import {
  CreateWorkspaceOutputSchema,
  WorkspaceDtoSchema,
  isProblemDetails,
  type ProblemDetails,
  type WorkspaceDto,
} from "@corely/contracts";
import { PrismaClient } from "@prisma/client";
import { expect } from "@playwright/test";
import { test } from "../fixtures.ts";
import { buildAuthHeaders, loginAsSeededUser } from "../helpers/auth.ts";
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  failNextBillingProviderOperation,
  getBillingCurrent,
  getBillingOverview,
  getBillingUsage,
  inspectBillingState,
  setBillingTrialEndsAt,
  postFakeStripeWebhook,
  resetBillingProviderState,
  signFakeStripeWebhook,
  startBillingTrial,
  type BillingPlanCode,
  type BillingUsageMetricState,
} from "../helpers/billing-fixtures.ts";
import {
  attachBelegToEntry,
  createCashEntry,
  createCashRegister,
  exportCashBook,
  submitCashDayClose,
  uploadBase64Document,
} from "../helpers/cash-management-fixtures.ts";
import { resetTenantDataForE2e, seedIsolatedTestData } from "../helpers/db-reset.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";

const prisma = process.env.DATABASE_URL ? new PrismaClient() : null;
const receiptBase64 = Buffer.from("billing e2e receipt", "utf8").toString("base64");
const CASH_MANAGEMENT_PRODUCT_KEY = "cash-management";
const CASH_BILLING_FEATURE_KEYS = {
  canExport: "cash-management.canExport",
  aiAssistant: "cash-management.aiAssistant",
  teamAccess: "cash-management.teamAccess",
  consolidatedOverview: "cash-management.consolidatedOverview",
} as const;
const CASH_BILLING_METRIC_KEYS = {
  entries: "cash.entries",
  receipts: "cash.receipts",
} as const;

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function currentPeriodContext(): {
  dayKey: string;
  nextDayKey: string;
  month: string;
  periodStartIso: string;
  periodEndIso: string;
} {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const dayKey = `${month}-14`;
  const nextDayKey = `${month}-15`;
  const periodStartIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)
  ).toISOString();
  const periodEndIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)
  ).toISOString();

  return { dayKey, nextDayKey, month, periodStartIso, periodEndIso };
}

function buildBillingEvent(input: {
  eventId: string;
  eventType:
    | "checkout.session.completed"
    | "customer.subscription.created"
    | "customer.subscription.updated"
    | "customer.subscription.deleted"
    | "invoice.payment_failed";
  tenantId: string;
  planCode: BillingPlanCode;
  status: "active" | "past_due" | "canceled";
  customerRef?: string;
  subscriptionRef?: string;
  priceRef?: string;
  cancelAtPeriodEnd?: boolean;
  canceledAt?: string | null;
}): {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
} {
  const { periodStartIso, periodEndIso } = currentPeriodContext();
  const customerRef = input.customerRef ?? `cus_e2e_${input.tenantId.slice(0, 8)}`;
  const subscriptionRef = input.subscriptionRef ?? `sub_e2e_${input.tenantId.slice(0, 8)}`;

  return {
    id: input.eventId,
    type: input.eventType,
    data: {
      object: {
        object:
          input.eventType === "checkout.session.completed"
            ? "checkout.session"
            : input.eventType === "invoice.payment_failed"
              ? "invoice"
              : "subscription",
        id:
          input.eventType === "checkout.session.completed"
            ? `cs_e2e_${input.eventId}`
            : subscriptionRef,
        customer: customerRef,
        subscription: subscriptionRef,
        tenantId: input.tenantId,
        productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        metadata: {
          tenantId: input.tenantId,
          productKey: CASH_MANAGEMENT_PRODUCT_KEY,
          planCode: input.planCode,
        },
        subscriptionSnapshot: {
          productKey: CASH_MANAGEMENT_PRODUCT_KEY,
          planCode: input.planCode,
          customerRef,
          subscriptionRef,
          priceRef: input.priceRef ?? `price_${input.planCode}`,
          status: input.status,
          currentPeriodStart: periodStartIso,
          currentPeriodEnd: periodEndIso,
          cancelAtPeriodEnd: input.cancelAtPeriodEnd ?? false,
          canceledAt: input.canceledAt ?? null,
          trialEndsAt: null,
        },
      },
    },
  };
}

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
  expect(typeof problem.traceId).toBe("string");
  return problem;
}

async function createWorkspace(
  client: HttpClient,
  name: string,
  idempotency: string
): Promise<WorkspaceDto> {
  const { response, body } = await client.postJson(
    "/workspaces",
    {
      name,
      kind: "COMPANY",
      currency: "EUR",
      countryCode: "DE",
    },
    idempotency
  );

  expect(response.status()).toBe(201);
  const parsed = CreateWorkspaceOutputSchema.parse(body);
  return WorkspaceDtoSchema.parse(parsed.workspace);
}

async function createCopilotRun(
  request: Parameters<typeof loginAsSeededUser>[0],
  auth: Awaited<ReturnType<typeof loginAsSeededUser>>,
  idempotency: string
) {
  return request.post(`${process.env.API_URL ?? "http://localhost:3000"}/copilot/runs`, {
    headers: {
      ...buildAuthHeaders(auth),
      "Content-Type": "application/json",
      "x-idempotency-key": idempotency,
    },
    data: {
      requestData: {
        activeModule: CASH_MANAGEMENT_PRODUCT_KEY,
      },
    },
  });
}

function usageMetricByKey(
  usage: BillingUsageMetricState[],
  key: string
): BillingUsageMetricState | undefined {
  return usage.find((metric) => metric.key === key);
}

test.describe("Billing / subscriptions - cash management", () => {
  test.beforeEach(async () => {
    await resetBillingProviderState();
  });

  test.afterAll(async () => {
    if (prisma) {
      await prisma.$disconnect();
    }
  });

  test("reads free billing state and usage defaults through real endpoints", async ({
    request,
    testData,
  }) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const current = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(current.response.status()).toBe(200);
    expect(current.billing.subscription.productKey).toBe(CASH_MANAGEMENT_PRODUCT_KEY);
    expect(current.billing.subscription.planCode).toBe("free");
    expect(current.billing.subscription.status).toBe("free");
    expect(current.billing.subscription.provider).toBeNull();
    expect(current.billing.subscription.customerRef).toBeNull();
    expect(current.billing.entitlements.featureValues[CASH_BILLING_FEATURE_KEYS.canExport]).toBe(
      false
    );
    expect(current.billing.entitlements.featureValues[CASH_BILLING_FEATURE_KEYS.aiAssistant]).toBe(
      false
    );

    const usage = await getBillingUsage(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(usage.response.status()).toBe(200);
    expect(usageMetricByKey(usage.billing.usage, CASH_BILLING_METRIC_KEYS.entries)?.used).toBe(0);
    expect(usageMetricByKey(usage.billing.usage, CASH_BILLING_METRIC_KEYS.entries)?.limit).toBe(30);
    expect(usageMetricByKey(usage.billing.usage, CASH_BILLING_METRIC_KEYS.receipts)?.used).toBe(0);
    expect(usageMetricByKey(usage.billing.usage, CASH_BILLING_METRIC_KEYS.receipts)?.limit).toBe(
      10
    );

    const overview = await getBillingOverview(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(overview.response.status()).toBe(200);
    expect(overview.billing.management.canManageBilling).toBe(false);
    expect(overview.billing.management.canUpgrade).toBe(true);
  });

  test("creates checkout and portal sessions, rejects invalid access, and isolates tenants", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const portalUnavailable = await createBillingPortalSession(
      client,
      { productKey: CASH_MANAGEMENT_PRODUCT_KEY, returnPath: "/cash/billing" },
      idempotencyKey(testInfo, "portal-without-customer")
    );
    await expectProblem(portalUnavailable.response, 400, "Billing:PortalUnavailable");

    const invalidCheckout = await createBillingCheckoutSession(
      client,
      {
        productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        planCode: "unknown-monthly",
      },
      idempotencyKey(testInfo, "checkout-invalid-plan")
    );
    await expectProblem(invalidCheckout.response, 400, "Billing:UnknownPlan");

    const unauthorized = await request.post(
      `${process.env.API_URL ?? "http://localhost:3000"}/billing/checkout-session`,
      {
        headers: { "Content-Type": "application/json" },
        data: {
          productKey: CASH_MANAGEMENT_PRODUCT_KEY,
          planCode: "starter-monthly",
        },
      }
    );
    expect(unauthorized.status()).toBe(401);

    await failNextBillingProviderOperation("checkout");
    const failedCheckout = await createBillingCheckoutSession(
      client,
      {
        productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        planCode: "starter-monthly",
      },
      idempotencyKey(testInfo, "checkout-provider-fails")
    );
    expect(failedCheckout.response.status()).toBe(500);

    const checkout = await createBillingCheckoutSession(
      client,
      {
        productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        planCode: "starter-monthly",
        successPath: "/billing/success",
        cancelPath: "/billing/cancel",
      },
      idempotencyKey(testInfo, "checkout-success")
    );
    expect(checkout.response.status()).toBe(201);
    expect(checkout.session.checkoutUrl).toContain("starter-monthly");

    const inspectedAfterCheckout = await inspectBillingState({
      tenantId: testData.tenant.id,
      productKey: CASH_MANAGEMENT_PRODUCT_KEY,
    });
    expect(inspectedAfterCheckout.accounts).toHaveLength(1);
    expect(inspectedAfterCheckout.accounts[0]?.providerCustomerRef).toMatch(/^cus_fake_/);
    expect(inspectedAfterCheckout.auditActions).toContain("billing.checkout.created");

    await failNextBillingProviderOperation("portal");
    const failedPortal = await createBillingPortalSession(
      client,
      { productKey: CASH_MANAGEMENT_PRODUCT_KEY, returnPath: "/billing" },
      idempotencyKey(testInfo, "portal-provider-fails")
    );
    expect(failedPortal.response.status()).toBe(500);

    const portal = await createBillingPortalSession(
      client,
      { productKey: CASH_MANAGEMENT_PRODUCT_KEY, returnPath: "/billing" },
      idempotencyKey(testInfo, "portal-success")
    );
    expect(portal.response.status()).toBe(201);
    expect(portal.session.portalUrl).toContain("billing.fake.corely.test/portal");
    expect(portal.session.portalUrl).toContain("cus_fake_");

    const otherTenant = await seedIsolatedTestData();
    try {
      const otherAuth = await loginAsSeededUser(request, otherTenant);
      const otherClient = new HttpClient(request, otherAuth);
      const otherCurrent = await getBillingCurrent(otherClient, CASH_MANAGEMENT_PRODUCT_KEY);
      expect(otherCurrent.response.status()).toBe(200);
      expect(otherCurrent.billing.subscription.planCode).toBe("free");
      expect(otherCurrent.billing.subscription.customerRef).toBeNull();
    } finally {
      await resetTenantDataForE2e(otherTenant.tenant.id);
    }
  });

  test("processes Stripe webhook lifecycle idempotently and fails safely on bad deliveries", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);

    const createdEvent = buildBillingEvent({
      eventId: `evt-created-${testInfo.retry}`,
      eventType: "checkout.session.completed",
      tenantId: testData.tenant.id,
      planCode: "starter-monthly",
      status: "active",
    });

    const created = await postFakeStripeWebhook(client, createdEvent);
    expect(created.response.status()).toBe(200);

    const currentAfterCreate = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(currentAfterCreate.billing.subscription.planCode).toBe("starter-monthly");
    expect(currentAfterCreate.billing.subscription.status).toBe("active");
    expect(currentAfterCreate.billing.subscription.customerRef).toMatch(/^cus_e2e_/);

    const duplicate = await postFakeStripeWebhook(client, createdEvent);
    expect(duplicate.response.status()).toBe(200);

    const updatedEvent = buildBillingEvent({
      eventId: `evt-updated-${testInfo.retry}`,
      eventType: "customer.subscription.updated",
      tenantId: testData.tenant.id,
      planCode: "pro-monthly",
      status: "active",
      cancelAtPeriodEnd: true,
      customerRef: currentAfterCreate.billing.subscription.customerRef ?? undefined,
    });
    const updated = await postFakeStripeWebhook(client, updatedEvent);
    expect(updated.response.status()).toBe(200);

    const currentAfterUpdate = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(currentAfterUpdate.billing.subscription.planCode).toBe("pro-monthly");
    expect(currentAfterUpdate.billing.subscription.cancelAtPeriodEnd).toBe(true);

    const paymentFailedEvent = buildBillingEvent({
      eventId: `evt-payment-failed-${testInfo.retry}`,
      eventType: "invoice.payment_failed",
      tenantId: testData.tenant.id,
      planCode: "pro-monthly",
      status: "past_due",
      customerRef: currentAfterUpdate.billing.subscription.customerRef ?? undefined,
    });
    const paymentFailed = await postFakeStripeWebhook(client, paymentFailedEvent);
    expect(paymentFailed.response.status()).toBe(200);

    const currentAfterFailure = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(currentAfterFailure.billing.subscription.status).toBe("past_due");

    const deletedEvent = buildBillingEvent({
      eventId: `evt-deleted-${testInfo.retry}`,
      eventType: "customer.subscription.deleted",
      tenantId: testData.tenant.id,
      planCode: "pro-monthly",
      status: "canceled",
      cancelAtPeriodEnd: false,
      canceledAt: new Date().toISOString(),
      customerRef: currentAfterFailure.billing.subscription.customerRef ?? undefined,
    });
    const deleted = await postFakeStripeWebhook(client, deletedEvent);
    expect(deleted.response.status()).toBe(200);

    const currentAfterDelete = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(currentAfterDelete.billing.subscription.status).toBe("canceled");

    const inspected = await inspectBillingState({
      tenantId: testData.tenant.id,
      productKey: CASH_MANAGEMENT_PRODUCT_KEY,
    });
    expect(inspected.providerEventCount).toBe(4);
    expect(inspected.providerEventTypes).toEqual([
      "checkout.session.completed",
      "customer.subscription.updated",
      "invoice.payment_failed",
      "customer.subscription.deleted",
    ]);
    expect(inspected.outboxEventTypes).toContain("billing.subscription.updated");

    const invalidSignature = await postFakeStripeWebhook(client, createdEvent, {
      signature: "t=1,v1=invalid",
    });
    await expectProblem(invalidSignature.response, 401, "Common:Http401");

    const malformedBody = "not-json";
    const malformed = await postFakeStripeWebhook(client, createdEvent, {
      rawBody: malformedBody,
      signature: signFakeStripeWebhook(malformedBody),
    });
    await expectProblem(malformed.response, 500, "Common:UnexpectedError");

    await failNextBillingProviderOperation("fetch-subscription");
    const failingEventId = `evt-fetch-failure-${testInfo.retry}`;
    const failingEvent = buildBillingEvent({
      eventId: failingEventId,
      eventType: "customer.subscription.updated",
      tenantId: testData.tenant.id,
      planCode: "starter-monthly",
      status: "active",
      customerRef: currentAfterDelete.billing.subscription.customerRef ?? undefined,
    });
    const failedWebhook = await postFakeStripeWebhook(client, failingEvent);
    await expectProblem(failedWebhook.response, 500, "Common:UnexpectedError");

    const currentAfterFailedSync = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(currentAfterFailedSync.billing.subscription.status).toBe("canceled");

    if (prisma) {
      const failedEventRow = await prisma.billingProviderEvent.findFirst({
        where: {
          tenantId: testData.tenant.id,
          externalEventId: failingEventId,
        },
      });
      expect(failedEventRow?.status).toBe("FAILED");
      expect(failedEventRow?.errorMessage).toContain("Fake Stripe fetch subscription failed");
    }
  });

  test("enforces free plan quotas, feature locks, and usage counters in cash-management", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const { dayKey, month } = currentPeriodContext();

    const register = await createCashRegister(
      client,
      {
        name: "Free Plan Register",
        location: "Berlin Mitte",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "free-register")
    );
    expect(register.response.status()).toBe(201);

    const expenseEntryIds: string[] = [];
    for (let index = 0; index < 30; index += 1) {
      const isExpense = index < 11;
      const created = await createCashEntry(
        client,
        register.register.id,
        {
          type: isExpense ? "EXPENSE_CASH" : "SALE_CASH",
          direction: isExpense ? "OUT" : "IN",
          source: "MANUAL",
          paymentMethod: "CASH",
          description: `Entry ${index + 1}`,
          amount: isExpense ? 500 : 1000,
          occurredAt: `${dayKey}T${String(8 + (index % 10)).padStart(2, "0")}:00:00.000Z`,
        },
        idempotencyKey(testInfo, `free-entry-${index + 1}`)
      );
      expect(created.response.status()).toBe(201);
      if (isExpense) {
        expenseEntryIds.push(created.entry.id);
      }
    }

    const blockedEntryAttempt = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/entries`,
      {
        registerId: register.register.id,
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Blocked entry 31",
        amount: 1000,
        occurredAt: `${dayKey}T19:00:00.000Z`,
      },
      idempotencyKey(testInfo, "free-entry-31")
    );
    await expectProblem(blockedEntryAttempt.response, 403, "CashManagement:EntryLimitReached");

    for (let index = 0; index < 10; index += 1) {
      const entryId = expenseEntryIds[index];
      expect(entryId).toBeDefined();
      const uploaded = await uploadBase64Document(
        client,
        {
          filename: `receipt-${index + 1}.txt`,
          contentType: "text/plain",
          base64: receiptBase64,
          category: "receipt",
          purpose: "cash-entry",
        },
        idempotencyKey(testInfo, `free-upload-${index + 1}`)
      );
      expect(uploaded.response.status()).toBe(201);

      const attached = await attachBelegToEntry(
        client,
        entryId ?? "",
        uploaded.upload.document.id,
        idempotencyKey(testInfo, `free-attach-${index + 1}`)
      );
      expect(attached.response.status()).toBe(201);
    }

    const blockedUpload = await uploadBase64Document(
      client,
      {
        filename: "receipt-11.txt",
        contentType: "text/plain",
        base64: receiptBase64,
        category: "receipt",
        purpose: "cash-entry",
      },
      idempotencyKey(testInfo, "free-upload-11")
    );
    expect(blockedUpload.response.status()).toBe(201);

    const blockedEntryId = expenseEntryIds[10];
    expect(blockedEntryId).toBeDefined();

    const blockedReceipt = await client.postJson(
      `/cash-entries/${encodeURIComponent(blockedEntryId ?? "")}/attachments`,
      {
        entryId: blockedEntryId ?? "",
        documentId: blockedUpload.upload.document.id,
      },
      idempotencyKey(testInfo, "free-attach-11")
    );
    await expectProblem(blockedReceipt.response, 403, "CashManagement:ReceiptLimitReached");

    const usage = await getBillingUsage(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(usageMetricByKey(usage.billing.usage, CASH_BILLING_METRIC_KEYS.entries)?.used).toBe(30);
    expect(usageMetricByKey(usage.billing.usage, CASH_BILLING_METRIC_KEYS.receipts)?.used).toBe(10);

    const blockedExport = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/exports`,
      {
        registerId: register.register.id,
        month,
        format: "CSV",
      },
      idempotencyKey(testInfo, "free-export")
    );
    await expectProblem(blockedExport.response, 403, "CashManagement:ExportUnavailable");

    const blockedClose = await client.postJson(
      `/cash-registers/${encodeURIComponent(register.register.id)}/day-closes/${encodeURIComponent(dayKey)}/submit`,
      {
        registerId: register.register.id,
        dayKey,
        countedBalance: 25000,
        denominationCounts: [],
      },
      idempotencyKey(testInfo, "free-close")
    );
    await expectProblem(blockedClose.response, 403, "CashManagement:DailyClosingUnavailable");

    const secondWorkspace = await createWorkspace(
      client,
      "Second Salon Workspace",
      idempotencyKey(testInfo, "free-second-workspace")
    );
    const secondWorkspaceClient = new HttpClient(request, {
      ...auth,
      workspaceId: secondWorkspace.id,
    });
    const blockedLocation = await secondWorkspaceClient.postJson(
      "/cash-registers",
      {
        name: "Second Location Register",
        location: "Hamburg Altona",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "free-second-location")
    );
    await expectProblem(blockedLocation.response, 403, "CashManagement:LocationLimitReached");
  });

  test("unlocks Starter, Pro, and Multi-location cash-management capabilities through billing", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const { dayKey, month } = currentPeriodContext();

    const register = await createCashRegister(
      client,
      {
        name: "Paid Plan Register",
        location: "Berlin Friedrichshain",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "paid-register")
    );
    expect(register.response.status()).toBe(201);

    const starterEvent = buildBillingEvent({
      eventId: `evt-starter-${testInfo.retry}`,
      eventType: "customer.subscription.created",
      tenantId: testData.tenant.id,
      planCode: "starter-monthly",
      status: "active",
    });
    expect((await postFakeStripeWebhook(client, starterEvent)).response.status()).toBe(200);

    const entry = await createCashEntry(
      client,
      register.register.id,
      {
        type: "SALE_CASH",
        direction: "IN",
        source: "MANUAL",
        paymentMethod: "CASH",
        description: "Starter cash sale",
        amount: 15000,
        occurredAt: `${dayKey}T10:00:00.000Z`,
      },
      idempotencyKey(testInfo, "starter-entry")
    );
    expect(entry.response.status()).toBe(201);

    const close = await submitCashDayClose(
      client,
      register.register.id,
      dayKey,
      {
        countedBalance: 15000,
        note: "Starter close",
      },
      idempotencyKey(testInfo, "starter-close")
    );
    expect(close.response.status()).toBe(201);

    const starterExport = await exportCashBook(
      client,
      {
        registerId: register.register.id,
        month,
        format: "CSV",
      },
      idempotencyKey(testInfo, "starter-export")
    );
    expect(starterExport.response.status()).toBe(201);

    const blockedStarterAi = await createCopilotRun(
      request,
      auth,
      idempotencyKey(testInfo, "starter-copilot")
    );
    await expectProblem(blockedStarterAi, 403, "Billing:AssistantUnavailable");

    const proEvent = buildBillingEvent({
      eventId: `evt-pro-${testInfo.retry}`,
      eventType: "customer.subscription.updated",
      tenantId: testData.tenant.id,
      planCode: "pro-monthly",
      status: "active",
    });
    expect((await postFakeStripeWebhook(client, proEvent)).response.status()).toBe(200);

    const proAi = await createCopilotRun(request, auth, idempotencyKey(testInfo, "pro-copilot"));
    expect(proAi.status()).toBe(201);
    const proAiBody = asRecord(await proAi.json());
    expect(typeof proAiBody.runId).toBe("string");

    const secondWorkspace = await createWorkspace(
      client,
      "Second Paid Workspace",
      idempotencyKey(testInfo, "paid-second-workspace")
    );
    const secondWorkspaceClient = new HttpClient(request, {
      ...auth,
      workspaceId: secondWorkspace.id,
    });
    const blockedSecondLocation = await secondWorkspaceClient.postJson(
      "/cash-registers",
      {
        name: "Second Location Blocked",
        location: "Hamburg",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "pro-second-location")
    );
    await expectProblem(blockedSecondLocation.response, 403, "CashManagement:LocationLimitReached");

    const multiEvent = buildBillingEvent({
      eventId: `evt-multi-${testInfo.retry}`,
      eventType: "customer.subscription.updated",
      tenantId: testData.tenant.id,
      planCode: "multi-location-monthly",
      status: "active",
    });
    expect((await postFakeStripeWebhook(client, multiEvent)).response.status()).toBe(200);

    const allowedSecondLocation = await createCashRegister(
      secondWorkspaceClient,
      {
        name: "Second Location Allowed",
        location: "Hamburg",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "multi-second-location")
    );
    expect(allowedSecondLocation.response.status()).toBe(201);

    const overview = await getBillingOverview(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(overview.billing.entitlements.featureValues[CASH_BILLING_FEATURE_KEYS.teamAccess]).toBe(
      true
    );
    expect(
      overview.billing.entitlements.featureValues[CASH_BILLING_FEATURE_KEYS.consolidatedOverview]
    ).toBe(true);
  });

  test("runs the cash-management full-access trial lifecycle and falls back to Free", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const freeState = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(freeState.billing.subscription.planCode).toBe("free");

    const trialStart = await startBillingTrial(
      client,
      {
        productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        source: "e2e",
      },
      idempotencyKey(testInfo, "trial-start")
    );
    expect(trialStart.response.status()).toBe(201);
    expect(trialStart.billing.subscription.entitlementSource).toBe("trial");
    expect(trialStart.billing.subscription.planCode).toBe("multi-location-monthly");
    expect(trialStart.billing.trial.status).toBe("active");

    const secondWorkspace = await createWorkspace(
      client,
      "Trial Workspace 2",
      idempotencyKey(testInfo, "trial-workspace-2")
    );
    const secondWorkspaceClient = new HttpClient(request, {
      ...auth,
      workspaceId: secondWorkspace.id,
    });
    const secondRegister = await createCashRegister(
      secondWorkspaceClient,
      {
        name: "Trial Register",
        location: "Hamburg",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "trial-register-2")
    );
    expect(secondRegister.response.status()).toBe(201);

    const repeatStart = await startBillingTrial(
      client,
      {
        productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        source: "e2e-repeat",
      },
      idempotencyKey(testInfo, "trial-repeat")
    );
    expect(repeatStart.response.status()).toBe(201);
    expect(repeatStart.billing.trial.status).toBe("active");

    const inspectedActive = await inspectBillingState({
      tenantId: testData.tenant.id,
      productKey: CASH_MANAGEMENT_PRODUCT_KEY,
    });
    expect(inspectedActive.outboxEventTypes).toContain("billing.trial.started");
    expect(inspectedActive.auditActions).toContain("billing.trial.started");

    await setBillingTrialEndsAt({
      tenantId: testData.tenant.id,
      productKey: CASH_MANAGEMENT_PRODUCT_KEY,
      endsAt: "2026-01-01T00:00:00.000Z",
    });

    const downgraded = await getBillingOverview(client, CASH_MANAGEMENT_PRODUCT_KEY);
    expect(downgraded.response.status()).toBe(200);
    expect(downgraded.billing.subscription.planCode).toBe("free");
    expect(downgraded.billing.subscription.entitlementSource).toBe("free");
    expect(downgraded.billing.trial.status).toBe("expired");
    expect(downgraded.billing.upgradeContext.isOverEntitlement).toBe(true);
    expect(downgraded.billing.upgradeContext.overEntitlementReasons[0]?.code).toBe(
      "cash-management.maxLocations"
    );
    expect(downgraded.billing.subscription.currentPeriodStart).not.toBeNull();
    expect(downgraded.billing.subscription.currentPeriodEnd).not.toBeNull();

    const thirdWorkspace = await createWorkspace(
      client,
      "Trial Workspace 3",
      idempotencyKey(testInfo, "trial-workspace-3")
    );
    const thirdWorkspaceClient = new HttpClient(request, {
      ...auth,
      workspaceId: thirdWorkspace.id,
    });
    const blockedThirdRegister = await thirdWorkspaceClient.postJson(
      "/cash-registers",
      {
        name: "Blocked Third Location",
        location: "Berlin",
        currency: "EUR",
      },
      idempotencyKey(testInfo, "trial-register-3")
    );
    await expectProblem(blockedThirdRegister.response, 403, "CashManagement:LocationLimitReached");
  });
});
