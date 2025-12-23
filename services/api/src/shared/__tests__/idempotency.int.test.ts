import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import {
  PostgresTestDb,
  createTenant,
  createTestDb,
  stopSharedContainer,
} from "@kerniflow/testkit";
import { PrismaIdempotencyAdapter } from "../infrastructure/persistence/prisma-idempotency.adapter";
import type { PrismaClient } from "@prisma/client";

describe("Idempotency adapter (Prisma + Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaClient;
  let adapter: PrismaIdempotencyAdapter;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
    adapter = new PrismaIdempotencyAdapter();
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await db.down();
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
