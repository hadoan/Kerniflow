import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function login(
  page: Page,
  creds: {
    email: string;
    password: string;
    tenantId: string;
  }
) {
  await page.goto(`/auth/login?tenant=${encodeURIComponent(creds.tenantId)}`);
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function getAuthContext(
  page: Page
): Promise<{ accessToken: string; workspaceId: string | null }> {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) {
    throw new Error("Missing access token");
  }
  const workspaceId = await page.evaluate(() => localStorage.getItem("corely-active-workspace"));
  return { accessToken, workspaceId };
}

async function createWebsiteSiteFixture(
  page: Page,
  suffix: string
): Promise<{ siteId: string; siteName: string }> {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const siteName = `E2E Website ${suffix}`;
  const siteSlug = `e2e-${suffix}`.toLowerCase();

  const response = await page.request.post(`${API_URL}/website/sites`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    data: {
      name: siteName,
      slug: siteSlug,
      defaultLocale: "en-US",
      isDefault: false,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { id?: string; site?: { id?: string } };
  const siteId = body.id ?? body.site?.id;
  if (!siteId) {
    throw new Error("Could not resolve created site id");
  }

  return { siteId, siteName };
}

test.describe("Website Wall Of Love", () => {
  test("manages wall-of-love items and exposes published data via public API", async ({
    page,
    testData,
  }) => {
    const suffix = uniqueSuffix();
    const quote = `Wall quote ${suffix}`;

    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const { siteId } = await createWebsiteSiteFixture(page, suffix);
    await page.goto(`/website/sites/${siteId}/wall-of-love`);

    await expect(page.getByText("Wall Of Love", { exact: true }).first()).toBeVisible();

    await page.locator("select").first().selectOption("x");
    await page
      .getByPlaceholder("https://x.com/username/status/...")
      .fill("https://twitter.com/corely/status/12345");
    await page.getByPlaceholder("What did the customer say?").fill(quote);
    await page.getByPlaceholder("Jane Doe").fill("E2E Customer");
    await page.getByRole("button", { name: "Create item" }).click();

    const publishButton = page.getByRole("button", { name: "Publish" }).first();
    await expect(publishButton).toBeVisible();
    await publishButton.click();
    await expect(page.getByText("published").first()).toBeVisible();

    const { accessToken, workspaceId } = await getAuthContext(page);
    const draftResponse = await page.request.post(
      `${API_URL}/website/sites/${siteId}/wall-of-love/items`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
        },
        data: {
          type: "image",
          quote: `Draft only ${suffix}`,
          imageFileIds: ["file-draft-only"],
        },
      }
    );
    expect(draftResponse.ok()).toBeTruthy();

    const publicResponse = await page.request.get(
      `${API_URL}/public/website/wall-of-love?siteId=${encodeURIComponent(siteId)}`
    );
    expect(publicResponse.ok()).toBeTruthy();
    const publicBody = (await publicResponse.json()) as {
      items?: Array<{ quote?: string; status?: string; type?: string; linkUrl?: string }>;
    };

    expect(publicBody.items?.length).toBe(1);
    expect(publicBody.items?.[0]?.quote).toBe(quote);
    expect(publicBody.items?.[0]?.type).toBe("x");
    expect(publicBody.items?.[0]?.linkUrl).toBe("https://x.com/corely/status/12345");

    await page.screenshot({
      path: path.resolve("output/playwright/website-wall-of-love-admin.png"),
      fullPage: true,
    });

    const unpublishButton = page.getByRole("button", { name: "Unpublish" }).first();
    await expect(unpublishButton).toBeVisible();
    await unpublishButton.click();
    await expect(page.getByText("draft").first()).toBeVisible();

    await page.screenshot({
      path: path.resolve("output/playwright/website-wall-of-love-admin-unpublished.png"),
      fullPage: true,
    });
  });
});
