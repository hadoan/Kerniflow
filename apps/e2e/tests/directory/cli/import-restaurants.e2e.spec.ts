import { test, expect } from "@playwright/test";
import { assertApiReady } from "../helpers/bootstrap-api.ts";
import { closePrisma, countRestaurantsByPrefix, ensureDirectorySchemaReady } from "../helpers/db.ts";
import {
  cleanupDirectoryFixtureSet,
  createRunTag,
  runDirectoryImportSeedCli,
} from "../helpers/directory-seed.ts";
import { listRestaurants } from "../helpers/http.ts";

test.describe("Directory UC-05: import/seed restaurants is rerunnable", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ browserName }) => browserName !== "chromium", "CLI e2e runs once in chromium.");

  let runTag = "";
  let slugPrefix = "";

  test.beforeAll(async ({ request }) => {
    runTag = createRunTag("uc05-import");
    slugPrefix = `${runTag}-import-`;

    await assertApiReady(request);
    await ensureDirectorySchemaReady();
    await cleanupDirectoryFixtureSet(slugPrefix);
  });

  test.afterAll(async () => {
    if (slugPrefix) {
      await cleanupDirectoryFixtureSet(slugPrefix);
    }
    await closePrisma();
  });

  test("imports seeded restaurants and remains stable when run twice", async ({ request }) => {
    const before = await countRestaurantsByPrefix(slugPrefix);
    expect(before).toBe(0);

    runDirectoryImportSeedCli({ slugPrefix, namePrefix: `${runTag} import` });

    const firstCount = await countRestaurantsByPrefix(slugPrefix);
    expect(firstCount).toBe(3);

    const firstList = await listRestaurants(request, {
      q: `${runTag} import`,
      page: 1,
      pageSize: 20,
    });

    expect(firstList.response.status()).toBe(200);
    expect(firstList.body.items.map((item) => item.slug).sort()).toEqual([
      `${slugPrefix}bun-cha-mitte`,
      `${slugPrefix}pho-bar-neukoelln`,
    ]);
    expect(firstList.body.pageInfo.total).toBe(2);

    runDirectoryImportSeedCli({ slugPrefix, namePrefix: `${runTag} import` });

    const secondCount = await countRestaurantsByPrefix(slugPrefix);
    expect(secondCount).toBe(3);

    const secondList = await listRestaurants(request, {
      q: `${runTag} import`,
      page: 1,
      pageSize: 20,
    });

    expect(secondList.response.status()).toBe(200);
    expect(secondList.body.pageInfo.total).toBe(2);
    expect(secondList.body.items.map((item) => item.slug).sort()).toEqual([
      `${slugPrefix}bun-cha-mitte`,
      `${slugPrefix}pho-bar-neukoelln`,
    ]);
  });
});
