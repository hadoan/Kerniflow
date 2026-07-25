import { resetTestData, seedTestData, type TestData } from "../../utils/testData.ts";

export async function seedIsolatedTestData(): Promise<TestData> {
  const seeded = await seedTestData();
  if (!seeded) {
    throw new Error("Failed to seed isolated e2e test data");
  }
  return seeded;
}

export async function resetTenantDataForE2e(tenantId: string): Promise<void> {
  await resetTestData(tenantId);
}
