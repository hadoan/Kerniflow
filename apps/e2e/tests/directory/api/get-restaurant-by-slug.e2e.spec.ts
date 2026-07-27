import { test, expect } from "@playwright/test";
import { DIRECTORY_ERROR_CODES } from "@corely/contracts";
import { assertApiReady } from "../helpers/bootstrap-api.ts";
import { ensureDirectorySchemaReady, closePrisma } from "../helpers/db.ts";
import {
  cleanupDirectoryFixtureSet,
  createRunTag,
  seedDirectoryFixtureSet,
} from "../helpers/directory-seed.ts";
import { API_BASE_URL, expectProblemDetails, getRestaurantBySlug } from "../helpers/http.ts";

test.describe("Directory UC-02: get restaurant by slug (public)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  let runTag = "";
  let fixturePrefix = "";
  let activeSlug = "";
  let hiddenSlug = "";

  test.beforeAll(async ({ request }) => {
    runTag = createRunTag("uc02-detail");
    await assertApiReady(request);
    await ensureDirectorySchemaReady();

    const seeded = await seedDirectoryFixtureSet(runTag);
    fixturePrefix = seeded.prefix;
    activeSlug = seeded.activeSlug;
    hiddenSlug = seeded.hiddenSlug;
  });

  test.afterAll(async () => {
    if (fixturePrefix) {
      await cleanupDirectoryFixtureSet(fixturePrefix);
    }
    await closePrisma();
  });

  test("returns 200 for active slug", async ({ request }) => {
    const { response, body } = await getRestaurantBySlug(request, activeSlug);

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"] ?? "").toContain("public");
    expect(body.restaurant.slug).toBe(activeSlug);
    expect(body.restaurant.status).toBe("ACTIVE");
    expect(body.restaurant.name).toContain(runTag);
  });

  test("returns 404 Problem Details for missing slug", async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/v1/public/berlin/restaurants/${encodeURIComponent(`${runTag}-missing`)}`
    );

    await expectProblemDetails(response, 404, DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND);
  });

  test("returns 404 for hidden slug without leaking existence", async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/v1/public/berlin/restaurants/${encodeURIComponent(hiddenSlug)}`
    );

    await expectProblemDetails(response, 404, DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND);
  });
});
