import { expect, test } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import {
  createCohortFromProgram,
  createPartyViaApi,
  createProgramCombo,
  createSessionViaApi,
  createUniqueName,
  getAuthContext,
  loginAndGetAuthContext,
  requestAsAuth,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Programs and Cohorts", () => {
  test("scenario A/B: program combo -> cohort -> team -> sessions -> lifecycle", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const instructor = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Instructor"),
      role: "EMPLOYEE",
      email: `${createUniqueName("instructor")}@example.test`,
    });
    const mentor = await createPartyViaApi(page, auth, {
      displayName: createUniqueName("Mentor"),
      role: "EMPLOYEE",
      email: `${createUniqueName("mentor")}@example.test`,
    });

    const comboTitle = createUniqueName("Combo A1.1");
    const { programId } = await createProgramCombo(page, {
      title: comboTitle,
      levelTag: "A1.1",
      expectedSessionsCount: 25,
      description: "German language center combo",
      timezone: "Europe/Berlin",
      sessionTemplates: [
        { index: 1, title: "Lecture Core", type: "LECTURE", defaultDurationMin: 120 },
        { index: 2, title: "Lab Practice", type: "LAB", defaultDurationMin: 120 },
      ],
      milestoneTemplates: [
        {
          index: 1,
          title: "Pronunciation checkpoint",
          type: "CHECKPOINT",
          required: true,
        },
        { index: 2, title: "Alltag roleplay", type: "ASSESSMENT", required: true },
      ],
    });

    await expect(page.getByRole("heading", { name: comboTitle })).toBeVisible();
    await page.getByTestId("classes-program-edit-button").click();
    await expect(page.getByTestId("classes-program-session-template-title-0")).toHaveValue(
      "Lecture Core"
    );
    await expect(page.getByTestId("classes-program-session-template-title-1")).toHaveValue(
      "Lab Practice"
    );
    await expect(page.getByTestId("classes-program-milestone-template-title-0")).toHaveValue(
      "Pronunciation checkpoint"
    );
    await expect(page.getByTestId("classes-program-milestone-template-title-1")).toHaveValue(
      "Alltag roleplay"
    );

    const cohortName = createUniqueName("A1.1 Cohort March");
    const { cohortId } = await createCohortFromProgram(page, {
      cohortName,
      subject: "Deutsch",
      level: "A1.1",
      timezone: "Europe/Berlin",
      price: "29.90",
      currency: "EUR",
    });

    await expect(page.locator(selectors.classes.cohortLifecycleBadge)).toHaveText("DRAFT");
    await expect(page.getByText(programId)).toBeVisible();
    await expect(page.getByText("Europe/Berlin")).toBeVisible();

    await page.locator(selectors.classes.cohortTeamPartyPicker).click();
    await page.getByPlaceholder("Search people by name or partyId...").fill(instructor.displayName);
    await page.locator(selectors.classes.cohortTeamPartyOption(instructor.id)).click();
    await page.locator(selectors.classes.cohortTeamRoleSelect).click();
    await page.getByRole("option", { name: "INSTRUCTOR" }).click();
    await page.locator(selectors.classes.cohortTeamAddButton).click();
    await expect(page.locator(selectors.classes.cohortTeamRole("INSTRUCTOR"))).toContainText(
      instructor.displayName
    );

    await page.locator(selectors.classes.cohortTeamPartyPicker).click();
    await page.getByPlaceholder("Search people by name or partyId...").fill(mentor.displayName);
    await page.locator(selectors.classes.cohortTeamPartyOption(mentor.id)).click();
    await page.locator(selectors.classes.cohortTeamRoleSelect).click();
    await page.getByRole("option", { name: "MENTOR" }).click();
    await page.locator(selectors.classes.cohortTeamAddButton).click();
    await expect(page.locator(selectors.classes.cohortTeamRole("MENTOR"))).toContainText(
      mentor.displayName
    );

    const now = Date.now();
    const runtimeAuth = await getAuthContext(page, testData);
    const joinUrl = "https://zoom.example.test/room-a11";
    const session1 = await createSessionViaApi(page, runtimeAuth, {
      classGroupId: cohortId,
      startsAt: new Date(now + 86_400_000).toISOString(),
      endsAt: new Date(now + 86_400_000 + 7_200_000).toISOString(),
      topic: "Pronunciation foundations",
      type: "LECTURE",
      meetingProvider: "ZOOM",
      meetingJoinUrl: joinUrl,
    });
    await createSessionViaApi(page, runtimeAuth, {
      classGroupId: cohortId,
      startsAt: new Date(now + 2 * 86_400_000).toISOString(),
      endsAt: new Date(now + 2 * 86_400_000 + 7_200_000).toISOString(),
      topic: "Conversation lab",
      type: "LAB",
    });
    await createSessionViaApi(page, runtimeAuth, {
      classGroupId: cohortId,
      startsAt: new Date(now + 3 * 86_400_000).toISOString(),
      endsAt: new Date(now + 3 * 86_400_000 + 7_200_000).toISOString(),
      topic: "Review",
      type: "REVIEW",
    });
    await expect
      .poll(async () => {
        const response = await requestAsAuth<{ items: Array<{ id: string }> }>(
          page,
          runtimeAuth,
          "GET",
          `/classes/sessions?classGroupId=${cohortId}&page=1&pageSize=50`
        );
        return response.items.length;
      })
      .toBeGreaterThanOrEqual(3);

    const sessions = await requestAsAuth<{
      items: Array<{
        id: string;
        type: string;
        meetingProvider?: string | null;
        meetingJoinUrl?: string | null;
      }>;
    }>(page, runtimeAuth, "GET", `/classes/sessions?classGroupId=${cohortId}&page=1&pageSize=50`);
    const createdSession = sessions.items.find((item) => item.id === session1.id);
    expect(createdSession?.type).toBe("LECTURE");
    expect(createdSession?.meetingProvider).toBe("ZOOM");
    expect(createdSession?.meetingJoinUrl).toBe(joinUrl);

    await expect(page.locator(selectors.classes.cohortLifecycleBadge)).toHaveText("DRAFT");
    await page.locator(selectors.classes.cohortLifecycleNextButton).click();
    await expect(page.locator(selectors.classes.cohortLifecycleBadge)).toHaveText("PUBLISHED");
    await page.locator(selectors.classes.cohortLifecycleNextButton).click();
    await expect(page.locator(selectors.classes.cohortLifecycleBadge)).toHaveText("RUNNING");
    await page.locator(selectors.classes.cohortLifecycleNextButton).click();
    await expect(page.locator(selectors.classes.cohortLifecycleBadge)).toHaveText("ENDED");

    const programsList = await requestAsAuth<{ items: Array<{ id: string; title: string }> }>(
      page,
      runtimeAuth,
      "GET",
      `/classes/programs?q=${encodeURIComponent(comboTitle)}&page=1&pageSize=50`
    );
    expect(programsList.items.some((item) => item.title === comboTitle)).toBe(true);

    const cohortsList = await requestAsAuth<{ items: Array<{ id: string; name: string }> }>(
      page,
      runtimeAuth,
      "GET",
      `/classes/class-groups?q=${encodeURIComponent(cohortName)}&kind=COHORT&page=1&pageSize=50`
    );
    expect(cohortsList.items.some((item) => item.id === cohortId)).toBe(true);
  });
});
