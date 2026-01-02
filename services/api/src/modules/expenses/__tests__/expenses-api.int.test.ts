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

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("POST /expenses (API)", () => {
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

  it("accepts web payload shape (merchantName/expenseDate/totalAmountCents)", async () => {
    const payload = {
      merchantName: "Web Vendor",
      expenseDate: "2024-07-01",
      totalAmountCents: 1234,
      currency: "EUR",
      category: "office_supplies",
      notes: "From web form",
    };

    const res = await request(server)
      .post("/expenses")
      .set("x-idempotency-key", "web-payload-1")
      .set("x-tenant-id", tenantId)
      .set("x-user-id", userId)
      .send(payload);

    expect([200, 201]).toContain(res.status);
    expect(res.body.merchant ?? res.body.merchantName).toBe(payload.merchantName);
    expect(res.body.totalCents ?? res.body.totalAmountCents).toBe(payload.totalAmountCents);
    expect(res.body.currency).toBe(payload.currency);
  });

  it("creates an expense and returns dto", async () => {
    const res = await request(server)
      .post("/expenses")
      .set("x-idempotency-key", "api-expense-1")
      .send({
        tenantId,
        merchant: "API Vendor",
        totalCents: 4200,
        currency: "USD",
        category: "Meals",
        issuedAt: new Date("2024-05-01").toISOString(),
        createdByUserId: userId,
        idempotencyKey: "ignored-from-body",
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body).toMatchObject({
      tenantId,
      merchant: "API Vendor",
      totalCents: 4200,
      currency: "USD",
      category: "Meals",
      createdByUserId: userId,
    });
    expect(res.body.id).toBeDefined();
  });

  it("replays same idempotency key without duplicating rows", async () => {
    const payload = {
      tenantId,
      merchant: "Repeat Vendor",
      totalCents: 999,
      currency: "USD",
      category: "Office",
      issuedAt: new Date("2024-06-10").toISOString(),
      createdByUserId: userId,
      idempotencyKey: "repeat-key",
    };

    const first = await request(server)
      .post("/expenses")
      .set("x-idempotency-key", "repeat-key")
      .send(payload);
    const second = await request(server)
      .post("/expenses")
      .set("x-idempotency-key", "repeat-key")
      .send(payload);

    expect([200, 201]).toContain(first.status);
    expect(second.status).toBe(first.status);
    expect(second.body.id).toBe(first.body.id);
  });

  it("rejects invalid payloads with 4xx", async () => {
    const res = await request(server).post("/expenses").send({
      tenantId,
      merchant: "Missing totals",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
