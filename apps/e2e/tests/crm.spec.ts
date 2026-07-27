import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

test.use({ timezoneId: "Europe/Berlin" });

const API_URL = process.env.API_URL || "http://localhost:3000";

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
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

function uniqueSuffix() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

async function createDealFixture(page: Page, suffix: string): Promise<{ dealId: string }> {
  const { accessToken, workspaceId } = await getAuthContext(page);

  const customerRes = await page.request.post(`${API_URL}/customers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    data: {
      displayName: `E2E Customer ${suffix}`,
      email: `customer-${suffix}@example.com`,
    },
  });
  expect(customerRes.ok()).toBeTruthy();
  const customerBody = (await customerRes.json()) as { id?: string; customer?: { id?: string } };
  const partyId = customerBody.customer?.id ?? customerBody.id;
  if (!partyId) {
    throw new Error("Could not resolve customer id");
  }

  const dealRes = await page.request.post(`${API_URL}/crm/deals`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    data: {
      title: `E2E Deal ${suffix}`,
      partyId,
      stageId: "lead",
      amountCents: 120000,
      currency: "EUR",
      probability: 40,
    },
  });
  expect(dealRes.ok()).toBeTruthy();
  const dealBody = (await dealRes.json()) as { id?: string; deal?: { id?: string } };
  const dealId = dealBody.deal?.id ?? dealBody.id;
  if (!dealId) {
    throw new Error("Could not resolve deal id");
  }

  return { dealId };
}

async function getAuthContext(page: Page): Promise<{ accessToken: string; workspaceId: string }> {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) {
    throw new Error("Missing access token");
  }
  const workspaceId =
    (await page.evaluate(() => localStorage.getItem("corely-active-workspace"))) ?? "";
  return { accessToken, workspaceId };
}

async function ensureCrmAiEnabled(page: Page): Promise<boolean> {
  const { accessToken, workspaceId } = await getAuthContext(page);
  await page.request.patch(`${API_URL}/crm/ai/settings`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
    data: {
      aiEnabled: true,
      intentSentimentEnabled: true,
    },
  });

  const settingsRes = await page.request.get(`${API_URL}/crm/ai/settings`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
    },
  });
  if (!settingsRes.ok()) {
    return false;
  }
  const body = (await settingsRes.json()) as {
    settings?: { aiEnabled?: boolean; intentSentimentEnabled?: boolean };
  };
  return Boolean(body.settings?.aiEnabled);
}

test.describe("CRM Smoke + Navigation", () => {
  test("opens CRM from nav and renders deals list/empty state", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const crmNav = page.locator('[data-testid^="nav-crm"]').first();
    if ((await crmNav.count()) > 0) {
      await crmNav.click();
    } else {
      await page.goto("/crm/deals");
    }

    await expect(page).toHaveURL(/\/crm\/deals/);
    await expect(page.locator(selectors.crm.dealsHeader)).toBeVisible();
    await expect(page.locator(selectors.crm.dealsCreate)).toBeVisible();
    await expect(
      page.locator(
        `${selectors.crm.dealsList}, ${selectors.crm.dealsPage} [data-testid="crm-deals-empty"]`
      )
    ).toBeVisible();
  });
});

test.describe("CRM Leads -> Deals", () => {
  test("creates lead and converts to deal", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const suffix = uniqueSuffix();

    await page.goto("/crm/leads/new");
    await expect(page.locator(selectors.crm.leadForm)).toBeVisible();
    await page.fill(selectors.crm.leadFirstName, "E2E");
    await page.fill(selectors.crm.leadLastName, `Lead ${suffix}`);
    await page.fill(selectors.crm.leadCompanyName, `E2E LeadCo ${suffix}`);
    await page.fill(selectors.crm.leadEmail, `lead-${suffix}@example.com`);
    await page.fill(selectors.crm.leadPhone, "+49111111111");
    await page.fill(selectors.crm.leadNotes, "Qualification notes");
    const createLeadResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/crm/leads") && response.request().method() === "POST"
    );
    await page.click(selectors.crm.leadSave);
    const createLeadResponse = await createLeadResponsePromise;
    expect(createLeadResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/crm\/leads$/, { timeout: 15_000 });
    await page.locator(selectors.crm.leadsRow).filter({ hasText: suffix }).first().click();
    await expect(page).toHaveURL(/\/crm\/leads\/.+/);

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    const convertLeadResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/crm/leads/") &&
        response.url().includes("/convert") &&
        response.request().method() === "POST"
    );
    await page.click(selectors.crm.leadConvert);
    const convertLeadResponse = await convertLeadResponsePromise;
    if (!convertLeadResponse.ok()) {
      throw new Error(
        `Lead conversion failed with ${convertLeadResponse.status()}: ${await convertLeadResponse.text()}`
      );
    }
    await expect(page).toHaveURL(/\/crm\/deals\/.+/, { timeout: 20_000 });
    await expect(page.locator(selectors.crm.dealDetailPage)).toBeVisible();
  });
});

test.describe("CRM Deals Lifecycle", () => {
  test("moves stage and logs timeline entries", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { dealId } = await createDealFixture(page, uniqueSuffix());

    await page.goto(`/crm/deals/${dealId}`);
    const stageSelect = page.locator(selectors.crm.dealStageSelect).first();
    await expect(stageSelect).toBeVisible();

    await stageSelect.click();
    await page.locator('[role="option"]').nth(1).click();
    await expect(page.locator(selectors.crm.timeline)).toContainText(
      /stage|lead|qualified|proposal|negotiation/i
    );
  });

  test("marks deal as won and then blocks stage edits", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { dealId } = await createDealFixture(page, uniqueSuffix());

    await page.goto(`/crm/deals/${dealId}`);
    await page.click(selectors.crm.dealMarkWon);
    await expect(page.locator(selectors.crm.dealDetailPage)).toContainText(/won/i);
    await expect(page.locator(selectors.crm.dealMarkWon)).toBeDisabled();
    await expect(page.locator(selectors.crm.dealMarkLost)).toBeDisabled();
  });

  test("marks deal as lost with reason", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { dealId } = await createDealFixture(page, uniqueSuffix());

    await page.goto(`/crm/deals/${dealId}`);
    await page.click(selectors.crm.dealMarkLost);
    await page.click(selectors.crm.dealLostConfirm);
    await expect(page.locator(selectors.crm.dealDetailPage)).toContainText(/lost/i);
  });
});

test.describe("CRM Activities + Timeline", () => {
  test("adds a note activity from deal composer", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const suffix = uniqueSuffix();
    const { dealId } = await createDealFixture(page, suffix);

    await page.goto(`/crm/deals/${dealId}`);
    await page.fill(selectors.crm.activitySubject, `Follow-up ${suffix}`);
    await page.fill(selectors.crm.activityBody, "Shared next steps with customer");
    await page.click(selectors.crm.activityAdd);
    await expect(page.locator(selectors.crm.timeline)).toContainText(`Follow-up ${suffix}`);
  });

  test("logs call outcome in timeline", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const suffix = uniqueSuffix();
    const { dealId } = await createDealFixture(page, suffix);

    await page.goto(`/crm/deals/${dealId}`);
    await page.click(selectors.crm.activityType);
    await page.getByRole("option", { name: "Call" }).click();
    await page.fill(selectors.crm.activitySubject, `Call ${suffix}`);
    await page.click(selectors.crm.activityOutcome);
    await page.getByRole("option", { name: "Connected" }).click();
    await page.click(selectors.crm.activityAdd);
    await expect(page.locator(selectors.crm.timeline)).toContainText("Connected");
  });
});

test.describe("CRM AI Smoke", () => {
  test("generates deal insights from object page", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const aiEnabled = await ensureCrmAiEnabled(page);
    test.skip(!aiEnabled, "CRM AI is disabled in this environment");

    const { dealId } = await createDealFixture(page, uniqueSuffix());
    await page.goto(`/crm/deals/${dealId}`);
    await expect(page.locator(selectors.crm.dealAiInsightsCard)).toBeVisible();

    const insightsResponse = page.waitForResponse(
      (response) =>
        response.url().includes(`/crm/deals/${dealId}/ai/insights`) &&
        response.request().method() === "GET"
    );
    await page.getByRole("button", { name: "Generate insights" }).click();
    const response = await insightsResponse;
    expect(response.ok()).toBeTruthy();
  });

  test("parses activity from describe input", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const aiEnabled = await ensureCrmAiEnabled(page);
    test.skip(!aiEnabled, "CRM AI is disabled in this environment");

    await page.goto("/crm/activities/new");
    await page.fill(
      selectors.crm.activityDescribeInput,
      "Call John tomorrow 10:00 about pricing, then send follow-up."
    );

    const parseResponse = page.waitForResponse(
      (response) =>
        response.url().includes("/crm/activities/ai/parse") &&
        response.request().method() === "POST"
    );
    await page.click(selectors.crm.activityDescribeParse);
    const response = await parseResponse;
    expect(response.ok()).toBeTruthy();

    await page.click(selectors.crm.activityDescribeApply);
    await expect(page.locator(selectors.crm.newActivitySubject)).toHaveValue(/.+/);
  });
});

test.describe("CRM Channel Catalog", () => {
  test("builds email channel deep link with placeholders", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const { dealId } = await createDealFixture(page, uniqueSuffix());

    await page.goto(`/crm/deals/${dealId}`);
    await page.click(selectors.crm.channelOpenEmail);
    await expect(page.locator(selectors.crm.channelComposer)).toBeVisible();

    await page.evaluate(() => {
      (window as any).__crmOpenUrl = "";
      const originalOpen = window.open;
      window.open = ((url?: string | URL) => {
        (window as any).__crmOpenUrl = String(url ?? "");
        return null;
      }) as typeof originalOpen;
    });

    await page.click(selectors.crm.channelOpenLink);
    const opened = await page.evaluate(() => (window as any).__crmOpenUrl as string);
    expect(opened).toContain("mailto:");
    expect(opened).toContain("subject=");
    expect(opened).toContain("body=");
  });
});

test.describe("CRM Full Platform Placeholders", () => {
  test("workflow automation hook creates timeline item deterministically", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const suffix = uniqueSuffix();
    const { dealId } = await createDealFixture(page, suffix);
    const hookSubject = `Workflow Hook Task ${suffix}`;

    const hookRes = await page.request.post(`${API_URL}/test/crm/seed-workflow-activity`, {
      headers: {
        "Content-Type": "application/json",
        "X-Test-Secret": process.env.TEST_HARNESS_SECRET || "test-secret-key",
      },
      data: {
        tenantId: testData.tenant.id,
        dealId,
        actorUserId: testData.user.id,
        subject: hookSubject,
      },
    });
    expect(hookRes.ok()).toBeTruthy();

    await page.goto(`/crm/deals/${dealId}`);
    await expect(page.locator(selectors.crm.timeline)).toBeVisible();
    await expect(page.locator(selectors.crm.timeline)).toContainText(hookSubject);
  });
  test.skip("tickets UI flow is not implemented in current UI build", async () => {});
  test.skip("AI CRM-specific tool-card mutation flow is not deterministic in current E2E harness", async () => {});
});

test.describe("CRM Custom Properties", () => {
  test("creates custom field definition and shows value on account detail", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const suffix = uniqueSuffix();
    const fieldKey = `crm_cf_${suffix.replace(/[^a-zA-Z0-9_]/g, "_")}`;
    const fieldLabel = `CRM Field ${suffix}`;
    const fieldValue = `Value ${suffix}`;
    const accountName = `CF Account ${suffix}`;
    const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
    if (!accessToken) throw new Error("Missing access token");
    const workspaceId =
      (await page.evaluate(() => localStorage.getItem("corely-active-workspace"))) ?? "";

    const createFieldRes = await page.request.post(`${API_URL}/customization/custom-fields`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
      },
      data: {
        entityType: "party",
        key: fieldKey,
        label: fieldLabel,
        type: "TEXT",
        required: false,
        isIndexed: false,
      },
    });
    expect(createFieldRes.ok()).toBeTruthy();

    await page.goto("/crm/accounts/new");
    await page.fill(selectors.crm.accountName, accountName);
    await page.fill(selectors.crm.accountEmail, `cf-${suffix}@example.com`);
    await page.click(selectors.crm.accountSave);

    await expect(page).toHaveURL(/\/crm\/accounts\/[^/]+$/, { timeout: 15_000 });
    await expect(page.locator(selectors.crm.accountDetail)).toBeVisible();
    const accountId = page.url().split("/").pop();
    expect(accountId && accountId !== "new").toBeTruthy();
    const setAttributesRes = await page.request.put(
      `${API_URL}/crm/accounts/${accountId}/custom-attributes`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
        },
        data: {
          customFieldValues: {
            [fieldKey]: fieldValue,
          },
          dimensionAssignments: [],
        },
      }
    );
    if (!setAttributesRes.ok()) {
      const body = await setAttributesRes.text();
      throw new Error(
        `set custom attributes failed: ${setAttributesRes.status()} ${setAttributesRes.statusText()} ${body}`
      );
    }
    await page.reload();

    await expect(page.locator(`div[data-testid="custom-field-value-${fieldKey}"]`)).toContainText(
      fieldValue
    );
  });
});

test.describe("CRM Contacts CRUD", () => {
  test("creates contact and opens detail page", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const suffix = uniqueSuffix();
    const contactName = `E2E Contact ${suffix}`;
    const contactEmail = `contact-${suffix}@example.com`;
    const contactPhone = "+491234567890";

    await page.goto("/crm/contacts");
    await expect(page.locator(selectors.crm.contactsPage)).toBeVisible();
    await page.click(selectors.crm.contactsCreate);

    await expect(page).toHaveURL(/\/crm\/contacts\/new$/);
    await expect(page.locator(selectors.crm.contactForm)).toBeVisible();
    await page.fill(selectors.crm.contactName, contactName);
    await page.fill(selectors.crm.contactEmail, contactEmail);
    await page.fill(selectors.crm.contactPhone, contactPhone);
    await page.click(selectors.crm.contactSave);

    await expect(page).toHaveURL(/\/crm\/contacts\/[^/]+$/, { timeout: 15_000 });
    await expect(page.locator(selectors.crm.contactDetail)).toBeVisible();
    await expect(page.locator(selectors.crm.contactDetailName)).toContainText(contactName);
  });
});

test.describe("CRM Sequences", () => {
  test("creates a sequence from UI and sees it in list", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const suffix = uniqueSuffix();
    const sequenceName = `E2E Sequence ${suffix}`;

    await page.goto("/crm/sequences");
    await expect(page.locator(selectors.crm.sequencesPage)).toBeVisible();
    await page.click(selectors.crm.sequencesCreate);

    await expect(page).toHaveURL(/\/crm\/sequences\/new$/);
    await expect(page.locator(selectors.crm.sequenceForm)).toBeVisible();
    await page.fill(selectors.crm.sequenceName, sequenceName);
    await page.fill(selectors.crm.sequenceDescription, "E2E sequence description");
    await page.selectOption(selectors.crm.sequenceStepType, "TASK");
    await page.fill(selectors.crm.sequenceDayDelay, "0");
    await page.fill(selectors.crm.sequenceStepSubject, `Task ${suffix}`);
    await page.fill(selectors.crm.sequenceStepBody, "Follow up with the prospect");

    const createSequenceResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/crm/sequences") && response.request().method() === "POST"
    );
    await page.click(selectors.crm.sequenceSave);
    const createSequenceResponse = await createSequenceResponsePromise;
    expect(createSequenceResponse.ok()).toBeTruthy();

    await expect(page).toHaveURL(/\/crm\/sequences$/, { timeout: 15_000 });
    await expect(page.locator(selectors.crm.sequencesList)).toContainText(sequenceName);
  });
});

test.describe("CRM Accounts CRUD", () => {
  test("creates an account, views detail, edits, and confirms", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const suffix = uniqueSuffix();
    const accountName = `Acme Corp ${suffix}`;
    const accountEmail = `acme-${suffix}@example.com`;
    const accountPhone = "+1234567890";

    // Navigate to accounts list
    await page.goto("/crm/accounts");
    await expect(page.locator(selectors.crm.accountsList)).toBeVisible();

    // Click create
    await page.click(selectors.crm.accountsCreate);
    await expect(page.locator(selectors.crm.accountName)).toBeVisible();

    // Fill identity (Party) fields
    await page.fill(selectors.crm.accountName, accountName);
    await page.fill(selectors.crm.accountEmail, accountEmail);
    await page.fill(selectors.crm.accountPhone, accountPhone);

    // Fill CRM profile fields
    await page.selectOption(selectors.crm.accountType, "CUSTOMER");
    await page.selectOption(selectors.crm.accountStatus, "ACTIVE");

    // Submit
    await page.click(selectors.crm.accountSave);

    // Verify detail page is shown
    await expect(page.locator(selectors.crm.accountDetail)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(selectors.crm.accountDetailName)).toContainText(accountName);
    await expect(page.locator(selectors.crm.accountEmail)).toContainText(accountEmail);
    await expect(page.locator(selectors.crm.accountPhone)).toContainText(accountPhone);
    await expect(page.locator(selectors.crm.accountStatus)).toContainText("ACTIVE");

    // Edit — change the name
    const editedName = `Acme Updated ${suffix}`;
    await page.click(selectors.crm.accountEdit);
    // Wait for form input to be visible to ensure navigation completed
    await expect(page.locator(selectors.crm.accountName)).toBeVisible();
    await page.fill(selectors.crm.accountName, editedName);
    await page.click(selectors.crm.accountSave);

    // Verify edit persisted
    await expect(page.locator(selectors.crm.accountDetail)).toBeVisible({ timeout: 10000 });
    await expect(page.locator(selectors.crm.accountDetailName)).toContainText(editedName);

    // Verify list shows the account
    await page.goto("/crm/accounts");
    await expect(page.locator(selectors.crm.accountsList)).toBeVisible();
    await expect(page.getByText(editedName)).toBeVisible();
  });
});
