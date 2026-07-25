import { test as base, expect, type Page } from "@playwright/test";
import { loginAsSeededUser } from "../tests/helpers/auth.ts";
import { HttpClient } from "../tests/helpers/http-client.ts";
import { seedTestData, resetTestData, type TestData } from "../utils/testData.ts";
import { CashRegisterSchema, type CashRegister } from "@corely/contracts";
import { randomUUID } from "crypto";
import { CashApiClient } from "../tests/helpers/cash-api-client.ts";
import { DeterministicAiHelper } from "../tests/helpers/deterministic-ai.ts";
import { startBillingTrial } from "../tests/helpers/billing-fixtures.ts";

export type CashE2EContext = {
  tenant: TestData["tenant"];
  workspace: TestData["workspace"];
  adminUser: TestData["user"];
  register: CashRegister;
  client: CashApiClient;
  testRunId: string;
  e2eAi: DeterministicAiHelper;
};

type CashFixtures = {
  cashContext: CashE2EContext;
  cashPage: Page;
};

async function primeAuthenticatedSession(
  page: Page,
  session: {
    accessToken: string;
    workspaceId: string;
  }
): Promise<void> {
  await page.context().clearCookies();
  await page.addInitScript((value) => {
    window.localStorage.clear();
    window.localStorage.setItem("accessToken", value.accessToken);
    window.localStorage.setItem("corely-active-workspace", value.workspaceId);
  }, session);
}

export const test = base.extend<CashFixtures>({
  cashContext: async ({ request }, use) => {
    // 1. Seed fresh tenant
    const testData = await seedTestData();
    if (!testData) {
      throw new Error("Failed to seed test data");
    }

    // 2. Auth
    const auth = await loginAsSeededUser(request, testData);
    const workspaceId = testData.workspace.id;
    const client = new CashApiClient(request, auth);
    const testRunId = `e2e-${Date.now()}-${randomUUID()}`;

    const httpClient = new HttpClient(request, auth);
    const { response } = await startBillingTrial(httpClient, { productKey: "cash-management" as any }, randomUUID());
    if (!response.ok()) {
      throw new Error(`Failed to start trial: ${response.status()} ${response.statusText()}`);
    }

    // 3. Create cash register for the test
    const { register } = await client.createCashRegister(testData.tenant.id, {
      name: "Berlin Nail Salon E2E",
      currency: "EUR",
    });

    const e2eAi = new DeterministicAiHelper(request, testData.tenant.id);

    const context: CashE2EContext = {
      tenant: testData.tenant,
      workspace: testData.workspace,
      adminUser: testData.user,
      register,
      client,
      testRunId,
      e2eAi,
    };

    // 4. Pass to test
    await use(context);

    // 5. Teardown
    try {
      await resetTestData(testData.tenant.id);
    } catch (error) {
      console.warn("Failed to reset test data:", error);
    }
  },
  
  cashPage: async ({ page, cashContext, request }, use) => {
    const auth = await loginAsSeededUser(request, {
      tenant: cashContext.tenant,
      workspace: cashContext.workspace,
      user: cashContext.adminUser,
    });
    await primeAuthenticatedSession(page, {
      accessToken: auth.accessToken,
      workspaceId: cashContext.workspace.id,
    });
    page.on('console', msg => console.log('BROWSER:', msg.text()));
    await use(page);
  }
});

export { expect };
