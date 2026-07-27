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

async function createWebsiteSiteFixture(page: Page, suffix: string): Promise<{ siteId: string }> {
  const { accessToken, workspaceId } = await getAuthContext(page);
  const siteName = `E2E External Content ${suffix}`;
  const siteSlug = `e2e-ext-${suffix}`.toLowerCase();

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

  return { siteId };
}

test.describe("Website External Content Editor", () => {
  test("edits generated content via search dialog and publishes to public API", async ({
    page,
    testData,
  }) => {
    const suffix = uniqueSuffix();
    const updatedHeadline = `Updated headline ${suffix}`;
    const heroImageFileId = `file_hero_${suffix}`;
    const logoFileId = `file_logo_${suffix}`;
    const heroVisualAsset = `file_visual_${suffix}`;

    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const { siteId } = await createWebsiteSiteFixture(page, suffix);
    await page.goto(`/website/sites/${siteId}/edit?tab=external-content`);

    await expect(
      page.getByRole("heading", { name: "External Content", exact: true })
    ).toBeVisible();

    const schemaSource = `import { z } from "zod";
export const SiteCopySchema = z.object({
  hero: z.object({
    headline: z.string(),
    subheadline: z.string(),
    heroImageFileId: z.string(),
    visualAsset: z.string().describe("file:image"),
  }).optional(),
  features: z.object({
    items: z.array(z.object({
      title: z.string(),
      description: z.string(),
    })),
  }).optional(),
  testimonials: z.object({
    logoFileIds: z.array(z.string()),
  }).optional(),
}).passthrough();`;

    const defaultSource = `export const defaultSiteCopy = {
  hero: {
    headline: "Original hero headline",
    subheadline: "Original hero subheadline",
    heroImageFileId: "",
    visualAsset: "",
  },
  features: {
    items: [
      {
        title: "Booking",
        description: "Description",
      },
    ],
  },
  testimonials: {
    logoFileIds: [],
  },
};`;

    await page.locator("#site-copy-schema-source").fill(schemaSource);
    await page.locator("#site-copy-default-source").fill(defaultSource);
    await page.getByRole("button", { name: "Generate Editor" }).click();

    const heroTrigger = page.getByRole("button", { name: /^hero$/i });
    const headlineLabel = page
      .locator("label")
      .filter({ hasText: /^headline$/i })
      .first();

    await expect(heroTrigger).toBeVisible();
    await expect(headlineLabel).not.toBeVisible();

    await heroTrigger.click();
    await expect(headlineLabel).toBeVisible();

    await page.getByRole("button", { name: "Collapse all" }).click();
    await expect(headlineLabel).not.toBeVisible();

    await page.getByRole("button", { name: "Search fields" }).click();
    await expect(page.getByPlaceholder("Search keys or content...")).toBeVisible();

    await page.getByPlaceholder("Search keys or content...").fill("hero.headline");
    await page.getByText("hero.headline").first().click();

    const dialog = page.getByRole("dialog").last();
    await expect(dialog.locator("label").filter({ hasText: /^Field$/ })).toBeVisible();
    await expect(dialog.getByText("hero.headline", { exact: true })).toBeVisible();
    await dialog.locator('input[value="Original hero headline"]').fill(updatedHeadline);
    await dialog.getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: "Search fields" }).click();
    await page.getByPlaceholder("Search keys or content...").fill("hero.heroImageFileId");
    await page.getByText("hero.heroImageFileId").first().click();
    await page.getByRole("dialog").last().getByPlaceholder("file_xxx").fill(heroImageFileId);
    await page.getByRole("dialog").last().getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: "Search fields" }).click();
    await page.getByPlaceholder("Search keys or content...").fill("hero.visualAsset");
    await page.getByText("hero.visualAsset").first().click();
    await page.getByRole("dialog").last().getByPlaceholder("file_xxx").fill(heroVisualAsset);
    await page.getByRole("dialog").last().getByRole("button", { name: "Done" }).click();

    await page.getByRole("button", { name: "Search fields" }).click();
    await page.getByPlaceholder("Search keys or content...").fill("testimonials.logoFileIds");
    await page.getByText("testimonials.logoFileIds").first().click();
    const logoDialog = page.getByRole("dialog").last();
    await logoDialog.getByPlaceholder("Add fileId").fill(logoFileId);
    await logoDialog.getByRole("button", { name: "Add" }).click();
    await logoDialog.getByRole("button", { name: "Done" }).click();

    await expect(page.getByPlaceholder("Search keys or content...")).not.toBeVisible();

    const jsonValue = await page.locator("#site-copy-json").inputValue();
    const parsedJson = JSON.parse(jsonValue) as {
      hero?: { headline?: string; heroImageFileId?: string; visualAsset?: string };
      testimonials?: { logoFileIds?: string[] };
    };
    expect(parsedJson.hero?.headline).toBe(updatedHeadline);
    expect(parsedJson.hero?.heroImageFileId).toBe(heroImageFileId);
    expect(parsedJson.hero?.visualAsset).toBe(heroVisualAsset);
    expect(parsedJson.testimonials?.logoFileIds).toContain(logoFileId);

    await page.getByRole("button", { name: "Save Draft" }).click();
    await expect(page.getByText("External content draft saved.")).toBeVisible();

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("External content published.")).toBeVisible();

    const publicResponse = await page.request.get(
      `${API_URL}/public/website/external-content?siteId=${encodeURIComponent(siteId)}&key=siteCopy`
    );
    expect(publicResponse.ok()).toBeTruthy();
    const publicBody = (await publicResponse.json()) as {
      key?: string;
      version?: string;
      data?: {
        hero?: { headline?: string; heroImageFileId?: string; visualAsset?: string };
        testimonials?: { logoFileIds?: string[] };
      };
    };

    expect(publicBody.key).toBe("siteCopy");
    expect(publicBody.version).toBe("published");
    expect(publicBody.data?.hero?.headline).toBe(updatedHeadline);
    expect(publicBody.data?.hero?.heroImageFileId).toBe(heroImageFileId);
    expect(publicBody.data?.hero?.visualAsset).toBe(heroVisualAsset);
    expect(publicBody.data?.testimonials?.logoFileIds).toContain(logoFileId);
  });
});
