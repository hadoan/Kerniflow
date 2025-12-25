import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresTestDb, createTestDb, stopSharedContainer } from "@kerniflow/testkit";
import { resetPrisma, PrismaService } from "@kerniflow/data";

let OutboxRepository: typeof import("@kerniflow/data").OutboxRepository;

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Outbox reliability (worker + Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let repo: import("@kerniflow/data").OutboxRepository;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
    ({ OutboxRepository } = await import("@kerniflow/data"));
    repo = new OutboxRepository(prisma);
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await db.down();
    await resetPrisma();
    await stopSharedContainer();
  });

  it("rolls back outbox enqueue when the surrounding transaction fails", async () => {
    await prisma
      .$transaction(async (tx) => {
        await repo.enqueue(
          {
            tenantId: "tenant-rollback",
            eventType: "test.event",
            payloadJson: JSON.stringify({ ok: true }),
          },
          tx as any
        );
        throw new Error("force rollback");
      })
      .catch(() => undefined);

    const count = await prisma.outboxEvent.count();
    expect(count).toBe(0);
  });

  it("fetches pending events once and marks them sent", async () => {
    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "invoice.created",
      payloadJson: "{}",
    });

    const pending = await repo.fetchPending(10);
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("PENDING");

    await repo.markSent(pending[0].id);
    const updated = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: pending[0].id } });
    expect(updated.status).toBe("SENT");
  });

  it("marks failed publishes and increments attempts", async () => {
    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "workflow.failed",
      payloadJson: "{}",
    });
    const [event] = await repo.fetchPending(5);

    await repo.markFailed(event.id, "network error");

    const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: event.id } });
    expect(stored.status).toBe("FAILED");
    expect(stored.attempts).toBeGreaterThanOrEqual(1);
  });

  it("only surfaces events whose availableAt is due", async () => {
    const now = new Date();
    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "ready",
      payloadJson: "{}",
      availableAt: now,
    });
    await repo.enqueue({
      tenantId: "tenant-1",
      eventType: "future",
      payloadJson: "{}",
      availableAt: new Date(now.getTime() + 60_000),
    });

    const pending = await repo.fetchPending(10);
    expect(pending.map((e) => e.eventType)).toEqual(["ready"]);
  });
});
