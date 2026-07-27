import { isProblemDetails, type ProblemDetails } from "@corely/contracts";
import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  createCashRegister,
  getCashRegister,
  listCashRegisters,
  updateCashRegister,
} from "../helpers/cash-management-fixtures.ts";
import { resetTenantDataForE2e, seedIsolatedTestData } from "../helpers/db-reset.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

async function expectProblem(
  response: { status: () => number; json: () => Promise<unknown> },
  status: number,
  code: string
): Promise<ProblemDetails> {
  expect(response.status()).toBe(status);
  const payload = await response.json();
  expect(isProblemDetails(payload)).toBe(true);
  const problem = payload as ProblemDetails;
  expect(problem.status).toBe(status);
  expect(problem.code).toBe(code);
  expect(typeof problem.type).toBe("string");
  expect(typeof problem.title).toBe("string");
  expect(typeof problem.detail).toBe("string");
  expect(typeof problem.traceId).toBe("string");
  return problem;
}

test.describe("Cash Management - registers", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  test.afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test("creates a cash register idempotently and returns one row in list", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const key = idempotencyKey(testInfo, "register-create");

    const createPayload = {
      name: "Kasse Frontdesk",
      location: "Berlin Mitte",
      currency: "EUR",
      disallowNegativeBalance: false,
    } as const;

    const first = await createCashRegister(client, createPayload, key);
    const second = await createCashRegister(client, createPayload, key);

    expect(first.response.status()).toBe(201);
    expect(second.response.status()).toBe(201);
    expect(first.register.id).toBe(second.register.id);

    const listed = await listCashRegisters(client, { q: "Frontdesk" });
    expect(listed.response.status()).toBe(200);
    const sameName = listed.registers.filter((row) => row.name === createPayload.name);
    expect(sameName).toHaveLength(1);
    expect(sameName[0]?.id).toBe(first.register.id);

    if (prisma) {
      const auditCount = await prisma.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.register.created",
          entity: "CashRegister",
          entityId: first.register.id,
        },
      });
      expect(auditCount).toBe(1);

      const outboxCount = await prisma.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "cash.register.created",
          payloadJson: {
            contains: first.register.id,
          },
        },
      });
      expect(outboxCount).toBe(1);
    }
  });

  test("lists, gets, and updates a cash register", async ({ request, testData }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const created = await createCashRegister(
      client,
      {
        name: "Backoffice Register",
        location: "Berlin HQ",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "register-create-main")
    );

    const listed = await listCashRegisters(client, { location: "Berlin" });
    expect(listed.response.status()).toBe(200);
    expect(listed.registers.some((row) => row.id === created.register.id)).toBe(true);

    const fetched = await getCashRegister(client, created.register.id);
    expect(fetched.response.status()).toBe(200);
    expect(fetched.register.currency).toBe("EUR");
    expect(fetched.register.location).toBe("Berlin HQ");
    expect(fetched.register.name).toBe("Backoffice Register");

    const updated = await updateCashRegister(
      client,
      created.register.id,
      {
        name: "Backoffice Register v2",
      },
      idempotencyKey(testInfo, "register-update")
    );
    expect(updated.response.status()).toBe(200);
    expect(updated.register.name).toBe("Backoffice Register v2");

    if (prisma) {
      const auditCount = await prisma.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.register.updated",
          entity: "CashRegister",
          entityId: created.register.id,
        },
      });
      expect(auditCount).toBe(1);

      const outboxCount = await prisma.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "cash.register.updated",
          payloadJson: {
            contains: created.register.id,
          },
        },
      });
      expect(outboxCount).toBe(1);
    }
  });

  test("enforces tenant/workspace isolation for register get", async ({
    request,
    testData,
  }, testInfo) => {
    const authA = await loginAsSeededUser(request, testData);
    const clientA = new HttpClient(request, authA);

    const created = await createCashRegister(
      clientA,
      {
        name: "Tenant A Register",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "register-tenant-a-create")
    );

    const otherTenant = await seedIsolatedTestData();
    try {
      const authB = await loginAsSeededUser(request, otherTenant);
      const clientB = new HttpClient(request, authB);

      const { response } = await clientB.getJson(
        `/cash-registers/${encodeURIComponent(created.register.id)}`
      );
      expect([403, 404]).toContain(response.status());

      if (response.status() === 404) {
        await expectProblem(response, 404, "CashManagement:RegisterNotFound");
      } else {
        await expectProblem(response, 403, "Auth:Forbidden");
      }
    } finally {
      await resetTenantDataForE2e(otherTenant.tenant.id);
    }
  });

  test.skip("archive register endpoint (not implemented)", async () => {});
  test.skip("transfer between registers endpoint (not implemented)", async () => {});
});
