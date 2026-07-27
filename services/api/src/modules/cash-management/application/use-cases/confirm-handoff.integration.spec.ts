import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PrismaService } from "@corely/data";
import { PrismaCashRepository } from "../../infrastructure/adapters/prisma-cash-repository.adapter";
import { ConfirmCashEntryUseCase } from "./confirm-cash-entry.usecase";
import { ConfirmHandoffUseCase } from "./confirm-handoff.usecase";
import { PrismaUnitOfWork } from "@corely/data";
import { createIdempotencyKey } from "@corely/api-client";
import { ValidationError, ok, isOk, isErr } from "@corely/kernel";

describe("ConfirmHandoffUseCase Integration", () => {
  let prisma: PrismaService;
  let handoffRepo: PrismaCashRepository;
  let confirmationRepo: PrismaCashRepository;
  let confirmCashEntryUseCase: ConfirmCashEntryUseCase;
  let useCase: ConfirmHandoffUseCase;
  let uow: PrismaUnitOfWork;

  const tenantId = "int-tenant-1";
  const workspaceId = "int-ws-1";
  const registerId = "int-reg-1";
  const conversationId = "int-conv-1";

  beforeAll(async () => {
    // Override the DB URL to ensure we connect to E2E
    process.env.DATABASE_URL = "postgresql://hadoan@localhost:5432/corely_cash_e2e?schema=public";
    prisma = new PrismaService();
    // Assuming DB is already migrated and empty (e2e db)
    await prisma.cashWorkspaceHandoff.deleteMany({});
    await prisma.cashEntryConfirmation.deleteMany({});
    await prisma.cashEntry.deleteMany({});
    await prisma.cashRegister.deleteMany({});
    await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });

    // Seed required relations
    await prisma.tenant.create({
      data: { id: tenantId, name: "Int Tenant", slug: "int-tenant-1" },
    });
    const legalEntity = await prisma.legalEntity.create({
      data: {
        tenantId,
        kind: "COMPANY",
        legalName: "Int Legal Entity",
        countryCode: "DE",
        currency: "EUR",
      },
    });
    await prisma.workspace.create({
      data: {
        id: workspaceId,
        tenant: { connect: { id: tenantId } },
        legalEntity: { connect: { id: legalEntity.id } },
        name: "Int Workspace",
      },
    });
    await prisma.cashRegister.create({
      data: {
        id: registerId,
        tenant: { connect: { id: tenantId } },
        workspace: { connect: { id: workspaceId } },
        name: "Test Register",
        currency: "EUR",
      },
    });

    handoffRepo = new PrismaCashRepository(prisma);
    confirmationRepo = new PrismaCashRepository(prisma);
    uow = new PrismaUnitOfWork(prisma);

    // Mock confirmCashEntryUseCase to simulate a delay and create an entry
    confirmCashEntryUseCase = {
      execute: async (input: any, ctx: any) => {
        // Sleep for 50ms to ensure overlap
        await new Promise((r) => setTimeout(r, 50));

        // Use the passed transaction to create an entry
        await (ctx.tx as any).cashEntry.create({
          data: {
            id: createIdempotencyKey(),
            tenantId,
            workspaceId,
            registerId,
            dayKey: "2026-07-27",
            entryNo: Math.floor(Math.random() * 1000000),
            occurredAt: new Date(),
            type: "SALE_CASH",
            amountCents: 1000,
            description: "Concurrent Test",
            source: "MANUAL",
            createdByUserId: "user-1",
            direction: "IN",
            entryType: "SALE",
            grossAmountCents: 1000,
            sourceType: "MANUAL",
          },
        });

        return ok({ entryId: "fake-entry-id" });
      },
    } as any;

    useCase = new ConfirmHandoffUseCase(
      handoffRepo,
      confirmationRepo,
      confirmCashEntryUseCase,
      uow
    );
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("should block concurrent confirmations on the same handoff", async () => {
    // 1. Create confirmation
    const confirmation = await confirmationRepo.createEntryConfirmation({
      tenantId,
      workspaceId,
      registerId,
      conversationId,
      preparedByUserId: "user-1",
      businessDate: "2026-07-27",
      candidatePayload: {
        businessDate: "2026-07-27",
        movementType: "SALE_CASH",
        amountCents: 1000,
        description: "Test Sale",
        evidenceRequirement: null,
      },
      candidateHash: "hash-1",
      version: 1,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 100000),
    });

    // 2. Create handoff
    const handoff = await handoffRepo.createHandoff({
      tenantId,
      locationId: null,
      registerId,
      sourceWorkspaceId: workspaceId,
      targetWorkspaceId: workspaceId,
      sourceConversationId: conversationId,
      sourceMessageId: "msg-1",
      businessDate: "2026-07-27",
      movementType: "SALE_CASH",
      amountCents: 1000,
      description: "Test Sale",
      evidenceRequirement: null,
      candidateHash: "hash-1",
      version: 1,
      confirmationId: confirmation.id,
      status: "PENDING",
      expiresAt: new Date(Date.now() + 100000),
    });

    const idempotencyKey = createIdempotencyKey();
    const ctx = {
      tenantId,
      workspaceId,
      userId: "user-1",
      actor: { type: "USER", id: "user-1", tenantId },
    } as any;

    // 3. Trigger 2 simultaneous requests
    const promise1 = useCase.execute(
      { handoffId: handoff.id, expectedConversationId: conversationId, idempotencyKey },
      ctx
    );
    const promise2 = useCase.execute(
      { handoffId: handoff.id, expectedConversationId: conversationId, idempotencyKey },
      ctx
    );

    const [res1, res2] = await Promise.all([promise1, promise2]);

    // One should succeed, one should fail (because `status` is already CONSUMED)
    const successCount = [res1, res2].filter((r) => isOk(r)).length;
    const errorCount = [res1, res2].filter((r) => isErr(r)).length;

    expect(successCount).toBe(1);
    expect(errorCount).toBe(1);

    if (isErr(res1)) {
      expect(res1.error).toBeInstanceOf(ValidationError);
      expect(res1.error.message).toBe("Handoff has already been consumed");
    }
    if (isErr(res2)) {
      expect(res2.error).toBeInstanceOf(ValidationError);
      expect(res2.error.message).toBe("Handoff has already been consumed");
    }

    // 4. Verify only exactly ONE cash entry was created
    const entryCount = await prisma.cashEntry.count({
      where: { tenantId, workspaceId, registerId, description: "Concurrent Test" },
    });

    expect(entryCount).toBe(1);
  });
});
