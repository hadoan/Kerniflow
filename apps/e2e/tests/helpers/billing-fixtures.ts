import { createHmac } from "node:crypto";
import type { APIResponse } from "@playwright/test";
import { apiClient } from "../../utils/api.ts";
import { type HttpClient } from "./http-client.ts";

export type BillingProviderFailureOperation = "checkout" | "portal" | "fetch-subscription";
export type BillingProductKey = string;
export type BillingPlanCode = string;

export type BillingSubscriptionState = {
  productKey: BillingProductKey;
  planCode: BillingPlanCode;
  entitlementSource: "paid_subscription" | "trial" | "free";
  provider: string | null;
  status: string;
  customerRef: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEndsAt: string | null;
  lastSyncedAt: string | null;
};

export type BillingEntitlementState = {
  productKey: BillingProductKey;
  planCode: BillingPlanCode;
  featureValues: Record<string, boolean | number | string | null>;
};

export type BillingUsageMetricState = {
  productKey: BillingProductKey;
  key: string;
  label: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
  percentUsed: number | null;
};

export type BillingCurrentState = {
  subscription: BillingSubscriptionState;
  entitlements: BillingEntitlementState;
  trial: {
    productKey: BillingProductKey;
    status: "not_started" | "active" | "expired" | "superseded_by_subscription";
    startedAt: string | null;
    endsAt: string | null;
    expiredAt: string | null;
    supersededAt: string | null;
    activatedByUserId: string | null;
    source: string | null;
    daysRemaining: number;
    isExpiringSoon: boolean;
  };
  upgradeContext: {
    productKey: BillingProductKey;
    effectivePlanCode: BillingPlanCode;
    entitlementSource: "paid_subscription" | "trial" | "free";
    recommendedPlanCode: BillingPlanCode | null;
    requiresUpgrade: boolean;
    isOverEntitlement: boolean;
    overEntitlementReasons: Array<{
      code: string;
      message: string;
      actual?: number | null;
      limit?: number | null;
    }>;
    trial: BillingCurrentState["trial"];
  };
  plan: {
    productKey: BillingProductKey;
    code: BillingPlanCode;
    name: string;
    priceCents: number;
    currency: string;
    interval: string;
    summary: string;
    highlights: string[];
    upgradeRank: number;
    entitlements: BillingEntitlementState;
  };
};

export type BillingUsageState = {
  usage: BillingUsageMetricState[];
};

export type BillingOverviewState = {
  productKey: BillingProductKey;
  subscription: BillingSubscriptionState;
  entitlements: BillingEntitlementState;
  trial: BillingCurrentState["trial"];
  upgradeContext: BillingCurrentState["upgradeContext"];
  usage: BillingUsageMetricState[];
  plans: BillingCurrentState["plan"][];
  management: {
    canManageBilling: boolean;
    canUpgrade: boolean;
    canStartTrial: boolean;
    recommendedPlanCode: BillingPlanCode | null;
    requiresUpgradePrompt: boolean;
  };
};

export type CreateBillingCheckoutSessionOutput = {
  checkoutUrl: string;
  sessionId: string;
};

export type CreateBillingPortalSessionOutput = {
  portalUrl: string;
};

export type StartBillingTrialState = BillingCurrentState;

export type BillingInspection = {
  accounts: Array<{
    tenantId: string;
    provider: string | null;
    providerCustomerRef: string | null;
  }>;
  subscriptions: Array<{
    productKey: string;
    planCode: string;
    status: string;
    providerSubscriptionRef: string | null;
    providerPriceRef: string | null;
    cancelAtPeriodEnd: boolean;
  }>;
  usageCounters: Array<{
    productKey: string;
    metricKey: string;
    quantity: number;
    periodStart: string;
    periodEnd: string;
  }>;
  providerEventCount: number;
  providerEventTypes: string[];
  outboxEventTypes: string[];
  auditActions: string[];
};

type FakeStripeWebhookEvent = {
  id: string;
  type: string;
  data: {
    object: Record<string, unknown>;
  };
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, unknown>;
}

function billingQuery(productKey?: BillingProductKey): Record<string, string> | undefined {
  if (!productKey) {
    return undefined;
  }

  return { productKey };
}

export async function getBillingCurrent(
  client: HttpClient,
  productKey?: BillingProductKey
): Promise<{ response: APIResponse; billing: BillingCurrentState }> {
  const options = productKey ? { query: billingQuery(productKey) } : undefined;
  const { response, body } = await client.getJson("/billing/current", options);
  return {
    response,
    billing: body as BillingCurrentState,
  };
}

export async function getBillingUsage(
  client: HttpClient,
  productKey?: BillingProductKey
): Promise<{ response: APIResponse; billing: BillingUsageState }> {
  const options = productKey ? { query: billingQuery(productKey) } : undefined;
  const { response, body } = await client.getJson("/billing/usage", options);
  return {
    response,
    billing: body as BillingUsageState,
  };
}

export async function getBillingOverview(
  client: HttpClient,
  productKey?: BillingProductKey
): Promise<{ response: APIResponse; billing: BillingOverviewState }> {
  const options = productKey ? { query: billingQuery(productKey) } : undefined;
  const { response, body } = await client.getJson("/billing/overview", options);
  const record = asRecord(body);
  return {
    response,
    billing: record.billing as BillingOverviewState,
  };
}

export async function createBillingCheckoutSession(
  client: HttpClient,
  input: {
    productKey?: BillingProductKey;
    planCode: string;
    successPath?: string;
    cancelPath?: string;
  },
  idempotency: string
): Promise<{ response: APIResponse; session: CreateBillingCheckoutSessionOutput }> {
  const { response, body } = await client.postJson("/billing/checkout-session", input, idempotency);
  return {
    response,
    session: asRecord(body) as CreateBillingCheckoutSessionOutput,
  };
}

export async function createBillingPortalSession(
  client: HttpClient,
  input: {
    productKey?: BillingProductKey;
    returnPath?: string;
  },
  idempotency: string
): Promise<{ response: APIResponse; session: CreateBillingPortalSessionOutput }> {
  const { response, body } = await client.postJson("/billing/portal-session", input, idempotency);
  return {
    response,
    session: asRecord(body) as CreateBillingPortalSessionOutput,
  };
}

export async function startBillingTrial(
  client: HttpClient,
  input: {
    productKey?: BillingProductKey;
    source?: string;
  },
  idempotency: string
): Promise<{ response: APIResponse; billing: StartBillingTrialState }> {
  const { response, body } = await client.postJson("/billing/trial/start", input, idempotency);
  return {
    response,
    billing: body as StartBillingTrialState,
  };
}

export async function setBillingTrialEndsAt(input: {
  tenantId: string;
  productKey?: BillingProductKey;
  endsAt: string;
}): Promise<void> {
  await apiClient.post("/test/billing/trial/set-ends-at", input);
}

export async function resetBillingProviderState(): Promise<void> {
  await apiClient.post("/test/billing/provider/reset");
}

export async function failNextBillingProviderOperation(
  operation: BillingProviderFailureOperation
): Promise<void> {
  await apiClient.post("/test/billing/provider/fail-next", { operation });
}

export async function inspectBillingState(input: {
  tenantId: string;
  productKey?: BillingProductKey;
}): Promise<BillingInspection> {
  return apiClient.post<BillingInspection>("/test/billing/inspect", input);
}

export function signFakeStripeWebhook(rawBody: string, secret?: string): string {
  const effectiveSecret =
    secret ?? process.env.STRIPE_WEBHOOK_SECRET ?? "test-billing-webhook-secret";
  const digest = createHmac("sha256", effectiveSecret).update(rawBody).digest("hex");
  return `t=1,v1=${digest}`;
}

export async function postFakeStripeWebhook(
  client: HttpClient,
  event: FakeStripeWebhookEvent,
  options?: {
    rawBody?: string;
    signature?: string;
  }
): Promise<{
  response: APIResponse;
  body: Record<string, unknown>;
}> {
  const rawBody = options?.rawBody ?? JSON.stringify(event);
  const signature = options?.signature ?? signFakeStripeWebhook(rawBody);

  const { response, body } = await client.postJson(
    "/billing/webhooks/stripe",
    rawBody,
    `webhook-${event.id}`,
    {
      headers: {
        "Content-Type": "application/json",
        "stripe-signature": signature,
      },
    }
  );

  return {
    response,
    body: asRecord(body),
  };
}
