/**
 * E2E – Booking: Service Offerings
 *
 * Conventions followed (mirrors crm.spec.ts):
 *  - Playwright test framework
 *  - fixtures.ts provides `testData` (isolated tenant+user per test)
 *  - auth via UI login + localStorage token extraction
 *  - real HTTP calls via `page.request.*`
 *
 * Covered use cases:
 *  UC-6   CreateServiceOffering – POST /booking/services
 *  UC-7   ListServiceOfferings  – GET  /booking/services
 *  UC-8   GetServiceOfferingById– GET  /booking/services/:id (cross-tenant)
 *  UC-9   UpdateServiceOffering – PATCH /booking/services/:id
 *  UC-10  DeleteServiceOffering – DELETE /booking/services/:id
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

async function getAuthContext(page: Page) {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) throw new Error("Missing access token");
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

// ─── Service factory ──────────────────────────────────────────────────────────

async function createTestService(page: Page, overrides: Record<string, unknown> = {}) {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const suffix = uniqueSuffix();
  const res = await page.request.post(`${API_URL}/booking/services`, {
    headers: authHeaders(accessToken, workspaceId),
    data: {
      name: `E2E Service ${suffix}`,
      description: "Test service",
      durationMinutes: 60,
      bufferBeforeMinutes: 5,
      bufferAfterMinutes: 10,
      priceCents: 5000,
      currency: "EUR",
      isActive: true,
      ...overrides,
    },
  });
  expect(res.ok(), `createTestService failed: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { service: { id: string } };
  return { serviceId: body.service.id, suffix, accessToken, workspaceId };
}

// ═════════════════════════════════════════════════════════════════════════════
// UC-6  CreateServiceOffering
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-6 CreateServiceOffering", () => {
  test("POST /booking/services → 200, fully persisted service returned", async ({
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

    const res = await page.request.post(`${API_URL}/booking/services`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        name: `Premium Haircut ${suffix}`,
        description: "60-minute service with buffers",
        durationMinutes: 60,
        bufferBeforeMinutes: 5,
        bufferAfterMinutes: 15,
        priceCents: 9500,
        currency: "EUR",
        depositCents: 2000,
        requiredResourceTypes: ["STAFF"],
        requiredTags: ["haircut"],
        isActive: true,
      },
    });

    expect(res.ok(), `POST /booking/services failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      service: {
        id: string;
        name: string;
        durationMinutes: number;
        bufferBeforeMinutes: number;
        bufferAfterMinutes: number;
        priceCents: number;
        currency: string;
        depositCents: number;
        requiredResourceTypes: string[];
        isActive: boolean;
        tenantId: string;
      };
    };

    expect(body.service.id).toBeDefined();
    expect(body.service.name).toBe(`Premium Haircut ${suffix}`);
    expect(body.service.durationMinutes).toBe(60);
    expect(body.service.bufferBeforeMinutes).toBe(5);
    expect(body.service.bufferAfterMinutes).toBe(15);
    expect(body.service.priceCents).toBe(9500);
    expect(body.service.currency).toBe("EUR");
    expect(body.service.depositCents).toBe(2000);
    expect(body.service.requiredResourceTypes).toContain("STAFF");
    expect(body.service.isActive).toBe(true);
    expect(body.service.tenantId).toBe(testData.tenant.id);

    // Verify persistence
    const getRes = await page.request.get(`${API_URL}/booking/services/${body.service.id}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(getRes.ok()).toBeTruthy();
  });

  test("POST /booking/services appears in list after creation", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { serviceId, accessToken, workspaceId } = await createTestService(page);

    const listRes = await page.request.get(`${API_URL}/booking/services`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as { items: Array<{ id: string }> };
    expect(listBody.items.map((s) => s.id)).toContain(serviceId);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-7  ListServiceOfferings
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-7 ListServiceOfferings", () => {
  test("GET /booking/services returns tenant-scoped list with pageInfo", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    await createTestService(page);
    await createTestService(page, { name: `Service B ${uniqueSuffix()}` });

    const { accessToken, workspaceId } = await getAuthContext(page);
    const res = await page.request.get(`${API_URL}/booking/services`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      items: Array<{ id: string; tenantId: string }>;
      pageInfo: { total: number };
    };

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.pageInfo).toBeDefined();
    expect(body.pageInfo.total).toBeGreaterThanOrEqual(2);
    // All items belong to tenant
    for (const item of body.items) {
      expect(item.tenantId).toBe(testData.tenant.id);
    }
  });

  test("GET /booking/services?isActive=false filters inactive services", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    await createTestService(page, {
      name: `Inactive Svc ${uniqueSuffix()}`,
      isActive: false,
    });

    const { accessToken, workspaceId } = await getAuthContext(page);
    const res = await page.request.get(`${API_URL}/booking/services?isActive=false`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: Array<{ isActive: boolean }> };
    for (const item of body.items) {
      expect(item.isActive).toBe(false);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-8  GetServiceOfferingById
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-8 GetServiceOfferingById", () => {
  test("GET /booking/services/:id returns the service", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { serviceId, accessToken, workspaceId } = await createTestService(page);

    const res = await page.request.get(`${API_URL}/booking/services/${serviceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      service: { id: string; tenantId: string };
    };
    expect(body.service.id).toBe(serviceId);
    expect(body.service.tenantId).toBe(testData.tenant.id);
  });

  test("GET /booking/services/:id cross-tenant access blocked (404 or 403)", async ({
    page,
    testData,
  }) => {
    // Tenant A creates a service
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { serviceId } = await createTestService(page);

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

      const res = await page.request.get(`${API_URL}/booking/services/${serviceId}`, {
        headers: authHeaders(tokenB, wsB),
      });
      expect([403, 404]).toContain(res.status());
    } finally {
      await resetTestData(dataB.tenant.id);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-9  UpdateServiceOffering
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-9 UpdateServiceOffering", () => {
  test("PATCH /booking/services/:id updates duration, buffers, price, deposit", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { serviceId, accessToken, workspaceId } = await createTestService(page, {
      durationMinutes: 30,
      priceCents: 3000,
    });

    const res = await page.request.patch(`${API_URL}/booking/services/${serviceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        durationMinutes: 90,
        bufferBeforeMinutes: 10,
        bufferAfterMinutes: 20,
        priceCents: 12000,
        depositCents: 3000,
        currency: "USD",
      },
    });

    expect(res.ok(), `PATCH failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      service: {
        durationMinutes: number;
        bufferBeforeMinutes: number;
        priceCents: number;
        depositCents: number;
        currency: string;
      };
    };
    expect(body.service.durationMinutes).toBe(90);
    expect(body.service.bufferBeforeMinutes).toBe(10);
    expect(body.service.priceCents).toBe(12000);
    expect(body.service.depositCents).toBe(3000);
    expect(body.service.currency).toBe("USD");

    // Verify persistence
    const getRes = await page.request.get(`${API_URL}/booking/services/${serviceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    const getBody = (await getRes.json()) as {
      service: { durationMinutes: number };
    };
    expect(getBody.service.durationMinutes).toBe(90);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-10  DeleteServiceOffering
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-10 DeleteServiceOffering", () => {
  test("DELETE /booking/services/:id → removed from list; GET fails", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { serviceId, accessToken, workspaceId } = await createTestService(page);

    const deleteRes = await page.request.delete(`${API_URL}/booking/services/${serviceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(deleteRes.ok()).toBeTruthy();

    // After delete: 404 or soft-deleted flag
    const getRes = await page.request.get(`${API_URL}/booking/services/${serviceId}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    if (getRes.ok()) {
      const body = (await getRes.json()) as {
        service: { isActive?: boolean };
      };
      expect(body.service.isActive).toBe(false);
    } else {
      expect(getRes.status()).toBe(404);
    }

    // Active list should exclude deleted service
    const listRes = await page.request.get(`${API_URL}/booking/services?isActive=true`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string }>;
    };
    expect(listBody.items.map((s) => s.id)).not.toContain(serviceId);
  });
});
