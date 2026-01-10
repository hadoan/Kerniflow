import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresTestDb, createTenant, createTestDb, stopSharedContainer } from "@corely/testkit";
import { PrismaService, resetPrisma } from "@corely/data";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Idempotency adapter (Prisma + Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let adapter: import("../infrastructure/persistence/prisma-idempotency-storage.adapter").PrismaIdempotencyStorageAdapter;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
    const { PrismaIdempotencyStorageAdapter } =
      await import("../infrastructure/persistence/prisma-idempotency-storage.adapter");
    adapter = new PrismaIdempotencyStorageAdapter(prisma);
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await db.down();
    await resetPrisma();
    await stopSharedContainer();
  });

  it("persists and replays stored responses per tenant + key", async () => {
    const tenant = await createTenant(prisma);
    await adapter.store("expenses.create", tenant.id, "abc", {
      statusCode: 201,
      body: { ok: true },
    });

    const cached = await adapter.get("expenses.create", tenant.id, "abc");
    expect(cached).toEqual({ statusCode: 201, body: { ok: true } });
  });

  it("isolates entries across tenants", async () => {
    const tenantA = await createTenant(prisma, { name: "A" });
    const tenantB = await createTenant(prisma, { name: "B" });

    await adapter.store("expenses.create", tenantA.id, "duplicate", {
      statusCode: 200,
      body: { ok: true },
    });

    const crossTenant = await adapter.get("expenses.create", tenantB.id, "duplicate");
    expect(crossTenant).toBeNull();

    const rows = await prisma.idempotencyKey.findMany();
    expect(rows).toHaveLength(1);
  });
});
