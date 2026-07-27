import { describe, it, expect, vi, beforeEach } from "vitest";
import { ConfirmHandoffUseCase } from "./confirm-handoff.usecase";
import {
  NotFoundError,
  ValidationError,
  ok,
  err,
  UseCaseContext,
  UnitOfWork,
} from "@corely/kernel";

describe("ConfirmHandoffUseCase", () => {
  let handoffRepo: any;
  let confirmationRepo: any;
  let confirmCashEntryUseCase: any;
  let unitOfWork: any;
  let useCase: ConfirmHandoffUseCase;

  const mockCtx: UseCaseContext = {
    tenantId: "tenant-1",
    workspaceId: "workspace-1",
    userId: "user-1",
    actor: { type: "USER", id: "user-1", tenantId: "tenant-1" },
  };

  const validHandoff = {
    id: "handoff-1",
    tenantId: "tenant-1",
    targetWorkspaceId: "workspace-1",
    sourceWorkspaceId: "source-ws-1",
    registerId: "register-1",
    status: "PENDING",
    confirmationId: "confirmation-1",
    expiresAt: new Date(Date.now() + 100000).toISOString(),
  };

  beforeEach(() => {
    handoffRepo = {
      getHandoffForUpdate: vi.fn(),
      markHandoffConsumed: vi.fn(),
    };
    confirmationRepo = {
      findEntryConfirmationById: vi.fn(),
    };
    confirmCashEntryUseCase = {
      execute: vi.fn(),
    };
    unitOfWork = {
      withinTransaction: vi.fn(async (fn) => fn("mock-tx")),
    };

    useCase = new ConfirmHandoffUseCase(
      handoffRepo,
      confirmationRepo,
      confirmCashEntryUseCase,
      unitOfWork
    );
  });

  it("should confirm successfully", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue(validHandoff);
    confirmationRepo.findEntryConfirmationById.mockResolvedValue({ id: "confirmation-1" });
    confirmCashEntryUseCase.execute.mockResolvedValue(ok({ entryId: "entry-1" }));

    const result = await useCase.execute(
      {
        handoffId: "handoff-1",
        expectedConversationId: "conv-1",
        idempotencyKey: "key-1",
      },
      mockCtx
    );

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.entryId).toBe("entry-1");
    }
    expect(handoffRepo.markHandoffConsumed).toHaveBeenCalledWith("handoff-1", "mock-tx");
    expect(unitOfWork.withinTransaction).toHaveBeenCalled();
  });

  it("should fail if handoff is not found", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue(null);
    const result = await useCase.execute(
      { handoffId: "handoff-1", expectedConversationId: "conv-1", idempotencyKey: "key-1" },
      mockCtx
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("should fail if handoff is from wrong tenant", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue({ ...validHandoff, tenantId: "tenant-2" });
    const result = await useCase.execute(
      { handoffId: "handoff-1", expectedConversationId: "conv-1", idempotencyKey: "key-1" },
      mockCtx
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(NotFoundError);
  });

  it("should fail if handoff is from wrong workspace", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue({
      ...validHandoff,
      targetWorkspaceId: "ws-2",
    });
    const result = await useCase.execute(
      { handoffId: "handoff-1", expectedConversationId: "conv-1", idempotencyKey: "key-1" },
      mockCtx
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("should fail if handoff is already consumed", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue({ ...validHandoff, status: "CONSUMED" });
    const result = await useCase.execute(
      { handoffId: "handoff-1", expectedConversationId: "conv-1", idempotencyKey: "key-1" },
      mockCtx
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("should fail if handoff is expired", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue({
      ...validHandoff,
      expiresAt: new Date(Date.now() - 1000).toISOString(),
    });
    const result = await useCase.execute(
      { handoffId: "handoff-1", expectedConversationId: "conv-1", idempotencyKey: "key-1" },
      mockCtx
    );
    expect(result.isErr()).toBe(true);
    if (result.isErr()) expect(result.error).toBeInstanceOf(ValidationError);
  });

  it("should fail if confirmCashEntryUseCase fails and rollback", async () => {
    handoffRepo.getHandoffForUpdate.mockResolvedValue(validHandoff);
    confirmationRepo.findEntryConfirmationById.mockResolvedValue({ id: "confirmation-1" });

    const useCaseError = new ValidationError("Entry validation failed");
    confirmCashEntryUseCase.execute.mockResolvedValue(err(useCaseError));

    const result = await useCase.execute(
      { handoffId: "handoff-1", expectedConversationId: "conv-1", idempotencyKey: "key-1" },
      mockCtx
    );

    expect(result.isErr()).toBe(true);
    expect(handoffRepo.markHandoffConsumed).not.toHaveBeenCalled();
  });
});
