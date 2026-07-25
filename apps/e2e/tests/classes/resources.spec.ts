import { expect, test } from "../fixtures.ts";
import {
  createCohortFromProgramViaApi,
  createProgramViaApi,
  createUniqueName,
  loginAndGetAuthContext,
  requestAsAuth,
  requestAsAuthFailure,
} from "../../helpers/classes/workflow.ts";

test.describe("Classes Cohort Academy v1.1 - Resources", () => {
  test("scenario F + negative: resources CRUD/reorder/persistence and invalid LINK", async ({
    page,
    testData,
  }) => {
    const auth = await loginAndGetAuthContext(page, testData);

    const program = await createProgramViaApi(page, auth, {
      title: createUniqueName("Resources Program"),
      levelTag: "A2",
      expectedSessionsCount: 18,
    });
    const cohort = await createCohortFromProgramViaApi(page, auth, {
      programId: program.id,
      cohortName: createUniqueName("Resources Cohort"),
      subject: "Deutsch",
      level: "A2",
      defaultPricePerSession: 2_500,
      currency: "EUR",
      timezone: "Europe/Berlin",
    });

    const linkA = await requestAsAuth<{ resource: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/resources`,
      {
        type: "LINK",
        visibility: "ENROLLED_ONLY",
        title: createUniqueName("Discord community"),
        url: "https://discord.com/example-community",
      }
    );
    const linkBTitle = createUniqueName("Grammar deck");
    const linkB = await requestAsAuth<{ resource: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/resources`,
      {
        type: "LINK",
        visibility: "ENROLLED_ONLY",
        title: linkBTitle,
        url: "https://example.test/grammar-deck",
      }
    );
    const recording = await requestAsAuth<{ resource: { id: string } }>(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/resources`,
      {
        type: "RECORDING",
        visibility: "ENROLLED_ONLY",
        title: createUniqueName("Week 1 recording"),
        url: "https://example.test/recordings/week-1",
      }
    );

    const resourcesAfterCreate = await requestAsAuth<{
      items: Array<{ id: string; title: string }>;
    }>(page, auth, "GET", `/classes/class-groups/${cohort.id}/resources`);
    expect(resourcesAfterCreate.items.some((item) => item.id === linkA.resource.id)).toBe(true);
    expect(resourcesAfterCreate.items.some((item) => item.id === linkB.resource.id)).toBe(true);
    expect(resourcesAfterCreate.items.some((item) => item.id === recording.resource.id)).toBe(true);

    await requestAsAuth(page, auth, "PUT", `/classes/class-groups/${cohort.id}/resources/reorder`, {
      orderedIds: [linkB.resource.id, linkA.resource.id, recording.resource.id],
    });
    const resourcesAfterReorder = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/class-groups/${cohort.id}/resources`
    );
    expect(resourcesAfterReorder.items[0]?.id).toBe(linkB.resource.id);

    const invalidLink = await requestAsAuthFailure(
      page,
      auth,
      "POST",
      `/classes/class-groups/${cohort.id}/resources`,
      {
        type: "LINK",
        visibility: "ENROLLED_ONLY",
        title: createUniqueName("Broken link"),
        url: "",
      }
    );
    expect(invalidLink.status).toBeGreaterThanOrEqual(400);
    expect(invalidLink.status).toBeLessThan(500);

    await requestAsAuth(page, auth, "DELETE", `/classes/resources/${linkA.resource.id}`);
    const resourcesAfterDelete = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/class-groups/${cohort.id}/resources`
    );
    expect(resourcesAfterDelete.items.some((item) => item.id === linkA.resource.id)).toBe(false);

    await requestAsAuth(page, auth, "POST", `/classes/class-groups/${cohort.id}/lifecycle`, {
      lifecycle: "PUBLISHED",
    });
    await requestAsAuth(page, auth, "POST", `/classes/class-groups/${cohort.id}/lifecycle`, {
      lifecycle: "RUNNING",
    });
    await requestAsAuth(page, auth, "POST", `/classes/class-groups/${cohort.id}/lifecycle`, {
      lifecycle: "ENDED",
    });

    const resourcesAfterEnded = await requestAsAuth<{ items: Array<{ id: string }> }>(
      page,
      auth,
      "GET",
      `/classes/class-groups/${cohort.id}/resources`
    );
    expect(resourcesAfterEnded.items.some((item) => item.id === linkB.resource.id)).toBe(true);
    expect(resourcesAfterEnded.items.some((item) => item.id === recording.resource.id)).toBe(true);
  });
});
