import { test as base, expect } from "@playwright/test";
import { seedTestData, resetTestData, seedHostAdminData, type TestData } from "../utils/testData.ts";

type TestFixtures = {
  testData: TestData;
  hostAdminData: TestData;
};

export const test = base.extend<TestFixtures>({
  testData: async ({ page: _page }, use) => {
    // Seed test data before each test
    const testData = await seedTestData();

    if (!testData) {
      throw new Error("Failed to seed test data");
    }

    // Use the test data in the test
    await use(testData);

    // Reset after each test (optional, but recommended for isolation)
    try {
      await resetTestData(testData.tenant.id);
    } catch (error) {
      console.warn("Failed to reset test data:", error);
    }
  },
  hostAdminData: async ({ page: _page }, use) => {
    const data = await seedHostAdminData();
    if (!data) {
      throw new Error("Failed to seed host admin data");
    }
    await use(data);
    // Note: host admin doesn't have a single tenant to reset normally
  },
});

export { expect };
