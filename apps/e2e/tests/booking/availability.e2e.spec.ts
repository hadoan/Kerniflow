/**
 * E2E – Booking: Availability Rules
 *
 * Conventions followed (mirrors crm.spec.ts):
 *  - Playwright test framework
 *  - fixtures.ts provides `testData` (isolated tenant+user per test)
 *  - auth via UI login + localStorage token extraction
 *  - real HTTP calls via `page.request.*`
 *
 * Covered use cases:
 *  UC-11  UpsertAvailabilityRules – PUT /booking/availability/:resourceId
 *  UC-12  GetAvailabilityRules    – GET /booking/availability?resourceId=...
 */

import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";

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

// ─── Resource factory ─────────────────────────────────────────────────────────

async function createResource(page: Page, overrides: Record<string, unknown> = {}) {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const res = await page.request.post(`${API_URL}/booking/resources`, {
    headers: authHeaders(accessToken, workspaceId),
    data: {
      type: "ROOM",
      name: `Availability Room ${uniqueSuffix()}`,
      isActive: true,
      ...overrides,
    },
  });
  expect(res.ok(), `createResource failed: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { resource: { id: string } };
  return { resourceId: body.resource.id, accessToken, workspaceId };
}

// ─── Shared weekly slot fixture ───────────────────────────────────────────────

const WEEKLY_SLOTS = [
  { dayOfWeek: 1, startTime: "09:00", endTime: "17:00" }, // Monday
  { dayOfWeek: 2, startTime: "09:00", endTime: "17:00" }, // Tuesday
  { dayOfWeek: 3, startTime: "09:00", endTime: "17:00" }, // Wednesday
  { dayOfWeek: 4, startTime: "09:00", endTime: "17:00" }, // Thursday
  { dayOfWeek: 5, startTime: "09:00", endTime: "17:00" }, // Friday
];

// ═════════════════════════════════════════════════════════════════════════════
// UC-11  UpsertAvailabilityRules
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-11 UpsertAvailabilityRules", () => {
  test("PUT /booking/availability/:resourceId creates new rule with weekly slots", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    const res = await page.request.put(`${API_URL}/booking/availability/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        timezone: "Europe/Berlin",
        weeklySlots: WEEKLY_SLOTS,
        blackouts: [],
      },
    });

    expect(res.ok(), `PUT availability failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      rule: {
        id: string;
        resourceId: string;
        timezone: string;
        weeklySlots: Array<{ dayOfWeek: number }>;
        blackouts: unknown[];
      };
    };

    expect(body.rule.id).toBeDefined();
    expect(body.rule.resourceId).toBe(resourceId);
    expect(body.rule.timezone).toBe("Europe/Berlin");
    expect(body.rule.weeklySlots).toHaveLength(5);
    expect(body.rule.blackouts).toHaveLength(0);
  });

  test("PUT /booking/availability/:resourceId updates an existing rule (upsert)", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    // First upsert
    await page.request.put(`${API_URL}/booking/availability/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        timezone: "UTC",
        weeklySlots: [{ dayOfWeek: 1, startTime: "08:00", endTime: "16:00" }],
        blackouts: [],
      },
    });

    // Second upsert (override)
    const now = new Date("2027-01-01T00:00:00Z");
    const blackoutEnd = new Date("2027-01-03T23:59:59Z");
    const res = await page.request.put(`${API_URL}/booking/availability/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        timezone: "America/New_York",
        weeklySlots: WEEKLY_SLOTS,
        blackouts: [
          {
            startAt: now.toISOString(),
            endAt: blackoutEnd.toISOString(),
            reason: "New Year holiday",
          },
        ],
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      rule: {
        timezone: string;
        weeklySlots: unknown[];
        blackouts: unknown[];
      };
    };
    expect(body.rule.timezone).toBe("America/New_York");
    expect(body.rule.weeklySlots).toHaveLength(5);
    expect(body.rule.blackouts).toHaveLength(1);
  });

  test("PUT /booking/availability/:resourceId with blackout intervals", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    const blackoutStart = "2027-12-24T00:00:00.000Z";
    const blackoutEnd = "2027-12-26T23:59:59.000Z";

    const res = await page.request.put(`${API_URL}/booking/availability/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        timezone: "UTC",
        weeklySlots: WEEKLY_SLOTS,
        blackouts: [
          {
            startAt: blackoutStart,
            endAt: blackoutEnd,
            reason: "Christmas closure",
          },
        ],
      },
    });

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      rule: { blackouts: Array<{ reason: string }> };
    };
    expect(body.rule.blackouts[0]?.reason).toBe("Christmas closure");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-12  GetAvailabilityRules
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-12 GetAvailabilityRules", () => {
  test("GET /booking/availability?resourceId=... returns rule for the resource", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    // Upsert a rule first
    await page.request.put(`${API_URL}/booking/availability/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        timezone: "Europe/London",
        weeklySlots: WEEKLY_SLOTS,
        blackouts: [],
      },
    });

    // Use a date range 6 months out to get slots
    const from = "2027-06-01T00:00:00.000Z";
    const to = "2027-06-07T23:59:59.000Z";

    const res = await page.request.get(
      `${API_URL}/booking/availability?resourceId=${resourceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: authHeaders(accessToken, workspaceId) }
    );

    expect(res.ok(), `GET availability failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      slots: Array<{ resourceId: string; isAvailable: boolean }>;
      rule: { resourceId: string; weeklySlots: unknown[] } | null;
    };

    // rule should be returned
    expect(body.rule).not.toBeNull();
    expect(body.rule?.resourceId).toBe(resourceId);
    expect(body.rule?.weeklySlots).toHaveLength(5);
    // slots array present
    expect(Array.isArray(body.slots)).toBe(true);
  });

  test("GET /booking/availability?resourceId=... for resource with no rules returns null rule", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    const from = "2027-06-01T00:00:00.000Z";
    const to = "2027-06-07T23:59:59.000Z";

    const res = await page.request.get(
      `${API_URL}/booking/availability?resourceId=${resourceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: authHeaders(accessToken, workspaceId) }
    );

    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { rule: null | object };
    // No rule set yet, should be null
    expect(body.rule).toBeNull();
  });

  test("PUT then GET returns consistent rule data", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    const slots = [
      { dayOfWeek: 2, startTime: "10:00", endTime: "18:00" },
      { dayOfWeek: 4, startTime: "10:00", endTime: "18:00" },
    ];

    const putRes = await page.request.put(`${API_URL}/booking/availability/${resourceId}`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        timezone: "UTC",
        weeklySlots: slots,
        blackouts: [],
      },
    });
    expect(putRes.ok()).toBeTruthy();
    const putBody = (await putRes.json()) as {
      rule: { weeklySlots: Array<{ dayOfWeek: number }> };
    };

    const from = "2027-07-01T00:00:00.000Z";
    const to = "2027-07-14T23:59:59.000Z";
    const getRes = await page.request.get(
      `${API_URL}/booking/availability?resourceId=${resourceId}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
      { headers: authHeaders(accessToken, workspaceId) }
    );
    expect(getRes.ok()).toBeTruthy();
    const getBody = (await getRes.json()) as {
      rule: { weeklySlots: Array<{ dayOfWeek: number }> };
    };

    // Rule persisted is same as what was PUT
    expect(getBody.rule?.weeklySlots.length).toBe(putBody.rule.weeklySlots.length);
    const getDays = getBody.rule?.weeklySlots.map((s) => s.dayOfWeek).sort();
    const putDays = putBody.rule.weeklySlots.map((s) => s.dayOfWeek).sort();
    expect(getDays).toEqual(putDays);
  });
});
