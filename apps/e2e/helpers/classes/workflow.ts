import { randomUUID } from "node:crypto";
import { expect, type APIResponse, type Page } from "@playwright/test";
import type { TestData } from "../../utils/testData.ts";
import { selectors } from "../../utils/selectors.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ProgramTemplateInput = {
  index: number;
  title: string;
  type: "LECTURE" | "LAB" | "OFFICE_HOURS" | "REVIEW" | "DEMO_DAY";
  defaultDurationMin: number;
};

type MilestoneTemplateInput = {
  index: number;
  title: string;
  type: "PROJECT" | "ASSESSMENT" | "CHECKPOINT";
  required: boolean;
};

type BillingPlanInput =
  | {
      type: "UPFRONT";
      amountCents: number;
      currency: string;
      dueDate?: string;
    }
  | {
      type: "INSTALLMENTS";
      currency: string;
      installments: Array<{
        dueDate: string;
        amountCents: number;
        label?: string;
      }>;
    }
  | {
      type: "INVOICE_NET";
      amountCents: number;
      currency: string;
      netDays: number;
    };

export type AuthContext = {
  accessToken: string;
  workspaceId: string;
  tenantId: string;
  userId: string;
};

export function createUniqueName(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function parseResponseBody(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export async function login(page: Page, testData: TestData): Promise<void> {
  await page.goto(`/auth/login?tenant=${encodeURIComponent(testData.tenant.id)}`);
  await page.fill(selectors.auth.loginEmailInput, testData.user.email);
  await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

export async function getAuthContext(page: Page, testData: TestData): Promise<AuthContext> {
  const auth = await page.evaluate(() => {
    const accessToken = localStorage.getItem("accessToken") ?? "";
    const workspaceId = localStorage.getItem("corely-active-workspace") ?? "";
    return { accessToken, workspaceId };
  });

  expect(auth.accessToken).toBeTruthy();
  expect(auth.workspaceId).toBeTruthy();

  return {
    accessToken: auth.accessToken,
    workspaceId: auth.workspaceId,
    tenantId: testData.tenant.id,
    userId: testData.user.id,
  };
}

export async function loginAndGetAuthContext(page: Page, testData: TestData): Promise<AuthContext> {
  await login(page, testData);
  return getAuthContext(page, testData);
}

export async function openClassesModule(
  page: Page,
  section:
    | "programs"
    | "cohorts"
    | "teacher-dashboard"
    | "program-detail"
    | "cohort-detail" = "programs"
): Promise<void> {
  if (section === "programs" || section === "program-detail") {
    await page.locator(selectors.navigation.classesProgramsNavLink).click();
    await expect(page.locator(selectors.classes.programsList)).toBeVisible({ timeout: 20_000 });
    if (section === "program-detail") {
      await page.locator(selectors.classes.programsNewButton).click();
      await expect(page.locator(selectors.classes.programDetail)).toBeVisible({ timeout: 20_000 });
    }
    return;
  }

  if (section === "teacher-dashboard") {
    await page.locator(selectors.navigation.teacherDashboardNavLink).click();
    await expect(page.locator(selectors.classes.teacherDashboard)).toBeVisible({ timeout: 20_000 });
    return;
  }

  await page.locator(selectors.navigation.classesGroupsNavLink).click();
  await expect(page.locator(selectors.classes.cohortsList)).toBeVisible({ timeout: 20_000 });
}

export async function requestAsAuth<T>(
  page: Page,
  auth: AuthContext,
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: {
    idempotencyKey?: string;
  }
): Promise<T> {
  const response = await page.request.fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Workspace-Id": auth.workspaceId,
      "Idempotency-Key": options?.idempotencyKey ?? randomUUID(),
    },
    data: body,
  });

  if (!response.ok()) {
    const errorBody = await parseResponseBody(response);
    throw new Error(`${method} ${path} failed: ${response.status()} ${JSON.stringify(errorBody)}`);
  }

  return (await parseResponseBody(response)) as T;
}

export async function requestAsAuthFailure(
  page: Page,
  auth: AuthContext,
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: {
    idempotencyKey?: string;
  }
): Promise<{ status: number; body: unknown }> {
  const response = await page.request.fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Workspace-Id": auth.workspaceId,
      "Idempotency-Key": options?.idempotencyKey ?? randomUUID(),
    },
    data: body,
  });

  return {
    status: response.status(),
    body: await parseResponseBody(response),
  };
}

async function selectRadixOption(page: Page, triggerTestId: string, optionLabel: string) {
  await page.getByTestId(triggerTestId).click();
  await page
    .getByRole("option", { name: new RegExp(`^${escapeRegExp(optionLabel)}$`) })
    .first()
    .click();
}

export async function createProgramCombo(
  page: Page,
  input: {
    title: string;
    levelTag: string;
    expectedSessionsCount: number;
    description?: string;
    timezone?: string;
    sessionTemplates: ProgramTemplateInput[];
    milestoneTemplates: MilestoneTemplateInput[];
  }
): Promise<{ programId: string; title: string }> {
  await openClassesModule(page, "programs");
  await page.locator(selectors.classes.programsNewButton).click();
  await expect(page).toHaveURL(/\/classes\/programs\/new$/);

  await page.locator(selectors.classes.programTitleInput).fill(input.title);
  await page.locator(selectors.classes.programLevelTagInput).fill(input.levelTag);
  await page
    .locator(selectors.classes.programExpectedSessionsInput)
    .fill(String(input.expectedSessionsCount));
  await page
    .locator(selectors.classes.programTimezoneInput)
    .fill(input.timezone ?? "Europe/Berlin");
  if (input.description) {
    await page.locator(selectors.classes.programDescriptionInput).fill(input.description);
  }

  for (let i = 0; i < input.sessionTemplates.length; i += 1) {
    const template = input.sessionTemplates[i];
    await page.locator(selectors.classes.programAddSessionTemplateButton).click();
    await page
      .getByTestId(`classes-program-session-template-index-${i}`)
      .fill(String(template.index));
    await page.getByTestId(`classes-program-session-template-title-${i}`).fill(template.title);
    await page
      .getByTestId(`classes-program-session-template-duration-${i}`)
      .fill(String(template.defaultDurationMin));
    await selectRadixOption(page, `classes-program-session-template-type-${i}`, template.type);
  }

  for (let i = 0; i < input.milestoneTemplates.length; i += 1) {
    const template = input.milestoneTemplates[i];
    await page.locator(selectors.classes.programAddMilestoneTemplateButton).click();
    await page
      .getByTestId(`classes-program-milestone-template-index-${i}`)
      .fill(String(template.index));
    await page.getByTestId(`classes-program-milestone-template-title-${i}`).fill(template.title);
    await selectRadixOption(page, `classes-program-milestone-template-type-${i}`, template.type);
    if (!template.required) {
      await page.getByTestId(`classes-program-milestone-template-required-${i}`).click();
    }
  }

  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      new URL(response.url()).pathname.endsWith("/classes/programs")
  );
  await page.locator(selectors.classes.programSaveButton).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBeTruthy();
  const createdBody = (await createResponse.json()) as { program?: { id?: string } };
  const programId = createdBody.program?.id ?? "";
  expect(programId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/classes/programs/${escapeRegExp(programId)}$`));
  return { programId, title: input.title };
}

export async function createCohortFromProgram(
  page: Page,
  input: {
    cohortName: string;
    subject: string;
    level: string;
    timezone: string;
    price: string;
    currency: string;
  }
): Promise<{ cohortId: string }> {
  await expect(page.locator(selectors.classes.programCreateCohortPanel)).toBeVisible();
  await page.getByTestId("classes-program-create-cohort-name-input").fill(input.cohortName);
  await page.getByTestId("classes-program-create-cohort-subject-input").fill(input.subject);
  await page.getByTestId("classes-program-create-cohort-level-input").fill(input.level);
  await page.getByTestId("classes-program-create-cohort-timezone-input").fill(input.timezone);
  await page.getByTestId("classes-program-create-cohort-price-input").fill(input.price);
  await page.getByTestId("classes-program-create-cohort-currency-input").fill(input.currency);
  const createResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      /\/classes\/programs\/[^/]+\/create-cohort$/.test(new URL(response.url()).pathname)
  );
  await page.locator(selectors.classes.programCreateCohortButton).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.ok()).toBeTruthy();
  const createdBody = (await createResponse.json()) as { classGroup?: { id?: string } };
  const cohortId = createdBody.classGroup?.id ?? "";
  expect(cohortId).toBeTruthy();
  await expect(page).toHaveURL(new RegExp(`/classes/cohorts/${escapeRegExp(cohortId)}$`));
  return { cohortId };
}

export async function createProgramViaApi(
  page: Page,
  auth: AuthContext,
  input: {
    title: string;
    levelTag: string;
    expectedSessionsCount: number;
    description?: string;
  }
): Promise<{ id: string }> {
  const response = await requestAsAuth<{ program?: { id?: string } }>(
    page,
    auth,
    "POST",
    "/classes/programs",
    {
      title: input.title,
      description: input.description ?? null,
      levelTag: input.levelTag,
      expectedSessionsCount: input.expectedSessionsCount,
      defaultTimezone: "Europe/Berlin",
    }
  );

  const id = response.program?.id ?? "";
  expect(id).toBeTruthy();
  return { id };
}

export async function createCohortFromProgramViaApi(
  page: Page,
  auth: AuthContext,
  input: {
    programId: string;
    cohortName: string;
    subject: string;
    level: string;
    defaultPricePerSession: number;
    currency: string;
    timezone?: string;
    deliveryMode?: "ONLINE" | "HYBRID" | "IN_PERSON";
  }
): Promise<{ id: string }> {
  const response = await requestAsAuth<{ classGroup?: { id?: string } }>(
    page,
    auth,
    "POST",
    `/classes/programs/${input.programId}/create-cohort`,
    {
      cohortName: input.cohortName,
      subject: input.subject,
      level: input.level,
      defaultPricePerSession: input.defaultPricePerSession,
      currency: input.currency,
      timezone: input.timezone ?? "Europe/Berlin",
      deliveryMode: input.deliveryMode ?? "ONLINE",
    }
  );

  const id = response.classGroup?.id ?? "";
  expect(id).toBeTruthy();
  return { id };
}

export async function createPartyViaApi(
  page: Page,
  auth: AuthContext,
  input: {
    displayName: string;
    role: "CUSTOMER" | "SUPPLIER" | "EMPLOYEE" | "CONTACT" | "STUDENT" | "GUARDIAN";
    email?: string;
  }
): Promise<{ id: string; displayName: string }> {
  const response = await requestAsAuth<{
    customer?: { id: string; displayName: string };
    id?: string;
  }>(page, auth, "POST", "/customers", {
    displayName: input.displayName,
    role: input.role,
    email: input.email,
  });

  const customer = response.customer ?? { id: response.id ?? "", displayName: input.displayName };
  return { id: customer.id, displayName: customer.displayName };
}

export async function createSessionViaApi(
  page: Page,
  auth: AuthContext,
  input: {
    classGroupId: string;
    startsAt: string;
    endsAt: string;
    topic: string;
    type: "LECTURE" | "LAB" | "OFFICE_HOURS" | "REVIEW" | "DEMO_DAY";
    meetingProvider?: "ZOOM" | "GOOGLE_MEET" | "TEAMS" | "OTHER";
    meetingJoinUrl?: string;
  }
): Promise<{ id: string }> {
  const response = await requestAsAuth<{ session: { id: string } }>(
    page,
    auth,
    "POST",
    "/classes/sessions",
    input
  );
  return { id: response.session.id };
}

export async function createApplication(
  page: Page,
  auth: AuthContext,
  input: {
    classGroupId: string;
    studentClientId: string;
    payerClientId: string;
    placementLevel?: string;
    placementGoal?: string;
  }
): Promise<{ enrollmentId: string }> {
  await page.locator(selectors.classes.cohortTabLearners).click();
  await page.locator(selectors.classes.cohortCreateApplicationStudent).fill(input.studentClientId);
  await page.locator(selectors.classes.cohortCreateApplicationPayer).fill(input.payerClientId);
  if (input.placementLevel) {
    await page
      .locator(selectors.classes.cohortCreateApplicationPlacementLevel)
      .fill(input.placementLevel);
  }
  if (input.placementGoal) {
    await page
      .locator(selectors.classes.cohortCreateApplicationPlacementGoal)
      .fill(input.placementGoal);
  }
  await page.locator(selectors.classes.cohortCreateApplicationButton).click();

  let enrollmentId = "";
  await expect
    .poll(async () => {
      const response = await requestAsAuth<{
        items: Array<{ id: string; studentClientId: string }>;
      }>(
        page,
        auth,
        "GET",
        `/classes/enrollments?classGroupId=${encodeURIComponent(input.classGroupId)}&status=APPLIED&page=1&pageSize=100`
      );
      const enrollment = response.items.find(
        (item) => item.studentClientId === input.studentClientId
      );
      enrollmentId = enrollment?.id ?? "";
      return Boolean(enrollmentId);
    })
    .toBe(true);

  return { enrollmentId };
}

export async function approveApplication(
  page: Page,
  auth: AuthContext,
  input: {
    classGroupId: string;
    enrollmentId: string;
  }
): Promise<void> {
  await page.locator(selectors.classes.cohortLearnersStatusFilter("APPLIED")).click();
  await page.locator(selectors.classes.cohortEnrollmentApprove(input.enrollmentId)).click();

  await expect
    .poll(async () => {
      const response = await requestAsAuth<{ items: Array<{ id: string; status: string }> }>(
        page,
        auth,
        "GET",
        `/classes/enrollments?classGroupId=${encodeURIComponent(input.classGroupId)}&status=ENROLLED&page=1&pageSize=100`
      );
      return response.items.some((item) => item.id === input.enrollmentId);
    })
    .toBe(true);
}

export async function setBillingPlan(
  page: Page,
  auth: AuthContext,
  input: {
    enrollmentId: string;
    plan: BillingPlanInput;
  }
): Promise<void> {
  if (input.plan.type === "UPFRONT") {
    await requestAsAuth(
      page,
      auth,
      "PUT",
      `/classes/enrollments/${input.enrollmentId}/billing-plan`,
      {
        type: "UPFRONT",
        scheduleJson: {
          type: "UPFRONT",
          data: {
            amountCents: input.plan.amountCents,
            currency: input.plan.currency,
            dueDate: input.plan.dueDate,
          },
        },
      }
    );
    return;
  }

  if (input.plan.type === "INSTALLMENTS") {
    await requestAsAuth(
      page,
      auth,
      "PUT",
      `/classes/enrollments/${input.enrollmentId}/billing-plan`,
      {
        type: "INSTALLMENTS",
        scheduleJson: {
          type: "INSTALLMENTS",
          data: {
            currency: input.plan.currency,
            installments: input.plan.installments,
          },
        },
      }
    );
    return;
  }

  await requestAsAuth(
    page,
    auth,
    "PUT",
    `/classes/enrollments/${input.enrollmentId}/billing-plan`,
    {
      type: "INVOICE_NET",
      scheduleJson: {
        type: "INVOICE_NET",
        data: {
          amountCents: input.plan.amountCents,
          currency: input.plan.currency,
          netDays: input.plan.netDays,
        },
      },
    }
  );
}

export async function generateInvoices(
  page: Page,
  auth: AuthContext,
  input: {
    enrollmentId: string;
    idempotencyKey?: string;
    sendInvoices?: boolean;
  }
): Promise<{ invoiceIds: string[] }> {
  const requestOptions = input.idempotencyKey
    ? { idempotencyKey: input.idempotencyKey }
    : undefined;
  return requestAsAuth<{ invoiceIds: string[] }>(
    page,
    auth,
    "POST",
    `/classes/enrollments/${input.enrollmentId}/billing-plan/generate-invoices`,
    { sendInvoices: input.sendInvoices ?? false },
    requestOptions
  );
}

export async function addMilestone(
  page: Page,
  input: {
    title: string;
  }
): Promise<{ milestoneId: string }> {
  await page.locator(selectors.classes.cohortTabOutcomes).click();
  const rows = page.locator('[data-testid^="classes-cohort-milestone-row-"]');
  const beforeCount = await rows.count();
  await page.locator(selectors.classes.cohortMilestoneTitleInput).fill(input.title);
  await page.locator(selectors.classes.cohortMilestoneAddButton).click();

  await expect(rows).toHaveCount(beforeCount + 1, { timeout: 20_000 });
  const row = rows.nth(beforeCount);

  const testId = await row.getAttribute("data-testid");
  const milestoneId = (testId ?? "").replace("classes-cohort-milestone-row-", "");
  expect(milestoneId).toBeTruthy();
  return { milestoneId };
}

export async function setMilestoneCompletion(
  page: Page,
  input: {
    milestoneId: string;
    status: "NOT_STARTED" | "SUBMITTED" | "PASSED" | "FAILED";
  }
): Promise<void> {
  await selectRadixOption(
    page,
    `classes-cohort-milestone-status-${input.milestoneId}`,
    input.status
  );
}

export async function addResource(
  page: Page,
  input: {
    type: "RECORDING" | "DOC" | "LINK";
    visibility: "ENROLLED_ONLY" | "PUBLIC";
    title: string;
    url?: string;
    documentId?: string;
  }
): Promise<{ resourceId: string }> {
  await page.locator(selectors.classes.cohortTabResources).click();
  const rows = page.locator('[data-testid^="classes-cohort-resource-row-"]');
  const beforeCount = await rows.count();
  await selectRadixOption(page, "classes-cohort-resource-type-select", input.type);
  await selectRadixOption(page, "classes-cohort-resource-visibility-select", input.visibility);
  await page.locator(selectors.classes.cohortResourceTitleInput).fill(input.title);
  await page.locator(selectors.classes.cohortResourceUrlInput).fill(input.url ?? "");
  if (input.documentId) {
    await page.getByTestId("classes-cohort-resource-document-id-input").fill(input.documentId);
  }
  await page.locator(selectors.classes.cohortResourceAddButton).click();

  await expect(rows).toHaveCount(beforeCount + 1, { timeout: 20_000 });
  const row = rows.nth(beforeCount);

  const testId = await row.getAttribute("data-testid");
  const resourceId = (testId ?? "").replace("classes-cohort-resource-row-", "");
  expect(resourceId).toBeTruthy();
  return { resourceId };
}

export async function reorderResources(
  page: Page,
  input: { resourceId: string; direction: "up" | "down" }
): Promise<void> {
  const selector =
    input.direction === "up"
      ? selectors.classes.cohortResourceUp(input.resourceId)
      : selectors.classes.cohortResourceDown(input.resourceId);
  await page.locator(selector).click();
}

export async function updateCohortLifecycleViaApi(
  page: Page,
  auth: AuthContext,
  input: {
    classGroupId: string;
    lifecycle: "DRAFT" | "PUBLISHED" | "RUNNING" | "ENDED" | "ARCHIVED";
  }
): Promise<void> {
  await requestAsAuth(page, auth, "POST", `/classes/class-groups/${input.classGroupId}/lifecycle`, {
    lifecycle: input.lifecycle,
  });
}
