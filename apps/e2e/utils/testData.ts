import { apiClient } from "./api";

export interface TestData {
  tenant: {
    id: string;
    name: string;
  };
  user: {
    id: string;
    email: string;
    password: string;
    name: string;
  };
}

const TEST_EMAIL = "e2e-test@corely.local";
const TEST_PASSWORD = "E2ETestPassword123!";

/**
 * Seeds test data using test harness endpoints
 */
export async function seedTestData(): Promise<TestData | null> {
  try {
    const response = await apiClient.post("/test/seed", {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      tenantName: "E2E Test Tenant",
    });

    return {
      tenant: {
        id: response.tenantId,
        name: response.tenantName,
      },
      user: {
        id: response.userId,
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        name: response.userName,
      },
    };
  } catch (error) {
    console.error("Failed to seed test data:", error);
    return null;
  }
}

/**
 * Resets tenant-scoped test data (called before each test)
 */
export async function resetTestData(tenantId: string): Promise<void> {
  try {
    await apiClient.post("/test/reset", {
      tenantId,
    });
  } catch (error) {
    console.error("Failed to reset test data:", error);
  }
}

/**
 * Drains outbox events for deterministic testing
 */
export async function drainOutbox(): Promise<{ processedCount: number }> {
  try {
    const response = await apiClient.post("/test/drain-outbox");
    return { processedCount: response.processedCount || 0 };
  } catch (error) {
    console.error("Failed to drain outbox:", error);
    return { processedCount: 0 };
  }
}
