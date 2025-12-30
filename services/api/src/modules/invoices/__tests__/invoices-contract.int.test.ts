import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PostgresTestDb,
  createApiTestApp,
  createCustomerParty,
  createTenant,
  createTestDb,
  stopSharedContainer,
} from "@corely/testkit";
import { CreateInvoiceDraftOutputSchema } from "@corely/contracts";
import { JwtTokenService } from "../../identity/infrastructure/security/jwt.token-service";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Invoice API contracts", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;
  let tokenService: JwtTokenService;
  let tenantId: string;
  let customerId: string;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
    tokenService = new JwtTokenService();
  });

  beforeEach(async () => {
    await db.reset();
    const prisma = db.client;
    const tenant = await createTenant(prisma, { name: "Contract Tenant" });
    tenantId = tenant.id;
    const customer = await createCustomerParty(prisma, tenantId);
    customerId = customer.id;
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  it("matches CreateInvoiceDraftOutput schema", async () => {
    const res = await request(server)
      .post("/invoices")
      .set(
        "authorization",
        `Bearer ${tokenService.generateAccessToken({
          userId: "user-schema",
          email: "user@example.com",
          tenantId,
          roleIds: ["schema-role"],
        })}`
      )
      .send({
        tenantId,
        customerPartyId: customerId,
        currency: "USD",
        lineItems: [{ description: "Consulting", qty: 1, unitPriceCents: 5000 }],
        idempotencyKey: "inv-contract-1",
        actorUserId: "user-schema",
      });

    const parsed = CreateInvoiceDraftOutputSchema.safeParse(res.body);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      console.error(parsed.error.format());
    }
  });
});
