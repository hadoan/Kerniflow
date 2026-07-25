import { expect } from "@playwright/test";
import {
  CreateWorkspaceOutputSchema,
  WorkspaceDtoSchema,
  type WorkspaceDto,
} from "@corely/contracts";
import { test } from "../fixtures.ts";
import { buildAuthHeaders, loginAsSeededUser } from "../helpers/auth.ts";
import {
  createBillingCheckoutSession,
  createBillingPortalSession,
  getBillingCurrent,
} from "../helpers/billing-fixtures.ts";
import {
  attachBelegToEntry,
  createCashEntry,
  createCashRegister,
  exportCashBook,
  monthKeyFromDayKey,
  uploadBase64Document,
} from "../helpers/cash-management-fixtures.ts";
import { HttpClient } from "../helpers/http-client.ts";
import { idempotencyKey } from "../helpers/idempotency.ts";
import {
  cancelStripeSubscription,
  createCashManagementStripeSubscription,
  setStripeSubscriptionCancelAtPeriodEnd,
  updateCashManagementStripeSubscription,
} from "../helpers/stripe-sandbox.ts";

const CASH_MANAGEMENT_PRODUCT_KEY = "cash-management";
const receiptBase64 = Buffer.from("real stripe sandbox receipt", "utf8").toString("base64");

function currentPeriodContext(): { dayKey: string; month: string } {
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const dayKey = `${month}-14`;
  return { dayKey, month };
}

async function waitForBillingState(
  client: HttpClient,
  matcher: (billing: Awaited<ReturnType<typeof getBillingCurrent>>["billing"]) => boolean,
  timeoutMs: number = 30_000
): Promise<Awaited<ReturnType<typeof getBillingCurrent>>["billing"]> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const current = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
    if (matcher(current.billing)) {
      return current.billing;
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }

  const finalState = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
  throw new Error(
    `Timed out waiting for Stripe-backed billing sync. Final state: ${JSON.stringify(finalState.billing)}`
  );
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

test.describe("Billing / subscriptions - real Stripe sandbox", () => {
  test("creates a real Stripe-backed Starter subscription and enforces Starter entitlements", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const trackedSubscriptions: string[] = [];
    const { dayKey } = currentPeriodContext();

    try {
      const freeState = await getBillingCurrent(client, CASH_MANAGEMENT_PRODUCT_KEY);
      expect(freeState.response.status()).toBe(200);
      expect(freeState.billing.subscription.planCode).toBe("free");
      expect(freeState.billing.subscription.status).toBe("free");

      const checkout = await createBillingCheckoutSession(
        client,
        {
          productKey: CASH_MANAGEMENT_PRODUCT_KEY,
          planCode: "starter-monthly",
        },
        idempotencyKey(testInfo, "real-stripe-checkout")
      );
      expect(checkout.response.status()).toBe(201);
      expect(checkout.session.checkoutUrl).toContain("checkout.stripe.com");

      const postCheckoutState = await waitForBillingState(
        client,
        (billing) => typeof billing.subscription.customerRef === "string"
      );
      expect(postCheckoutState.subscription.customerRef).toBeTruthy();

      const starterSubscription = await createCashManagementStripeSubscription({
        customerRef: postCheckoutState.subscription.customerRef as string,
        tenantId: testData.tenant.id,
        planCode: "starter-monthly",
      });
      trackedSubscriptions.push(starterSubscription.id);

      const activeStarterState = await waitForBillingState(
        client,
        (billing) =>
          billing.subscription.planCode === "starter-monthly" &&
          (billing.subscription.status === "active" || billing.subscription.status === "trialing")
      );
      expect(activeStarterState.subscription.provider).toBe("stripe");

      const portal = await createBillingPortalSession(
        client,
        {
          productKey: CASH_MANAGEMENT_PRODUCT_KEY,
        },
        idempotencyKey(testInfo, "real-stripe-portal")
      );
      expect(portal.response.status()).toBe(201);
      expect(portal.session.portalUrl).toContain("billing.stripe.com");

      const register = await createCashRegister(
        client,
        {
          name: `Starter Register ${Date.now()}`,
        },
        idempotencyKey(testInfo, "starter-register")
      );
      expect(register.response.status()).toBe(201);

      const expense = await createCashEntry(
        client,
        register.register.id,
        {
          direction: "OUT",
          description: "Acetone refill",
          amountCents: 1800,
          currency: "EUR",
          dayKey,
          paymentMethod: "cash",
        },
        idempotencyKey(testInfo, "starter-expense")
      );
      expect(expense.response.status()).toBe(201);

      const upload = await uploadBase64Document(
        client,
        {
          filename: "receipt.txt",
          contentType: "text/plain",
          base64: receiptBase64,
          category: "receipt",
        },
        idempotencyKey(testInfo, "starter-upload")
      );
      expect(upload.response.status()).toBe(201);

      const attachment = await attachBelegToEntry(
        client,
        expense.entry.id,
        upload.upload.document.id,
        idempotencyKey(testInfo, "starter-attach")
      );
      expect(attachment.response.status()).toBe(201);

      const exported = await exportCashBook(
        client,
        {
          registerId: register.register.id,
          month: monthKeyFromDayKey(dayKey),
          format: "CSV",
        },
        idempotencyKey(testInfo, "starter-export")
      );
      expect(exported.response.status()).toBe(201);
    } finally {
      for (const subscriptionRef of trackedSubscriptions) {
        await cancelStripeSubscription(subscriptionRef).catch(() => undefined);
      }
    }
  });

  test("upgrades from Pro to Multi-location through real Stripe subscription updates", async ({
    request,
    testData,
  }, testInfo) => {
    const auth = await loginAsSeededUser(request, testData);
    const client = new HttpClient(request, auth);
    const trackedSubscriptions: string[] = [];

    try {
      await createBillingCheckoutSession(
        client,
        {
          productKey: CASH_MANAGEMENT_PRODUCT_KEY,
          planCode: "pro-monthly",
        },
        idempotencyKey(testInfo, "pro-checkout")
      );

      const checkoutState = await waitForBillingState(
        client,
        (billing) => typeof billing.subscription.customerRef === "string"
      );

      const subscription = await createCashManagementStripeSubscription({
        customerRef: checkoutState.subscription.customerRef as string,
        tenantId: testData.tenant.id,
        planCode: "pro-monthly",
      });
      trackedSubscriptions.push(subscription.id);

      const proState = await waitForBillingState(
        client,
        (billing) =>
          billing.subscription.planCode === "pro-monthly" &&
          (billing.subscription.status === "active" || billing.subscription.status === "trialing")
      );
      expect(proState.subscription.customerRef).toBeTruthy();

      await updateCashManagementStripeSubscription({
        subscriptionRef: subscription.id,
        tenantId: testData.tenant.id,
        planCode: "multi-location-monthly",
      });

      const multiState = await waitForBillingState(
        client,
        (billing) =>
          billing.subscription.planCode === "multi-location-monthly" &&
          (billing.subscription.status === "active" || billing.subscription.status === "trialing")
      );
      expect(multiState.subscription.planCode).toBe("multi-location-monthly");

      const firstRegister = await createCashRegister(
        client,
        {
          name: `Multi Register 1 ${Date.now()}`,
        },
        idempotencyKey(testInfo, "multi-register-1")
      );
      expect(firstRegister.response.status()).toBe(201);

      const secondWorkspace = await createWorkspace(
        client,
        `Multi Workspace ${Date.now()}`,
        idempotencyKey(testInfo, "multi-workspace-2")
      );

      const secondRegister = await request.post(
        `${process.env.API_URL ?? "http://localhost:3000"}/cash-registers`,
        {
          headers: {
            ...buildAuthHeaders(auth, { workspaceId: secondWorkspace.id }),
            "Content-Type": "application/json",
            "x-idempotency-key": idempotencyKey(testInfo, "multi-workspace-2-register"),
          },
          data: {
            name: `Multi Register 2 ${Date.now()}`,
          },
        }
      );
      expect(secondRegister.status()).toBe(201);

      await setStripeSubscriptionCancelAtPeriodEnd({
        subscriptionRef: subscription.id,
        tenantId: testData.tenant.id,
        planCode: "multi-location-monthly",
        cancelAtPeriodEnd: true,
      });

      const cancelingState = await waitForBillingState(
        client,
        (billing) =>
          billing.subscription.planCode === "multi-location-monthly" &&
          billing.subscription.cancelAtPeriodEnd === true
      );
      expect(cancelingState.subscription.cancelAtPeriodEnd).toBe(true);
    } finally {
      for (const subscriptionRef of trackedSubscriptions) {
        await cancelStripeSubscription(subscriptionRef).catch(() => undefined);
      }
    }
  });
});
