import { describe, expect, it, beforeEach, vi } from "vitest";

type Key = { tenantId: string | null; actionKey: string; key: string };

vi.mock("@corely/data", () => {
  const store = new Map<string, any>();
  const makeKey = (params: Key) =>
    `${params.tenantId ?? "public"}:${params.actionKey}:${params.key}`;

  const mockPrismaService = {
    idempotencyKey: {
      async findUnique({ where }: { where: { tenantId_actionKey_key: Key } }) {
        return store.get(makeKey(where.tenantId_actionKey_key)) ?? null;
      },
      async create({ data }: { data: any }) {
        const key = makeKey(data);
        const record = {
          id: data.id ?? Math.random().toString(36).slice(2),
          ...data,
          createdAt: data.createdAt ?? new Date(),
          updatedAt: data.updatedAt ?? new Date(),
        };
        store.set(key, record);
        return record;
      },
      async update({ where, data }: { where: { tenantId_actionKey_key: Key }; data: any }) {
        const key = makeKey(where.tenantId_actionKey_key);
        const existing = store.get(key);
        const record = {
          ...existing,
          ...data,
          updatedAt: data.updatedAt ?? new Date(),
        };
        store.set(key, record);
        return record;
      },
    },
  };

  return {
    PrismaService: vi.fn(() => mockPrismaService),
    prisma: mockPrismaService,
    __resetIdempotencyMock() {
      store.clear();
    },
  };
});

// @ts-expect-error test-only mock export
import { __resetIdempotencyMock, prisma } from "@corely/data";
import { IdempotencyService } from "./idempotency.service";

describe("IdempotencyService", () => {
  beforeEach(() => {
    __resetIdempotencyMock();
  });

  it("returns replay when completed response exists", async () => {
    const service = new IdempotencyService(prisma as any, () => new Date(0));
    const params = {
      actionKey: "copilot.chat",
      tenantId: "tenant-1",
      userId: "user-1",
      idempotencyKey: "key-1",
      requestHash: "hash-a",
    };

    const first = await service.startOrReplay(params);
    expect(first.mode).toBe("STARTED");

    await service.complete({
      actionKey: params.actionKey,
      tenantId: params.tenantId,
      idempotencyKey: params.idempotencyKey,
      responseStatus: 200,
      responseBody: { ok: true },
    });

    const replay = await service.startOrReplay(params);
    expect(replay).toEqual({
      mode: "REPLAY",
      responseStatus: 200,
      responseBody: { ok: true },
    });
  });

  it("detects mismatched request hashes", async () => {
    const service = new IdempotencyService(prisma as any, () => new Date(0));
    const params = {
      actionKey: "copilot.chat",
      tenantId: "tenant-1",
      userId: "user-1",
      idempotencyKey: "key-2",
      requestHash: "hash-a",
    };

    await service.startOrReplay(params);
    const mismatch = await service.startOrReplay({ ...params, requestHash: "hash-b" });
    expect(mismatch.mode).toBe("MISMATCH");
  });

  it("returns in-progress when duplicate arrives during processing", async () => {
    const service = new IdempotencyService(prisma as any, () => new Date(0));
    const params = {
      actionKey: "copilot.chat",
      tenantId: "tenant-1",
      userId: "user-1",
      idempotencyKey: "key-3",
    };

    const first = await service.startOrReplay(params);
    const second = await service.startOrReplay(params);
    expect(first.mode).toBe("STARTED");
    expect(second.mode).toBe("IN_PROGRESS");
  });
});
