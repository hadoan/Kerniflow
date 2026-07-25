import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

type ApiOptions = {
  token: string;
  workspaceId: string;
};

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, email);
  await page.fill(selectors.auth.loginPasswordInput, password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function apiRequest(
  method: "GET" | "POST" | "PATCH" | "PUT",
  path: string,
  options: ApiOptions,
  body?: unknown
) {
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
      "X-Workspace-Id": options.workspaceId,
      "Idempotency-Key": randomUUID(),
    },
  };
  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(
    `${process.env.API_URL || "http://localhost:3000"}${path}`,
    requestInit
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`${method} ${path} failed: ${response.status} ${responseBody}`);
  }

  return response.json() as Promise<any>;
}

test.describe("Classes Cohort Academy v1.1", () => {
  test("happy path: program -> cohort -> application -> billing -> outcomes -> resources", async ({
    page,
    testData,
  }) => {
    await login(page, testData.user.email, testData.user.password);

    const auth = await page.evaluate(() => {
      const accessToken = localStorage.getItem("accessToken") ?? "";
      const workspaceId = localStorage.getItem("corely-active-workspace") ?? "";
      return { accessToken, workspaceId };
    });

    expect(auth.accessToken).toBeTruthy();
    expect(auth.workspaceId).toBeTruthy();

    const apiOptions: ApiOptions = {
      token: auth.accessToken,
      workspaceId: auth.workspaceId,
    };

    const runLabel = Date.now().toString();

    const studentCustomer = await apiRequest("POST", "/customers", apiOptions, {
      displayName: `Student ${runLabel}`,
      role: "STUDENT",
      email: `student-${runLabel}@example.test`,
    });
    const payerCustomer = await apiRequest("POST", "/customers", apiOptions, {
      displayName: `Payer ${runLabel}`,
      role: "CUSTOMER",
      email: `payer-${runLabel}@example.test`,
    });
    const studentClientId = String((studentCustomer.customer ?? studentCustomer).id);
    const payerClientId = String((payerCustomer.customer ?? payerCustomer).id);

    const program = await apiRequest("POST", "/classes/programs", apiOptions, {
      title: `Combo 1 ${runLabel}`,
      levelTag: "A1.1",
      expectedSessionsCount: 25,
      defaultTimezone: "Europe/Berlin",
      sessionTemplates: [
        {
          index: 1,
          title: "Kickoff",
          defaultDurationMin: 120,
          type: "LECTURE",
        },
      ],
      milestoneTemplates: [
        {
          index: 1,
          title: "Pronunciation checkpoint",
          type: "CHECKPOINT",
          required: true,
        },
      ],
    });
    expect(program.program.id).toBeTruthy();

    const cohortCreated = await apiRequest(
      "POST",
      `/classes/programs/${program.program.id}/create-cohort`,
      apiOptions,
      {
        cohortName: `A1 Cohort ${runLabel}`,
        subject: "Deutsch",
        level: "A1.1",
        defaultPricePerSession: 3000,
        currency: "EUR",
        timezone: "Europe/Berlin",
        deliveryMode: "ONLINE",
      }
    );
    const cohortId = cohortCreated.classGroup.id as string;
    expect(cohortId).toBeTruthy();

    const application = await apiRequest(
      "POST",
      `/classes/class-groups/${cohortId}/applications`,
      apiOptions,
      {
        studentClientId,
        payerClientId,
        placementLevel: "A1",
        placementGoal: "work",
      }
    );
    expect(application.enrollment.status).toBe("APPLIED");

    const approved = await apiRequest(
      "POST",
      `/classes/enrollments/${application.enrollment.id}/approve`,
      apiOptions,
      {
        priceCents: 75000,
        currency: "EUR",
        discountLabel: "Ưu đãi đợt 3",
      }
    );
    expect(approved.enrollment.status).toBe("ENROLLED");

    await apiRequest(
      "PUT",
      `/classes/enrollments/${application.enrollment.id}/billing-plan`,
      apiOptions,
      {
        type: "INSTALLMENTS",
        scheduleJson: {
          type: "INSTALLMENTS",
          data: {
            currency: "EUR",
            installments: [
              { dueDate: "2026-03-01", amountCents: 35000, label: "Inst 1" },
              { dueDate: "2026-04-01", amountCents: 40000, label: "Inst 2" },
            ],
          },
        },
      }
    );

    const invoiceResult = await apiRequest(
      "POST",
      `/classes/enrollments/${application.enrollment.id}/billing-plan/generate-invoices`,
      apiOptions,
      {
        sendInvoices: false,
      }
    );
    expect(invoiceResult.invoiceIds.length).toBeGreaterThan(0);

    const milestone = await apiRequest(
      "POST",
      `/classes/class-groups/${cohortId}/milestones`,
      apiOptions,
      {
        title: "Alltag roleplay",
        type: "CHECKPOINT",
        required: true,
      }
    );

    const completion = await apiRequest(
      "PUT",
      `/classes/milestones/${milestone.milestone.id}/completions/${approved.enrollment.id}`,
      apiOptions,
      {
        status: "PASSED",
      }
    );
    expect(completion.completion.status).toBe("PASSED");

    const resourceTitle = `Recording ${runLabel}`;
    await apiRequest("POST", `/classes/class-groups/${cohortId}/resources`, apiOptions, {
      type: "RECORDING",
      title: resourceTitle,
      url: "https://example.com/recordings/a1",
      visibility: "ENROLLED_ONLY",
    });

    await apiRequest("POST", `/classes/class-groups/${cohortId}/lifecycle`, apiOptions, {
      lifecycle: "PUBLISHED",
    });
    await apiRequest("POST", `/classes/class-groups/${cohortId}/lifecycle`, apiOptions, {
      lifecycle: "RUNNING",
    });
    await apiRequest("POST", `/classes/class-groups/${cohortId}/lifecycle`, apiOptions, {
      lifecycle: "ENDED",
    });

    const resourcesAfterEnd = await apiRequest(
      "GET",
      `/classes/class-groups/${cohortId}/resources`,
      apiOptions
    );
    expect(
      resourcesAfterEnd.items.some((item: { title: string }) => item.title === resourceTitle)
    ).toBe(true);

    await page.locator(selectors.navigation.classesProgramsNavLink).click();
    await expect(page.locator(selectors.classes.programsList)).toBeVisible({ timeout: 20_000 });
  });
});
