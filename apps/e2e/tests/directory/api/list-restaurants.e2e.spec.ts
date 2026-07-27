import { test, expect } from "@playwright/test";
import { assertApiReady } from "../helpers/bootstrap-api.ts";
import { ensureDirectorySchemaReady, closePrisma } from "../helpers/db.ts";
import {
  cleanupDirectoryFixtureSet,
  createRunTag,
  seedDirectoryFixtureSet,
} from "../helpers/directory-seed.ts";
import { listRestaurants } from "../helpers/http.ts";

test.describe("Directory UC-01: list restaurants (public)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  let runTag = "";
  let fixturePrefix = "";

  test.beforeAll(async ({ request }) => {
    runTag = createRunTag("uc01-list");
    await assertApiReady(request);
    await ensureDirectorySchemaReady();

    const seeded = await seedDirectoryFixtureSet(runTag);
    fixturePrefix = seeded.prefix;
  });

  test.afterAll(async () => {
    if (fixturePrefix) {
      await cleanupDirectoryFixtureSet(fixturePrefix);
    }
    await closePrisma();
  });

  test("returns active restaurants only with stable ordering", async ({ request }) => {
    const { response, body } = await listRestaurants(request, { q: runTag });

    expect(response.status()).toBe(200);
    expect(response.headers()["cache-control"] ?? "").toContain("public");

    expect(body.items).toHaveLength(2);
    expect(body.items.map((item) => item.slug)).toEqual([
      `${runTag}-bun-cha-mitte`,
      `${runTag}-pho-bar-neukoelln`,
    ]);
    expect(body.items.every((item) => item.status === "ACTIVE")).toBe(true);

    expect(body.pageInfo.page).toBe(1);
    expect(body.pageInfo.pageSize).toBe(20);
    expect(body.pageInfo.total).toBe(2);
    expect(body.pageInfo.hasNextPage).toBe(false);
  });

  test("supports filter by dish tag", async ({ request }) => {
    const { response, body } = await listRestaurants(request, { q: runTag, dish: "pho" });

    expect(response.status()).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.slug).toBe(`${runTag}-pho-bar-neukoelln`);
    expect(body.items[0]?.dishTags).toContain("pho");
  });

  test("supports filter by neighborhood", async ({ request }) => {
    const { response, body } = await listRestaurants(request, {
      q: runTag,
      neighborhood: "neukoelln",
    });

    expect(response.status()).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.slug).toBe(`${runTag}-pho-bar-neukoelln`);
    expect(body.items[0]?.neighborhoodSlug).toBe("neukoelln");
  });

  test("supports text search", async ({ request }) => {
    const { response, body } = await listRestaurants(request, { q: `${runTag} pho` });

    expect(response.status()).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0]?.slug).toBe(`${runTag}-pho-bar-neukoelln`);
  });

  test("supports pagination with stable sort", async ({ request }) => {
    const firstPage = await listRestaurants(request, {
      q: runTag,
      page: 1,
      pageSize: 1,
    });

    expect(firstPage.response.status()).toBe(200);
    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.items[0]?.slug).toBe(`${runTag}-bun-cha-mitte`);
    expect(firstPage.body.pageInfo).toEqual({
      page: 1,
      pageSize: 1,
      total: 2,
      hasNextPage: true,
    });

    const secondPage = await listRestaurants(request, {
      q: runTag,
      page: 2,
      pageSize: 1,
    });

    expect(secondPage.response.status()).toBe(200);
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0]?.slug).toBe(`${runTag}-pho-bar-neukoelln`);
    expect(secondPage.body.pageInfo).toEqual({
      page: 2,
      pageSize: 1,
      total: 2,
      hasNextPage: false,
    });
  });
});
