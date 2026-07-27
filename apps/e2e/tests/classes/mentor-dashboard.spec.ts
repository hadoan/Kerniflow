import { expect, test } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import {
  createCohortFromProgramViaApi,
  createPartyViaApi,
  createProgramViaApi,
  createSessionViaApi,
  createUniqueName,
  loginAndGetAuthContext,
  requestAsAuth,
  updateCohortLifecycleViaApi,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Mentor Dashboard", () => {
  test("scenario G: dashboard surfaces upcoming sessions and needs-attention items", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const program = await createProgramViaApi(page, auth, {
      title: createUniqueName("Mentor Dashboard Program"),
      levelTag: "B1",
      expectedSessionsCount: 16,
    });
    const cohortName = createUniqueName("Mentor Cohort");
    const cohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName,
      subject: "Upskilling",
      level: "B1",
      defaultPricePerSession: 4_000,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });
    await updateCohortLifecycleViaApi(page, auth, {
      classGroupId: cohort.id,
      lifecycle: "PUBLISHED",
    });
    await updateCohortLifecycleViaApi(page, auth, {
      classGroupId: cohort.id,
      lifecycle: "RUNNING",
    });

    const now = Date.now();
    await createSessionViaApi(page, auth, {
      classGroupId: cohort.id,
      startsAt: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now + 26 * 60 * 60 * 1000).toISOString(),
      topic: "Mentor Office Hours",
      type: "OFFICE_HOURS",
      meetingProvider: "ZOOM",
      meetingJoinUrl: "https://zoom.example.test/mentor-hours",
    });
    await createSessionViaApi(page, auth, {
      classGroupId: cohort.id,
      startsAt: new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString(),
      endsAt: new Date(now - 2 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
      topic: "Past unfinished session",
      type: "LECTURE",
    });

    const learner = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Needs Attention Student"),
      role: "STUDENT",
      email: `${createUniqueName("needs-attention")}@example.test`,
    });
    const payer = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Needs Attention Payer"),
      role: "CUSTOMER",
      email: `${createUniqueName("needs-attention-payer")}@example.test`,
    });

    const application = await requestAsAuth<{ enrollment: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/applications`,
      {
        studentClientId: learner.id,
        payerClientId: payer.id,
      }
    );
    await requestAsAuth(
      page,
      auth,
      "POST",
      `/classes/enrollments/${application.enrollment.id}/approve`,
      {}
    );

    await page.locator(selectors.navigation.teacherDashboardNavLink).click();
    await expect(page.locator(selectors.classes.teacherDashboard)).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(selectors.classes.teacherDashboardTodayCard)).toBeVisible();
    await expect(page.locator(selectors.classes.teacherDashboardNeedsAttention)).toBeVisible();

    await expect(
      page.locator('[data-testid="classes-teacher-dashboard-upcoming-sessions"]')
    ).toBeVisible();
    await expect(page.locator(selectors.classes.teacherDashboardNeedsAttention)).toBeVisible();
  });
});
