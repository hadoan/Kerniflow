import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { PostgresTestDb } from "@corely/testkit";
import {
  createApiTestApp,
  createTestDb,
  seedDefaultTenant,
  stopSharedContainer,
} from "@corely/testkit";
import { CreateExpenseOutputSchema } from "@corely/contracts";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Expense contract responses", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await db.reset();
    const seed = await seedDefaultTenant(app);
    tenantId = seed.tenantId;
    userId = seed.userId;
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  it("matches the CreateExpenseOutput contract", async () => {
    const res = await request(server)
      .post("/expenses")
      .send({
        tenantId,
        merchant: "Contract Vendor",
        totalCents: 1010,
        currency: "USD",
        category: "Software",
        issuedAt: new Date("2024-07-01").toISOString(),
        createdByUserId: userId,
        idempotencyKey: "contract-key",
      });

    const parsed = CreateExpenseOutputSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      // Should fail fast with helpful diagnostics
      console.error(parsed.error.format());
    }

    expect(Object.keys(res.body).sort()).toMatchInlineSnapshot(`
[
  "archivedAt",
  "archivedByUserId",
  "category",
  "createdByUserId",
  "currency",
  "custom",
  "id",
  "issuedAt",
  "merchant",
  "tenantId",
  "totalCents",
]
`);
  });
});
