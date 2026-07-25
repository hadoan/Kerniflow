import { expect, test } from "../fixtures.ts";
import {
  createCohortFromProgramViaApi,
  createPartyViaApi,
  createProgramViaApi,
  createUniqueName,
  loginAndGetAuthContext,
  requestAsAuth,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Outcomes", () => {
  test("scenario E: milestones + completion matrix + summary persistence", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const program = await createProgramViaApi(page, auth, {
      title: createUniqueName("Outcomes Program"),
      levelTag: "A2",
      expectedSessionsCount: 20,
    });
    const cohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName: createUniqueName("Outcomes Cohort"),
      subject: "Deutsch",
      level: "A2",
      defaultPricePerSession: 3_000,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });

    const learner = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Learner Outcomes"),
      role: "STUDENT",
      email: `${createUniqueName("learner-outcomes")}@example.test`,
    });
    const payer = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Payer Outcomes"),
      role: "CUSTOMER",
      email: `${createUniqueName("payer-outcomes")}@example.test`,
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

    const baselineSummary = await requestAsAuth<{
      summary: { totalCompletionsPassed: number };
    }>(page, auth, "GET", `/classes/class-groups/${cohort.id}/outcomes-summary`);

    const milestoneTitle = createUniqueName("Checkpoint 1");
    const createdMilestone = await requestAsAuth<{ milestone: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/milestones`,
      {
        title: milestoneTitle,
        type: "CHECKPOINT",
        required: true,
      }
    );
    const milestoneId = createdMilestone.milestone.id;
    await requestAsAuth(
      page,
      auth,
      "PUT",
      `/classes/milestones/${milestoneId}/completions/${application.enrollment.id}`,
      {
        status: "PASSED",
        feedback: "Strong checkpoint performance",
      }
    );

    const updatedSummary = await requestAsAuth<{
      summary: { totalCompletionsPassed: number };
    }>(page, auth, "GET", `/classes/class-groups/${cohort.id}/outcomes-summary`);
    expect(updatedSummary.summary.totalCompletionsPassed).toBeGreaterThanOrEqual(
      baselineSummary.summary.totalCompletionsPassed + 1
    );
  });
});
