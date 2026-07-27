import { CashRegisterSchema, type CashRegister } from "@corely/contracts";
import { expect, type Page } from "@playwright/test";
import { test } from "../fixtures.ts";
import { loginAsSeededUser } from "../helpers/auth.ts";
import {
  attachBelegToEntry,
  createCashEntry,
  submitCashDayClose,
  uploadBase64Document,
} from "../helpers/cash-management-fixtures.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const receiptBase64 = Buffer.from("receipt for salon purchase", "utf8").toString("base64");

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function primeAuthenticatedSession(
  page: Page,
  session: {
    accessToken: string;
    workspaceId: string;
  }
): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript((value) => {
    window.localStorage.clear();
    window.localStorage.setItem("accessToken", value.accessToken);
    window.localStorage.setItem("corely-active-workspace", value.workspaceId);
  }, session);
}

async function createDashboardRegister(
  client: HttpClient,
  input: {
    name: string;
    location?: string;
    currency: string;
  },
  idempotency: string
): Promise<CashRegister> {
  const { response, body } = await client.postJson("/cash-registers", input, idempotency);
  expect(response.status(), JSON.stringify(body)).toBe(201);
  const record = asRecord(body);
  return CashRegisterSchema.parse(record.register ?? record);
}

test.describe("Cash dashboard", () => {
  test("shows missing receipts and next actions for an open cash day", async ({
    page,
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const workspaceId = testData.workspace.id;
    const client = new HttpClient(request, { ...auth, workspaceId });
    const previousDayKey = "2026-03-13";
    const dayKey = "2026-03-14";

    const register = await createDashboardRegister(
      client,
      {
        name: "Lotus Nails Berlin",
        location: "Berlin-Neukoelln",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "dashboard-open-register")
    );

    await createCashEntry(
      client,
      register.id,
      {
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Opening float prepared",
        amount: 20000,
        occurredAt: `${previousDayKey}T08:00:00.000Z`,
      },
      idempotencyKey(testInfo, "dashboard-open-prev-entry")
    );

    await submitCashDayClose(
      client,
      register.id,
      previousDayKey,
      {
        countedBalance: 20000,
        note: "Previous day closed cleanly",
      },
      idempotencyKey(testInfo, "dashboard-open-prev-close")
    );

    await createCashEntry(
      client,
      register.id,
      {
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Cash manicure sales",
        amount: 45000,
        occurredAt: `${dayKey}T09:00:00.000Z`,
      },
      idempotencyKey(testInfo, "dashboard-open-income")
    );

    await createCashEntry(
      client,
      register.id,
      {
        type: "EXPENSE_CASH",
        direction: "OUT",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Acetone refill",
        amount: 8000,
        occurredAt: `${dayKey}T11:30:00.000Z`,
      },
      idempotencyKey(testInfo, "dashboard-open-expense")
    );

    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId,
    });

    const dashboardUrl = `/dashboard?registerId=${encodeURIComponent(register.id)}&day=${dayKey}`;
    await page.goto(dashboardUrl);
    await expect(page.getByTestId("cash-dashboard-page")).toBeVisible();
    await expect(page.getByTestId("cash-dashboard-banner-title")).toHaveText(
      "Today's cash book is still open"
    );
    await expect(page.getByTestId("cash-dashboard-summary-opening-balance-value")).toContainText(
      /200\.00/
    );
    await expect(page.getByTestId("cash-dashboard-summary-cash-in-value")).toContainText(/450\.00/);
    await expect(page.getByTestId("cash-dashboard-summary-cash-out-value")).toContainText(/80\.00/);
    await expect(page.getByTestId("cash-dashboard-summary-expected-balance-value")).toContainText(
      /570\.00/
    );
    await expect(page.getByTestId("cash-dashboard-summary-missing-receipts-value")).toHaveText("1");
    await expect(page.getByText("1 entries are missing receipts")).toBeVisible();
    await expect(page.getByTestId("cash-dashboard-closing-workflow")).toContainText(
      "Not entered yet"
    );
  });

  test("shows a closed day and export readiness once cash controls are complete", async ({
    page,
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const workspaceId = testData.workspace.id;
    const client = new HttpClient(request, { ...auth, workspaceId });
    const previousDayKey = "2026-03-13";
    const dayKey = "2026-03-14";

    const register = await createDashboardRegister(
      client,
      {
        name: "Lotus Nails Hamburg",
        location: "Hamburg-Altona",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "dashboard-closed-register")
    );

    await createCashEntry(
      client,
      register.id,
      {
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Opening float prepared",
        amount: 20000,
        occurredAt: `${previousDayKey}T08:00:00.000Z`,
      },
      idempotencyKey(testInfo, "dashboard-closed-prev-entry")
    );

    await submitCashDayClose(
      client,
      register.id,
      previousDayKey,
      {
        countedBalance: 20000,
        note: "Previous day closed cleanly",
      },
      idempotencyKey(testInfo, "dashboard-closed-prev-close")
    );

    await createCashEntry(
      client,
      register.id,
      {
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Cash manicure sales",
        amount: 45000,
        occurredAt: `${dayKey}T09:00:00.000Z`,
      },
      idempotencyKey(testInfo, "dashboard-closed-income")
    );

    const expense = await createCashEntry(
      client,
      register.id,
      {
        type: "EXPENSE_CASH",
        direction: "OUT",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Tip box envelopes",
        amount: 8000,
        occurredAt: `${dayKey}T11:30:00.000Z`,
      },
      idempotencyKey(testInfo, "dashboard-closed-expense")
    );

    const upload = await uploadBase64Document(
      client,
      {
        filename: "receipt.txt",
        contentType: "text/plain",
        base64: receiptBase64,
        category: "receipt",
        purpose: "cash-entry",
      },
      idempotencyKey(testInfo, "dashboard-closed-receipt-upload")
    );

    await attachBelegToEntry(
      client,
      expense.entry.id,
      upload.upload.document.id,
      idempotencyKey(testInfo, "dashboard-closed-receipt-attach")
    );

    await submitCashDayClose(
      client,
      register.id,
      dayKey,
      {
        countedBalance: 57000,
        note: "Counted by Lan Tran",
      },
      idempotencyKey(testInfo, "dashboard-closed-day-close")
    );

    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId,
    });

    const dashboardUrl = `/dashboard?registerId=${encodeURIComponent(register.id)}&day=${dayKey}`;
    await page.goto(dashboardUrl);
    await expect(page.getByTestId("cash-dashboard-page")).toBeVisible();
    await expect(page.getByTestId("cash-dashboard-banner-title")).toHaveText(
      "This month is ready to export"
    );
    await expect(page.getByTestId("cash-dashboard-summary-daily-closing-value")).toHaveText(
      "Closed"
    );
    await expect(page.getByTestId("cash-dashboard-export-status-badge")).toHaveText("Export ready");
    await expect(page.getByTestId("cash-dashboard-export-status")).toContainText(
      "All required days are closed"
    );
    await expect(page.getByTestId("cash-dashboard-export-button")).toBeVisible();
    await expect(page.getByTestId("cash-dashboard-close-day-button")).toContainText(
      "Close today's cash book"
    );
  });
});
