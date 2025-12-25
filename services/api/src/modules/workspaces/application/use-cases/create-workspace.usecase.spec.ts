import { describe, it, expect, beforeEach, vi } from "vitest";
import { CreateWorkspaceUseCase } from "./create-workspace.usecase";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";

describe("CreateWorkspaceUseCase", () => {
  let useCase: CreateWorkspaceUseCase;
  let mockRepo: WorkspaceRepositoryPort;
  let mockIdGen: IdGeneratorPort;
  let mockClock: ClockPort;
  let mockIdempotency: IdempotencyStoragePort;
  let idCounter: number;

  beforeEach(() => {
    mockRepo = {
      createLegalEntity: vi.fn(),
      createWorkspace: vi.fn(),
      createMembership: vi.fn(),
    } as any;

    mockIdGen = {
      newId: vi.fn().mockImplementation(() => `test-id-${++idCounter}`),
    } as any;

    mockClock = {
      now: vi.fn().mockReturnValue(new Date("2025-01-01")),
    } as any;

    mockIdempotency = {
      get: vi.fn().mockResolvedValue(null),
      store: vi.fn().mockResolvedValue(undefined),
    } as any;

    idCounter = 0;
    useCase = new CreateWorkspaceUseCase(mockRepo, mockIdGen, mockClock, mockIdempotency);
  });

  it("should create workspace with legal entity and owner membership", async () => {
    const legalEntity = {
      id: "legal-1",
      tenantId: "tenant-1",
      kind: "COMPANY",
      legalName: "Test Company",
      countryCode: "US",
      currency: "USD",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const workspace = {
      id: "workspace-1",
      tenantId: "tenant-1",
      legalEntityId: "legal-1",
      name: "Test Workspace",
      onboardingStatus: "PROFILE",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const membership = {
      id: "membership-1",
      workspaceId: "workspace-1",
      userId: "user-1",
      role: "OWNER" as const,
      status: "ACTIVE" as const,
      createdAt: new Date(),
    };

    vi.mocked(mockRepo.createLegalEntity).mockResolvedValue(legalEntity);
    vi.mocked(mockRepo.createWorkspace).mockResolvedValue(workspace);
    vi.mocked(mockRepo.createMembership).mockResolvedValue(membership);

    const result = await useCase.execute({
      tenantId: "tenant-1",
      userId: "user-1",
      name: "Test Workspace",
      kind: "COMPANY",
      legalName: "Test Company",
      countryCode: "US",
      currency: "USD",
    });

    expect(result.workspace.id).toBe("workspace-1");
    expect(result.workspace.name).toBe("Test Workspace");
    expect(result.membership.role).toBe("OWNER");
    expect(result.membership.userId).toBe("user-1");
  });

  it("should return cached result if idempotency key matches", async () => {
    const cachedResult = {
      workspace: { id: "cached-ws", name: "Cached" } as any,
      membership: { id: "cached-mem" } as any,
    };

    vi.mocked(mockIdempotency.get).mockResolvedValue({ statusCode: 200, body: cachedResult });

    const result = await useCase.execute({
      tenantId: "tenant-1",
      userId: "user-1",
      name: "Test",
      kind: "COMPANY",
      idempotencyKey: "test-key",
    });

    expect(result.workspace.id).toBe("cached-ws");
    expect(mockRepo.createLegalEntity).not.toHaveBeenCalled();
  });
});
