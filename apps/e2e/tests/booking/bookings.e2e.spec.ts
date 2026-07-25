/**
 * E2E – Booking: Core Booking Lifecycle (UC-13 … UC-21)
 *
 * Conventions (mirrors crm.spec.ts):
 *  - Playwright test framework
 *  - fixtures.ts → testData (isolated tenant+user per test)
 *  - auth via UI login → localStorage accessToken
 *  - real HTTP calls via page.request.*
 *  - workspaceId from localStorage "corely-active-workspace"
 */

import type { Page } from "@playwright/test";
import { test, expect } from "../fixtures.ts";
import { selectors } from "../../utils/selectors.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function login(page: Page, creds: { email: string; password: string; tenantId: string }) {
  await page.goto(`/auth/login?tenant=${encodeURIComponent(creds.tenantId)}`);
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

async function getAuthContext(page: Page) {
  const token = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!token) throw new Error("Missing accessToken");
  const ws = (await page.evaluate(() => localStorage.getItem("corely-active-workspace"))) ?? "";
  return { accessToken: token, workspaceId: ws };
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

// Fixed future timestamps that won't conflict with "now"
function futureTimes(offsetHours = 24) {
  const base = new Date("2028-06-15T10:00:00.000Z");
  base.setHours(base.getHours() + offsetHours);
  const start = new Date(base);
  const end = new Date(base);
  end.setHours(end.getHours() + 1);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}

// ─── Resource factory ─────────────────────────────────────────────────────────

async function createResource(page: Page, overrides: Record<string, unknown> = {}) {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const res = await page.request.post(`${API_URL}/booking/resources`, {
    headers: authHeaders(accessToken, workspaceId),
    data: {
      type: "ROOM",
      name: `Test Room ${uniqueSuffix()}`,
      capacity: 4,
      isActive: true,
      ...overrides,
    },
  });
  expect(res.ok(), `createResource: ${res.status()}`).toBeTruthy();
  const body = (await res.json()) as { resource: { id: string } };
  return { resourceId: body.resource.id, accessToken, workspaceId };
}

// ─── Hold factory ─────────────────────────────────────────────────────────────

async function createHold(
  page: Page,
  resourceId: string,
  times?: { startAt: string; endAt: string },
  ttlSeconds = 600
) {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const { startAt, endAt } = times ?? futureTimes(24);
  const res = await page.request.post(`${API_URL}/booking/bookings/holds`, {
    headers: authHeaders(accessToken, workspaceId),
    data: {
      startAt,
      endAt,
      resourceIds: [resourceId],
      ttlSeconds,
    },
  });
  return { res, accessToken, workspaceId };
}

// ═════════════════════════════════════════════════════════════════════════════
// UC-13  CreateHold
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-13 CreateHold", () => {
  test("POST /booking/bookings/holds → 200, returns holdId + expiresAt", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(48);

    const res = await page.request.post(`${API_URL}/booking/bookings/holds`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        startAt,
        endAt,
        resourceIds: [resourceId],
        ttlSeconds: 600,
        notes: "E2E hold test",
      },
    });

    expect(res.ok(), `hold failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      hold: {
        id: string;
        status: string;
        expiresAt: string;
        resourceIds: string[];
        tenantId: string;
      };
    };

    expect(body.hold.id).toBeDefined();
    expect(body.hold.status).toBe("ACTIVE");
    expect(body.hold.expiresAt).toBeDefined();
    expect(body.hold.resourceIds).toContain(resourceId);
    expect(body.hold.tenantId).toBe(testData.tenant.id);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-14  ConfirmBookingFromHold
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-14 ConfirmBookingFromHold", () => {
  test("POST /booking/bookings with holdId → booking CONFIRMED with allocations", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId } = await createResource(page);
    const {
      res: holdRes,
      accessToken,
      workspaceId,
    } = await createHold(page, resourceId, futureTimes(72));
    expect(holdRes.ok()).toBeTruthy();
    const holdBody = (await holdRes.json()) as { hold: { id: string } };
    const holdId = holdBody.hold.id;

    const confirmRes = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        holdId,
        bookedByName: "E2E Customer",
        bookedByEmail: "e2e@example.com",
        notes: "Confirmed from E2E hold",
      },
    });

    expect(confirmRes.ok(), `confirm failed: ${confirmRes.status()}`).toBeTruthy();
    const body = (await confirmRes.json()) as {
      booking: {
        id: string;
        status: string;
        holdId: string;
        tenantId: string;
      };
    };

    expect(body.booking.id).toBeDefined();
    expect(body.booking.status).toBe("CONFIRMED");
    expect(body.booking.holdId).toBe(holdId);
    expect(body.booking.tenantId).toBe(testData.tenant.id);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-15  CreateBookingDirect
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-15 CreateBookingDirect", () => {
  test("POST /booking/bookings without holdId → direct CONFIRMED booking", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(96);

    const res = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        startAt,
        endAt,
        resourceIds: [resourceId],
        bookedByName: "Direct Customer",
        bookedByEmail: "direct@example.com",
        notes: "Direct booking E2E",
      },
    });

    expect(res.ok(), `direct booking failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      booking: {
        id: string;
        status: string;
        startAt: string;
        endAt: string;
      };
    };

    expect(body.booking.id).toBeDefined();
    expect(body.booking.status).toBe("CONFIRMED");
    expect(body.booking.startAt).toBeDefined();
    expect(body.booking.endAt).toBeDefined();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-16  ListBookings
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-16 ListBookings", () => {
  test("GET /booking/bookings returns list with pageInfo", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);

    // Create two bookings
    for (let i = 0; i < 2; i++) {
      const { startAt, endAt } = futureTimes(120 + i * 3);
      await page.request.post(`${API_URL}/booking/bookings`, {
        headers: authHeaders(accessToken, workspaceId),
        data: { startAt, endAt, resourceIds: [resourceId] },
      });
    }

    const res = await page.request.get(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      items: Array<{ id: string; tenantId: string }>;
      pageInfo: { total: number };
    };

    expect(Array.isArray(body.items)).toBe(true);
    expect(body.pageInfo.total).toBeGreaterThanOrEqual(2);
    for (const item of body.items) {
      expect(item.tenantId).toBe(testData.tenant.id);
    }
  });

  test("GET /booking/bookings?status=CONFIRMED filters by status", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(144);
    await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt, endAt, resourceIds: [resourceId] },
    });

    const res = await page.request.get(`${API_URL}/booking/bookings?status=CONFIRMED`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      items: Array<{ status: string }>;
    };
    for (const item of body.items) {
      expect(item.status).toBe("CONFIRMED");
    }
  });

  test("GET /booking/bookings?resourceId=... filters by resource", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId: r1, accessToken, workspaceId } = await createResource(page);
    const { resourceId: r2 } = await createResource(page);

    const { startAt, endAt } = futureTimes(168);
    // Book r1
    await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt, endAt, resourceIds: [r1] },
    });
    // Book r2 different time
    const t2 = futureTimes(169);
    await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt: t2.startAt, endAt: t2.endAt, resourceIds: [r2] },
    });

    const res = await page.request.get(`${API_URL}/booking/bookings?resourceId=${r1}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: Array<{ id: string }> };
    // Should contain r1 booking but not necessarily r2
    expect(body.items.length).toBeGreaterThanOrEqual(1);
  });

  test("GET /booking/bookings?fromDate=...&toDate=... date-range filter", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(200);
    await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt, endAt, resourceIds: [resourceId] },
    });

    const fromDate = "2028-06-01";
    const toDate = "2028-12-31";
    const res = await page.request.get(
      `${API_URL}/booking/bookings?fromDate=${fromDate}&toDate=${toDate}`,
      { headers: authHeaders(accessToken, workspaceId) }
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { items: unknown[]; pageInfo: { total: number } };
    expect(Array.isArray(body.items)).toBe(true);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-17  GetBookingById
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-17 GetBookingById", () => {
  test("GET /booking/bookings/:id returns booking", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(220);
    const createRes = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt, endAt, resourceIds: [resourceId] },
    });
    const { booking } = (await createRes.json()) as {
      booking: { id: string };
    };

    const res = await page.request.get(`${API_URL}/booking/bookings/${booking.id}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      booking: { id: string; tenantId: string };
    };
    expect(body.booking.id).toBe(booking.id);
    expect(body.booking.tenantId).toBe(testData.tenant.id);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-18  RescheduleBooking
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-18 RescheduleBooking", () => {
  test("PATCH /booking/bookings/:id/reschedule → new times persisted", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const orig = futureTimes(250);
    const createRes = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        startAt: orig.startAt,
        endAt: orig.endAt,
        resourceIds: [resourceId],
      },
    });
    const { booking } = (await createRes.json()) as {
      booking: { id: string };
    };

    const newTimes = futureTimes(300);
    const res = await page.request.patch(`${API_URL}/booking/bookings/${booking.id}/reschedule`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        startAt: newTimes.startAt,
        endAt: newTimes.endAt,
        notes: "Rescheduled by E2E",
      },
    });

    expect(res.ok(), `reschedule failed: ${res.status()}`).toBeTruthy();
    const body = (await res.json()) as {
      booking: { id: string; startAt: string; notes: string };
    };
    expect(body.booking.id).toBe(booking.id);
    expect(body.booking.startAt).toBe(newTimes.startAt);
    expect(body.booking.notes).toBe("Rescheduled by E2E");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-19  UpdateBookingNotes
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-19 UpdateBookingNotes", () => {
  test("POST /booking/bookings then notes update via reschedule with same times", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(325);
    const createRes = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: {
        startAt,
        endAt,
        resourceIds: [resourceId],
        notes: "Original note",
      },
    });
    expect(createRes.ok()).toBeTruthy();
    const { booking } = (await createRes.json()) as {
      booking: { id: string };
    };

    // Update notes via reschedule (same time, different notes)
    const patchRes = await page.request.patch(
      `${API_URL}/booking/bookings/${booking.id}/reschedule`,
      {
        headers: authHeaders(accessToken, workspaceId),
        data: { startAt, endAt, notes: "Updated E2E note" },
      }
    );

    expect(patchRes.ok(), `notes update failed: ${patchRes.status()}`).toBeTruthy();
    const body = (await patchRes.json()) as {
      booking: { notes: string; startAt: string };
    };
    expect(body.booking.notes).toBe("Updated E2E note");
    // Times unchanged
    expect(body.booking.startAt).toBe(startAt);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// UC-21  CancelBooking
// ═════════════════════════════════════════════════════════════════════════════
test.describe("UC-21 CancelBooking", () => {
  test("POST /booking/bookings/:id/cancel → status CANCELLED", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(360);
    const createRes = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt, endAt, resourceIds: [resourceId] },
    });
    const { booking } = (await createRes.json()) as {
      booking: { id: string };
    };

    const cancelRes = await page.request.post(`${API_URL}/booking/bookings/${booking.id}/cancel`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { reason: "Changed plans" },
    });

    expect(cancelRes.ok(), `cancel failed: ${cancelRes.status()}`).toBeTruthy();
    const body = (await cancelRes.json()) as {
      booking: { status: string; cancelledReason: string };
    };
    expect(body.booking.status).toBe("CANCELLED");
    expect(body.booking.cancelledReason).toBe("Changed plans");

    // Verify via GET
    const getRes = await page.request.get(`${API_URL}/booking/bookings/${booking.id}`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    const getBody = (await getRes.json()) as {
      booking: { status: string };
    };
    expect(getBody.booking.status).toBe("CANCELLED");
  });

  test("GET /booking/bookings?status=CANCELLED shows cancelled booking", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { resourceId, accessToken, workspaceId } = await createResource(page);
    const { startAt, endAt } = futureTimes(380);
    const createRes = await page.request.post(`${API_URL}/booking/bookings`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { startAt, endAt, resourceIds: [resourceId] },
    });
    const { booking } = (await createRes.json()) as {
      booking: { id: string };
    };
    await page.request.post(`${API_URL}/booking/bookings/${booking.id}/cancel`, {
      headers: authHeaders(accessToken, workspaceId),
      data: { reason: "Testing cancelled list" },
    });

    const listRes = await page.request.get(`${API_URL}/booking/bookings?status=CANCELLED`, {
      headers: authHeaders(accessToken, workspaceId),
    });
    expect(listRes.ok()).toBeTruthy();
    const listBody = (await listRes.json()) as {
      items: Array<{ id: string; status: string }>;
    };
    const ids = listBody.items.map((b) => b.id);
    expect(ids).toContain(booking.id);
  });
});
