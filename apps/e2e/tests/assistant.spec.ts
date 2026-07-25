import type { APIRequestContext, Page } from "@playwright/test";
import { createIdempotencyKey } from "@corely/api-client";
import { test, expect } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";
const TEST_HARNESS_SECRET = process.env.TEST_HARNESS_SECRET || "test-secret-key";

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
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
  await page.waitForURL("**/dashboard", { timeout: 10_000 });

  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) {
    throw new Error("Missing access token after login");
  }
  const payload = decodeJwtPayload(accessToken);
  if (!payload || payload.tenantId !== creds.tenantId) {
    throw new Error(
      `Login token tenant mismatch. Expected ${creds.tenantId}, received ${String(payload?.tenantId)}`
    );
  }
}

async function getAuthContext(page: Page) {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) {
    throw new Error("Missing access token after login");
  }

  const payload = decodeJwtPayload(accessToken);
  const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId : null;
  const userId = typeof payload?.userId === "string" ? payload.userId : null;
  if (!tenantId) {
    throw new Error("Missing tenantId in access token");
  }
  if (!userId) {
    throw new Error("Missing userId in access token");
  }

  const workspaceId = await page.evaluate(() => localStorage.getItem("corely-active-workspace"));
  const resolvedWorkspaceId = workspaceId || tenantId;

  const workspacesResponse = await page.request.get(`${API_URL}/workspaces`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  expect(workspacesResponse.ok()).toBeTruthy();
  const workspacesBody = (await workspacesResponse.json()) as {
    workspaces?: Array<{ id?: string }>;
  };
  const defaultWorkspaceId =
    typeof workspacesBody.workspaces?.[0]?.id === "string"
      ? workspacesBody.workspaces[0].id
      : resolvedWorkspaceId;

  return {
    accessToken,
    tenantId,
    userId,
    workspaceId: resolvedWorkspaceId,
    defaultWorkspaceId,
  };
}

async function createCopilotThread(
  request: APIRequestContext,
  auth: { accessToken: string; workspaceId: string },
  title: string
): Promise<{ id: string; title: string }> {
  let response = await request.post(`${API_URL}/copilot/threads`, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": auth.workspaceId,
      "X-Idempotency-Key": createIdempotencyKey(),
    },
    data: { title },
  });
  if (response.status() === 404) {
    response = await request.post(`${API_URL}/ai-copilot/threads`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
        "X-Workspace-Id": auth.workspaceId,
        "X-Idempotency-Key": createIdempotencyKey(),
      },
      data: { title },
    });
  }

  if (!response.ok()) {
    const bodyText = await response.text();
    throw new Error(`createCopilotThread failed: ${response.status()} ${bodyText}`);
  }
  const body = await response.json();

  return {
    id: String(body?.thread?.id),
    title: String(body?.thread?.title ?? title),
  };
}

async function resolveAssistantWorkspaceId(
  page: Page,
  fallbackWorkspaceId: string
): Promise<string> {
  const listThreadsRequest = page.waitForRequest((request) => {
    if (request.method() !== "GET") {
      return false;
    }
    const pathname = new URL(request.url()).pathname;
    return pathname === "/copilot/threads" || pathname === "/ai-copilot/threads";
  });

  await page.goto("/assistant");
  await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible();

  const request = await listThreadsRequest;
  const headerWorkspaceId = request.headers()["x-workspace-id"];
  return headerWorkspaceId || fallbackWorkspaceId;
}

const uniqueScopes = (...ids: string[]): string[] => Array.from(new Set(ids.filter(Boolean)));

async function seedCopilotThreadMessage(
  request: APIRequestContext,
  params: { tenantId: string; userId: string; title: string; messageText: string }
): Promise<{ threadId: string; messageId: string; title: string }> {
  const response = await request.post(`${API_URL}/test/copilot/seed-thread-message`, {
    headers: {
      "Content-Type": "application/json",
      "X-Test-Secret": TEST_HARNESS_SECRET,
    },
    data: params,
  });
  if (!response.ok()) {
    throw new Error(
      `seedCopilotThreadMessage failed: ${response.status()} ${await response.text()}`
    );
  }
  return (await response.json()) as { threadId: string; messageId: string; title: string };
}

test.describe("Assistant", () => {
  test("shows recent chats and opens selected thread", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const authContext = await getAuthContext(page);
    const resolvedWorkspaceId = await resolveAssistantWorkspaceId(page, authContext.workspaceId);
    const auth = { ...authContext, workspaceId: resolvedWorkspaceId };
    const scopes = uniqueScopes(auth.tenantId, auth.workspaceId, auth.defaultWorkspaceId);
    const stamp = Date.now();
    const firstTitle = `E2E Thread One ${stamp}`;
    const secondTitle = `E2E Thread Two ${stamp}`;

    for (const scope of scopes) {
      const scopedAuth = { ...auth, workspaceId: scope };
      await createCopilotThread(page.request, scopedAuth, firstTitle);
      await createCopilotThread(page.request, scopedAuth, secondTitle);
    }

    await page.goto("/assistant");
    await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible();
    await expect(page.getByText("Recent chats")).toBeVisible();

    const secondThreadButton = page
      .locator("aside")
      .getByRole("button", { name: new RegExp(secondTitle, "i") })
      .first();
    await expect(secondThreadButton).toBeVisible({ timeout: 15_000 });
    await secondThreadButton.click();

    await expect(page).toHaveURL(/\/assistant\/t\//);
    await expect(secondThreadButton).toHaveClass(/bg-accent\/15/);

    const firstThreadButton = page
      .locator("aside")
      .getByRole("button", { name: new RegExp(firstTitle, "i") })
      .first();
    await expect(firstThreadButton).toBeVisible();
  });

  test("search chats returns message hit and opens thread", async ({ page, testData }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const authContext = await getAuthContext(page);
    const resolvedWorkspaceId = await resolveAssistantWorkspaceId(page, authContext.workspaceId);
    const auth = { ...authContext, workspaceId: resolvedWorkspaceId };
    const scopes = uniqueScopes(auth.tenantId, auth.workspaceId, auth.defaultWorkspaceId);
    const stamp = Date.now();
    const uniqueToken = `e2e-search-${stamp}`;

    for (const scope of scopes) {
      await seedCopilotThreadMessage(page.request, {
        tenantId: scope,
        userId: auth.userId,
        title: `Searchable Thread ${stamp}`,
        messageText: `Please remember this token ${uniqueToken}`,
      });
    }

    await page.goto("/assistant");
    await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible();

    await page
      .getByRole("button", { name: /^Search$/i })
      .first()
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const searchInput = page.getByPlaceholder("Search messages...");
    await searchInput.fill(uniqueToken);

    const resultButton = page
      .getByRole("dialog")
      .getByRole("button", {
        name: new RegExp(`Searchable Thread ${stamp}`, "i"),
      })
      .first();

    await expect(resultButton).toBeVisible({ timeout: 15_000 });
    await expect(resultButton).toContainText(uniqueToken);

    await resultButton.click();

    await expect(page).toHaveURL(/\/assistant\/t\/.+\?m=/, {
      timeout: 10_000,
    });

    await expect(page.locator('[data-testid="assistant-chat"] h1').first()).toContainText(
      `Searchable Thread ${stamp}`
    );
  });
});
