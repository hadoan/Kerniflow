/**
 * E2E – Booking: Resource Management
 *
 * Conventions followed (mirrors crm.spec.ts + customers.spec.ts):
 *  - Playwright test framework
 *  - fixtures.ts provides `testData` (isolated tenant+user per test)
 *  - auth via UI login, then `localStorage.getItem("accessToken")`
 *  - workspaceId from `localStorage.getItem("corely-active-workspace")`
 *  - real HTTP calls via `page.request.*` with Authorization + X-Workspace-Id headers
 *  - test harness at POST /test/reset for cross-tenant isolation checks
 *
 * Covered use cases:
 *  UC-1  CreateResource       – POST /booking/resources
 *  UC-2  ListResources        – GET  /booking/resources (pagination, tenant scoping)
 *  UC-3  GetResourceById      – GET  /booking/resources/:id (cross-tenant 404)
 *  UC-4  UpdateResource       – PATCH /booking/resources/:id
 *  UC-5  DeleteResource       – DELETE /booking/resources/:id
 */

import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";
import { seedTestData, resetTestData } from "../../utils/testData.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function login(page: Page, creds: { email: string; password: string; tenantId: string }) {
  await page.goto(`/auth/login?tenant=${encodeURIComponent(creds.tenantId)}`);
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

async function getAuthContext(page: Page): Promise<{ accessToken: string; workspaceId: string }> {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) throw new Error("Missing access token in localStorage");
  const workspaceId =
    (await page.evaluate(() => localStorage.getItem("corely-active-workspace"))) ?? "";
  return { accessToken, workspaceId };
}

function authHeaders(accessToken: string, workspaceId: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
  };
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ─── Resource factory ─────────────────────────────────────────────────────────

async function createTestResource(page: Page, overrides: Record<string, unknown> = {}) {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const suffix = uniqueSuffix();
  const payload = {
    type: "ROOM",
    name: `E2E Room ${suffix}`,
    description: "Created by E2E test",
    capacity: 10,
    tags: ["e2e"],
    isActive: true,
    ...overrides,
  };
  const res = await page.request.post(`${API_URL}/booking/resources`, {
    headers: authHeaders(accessToken, workspaceId),
    data: payload,
  });
  expect(res.ok(), `createTestResource failed: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { resource: { id: string } };
  return { resourceId: body.resource.id, suffix, workspaceId, accessToken };
}

// ═════════════════════════════════════════════════════════════════════════════
// UC-1  CreateResource
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-1 CreateResource", () => {
  test("POST /booking/resources → 200, returns persisted resource", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { accessToken, workspaceId } = await getAuthContext(page);
    const suffix = uniqueSuffix();

    const res = await page.request.post(`${API_URL}/booking/resources`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        type: "STAFF",
        name: `E2E Staff ${suffix}`,
        description: "A test staff member",
        capacity: 1,
        tags: ["haircut", "coloring"],
        attributes: { color: "blue" },
        isActive: true,
      },
    });

    expect(res.ok(), `Expected 200, got ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      resource: {
        id: string;
        name: string;
        type: string;
        capacity: number;
        isActive: boolean;
        tenantId: string;
        tags: string[];
      };
    };

    expect(body.resource.id).toBeDefined();
    expect(body.resource.name).toBe(`E2E Staff ${suffix}`);
    expect(body.resource.type).toBe("STAFF");
    expect(body.resource.capacity).toBe(1);
    expect(body.resource.isActive).toBe(true);
    expect(body.resource.tenantId).toBe(testData.tenant.id);

    // Verify it persists via GET
    const getRes = await page.request.get(`${API_URL}/booking/resources/${body.resource.id}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(getRes.ok()).toBeTruthy();
    const getBody = (await getRes.json()) as { resource: { id: string } };
    expect(getBody.resource.id).toBe(body.resource.id);
  });

  test("POST /booking/resources with EQUIPMENT type → persisted correctly", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { accessToken, workspaceId } = await getAuthContext(page);
    const suffix = uniqueSuffix();

    const res = await page.request.post(`${API_URL}/booking/resources`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        type: "EQUIPMENT",
        name: `E2E Equipment ${suffix}`,
        isActive: true,
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { resource: { type: string } };
    expect(body.resource.type).toBe("EQUIPMENT");
  });

  test("POST /booking/resources appears in list after creation", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createTestResource(page);

    const listRes = await page.request.get(`${API_URL}/booking/resources`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as { items: Array<{ id: string }> };
    const ids = listBody.items.map((r) => r.id);
    expect(ids).toContain(resourceId);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-2  ListResources
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-2 ListResources", () => {
  test("GET /booking/resources returns only own-tenant resources and includes pageInfo", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    await createTestResource(page, { type: "ROOM", name: `List Res A ${uniqueSuffix()}` });
    await createTestResource(page, { type: "STAFF", name: `List Res B ${uniqueSuffix()}` });

    const { accessToken, workspaceId } = await getAuthContext(page);
    const res = await page.request.get(`${API_URL}/booking/resources`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      items: Array<{ id: string; tenantId: string }>;
      pageInfo: { total: number; page: number; pageSize: number };
    };

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.pageInfo).toBeDefined();
    expect(body.pageInfo.total).toBeGreaterThanOrEqual(2);
    // All returned items belong to our tenant
    for (const item of body.items) {
      expect(item.tenantId).toBe(testData.tenant.id);
    }
  });

  test("GET /booking/resources?type=STAFF filters by type", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    await createTestResource(page, { type: "STAFF", name: `Staff Only ${uniqueSuffix()}` });
    await createTestResource(page, { type: "ROOM", name: `Room Ignored ${uniqueSuffix()}` });

    const { accessToken, workspaceId } = await getAuthContext(page);
    const res = await page.request.get(`${API_URL}/booking/resources?type=STAFF`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: Array<{ type: string }> };
    for (const item of body.items) {
      expect(item.type).toBe("STAFF");
    }
  });

  test("GET /booking/resources does NOT leak other-tenant resources (multi-tenancy)", async ({
    page,
    testData,
  }) => {
    // Tenant A: our main test tenant
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { accessToken: tokenA, workspaceId: wsA } = await getAuthContext(page);
    const suffix = uniqueSuffix();

    // Create resource under tenant A
    const createA = await page.request.post(`${API_URL}/booking/resources`, {
      headers: authHeaders(tokenA, wsA),
      data: { type: "ROOM", name: `TenantA Resource ${suffix}`, isActive: true },
    });
    expect(createA.ok()).toBeTruthy();
    const bodyA = (await createA.json()) as { resource: { id: string } };
    const resourceIdA = bodyA.resource.id;

    // Seed a second isolated tenant (Tenant B)
    const dataB = await seedTestData();
    if (!dataB) throw new Error("Failed to seed tenant B");

    try {
      // Login as Tenant B in a new browser context
      await page.goto(`/auth/login?tenant=${encodeURIComponent(dataB.tenant.id)}`);
      await page.fill(selectors.auth.loginEmailInput, dataB.user.email);
      await page.fill(selectors.auth.loginPasswordInput, dataB.user.password);
      await page.click(selectors.auth.loginSubmitButton);
      await page.waitForURL("**/dashboard", { timeout: 15_000 });

      const { accessToken: tokenB, workspaceId: wsB } = await getAuthContext(page);

      // Tenant B list should NOT contain tenant A's resource
      const listB = await page.request.get(`${API_URL}/booking/resources`, {
        headers: authHeaders(tokenB, wsB),
      });
      expect(listB.ok()).toBeTruthy();
      const listBodyB = (await listB.json()) as { items: Array<{ id: string }> };
      const idsB = listBodyB.items.map((r) => r.id);
      expect(idsB).not.toContain(resourceIdA);
    } finally {
      await resetTestData(dataB.tenant.id);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-3  GetResourceById
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-3 GetResourceById", () => {
  test("GET /booking/resources/:id returns the resource", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createTestResource(page);

    const res = await page.request.get(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      resource: { id: string; tenantId: string };
    };
    expect(body.resource.id).toBe(resourceId);
    expect(body.resource.tenantId).toBe(testData.tenant.id);
  });

  test("GET /booking/resources/:id from cross-tenant returns 404 or 403", async ({
    page,
    testData,
  }) => {
    // Tenant A creates a resource
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId } = await createTestResource(page);

    // Seed Tenant B
    const dataB = await seedTestData();
    if (!dataB) throw new Error("Failed to seed tenant B");

    try {
      await page.goto(`/auth/login?tenant=${encodeURIComponent(dataB.tenant.id)}`);
      await page.fill(selectors.auth.loginEmailInput, dataB.user.email);
      await page.fill(selectors.auth.loginPasswordInput, dataB.user.password);
      await page.click(selectors.auth.loginSubmitButton);
      await page.waitForURL("**/dashboard", { timeout: 15_000 });

      const { accessToken: tokenB, workspaceId: wsB } = await getAuthContext(page);

      // Attempt to get Tenant A's resource as Tenant B
      const res = await page.request.get(`${API_URL}/booking/resources/${resourceId}`, {
        headers: authHeaders(tokenB, wsB),
      });
      // Should be 404 (not found for this tenant) or 403
      expect([403, 404]).toContain(res.status());
    } finally {
      await resetTestData(dataB.tenant.id);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-4  UpdateResource
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-4 UpdateResource", () => {
  test("PATCH /booking/resources/:id updates name, capacity, attributes", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createTestResource(page, {
      capacity: 5,
      name: `Original ${uniqueSuffix()}`,
    });

    const updatedName = `Updated Room ${uniqueSuffix()}`;
    const res = await page.request.patch(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        name: updatedName,
        capacity: 20,
        attributes: { color: "red", amenities: ["projector"] },
      },
    });

    expect(res.ok(), `PATCH failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      resource: { name: string; capacity: number };
    };
    expect(body.resource.name).toBe(updatedName);
    expect(body.resource.capacity).toBe(20);

    // Verify persistence via GET
    const getRes = await page.request.get(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    const getBody = (await getRes.json()) as {
      resource: { name: string; capacity: number };
    };
    expect(getBody.resource.name).toBe(updatedName);
    expect(getBody.resource.capacity).toBe(20);
  });

  test("PATCH /booking/resources/:id can deactivate a resource", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createTestResource(page, {
      isActive: true,
    });

    const res = await page.request.patch(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { isActive: false },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { resource: { isActive: boolean } };
    expect(body.resource.isActive).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-5  DeleteResource
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-5 DeleteResource", () => {
  test("DELETE /booking/resources/:id → success; subsequent GET returns 404 or deleted flag", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createTestResource(page);

    // Delete
    const deleteRes = await page.request.delete(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(deleteRes.ok(), `DELETE failed: ${deleteRes.status()}`).toBeTruthy();

    // After delete: either 404 or a "deleted" flag on the resource
    const getRes = await page.request.get(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    if (getRes.ok()) {
      // Soft delete: resource still returned but may be flagged
      const body = (await getRes.json()) as {
        resource: { isActive?: boolean };
      };
      // At minimum, it should be inactive/soft-deleted
      expect(body.resource.isActive).toBe(false);
    } else {
      expect(getRes.status()).toBe(404);
    }
  });

  test("DELETE /booking/resources/:id → resource does not appear in list", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createTestResource(page);

    await page.request.delete(`${API_URL}/booking/resources/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });

    // Active list should not include deleted resource
    const listRes = await page.request.get(`${API_URL}/booking/resources?isActive=true`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string }>;
    };
    const ids = listBody.items.map((r) => r.id);
    expect(ids).not.toContain(resourceId);
  });
});
