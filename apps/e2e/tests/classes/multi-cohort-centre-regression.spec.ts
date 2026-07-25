import { expect, test } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import {
  createCohortFromProgramViaApi,
  createPartyViaApi,
  createProgramViaApi,
  createUniqueName,
  generateInvoices,
  loginAndGetAuthContext,
  requestAsAuth,
  requestAsAuthFailure,
  setBillingPlan,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Multi-Cohort Centre Regression", () => {
  test("scenario H + lifecycle negative: multi-cohort isolation and filter persistence", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const program = await createProgramViaApi(page, auth, {
      title: createUniqueName("A1.1 Program"),
      levelTag: "A1.1",
      expectedSessionsCount: 25,
    });

    const marchCohortName = createUniqueName("A1.1 Cohort March");
    const marchCohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName: marchCohortName,
      subject: "Deutsch",
      level: "A1.1",
      defaultPricePerSession: 3_000,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });
    const aprilCohortName = createUniqueName("A1.1 Cohort April");
    const aprilCohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName: aprilCohortName,
      subject: "Deutsch",
      level: "A1.1",
      defaultPricePerSession: 3_000,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });

    const learnerMarch = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("March Learner"),
      role: "STUDENT",
      email: `${createUniqueName("march-learner")}@example.test`,
    });
    const payerMarch = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("March Payer"),
      role: "CUSTOMER",
      email: `${createUniqueName("march-payer")}@example.test`,
    });
    const learnerApril = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("April Learner"),
      role: "STUDENT",
      email: `${createUniqueName("april-learner")}@example.test`,
    });
    const payerApril = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("April Payer"),
      role: "CUSTOMER",
      email: `${createUniqueName("april-payer")}@example.test`,
    });

    const marchApplication = await requestAsAuth<{ enrollment: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${marchCohort.id}/applications`,
      {
        studentClientId: learnerMarch.id,
        payerClientId: payerMarch.id,
      }
    );
    await requestAsAuth(
      page,
      auth,
      "POST",
      `/classes/enrollments/${marchApplication.enrollment.id}/approve`,
      {}
    );

    const aprilApplication = await requestAsAuth<{ enrollment: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${aprilCohort.id}/applications`,
      {
        studentClientId: learnerApril.id,
        payerClientId: payerApril.id,
      }
    );
    await requestAsAuth(
      page,
      auth,
      "POST",
      `/classes/enrollments/${aprilApplication.enrollment.id}/approve`,
      {}
    );

    const marchEnrollments = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/enrollments?classGroupId=${marchCohort.id}&status=ENROLLED&page=1&pageSize=100`
    );
    const aprilEnrollments = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/enrollments?classGroupId=${aprilCohort.id}&status=ENROLLED&page=1&pageSize=100`
    );

    expect(marchEnrollments.items).toHaveLength(1);
    expect(aprilEnrollments.items).toHaveLength(1);

    await setBillingPlan(page, auth, {
      enrollmentId: marchApplication.enrollment.id,
      plan: {
        type: "UPFRONT",
        amountCents: 50_000,
        currency: "EUR",
        dueDate: "2026-03-20",
      },
    });
    const marchInvoices = await generateInvoices(page, auth, {
      enrollmentId: marchApplication.enrollment.id,
      sendInvoices: false,
    });
    expect(marchInvoices.invoiceIds.length).toBe(1);

    const aprilGenerateWithoutPlan = await requestAsAuthFailure(
      page,
      auth,
      "POST",
      `/classes/enrollments/${aprilApplication.enrollment.id}/billing-plan/generate-invoices`,
      { sendInvoices: false }
    );
    expect(aprilGenerateWithoutPlan.status).toBeGreaterThanOrEqual(400);

    const marchResourceTitle = createUniqueName("March-only Resource");
    await requestAsAuth(page, auth, "POST", `/classes/class-groups/${marchCohort.id}/resources`, {
      type: "LINK",
      title: marchResourceTitle,
      url: "https://example.test/march-only",
      visibility: "ENROLLED_ONLY",
    });

    await page.locator(selectors.navigation.classesProgramsNavLink).click();
    await expect(page.locator(selectors.classes.programsList)).toBeVisible({ timeout: 20_000 });

    const marchResources = await requestAsAuth<{ items: Array<{ title: string }> }>(
      page,
      auth,
      "GET",
      `/classes/class-groups/${marchCohort.id}/resources`
    );
    expect(marchResources.items.some((item) => item.title === marchResourceTitle)).toBe(true);

    const aprilResources = await requestAsAuth<{ items: Array<{ title: string }> }>(
      page,
      auth,
      "GET",
      `/classes/class-groups/${aprilCohort.id}/resources`
    );
    expect(aprilResources.items.some((item) => item.title === marchResourceTitle)).toBe(false);

    const invalidTransition = await requestAsAuthFailure(
      page,
      auth,
      "POST",
      `/classes/class-groups/${aprilCohort.id}/lifecycle`,
      { lifecycle: "RUNNING" }
    );
    expect(invalidTransition.status).toBeGreaterThanOrEqual(400);
    expect(invalidTransition.status).toBeLessThan(500);
  });
});
