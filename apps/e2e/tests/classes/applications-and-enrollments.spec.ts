import { expect, test } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import {
  createCohortFromProgramViaApi,
  createPartyViaApi,
  createProgramViaApi,
  createUniqueName,
  loginAndGetAuthContext,
  requestAsAuth,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Applications and Enrollments", () => {
  test("scenario C: placement application -> approve -> enrolled roster", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const program = await createProgramViaApi(page, auth, {
      title: createUniqueName("Deutsch Program"),
      levelTag: "A1",
      expectedSessionsCount: 24,
    });
    const cohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName: createUniqueName("A1 Cohort"),
      subject: "Deutsch",
      level: "A1",
      defaultPricePerSession: 2_900,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });

    const learner = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Learner"),
      role: "STUDENT",
      email: `${createUniqueName("learner")}@example.test`,
    });
    const payer = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Payer"),
      role: "CUSTOMER",
      email: `${createUniqueName("payer")}@example.test`,
    });

    await page.locator(selectors.navigation.classesProgramsNavLink).click();
    await expect(page.locator(selectors.classes.programsList)).toBeVisible({ timeout: 20_000 });

    const createdApplication = await requestAsAuth<{ enrollment: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/applications`,
      {
        studentClientId: learner.id,
        payerClientId: payer.id,
        placementLevel: "A1",
        placementGoal: "Alltag / đi sở",
      }
    );
    const enrollmentId = createdApplication.enrollment.id;

    const appliedBeforeApproval = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/enrollments?classGroupId=${cohort.id}&status=APPLIED&page=1&pageSize=100`
    );
    expect(appliedBeforeApproval.items.some((item) => item.id === enrollmentId)).toBe(true);

    await requestAsAuth(page, auth, "POST", `/classes/enrollments/${enrollmentId}/approve`, {
      priceCents: 75_000,
      currency: "EUR",
    });

    await requestAsAuth(page, auth, "PATCH", `/classes/enrollments/${enrollmentId}`, {
      priceCents: 75_000,
      currency: "EUR",
      discountLabel: "Ưu đãi đợt 3",
      placementLevel: "A1",
      placementGoal: "Alltag / đi sở",
      placementNote: "Placement reviewed by sales team",
    });

    const appliedAfterApproval = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/enrollments?classGroupId=${cohort.id}&status=APPLIED&page=1&pageSize=100`
    );
    expect(appliedAfterApproval.items.some((item) => item.id === enrollmentId)).toBe(false);

    const enrolledAfterApproval = await requestAsAuth<{
      items: Array<{
        id: string;
        status: string;
        studentClientId: string;
        payerClientId: string | null;
        discountLabel: string | null;
      }>;
    }>(
      page,
      auth,
      "GET",
      `/classes/enrollments?classGroupId=${cohort.id}&status=ENROLLED&page=1&pageSize=100`
    );
    const enrolled = enrolledAfterApproval.items.find((item) => item.id === enrollmentId);
    expect(enrolled?.status).toBe("ENROLLED");
    expect(enrolled?.studentClientId).toBe(learner.id);
    expect(enrolled?.payerClientId).toBe(payer.id);
    expect(enrolled?.discountLabel).toBe("Ưu đãi đợt 3");
  });
});
