import { test as base, expect } from "@playwright/test";
import { seedTestData, resetTestData, type TestData } from "../utils/testData";

type TestFixtures = {
  testData: TestData;
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
});

export { expect };
