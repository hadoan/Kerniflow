import type { APIRequestContext, Page } from "@playwright/test";
import { expect } from "@playwright/test";
import { GetOnboardingProgressOutputSchema, OnboardingProgressSchema } from "@corely/contracts";
import type { AuthContext } from "./auth.ts";
import { HttpClient } from "./http-client.ts";

export const ONBOARDING_JOURNEY_KEY = "cash-management-v1";

export async function primeAuthenticatedSession(
  page: Page,
  session: { accessToken: string; workspaceId: string }
): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript((value) => {
    window.localStorage.clear();
    window.localStorage.setItem("accessToken", value.accessToken);
    window.localStorage.setItem("corely-active-workspace", value.workspaceId);
  }, session);
}

export async function getOnboardingProgress(
  request: APIRequestContext,
  auth: AuthContext,
  journeyKey: string = ONBOARDING_JOURNEY_KEY
) {
  const client = new HttpClient(request, auth);
  const { response, body } = await client.getJson(`/onboarding/${journeyKey}/progress`);
  expect(response.status()).toBe(200);
  return GetOnboardingProgressOutputSchema.parse(body);
}

export async function upsertOnboardingStep(
  request: APIRequestContext,
  auth: AuthContext,
  input: {
    journeyKey?: string;
    moduleKey?: string;
    stepId: string;
    status: "completed" | "skipped" | "pending" | "active";
    answers?: Record<string, unknown>;
    nextStepId?: string;
    locale?: string;
    workflowSource?: string;
  }
) {
  const client = new HttpClient(request, auth);
  const journeyKey = input.journeyKey ?? ONBOARDING_JOURNEY_KEY;
  const moduleKey = input.moduleKey ?? "cash-management";
  const { response, body } = await client.postJson(
    `/onboarding/${journeyKey}/step`,
    {
      moduleKey,
      stepId: input.stepId,
      status: input.status,
      answers: input.answers,
      nextStepId: input.nextStepId,
      locale: input.locale,
      workflowSource: input.workflowSource,
    },
    `e2e-onboarding-${input.stepId}-${Date.now()}`
  );
  expect([200, 201]).toContain(response.status());
  const record = body as { progress?: unknown };
  return OnboardingProgressSchema.parse(record.progress);
}

export async function completeOnboarding(
  request: APIRequestContext,
  auth: AuthContext,
  journeyKey: string = ONBOARDING_JOURNEY_KEY,
  moduleKey: string = "cash-management"
) {
  const client = new HttpClient(request, auth);
  const { response, body } = await client.postJson(
    `/onboarding/${journeyKey}/complete`,
    { moduleKey },
    `e2e-complete-${Date.now()}`
  );
  expect([200, 201]).toContain(response.status());
  const record = body as { progress?: unknown };
  return OnboardingProgressSchema.parse(record.progress);
}
