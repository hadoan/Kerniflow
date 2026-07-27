import { CashEntryType, isProblemDetails, type ProblemDetails } from "@corely/contracts";
import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  createCashEntry,
  createCashRegister,
  getCashDayClose,
  listCashDayCloses,
  listCashEntries,
  submitCashDayClose,
} from "../helpers/cash-management-fixtures.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;

const dayAt = (dayKey: string, hh: number, mm = 0): string =>
  `${dayKey}T${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}:00.000Z`;

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

test.describe("Cash Management - day close", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  test.afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test("submits day close idempotently, stores count lines, and creates a single difference entry", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-20";

    const register = await createCashRegister(
      client,
      { name: "Day Close Register", currency: "EUR" },
      idempotencyKey(testInfo, "day-close-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "opening",
        type: CashEntryType.OPENING_FLOAT,
        amount: 100,
        occurredAt: dayAt(dayKey, 8),
      },
      idempotencyKey(testInfo, "day-close-opening")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "expense",
        type: CashEntryType.EXPENSE_CASH,
        amount: 20,
        occurredAt: dayAt(dayKey, 9),
      },
      idempotencyKey(testInfo, "day-close-expense")
    );

    const closeKey = idempotencyKey(testInfo, "day-close-submit");
    const closeA = await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 90,
        denominationCounts: [
          { denomination: 50, count: 1, subtotal: 50 },
          { denomination: 20, count: 2, subtotal: 40 },
        ],
        note: "cash count differs by +10",
      },
      closeKey
    );
    const closeB = await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 90,
        denominationCounts: [
          { denomination: 50, count: 1, subtotal: 50 },
          { denomination: 20, count: 2, subtotal: 40 },
        ],
        note: "cash count differs by +10",
      },
      closeKey
    );

    expect(closeA.response.status()).toBe(201);
    expect(closeB.response.status()).toBe(201);
    expect(closeA.dayClose.id).toBe(closeB.dayClose.id);
    expect(closeA.dayClose.expectedBalance).toBe(80);
    expect(closeA.dayClose.countedBalance).toBe(90);
    expect(closeA.dayClose.difference).toBe(10);
    expect(closeA.dayClose.status).toBe("SUBMITTED");
    expect(closeA.dayClose.denominationCounts).toHaveLength(2);

    const fetched = await getCashDayClose(client, register.register.id, dayKey);
    expect(fetched.dayClose.id).toBe(closeA.dayClose.id);
    expect(fetched.dayClose.lockedAt).toBeTruthy();

    const adjustments = await listCashEntries(client, register.register.id, {
      dayKeyFrom: dayKey,
      dayKeyTo: dayKey,
      type: CashEntryType.CLOSING_ADJUSTMENT,
    });
    expect(adjustments.entries).toHaveLength(1);

    const blockedEntry = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/entries`,
      {
        registerId: register.register.id,
        description: "new sale after close",
        type: CashEntryType.SALE_CASH,
        amount: 5,
        dayKey,
        occurredAt: dayAt(dayKey, 12),
      },
      idempotencyKey(testInfo, "day-close-blocked-entry")
    );
    await expectProblem(blockedEntry.response, 400, "CashManagement:DayAlreadyClosed");

    if (prisma) {
      const closeAudit = await prisma.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.day-close.submitted",
          entity: "CashDayClose",
          entityId: closeA.dayClose.id,
        },
      });
      expect(closeAudit).toBe(1);

      const closeEvent = await prisma.outboxEvent.count({
        where: {
          tenantId: testData.tenant.id,
          eventType: "cash.day.closed",
          payloadJson: {
            contains: closeA.dayClose.id,
          },
        },
      });
      expect(closeEvent).toBe(1);
    }
  });

  test("gets and lists day closes with deterministic ordering", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const register = await createCashRegister(
      client,
      { name: "List Closes Register" },
      idempotencyKey(testInfo, "list-closes-register")
    );

    const dayOne = "2026-01-21";
    const dayTwo = "2026-01-22";

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "day one opening",
        type: CashEntryType.OPENING_FLOAT,
        amount: 100,
        occurredAt: dayAt(dayOne, 8),
      },
      idempotencyKey(testInfo, "list-closes-entry-1")
    );

    await submitCashDayClose(
      client,
      register.register.id,
      dayOne,
      {
        countedBalance: 100,
        denominationCounts: [{ denomination: 100, count: 1, subtotal: 100 }],
      },
      idempotencyKey(testInfo, "list-closes-submit-1")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "day two sale",
        type: CashEntryType.SALE_CASH,
        amount: 30,
        occurredAt: dayAt(dayTwo, 9),
      },
      idempotencyKey(testInfo, "list-closes-entry-2")
    );

    await submitCashDayClose(
      client,
      register.register.id,
      dayTwo,
      {
        countedBalance: 130,
        denominationCounts: [{ denomination: 50, count: 2, subtotal: 100 }],
        note: "manual count includes additional notes",
      },
      idempotencyKey(testInfo, "list-closes-submit-2")
    );

    const listed = await listCashDayCloses(client, register.register.id, {
      dayKeyFrom: dayOne,
      dayKeyTo: dayTwo,
    });
    expect(listed.response.status()).toBe(200);
    expect(listed.closes.length).toBeGreaterThanOrEqual(2);
    expect(listed.closes[0]?.dayKey).toBe(dayTwo);
    expect(listed.closes[1]?.dayKey).toBe(dayOne);

    const fetched = await getCashDayClose(client, register.register.id, dayOne);
    expect(fetched.response.status()).toBe(200);
    expect(fetched.dayClose.dayKey).toBe(dayOne);
    expect(fetched.dayClose.status).toBe("SUBMITTED");
  });

  test("rejects second submit with different idempotency key after day is closed", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-23";

    const register = await createCashRegister(
      client,
      { name: "Submit Conflict Register" },
      idempotencyKey(testInfo, "submit-conflict-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "opening",
        type: CashEntryType.OPENING_FLOAT,
        amount: 70,
        occurredAt: dayAt(dayKey, 8),
      },
      idempotencyKey(testInfo, "submit-conflict-opening")
    );

    await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 70,
        denominationCounts: [{ denomination: 50, count: 1, subtotal: 50 }],
        note: "explicit close",
      },
      idempotencyKey(testInfo, "submit-conflict-c1")
    );

    const second = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/day-closes/${encodeURIComponent(dayKey)}/submit`,
      {
        registerId: register.register.id,
        dayKey,
        countedBalance: 70,
        denominationCounts: [{ denomination: 50, count: 1, subtotal: 50 }],
      },
      idempotencyKey(testInfo, "submit-conflict-c2")
    );
    await expectProblem(second.response, 400, "CashManagement:DayAlreadyClosed");
  });

  test.skip("preview endpoint (not implemented)", async () => {});
  test.skip("void/reopen day close endpoint (not implemented)", async () => {});
});
