import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotEnv } from "dotenv";
import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";
import { apiClient } from "../utils/api.ts";

type SeedClassesBillingSendResult = {
  tenantId: string;
  workspaceId: string;
  month: string;
  invoiceIds: string[];
  recipients: string[];
};

type DeliveryRow = {
  invoiceId: string;
  to: string;
  status: string;
  provider: string;
  providerMessageId: string | null;
  lastError: string | null;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "../../..");
loadDotEnv({ path: path.join(REPO_ROOT, ".env") });

async function login(
  page: Page,
  creds: {
    email: string;
    password: string;
  }
) {
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

function runOutboxTick() {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  const serviceToken = process.env.WORKER_API_SERVICE_TOKEN?.trim();
  if (serviceToken) {
    headers["x-service-token"] = serviceToken;
  } else if (process.env.INTERNAL_WORKER_KEY?.trim()) {
    headers["x-worker-key"] = process.env.INTERNAL_WORKER_KEY.trim();
  }

  return fetch(`${process.env.API_URL ?? "http://localhost:3000"}/internal/background/outbox/run`, {
    method: "POST",
    headers,
    body: JSON.stringify({ limit: 50, repoRoot: REPO_ROOT }),
  });
}

async function waitForDeliveries(tenantId: string, invoiceIds: string[], timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const body = await apiClient.post<{ deliveries: DeliveryRow[] }>(
      "/test/invoices/email-deliveries",
      {
        tenantId,
        invoiceIds,
      }
    );

    const newestByInvoice = new Map<string, DeliveryRow>();
    for (const row of body.deliveries) {
      if (!newestByInvoice.has(row.invoiceId)) {
        newestByInvoice.set(row.invoiceId, row);
      }
    }

    const allReady = invoiceIds.every((invoiceId) => {
      const row = newestByInvoice.get(invoiceId);
      return Boolean(row?.providerMessageId && row.provider === "resend" && row.status === "SENT");
    });

    if (allReady) {
      return invoiceIds.map((invoiceId) => newestByInvoice.get(invoiceId)!);
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error("Timed out waiting for invoice deliveries to reach SENT with providerMessageId.");
}

async function waitForResendEmail(emailId: string, apiKey: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetch(`https://api.resend.com/emails/${emailId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });
    if (!response.ok) {
      throw new Error(
        `Resend retrieve failed for ${emailId}: ${response.status} ${response.statusText}`
      );
    }

    const payload = (await response.json()) as { data?: Record<string, unknown> } & Record<
      string,
      unknown
    >;
    const data = (payload.data ?? payload) as Record<string, unknown> as {
      last_event?: string;
      to?: string[] | string;
      subject?: string;
    };
    const lastEvent = data.last_event ?? "";
    if (lastEvent === "sent" || lastEvent === "delivered") {
      return data;
    }

    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  throw new Error(`Timed out waiting for Resend email ${emailId} to become sent/delivered.`);
}

test.describe("Classes Billing - Send Invoices (Resend)", () => {
  test.setTimeout(240_000);
  test.skip(({ browserName }) => browserName !== "chromium", "Run external email flow once.");

  test("sends invoices for 2 students from /billing and verifies via Resend API", async ({
    page,
    testData,
  }, testInfo) => {
    const resendApiKey = process.env.RESEND_API_KEY ?? "";
    expect(resendApiKey, "RESEND_API_KEY is required for real Resend E2E.").toBeTruthy();

    await login(page, { email: testData.user.email, password: testData.user.password });

    const activeWorkspaceId = await page.evaluate(() =>
      localStorage.getItem("corely-active-workspace")
    );
    expect(activeWorkspaceId, "Active workspace must be set after login.").toBeTruthy();
    if (!activeWorkspaceId) {
      throw new Error("No active workspace after login.");
    }

    const seed = await apiClient.post<SeedClassesBillingSendResult>(
      "/test/classes-billing/seed-send-invoices",
      {
        tenantId: testData.tenant.id,
        workspaceId: activeWorkspaceId,
        actorUserId: testData.user.id,
        label: `${Date.now()}-${testInfo.workerIndex}`,
      }
    );

    expect(seed.invoiceIds).toHaveLength(2);
    expect(seed.recipients).toHaveLength(2);

    await page.goto("/billing");
    const monthInput = page.locator('input[type="month"]');
    await monthInput.fill(seed.month);
    await monthInput.press("Tab");

    const sendInvoicesButton = page.getByRole("button", { name: /send invoices/i });
    await expect(sendInvoicesButton).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("ISSUED", { exact: true })).toHaveCount(2, { timeout: 20_000 });

    const sendResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/classes/billing/runs") &&
        response.request().method() === "POST" &&
        response.request().postData()?.includes('"sendInvoices":true') === true
    );

    await sendInvoicesButton.click();
    const sendResponse = await sendResponsePromise;
    if (!sendResponse.ok()) {
      const failBody = await sendResponse.text();
      throw new Error(
        `Send invoices request failed: ${sendResponse.status()} ${sendResponse.statusText()} ${failBody}`
      );
    }

    // Process outbox with real handlers (classes.invoice.ready_to_send -> invoice.email.requested -> Resend).
    const firstOutboxRun = await runOutboxTick();
    expect(firstOutboxRun.ok).toBeTruthy();
    const secondOutboxRun = await runOutboxTick();
    expect(secondOutboxRun.ok).toBeTruthy();

    const deliveries = await waitForDeliveries(seed.tenantId, seed.invoiceIds);
    const recipientsSet = new Set(seed.recipients);

    for (const delivery of deliveries) {
      expect(recipientsSet.has(delivery.to)).toBeTruthy();
      expect(delivery.provider).toBe("resend");
      expect(delivery.status).toBe("SENT");
      expect(delivery.providerMessageId).toBeTruthy();
    }

    for (const delivery of deliveries) {
      const providerMessageId = delivery.providerMessageId;
      if (!providerMessageId) {
        throw new Error(`Missing providerMessageId for invoice ${delivery.invoiceId}`);
      }
      const resendEmail = await waitForResendEmail(providerMessageId, resendApiKey);
      const recipients = Array.isArray(resendEmail.to)
        ? resendEmail.to
        : [String(resendEmail.to ?? "")];
      expect(recipients).toContain(delivery.to);
      expect(String(resendEmail.subject ?? "")).toMatch(/invoice/i);
    }

    await expect
      .poll(async () => page.getByText("SENT", { exact: true }).count(), {
        timeout: 60_000,
      })
      .toBe(2);
  });
});
