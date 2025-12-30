import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type PostgresTestDb,
  createCustomerParty,
  createTenant,
  createUser,
  createTestDb,
  stopSharedContainer,
} from "@corely/testkit";
import type { PrismaService } from "@corely/data";
import { buildRequestContext } from "@shared/context/request-context";
import { CreateExpenseUseCase } from "../application/use-cases/create-expense.usecase";
import { MockAuditPort } from "@shared/testkit/mocks/mock-audit-port";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Expenses integration (Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let useCase: CreateExpenseUseCase;
  let ExpenseRepo: any;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
    const [
      { PrismaExpenseRepository },
      { PrismaOutboxAdapter },
      { PrismaIdempotencyStorageAdapter },
      { SystemIdGenerator },
      { SystemClock },
      { CustomFieldDefinitionRepository, CustomFieldIndexRepository },
    ] = await Promise.all([
      import("../infrastructure/adapters/prisma-expense-repository.adapter"),
      import("@corely/data"),
      import("../../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter"),
      import("../../../shared/infrastructure/system-id-generator"),
      import("../../../shared/infrastructure/system-clock"),
      import("@corely/data"),
    ]);

    ExpenseRepo = PrismaExpenseRepository;
    useCase = new CreateExpenseUseCase(
      new PrismaExpenseRepository(prisma),
      new PrismaOutboxAdapter(prisma),
      new MockAuditPort(),
      new PrismaIdempotencyStorageAdapter(prisma),
      new SystemIdGenerator(),
      new SystemClock(),
      new CustomFieldDefinitionRepository(prisma),
      new CustomFieldIndexRepository(prisma)
    );
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("enforces tenant scoping when reading expenses", async () => {
    const tenantA = await createTenant(prisma, { name: "Tenant A" });
    const tenantB = await createTenant(prisma, { name: "Tenant B" });
    const user = await createUser(prisma, { email: "owner@a.test" });
    await createCustomerParty(prisma, tenantA.id);

    const ctxA = buildRequestContext({ tenantId: tenantA.id, actorUserId: user.id });
    const expense = await useCase.execute({
      tenantId: tenantA.id,
      merchant: "Vendor A",
      totalCents: 1234,
      currency: "USD",
      category: "Travel",
      issuedAt: new Date("2024-02-01"),
      createdByUserId: user.id,
      idempotencyKey: "expense-1",
      context: ctxA,
    });

    const repo = new ExpenseRepo(prisma);
    const crossTenantResult = await repo.findById(tenantB.id, expense.id);
    expect(crossTenantResult).toBeNull();

    const rows = await prisma.expense.findMany({ where: { tenantId: tenantA.id } });
    expect(rows).toHaveLength(1);
  });

  it("stores and replays idempotent expense creation and keeps outbox single", async () => {
    const tenant = await createTenant(prisma, { name: "Tenant Main" });
    const user = await createUser(prisma, { email: "owner@main.test" });
    await createCustomerParty(prisma, tenant.id);
    const ctx = buildRequestContext({ tenantId: tenant.id, actorUserId: user.id });
    const baseInput = {
      tenantId: tenant.id,
      merchant: "Vendor",
      totalCents: 555,
      currency: "USD",
      category: "Office",
      issuedAt: new Date("2024-03-10"),
      createdByUserId: user.id,
      idempotencyKey: "same-key",
      context: ctx,
    };

    const first = await useCase.execute(baseInput);
    const second = await useCase.execute(baseInput);

    expect(second.id).toBe(first.id);

    const expenses = await prisma.expense.findMany({ where: { tenantId: tenant.id } });
    expect(expenses).toHaveLength(1);

    const idemRows = await prisma.idempotencyKey.findMany({
      where: { tenantId: tenant.id, key: "same-key" },
    });
    expect(idemRows).toHaveLength(1);

    const outboxRows = await prisma.outboxEvent.findMany({
      where: { tenantId: tenant.id, eventType: "expense.created" },
    });
    expect(outboxRows).toHaveLength(1);
  });
});
