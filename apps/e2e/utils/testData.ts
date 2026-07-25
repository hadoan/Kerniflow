import { apiClient } from "./api.ts";

export interface TestData {
  tenant: {
    id: string;
    name: string;
  };
  workspace: {
    id: string;
  };
  user: {
    id: string;
    email: string;
    password: string;
    name: string;
  };
}

const TEST_PASSWORD = "E2ETestPassword123!";
const MAX_SEED_ATTEMPTS = 8;

interface SeedResponse {
  tenantId: string;
  tenantName: string;
  workspaceId: string;
  userId: string;
  userName: string;
}

const buildTestEmail = (): string =>
  `e2e-test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@corely.local`;

const buildTenantName = (): string =>
  `E2E Test Tenant ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Seeds test data using test harness endpoints
 */
export async function seedTestData(): Promise<TestData | null> {
  for (let attempt = 1; attempt <= MAX_SEED_ATTEMPTS; attempt += 1) {
    const email = buildTestEmail();

    try {
      const response = await apiClient.post<SeedResponse>("/test/seed", {
        email,
        password: TEST_PASSWORD,
        tenantName: buildTenantName(),
      });

      return {
        tenant: {
          id: response.tenantId,
          name: response.tenantName,
        },
        workspace: {
          id: response.workspaceId,
        },
        user: {
          id: response.userId,
          email,
          password: TEST_PASSWORD,
          name: response.userName,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isConflict = message.includes("409");
      const isTransientNetworkError =
        message.includes("fetch failed") ||
        message.includes("UND_ERR_SOCKET") ||
        message.includes("ECONNREFUSED") ||
        message.includes("other side closed");
      const isLastAttempt = attempt === MAX_SEED_ATTEMPTS;

      if ((!isConflict && !isTransientNetworkError) || isLastAttempt) {
        console.error("Failed to seed test data:", error);
        return null;
      }

      await wait(200 * attempt);
    }
  }

  return null;
}

/**
 * Seeds a host admin user for platform management testing
 */
export async function seedHostAdminData(): Promise<TestData | null> {
  const email = buildTestEmail();

  try {
    const response = await apiClient.post<SeedResponse>("/test/seed-host-admin", {
      email,
      password: TEST_PASSWORD,
    });

    return {
      tenant: {
        id: "", // Host admin has no tenantId
        name: "Platform",
      },
      workspace: {
        id: "",
      },
      user: {
        id: response.userId,
        email,
        password: TEST_PASSWORD,
        name: response.userName,
      },
    };
  } catch (error) {
    console.error("Failed to seed host admin data:", error);
    return null;
  }
}

/**
 * Seeds multiple platform tenants for list testing
 */
export async function seedPlatformTenants(
  count: number = 3
): Promise<Array<{ id: string; name: string }>> {
  try {
    const response = await apiClient.post<{ tenants: Array<{ id: string; name: string }> }>(
      "/test/seed-platform-tenants",
      {
        count,
      }
    );
    return response.tenants;
  } catch (error) {
    console.error("Failed to seed platform tenants:", error);
    return [];
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
    const response = await apiClient.post<{ processedCount?: number }>("/test/drain-outbox");
    return { processedCount: response.processedCount || 0 };
  } catch (error) {
    console.error("Failed to drain outbox:", error);
    return { processedCount: 0 };
  }
}
