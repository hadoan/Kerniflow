import { expect, type Page, type TestInfo } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

const SCREENSHOT_STAMP = new Date().toISOString().replace(/[:.]/g, "-");
const E2E_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function screenshotDirFor(testInfo: TestInfo): string {
  const dir = join(
    E2E_ROOT,
    "output",
    "coaching-offers-e2e",
    SCREENSHOT_STAMP,
    testInfo.project.name,
    slugify(testInfo.title)
  );
  mkdirSync(dir, { recursive: true });
  return dir;
}

async function captureStep(
  page: Page,
  testInfo: TestInfo,
  screenshotDir: string,
  name: string
): Promise<void> {
  await page.waitForLoadState("networkidle").catch(() => undefined);
  await page.waitForTimeout(250);

  const path = join(screenshotDir, `${name}.png`);
  await page.screenshot({
    path,
    fullPage: true,
  });
  await testInfo.attach(name, {
    path,
    contentType: "image/png",
  });
}

async function login(page: Page, creds: { email: string; password: string; tenantId: string }) {
  await page.context().clearCookies();
  await page.goto(`/auth/login?tenant=${encodeURIComponent(creds.tenantId)}`);
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);

  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 20_000 }),
    page.click(selectors.auth.loginSubmitButton),
  ]);
}

async function selectMeetingType(page: Page, name: "Video" | "Phone" | "In person") {
  await page.getByRole("combobox").click();
  await page.getByRole("option", { name }).click();
}

test.describe("Coaching offers UI", () => {
  test("enforces required fields on the offer editor", async ({ page, testData }, testInfo) => {
    const screenshotDir = screenshotDirFor(testInfo);

    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    await page.goto("/coaching/offers/new");
    await expect(page.getByRole("heading", { name: "Create coaching offer" })).toBeVisible();

    await page.getByLabel("Duration (minutes)").fill("");
    await page.getByRole("button", { name: "Create offer" }).click();

    await expect(page.getByText("Title is required")).toBeVisible();
    await expect(page.getByText("Price is required")).toBeVisible();
    await expect(page.getByText("Duration is required")).toBeVisible();

    await captureStep(page, testInfo, screenshotDir, "01-validation-errors");
    console.log(`Coaching offers screenshots saved to ${screenshotDir}`);
  });

  test("coach can create, edit, and archive an offer in the UI", async (
    { page, testData },
    testInfo
  ) => {
    const screenshotDir = screenshotDirFor(testInfo);
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const title = `E2E Coaching Offer ${suffix}`;

    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    await page.goto("/coaching/offers");
    await expect(page.getByRole("heading", { name: "Coaching offers" })).toBeVisible();
    await captureStep(page, testInfo, screenshotDir, "01-offers-list");

    await page.getByRole("link", { name: "Add offer" }).click();
    await expect(page.getByRole("heading", { name: "Create coaching offer" })).toBeVisible();

    await page.getByLabel("Title").fill(title);
    await page.getByLabel("Description").fill("Offer for UI e2e coverage.");
    await page.getByLabel("Price (cents)").fill("22000");
    await page.getByLabel("Duration (minutes)").fill("90");
    await selectMeetingType(page, "In person");
    await page.getByLabel("Timezone").fill("America/New_York");
    await page.getByLabel("Min notice (hours)").fill("24");
    await page.getByLabel("Max advance (days)").fill("45");
    await page.getByLabel("Buffer before (minutes)").fill("15");
    await page.getByLabel("Buffer after (minutes)").fill("10");
    await page
      .getByLabel("Contract template")
      .fill("Coach and client agree to the stated schedule and debrief cadence.");
    await page
      .getByLabel("Prep form questions")
      .fill("What is your primary goal?\nWhat would make this session a success?");
    await page
      .getByLabel("Debrief form questions")
      .fill("What changed after the session?\nWhat should we cover next?");

    await captureStep(page, testInfo, screenshotDir, "02-create-form-filled");

    await page.getByRole("button", { name: "Create offer" }).click();
    await expect(page.getByRole("heading", { name: "Coaching offer" })).toBeVisible();
    await expect(page.getByText(title)).toBeVisible();
    await expect(page.getByText("22000 EUR")).toBeVisible();
    await expect(page.getByText("90 minutes")).toBeVisible();
    await expect(page.getByText("America/New_York")).toBeVisible();
    await expect(page.getByText("24 hours")).toBeVisible();
    await expect(page.getByText("45 days")).toBeVisible();
    await captureStep(page, testInfo, screenshotDir, "03-detail-created");

    await page.getByRole("link", { name: "Edit" }).click();
    await expect(page.getByRole("heading", { name: "Edit coaching offer" })).toBeVisible();

    await page.getByLabel("Price (cents)").fill("25000");
    await page.getByLabel("Duration (minutes)").fill("120");
    await selectMeetingType(page, "Phone");
    await page.getByLabel("Timezone").fill("Europe/London");
    await page.getByLabel("Min notice (hours)").fill("48");
    await page.getByLabel("Max advance (days)").fill("30");
    await page.getByLabel("Buffer before (minutes)").fill("5");
    await page.getByLabel("Buffer after (minutes)").fill("20");

    await captureStep(page, testInfo, screenshotDir, "04-edit-form-filled");

    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("25000 EUR")).toBeVisible();
    await expect(page.getByText("120 minutes")).toBeVisible();
    await expect(page.getByText("phone")).toBeVisible();
    await expect(page.getByText("Europe/London")).toBeVisible();
    await expect(page.getByText("48 hours")).toBeVisible();
    await expect(page.getByText("30 days")).toBeVisible();
    await captureStep(page, testInfo, screenshotDir, "05-detail-updated");

    await page.getByRole("button", { name: "Archive" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await captureStep(page, testInfo, screenshotDir, "06-archive-confirm");
    await page.getByRole("button", { name: "Delete" }).click();

    await expect(page).toHaveURL(/\/coaching\/offers(?:\?.*)?$/);
    await expect(page.getByText(title)).toHaveCount(0);
    await captureStep(page, testInfo, screenshotDir, "07-list-after-archive");

    console.log(`Coaching offers screenshots saved to ${screenshotDir}`);
  });
});
