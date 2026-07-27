import { CashEntryType, isProblemDetails, type ProblemDetails } from "@corely/contracts";
import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  attachBelegToEntry,
  createCashEntry,
  createCashRegister,
  getCashRegister,
  listCashEntries,
  listEntryAttachments,
  reverseCashEntry,
  submitCashDayClose,
  uploadBase64Document,
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

test.describe("Cash Management - entries", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  test.afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test("creates IN and OUT entries idempotently with sequential entry numbers", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const register = await createCashRegister(
      client,
      {
        name: "Entries Register",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "entries-register-create")
    );

    const inKey = idempotencyKey(testInfo, "entry-in");
    const outKey = idempotencyKey(testInfo, "entry-out");

    const inEntry = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Cash sale",
        type: CashEntryType.SALE_CASH,
        amount: 50,
        paymentMethod: "CASH",
        occurredAt: dayAt("2026-01-10", 9),
      },
      inKey
    );
    const inEntryDup = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Cash sale",
        type: CashEntryType.SALE_CASH,
        amount: 50,
        paymentMethod: "CASH",
        occurredAt: dayAt("2026-01-10", 9),
      },
      inKey
    );

    const outEntry = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Cash expense",
        type: CashEntryType.EXPENSE_CASH,
        amount: 30,
        paymentMethod: "CASH",
        occurredAt: dayAt("2026-01-10", 10),
      },
      outKey
    );
    const outEntryDup = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Cash expense",
        type: CashEntryType.EXPENSE_CASH,
        amount: 30,
        paymentMethod: "CASH",
        occurredAt: dayAt("2026-01-10", 10),
      },
      outKey
    );

    expect(inEntry.entry.id).toBe(inEntryDup.entry.id);
    expect(outEntry.entry.id).toBe(outEntryDup.entry.id);

    const listed = await listCashEntries(client, register.register.id);
    expect(listed.response.status()).toBe(200);
    expect(listed.entries).toHaveLength(2);
    expect(listed.entries.map((entry) => entry.entryNo)).toEqual([2, 1]);
    expect(inEntry.entry.balanceAfterCents).toBe(50);
    expect(outEntry.entry.balanceAfterCents).toBe(20);

    const updatedRegister = await getCashRegister(client, register.register.id);
    expect(updatedRegister.register.currentBalanceCents).toBe(20);

    if (prisma) {
      const auditCount = await prisma.auditLog.count({
        where: {
          tenantId: testData.tenant.id,
          action: "cash.entry.created",
          entity: "CashEntry",
          entityId: {
            in: [inEntry.entry.id, outEntry.entry.id],
          },
        },
      });
      expect(auditCount).toBe(2);
    }
  });

  test("lists entries with filters and deterministic ordering", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const register = await createCashRegister(
      client,
      {
        name: "Filter Register",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "entries-filter-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "Sale D1",
        type: CashEntryType.SALE_CASH,
        amount: 100,
        occurredAt: dayAt("2026-01-11", 9),
      },
      idempotencyKey(testInfo, "entries-filter-sale")
    );
    await createCashEntry(
      client,
      register.register.id,
      {
        description: "Expense D2",
        type: CashEntryType.EXPENSE_CASH,
        amount: 20,
        occurredAt: dayAt("2026-01-12", 11),
      },
      idempotencyKey(testInfo, "entries-filter-expense")
    );
    await createCashEntry(
      client,
      register.register.id,
      {
        description: "Owner deposit D2",
        type: CashEntryType.OWNER_DEPOSIT,
        amount: 50,
        occurredAt: dayAt("2026-01-12", 12),
      },
      idempotencyKey(testInfo, "entries-filter-owner")
    );

    const filtered = await listCashEntries(client, register.register.id, {
      dayKeyFrom: "2026-01-12",
      dayKeyTo: "2026-01-12",
      type: CashEntryType.EXPENSE_CASH,
    });
    expect(filtered.response.status()).toBe(200);
    expect(filtered.entries).toHaveLength(1);
    expect(filtered.entries[0]?.description).toBe("Expense D2");

    const fullList = await listCashEntries(client, register.register.id);
    for (let index = 1; index < fullList.entries.length; index += 1) {
      const prev = fullList.entries[index - 1];
      const next = fullList.entries[index];
      if (!prev || !next) {
        continue;
      }

      const prevAt = new Date(prev.occurredAt).getTime();
      const nextAt = new Date(next.occurredAt).getTime();
      expect(prevAt >= nextAt).toBe(true);
      if (prevAt === nextAt) {
        expect(prev.entryNo >= next.entryNo).toBe(true);
      }
    }
  });

  test("reverses an entry idempotently and blocks second reversal with new key", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const register = await createCashRegister(
      client,
      {
        name: "Reverse Register",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "reverse-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "Opening amount",
        type: CashEntryType.OPENING_FLOAT,
        amount: 100,
        occurredAt: dayAt("2026-01-13", 8),
      },
      idempotencyKey(testInfo, "reverse-open")
    );

    const original = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Small expense",
        type: CashEntryType.EXPENSE_CASH,
        amount: 30,
        occurredAt: dayAt("2026-01-13", 9),
      },
      idempotencyKey(testInfo, "reverse-original")
    );

    const reverseKey = idempotencyKey(testInfo, "reverse-idempotent");
    const reversalA = await reverseCashEntry(
      client,
      original.entry.id,
      {
        reason: "Wrong expense row",
        occurredAt: dayAt("2026-01-13", 10),
        dayKey: "2026-01-13",
      },
      reverseKey
    );
    const reversalB = await reverseCashEntry(
      client,
      original.entry.id,
      {
        reason: "Wrong expense row",
        occurredAt: dayAt("2026-01-13", 10),
        dayKey: "2026-01-13",
      },
      reverseKey
    );

    expect(reversalA.entry.id).toBe(reversalB.entry.id);
    expect(reversalA.entry.reversalOfEntryId).toBe(original.entry.id);

    const listed = await listCashEntries(client, register.register.id);
    const listedOriginal = listed.entries.find((entry) => entry.id === original.entry.id);
    const listedReversal = listed.entries.find((entry) => entry.id === reversalA.entry.id);
    expect(listedOriginal?.reversedByEntryId).toBe(reversalA.entry.id);
    expect(listedReversal?.balanceAfterCents).toBe(100);

    const secondTry = await client.postJson(
      `/cash-entries/${encodeURIComponent(original.entry.id)}/reverse`,
      {
        reason: "second try should fail",
      },
      idempotencyKey(testInfo, "reverse-fail-new-key")
    );
    await expectProblem(secondTry.response, 400, "CashManagement:EntryAlreadyReversed");
  });

  test("attaches beleg idempotently and lists exactly one attachment", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const register = await createCashRegister(
      client,
      {
        name: "Attachment Register",
      },
      idempotencyKey(testInfo, "attach-register")
    );
    const entry = await createCashEntry(
      client,
      register.register.id,
      {
        description: "Entry with beleg",
        type: CashEntryType.SALE_CASH,
        amount: 120,
        occurredAt: dayAt("2026-01-14", 8),
      },
      idempotencyKey(testInfo, "attach-entry")
    );

    const uploaded = await uploadBase64Document(
      client,
      {
        filename: "beleg.txt",
        contentType: "text/plain",
        base64: Buffer.from("cash-beleg-attachment", "utf-8").toString("base64"),
      },
      idempotencyKey(testInfo, "attach-document-upload")
    );
    expect(uploaded.response.status()).toBe(201);

    const attachKey = idempotencyKey(testInfo, "attach-beleg");
    const attachA = await attachBelegToEntry(
      client,
      entry.entry.id,
      uploaded.upload.document.id,
      attachKey
    );
    const attachB = await attachBelegToEntry(
      client,
      entry.entry.id,
      uploaded.upload.document.id,
      attachKey
    );
    expect(attachA.attachment.id).toBe(attachB.attachment.id);

    const listed = await listEntryAttachments(client, entry.entry.id);
    expect(listed.response.status()).toBe(200);
    expect(listed.attachments).toHaveLength(1);
    expect(listed.attachments[0]?.documentId).toBe(uploaded.upload.document.id);
  });

  test("blocks regular entries on locked day but allows correction entry", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const dayKey = "2026-01-15";

    const register = await createCashRegister(
      client,
      {
        name: "Locked Day Register",
      },
      idempotencyKey(testInfo, "locked-register")
    );

    await createCashEntry(
      client,
      register.register.id,
      {
        description: "D1 opening",
        type: CashEntryType.OPENING_FLOAT,
        amount: 200,
        occurredAt: dayAt(dayKey, 8),
      },
      idempotencyKey(testInfo, "locked-opening")
    );

    const close = await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 200,
        denominationCounts: [{ denomination: 100, count: 2, subtotal: 200 }],
      },
      idempotencyKey(testInfo, "locked-close")
    );
    expect(close.dayClose.status).toBe("SUBMITTED");

    const blocked = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/entries`,
      {
        registerId: register.register.id,
        description: "blocked normal entry",
        type: CashEntryType.SALE_CASH,
        amount: 10,
        dayKey,
        occurredAt: dayAt(dayKey, 12),
      },
      idempotencyKey(testInfo, "locked-normal-blocked")
    );
    await expectProblem(blocked.response, 400, "CashManagement:DayAlreadyClosed");

    const correction = await createCashEntry(
      client,
      register.register.id,
      {
        description: "allowed correction",
        type: CashEntryType.CORRECTION,
        direction: "OUT",
        amount: 5,
        dayKey,
        occurredAt: dayAt(dayKey, 13),
      },
      idempotencyKey(testInfo, "locked-correction-ok")
    );

    expect(correction.response.status()).toBe(201);
    expect(correction.entry.lockedByDayCloseId).toBe(close.dayClose.id);
  });

  test("enforces negative balance policy when enabled", async ({ request, testData }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const register = await createCashRegister(
      client,
      {
        name: "No Negative Register",
        disallowNegativeBalance: true,
      },
      idempotencyKey(testInfo, "negative-register")
    );

    const negativeTry = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/entries`,
      {
        registerId: register.register.id,
        description: "Too much withdrawal",
        type: CashEntryType.EXPENSE_CASH,
        amount: 100,
        paymentMethod: "CASH",
        occurredAt: dayAt("2026-01-16", 9),
      },
      idempotencyKey(testInfo, "negative-entry")
    );

    await expectProblem(negativeTry.response, 400, "CashManagement:NegativeBalance");
  });

  test.skip("get cash entry endpoint (not implemented)", async () => {});
});
