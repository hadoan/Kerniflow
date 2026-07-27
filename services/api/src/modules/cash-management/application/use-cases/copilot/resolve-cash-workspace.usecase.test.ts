import { beforeEach, describe, expect, it, vi } from "vitest";
import { ResolveCashWorkspaceUseCase } from "./resolve-cash-workspace.usecase";
import { ConflictError } from "@corely/kernel";

describe("ResolveCashWorkspaceUseCase", () => {
  let useCase: ResolveCashWorkspaceUseCase;

  let workspaceRepo: any;
  let unitOfWork: any;
  let agentRunCreate: any;
  let prisma: any;

  beforeEach(() => {
    vi.clearAllMocks();

    workspaceRepo = {
      createWorkspace: vi.fn(),
      findCanonicalWorkspace: vi.fn(),
      findWorkspaceByConversationId: vi.fn(),
    };

    agentRunCreate = vi.fn();
    unitOfWork = {
      withinTransaction: vi
        .fn()
        .mockImplementation(async (fn: any) =>
          fn({ agentRun: { create: agentRunCreate.mockResolvedValue({}) } })
        ),
    };

    prisma = {
      agentRun: {
        findFirst: vi.fn(),
      },
      cashRegister: {
        findFirst: vi.fn(),
      },
      cashAssistantWorkspace: {
        update: vi.fn(),
      },
    };

    useCase = new ResolveCashWorkspaceUseCase(workspaceRepo, unitOfWork, prisma);
  });

  it("creates a new workspace and conversation atomically", async () => {
    prisma.cashRegister.findFirst.mockResolvedValue({ id: "reg-1" });
    workspaceRepo.createWorkspace.mockResolvedValue({
      id: "ws-1",
      conversationId: "conv-1",
      registerId: "reg-1",
      type: "GENERAL_HELP",
    });

    const result = await useCase.execute(
      { type: "GENERAL_HELP", registerId: "reg-1" },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspace.registerId).toBe("reg-1");
    }
    expect(agentRunCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: "ws-1",
          createdByUserId: "user-1",
          status: "running",
        }),
      })
    );
  });

  it("returns existing workspace idempotently for same conversationId and registerId", async () => {
    prisma.cashRegister.findFirst.mockResolvedValue({ id: "reg-1" });
    prisma.agentRun.findFirst.mockResolvedValue({ id: "conv-1" });
    workspaceRepo.findWorkspaceByConversationId.mockResolvedValue({
      id: "ws-1",
      conversationId: "conv-1",
      registerId: "reg-1",
      type: "GENERAL_HELP",
    });

    const result = await useCase.execute(
      { type: "GENERAL_HELP", conversationId: "conv-1", registerId: "reg-1" },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspace.registerId).toBe("reg-1");
    }
    expect(workspaceRepo.createWorkspace).not.toHaveBeenCalled();
  });

  it("returns ConflictError when attempting to rebind conversation to a different register", async () => {
    prisma.cashRegister.findFirst.mockResolvedValue({ id: "reg-2" });
    prisma.agentRun.findFirst.mockResolvedValue({ id: "conv-1" });
    workspaceRepo.findWorkspaceByConversationId.mockResolvedValue({
      id: "ws-1",
      conversationId: "conv-1",
      registerId: "reg-1",
      type: "GENERAL_HELP",
    });

    const result = await useCase.execute(
      { type: "GENERAL_HELP", conversationId: "conv-1", registerId: "reg-2" },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(ConflictError);
    }
  });

  it("rejects binding a conversation that is not owned in the Copilot workspace scope", async () => {
    prisma.cashRegister.findFirst.mockResolvedValue({ id: "reg-1" });
    prisma.agentRun.findFirst.mockResolvedValue(null);

    const result = await useCase.execute(
      { type: "GENERAL_HELP", conversationId: "other-users-conversation", registerId: "reg-1" },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(result.ok).toBe(false);
    expect(workspaceRepo.createWorkspace).not.toHaveBeenCalled();
    expect(unitOfWork.withinTransaction).not.toHaveBeenCalled();
    expect(prisma.agentRun.findFirst).toHaveBeenCalledWith({
      where: {
        id: "other-users-conversation",
        tenantId: "ws-1",
        createdByUserId: "user-1",
      },
      select: { id: true },
    });
  });

  it("returns the canonical workspace after a concurrent create conflict", async () => {
    prisma.cashRegister.findFirst.mockResolvedValue({ id: "reg-1" });
    unitOfWork.withinTransaction.mockRejectedValue({ code: "P2002" });
    workspaceRepo.findCanonicalWorkspace.mockResolvedValue({
      id: "ws-existing",
      conversationId: "conv-existing",
      registerId: "reg-1",
      type: "DAILY_CASH_DAY",
    });

    const result = await useCase.execute(
      { type: "DAILY_CASH_DAY", registerId: "reg-1", businessDate: "2026-03-14" },
      { tenantId: "tenant-1", workspaceId: "ws-1", userId: "user-1" }
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.workspace.id).toBe("ws-existing");
    }
  });
});
