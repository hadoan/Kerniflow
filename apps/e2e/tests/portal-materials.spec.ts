import { test, expect } from "@playwright/test";
import { apiClient } from "../utils/api.ts";

const PORTAL_URL = process.env.PORTAL_URL || "http://localhost:8083";

interface SeedPortalResult {
  tenantId: string;
  workspaceId: string;
  workspaceSlug: string;
  studentUserId: string;
  studentEmail: string;
  documentTitle: string;
  documentId: string;
  invoiceId: string;
  invoiceNumber: string;
}

/**
 * Helper: seed portal data, get tokens, set auth state on the browser context.
 * Returns the seed result so tests can assert against it.
 */
async function setupPortalSession(
  page: import("@playwright/test").Page,
  context: import("@playwright/test").BrowserContext
) {
  // Seed data
  const seedResult = await apiClient.post<SeedPortalResult>("/test/portal/seed");

  // Get tokens
  const tokens = await apiClient.post<{ accessToken: string; refreshToken: string }>(
    "/test/portal/login",
    {
      email: seedResult.studentEmail,
      tenantId: seedResult.tenantId,
      workspaceId: seedResult.workspaceId,
    }
  );

  // Set refresh token cookie
  await context.addCookies([
    {
      name: "portal_refresh_token",
      value: tokens.refreshToken,
      domain: "localhost",
      path: "/portal/auth",
      httpOnly: true,
      secure: false,
      sameSite: "Lax",
    },
  ]);

  // Navigate to portal to establish origin for localStorage
  await page.goto(`${PORTAL_URL}/w/${seedResult.workspaceSlug}/login`);

  // Set Zustand persist state (isAuthenticated + user) so boot triggers refreshSession()
  await page.evaluate(
    (user) => {
      localStorage.setItem(
        "portal-auth",
        JSON.stringify({
          state: {
            isAuthenticated: true,
            user: {
              userId: user.userId,
              email: user.email,
              displayName: "E2E Test Student",
              role: "STUDENT",
            },
          },
          version: 0,
        })
      );
    },
    { userId: seedResult.studentUserId, email: seedResult.studentEmail }
  );

  // Navigate to dashboard (triggers boot → refresh → data fetch)
  await page.goto(`${PORTAL_URL}/w/${seedResult.workspaceSlug}`);

  return seedResult;
}

test.describe("Portal Materials", () => {
  test("Student can view class materials", async ({ page, context }) => {
    const seedResult = await setupPortalSession(page, context);

    await expect(page.getByText(seedResult.documentTitle)).toBeVisible({ timeout: 15000 });
  });

  test("Student can download a material", async ({ page, context }) => {
    const seedResult = await setupPortalSession(page, context);

    // Wait for materials to render
    await expect(page.getByText(seedResult.documentTitle)).toBeVisible({ timeout: 15000 });

    // Intercept the download-url API call to verify it has the correct document ID
    const downloadRequest = page.waitForRequest(
      (req) => req.url().includes("/portal/materials/") && req.url().includes("/download-url")
    );

    // Click the "Get File" button (only one material card in this test)
    await page.getByRole("button", { name: /get file/i }).click();

    // Verify the API request uses the correct document ID (not "undefined")
    const req = await downloadRequest;
    expect(req.url()).toContain(`/portal/materials/${seedResult.documentId}/download-url`);
    expect(req.url()).not.toContain("/undefined/");
  });

  test("Student can request an invoice download link", async ({ page, context }) => {
    const seedResult = await setupPortalSession(page, context);

    await expect(page.getByText(seedResult.invoiceNumber)).toBeVisible({ timeout: 15000 });

    const downloadRequest = page.waitForRequest(
      (req) => req.url().includes("/portal/invoices/") && req.url().includes("/download-url")
    );

    const invoiceCard = page.locator('[class*="rounded-[2rem]"]').filter({
      hasText: seedResult.invoiceNumber,
    });
    await invoiceCard.getByRole("button", { name: /download invoice/i }).click();

    const req = await downloadRequest;
    expect(req.url()).toContain(`/portal/invoices/${seedResult.invoiceId}/download-url`);
    expect(req.url()).not.toContain("/undefined/");
  });
});
