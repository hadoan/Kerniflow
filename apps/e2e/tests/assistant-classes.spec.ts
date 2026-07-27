import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";
import { createIdempotencyKey } from "@corely/api-client";

const API_URL = process.env.API_URL || "http://localhost:3000";

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
  if (!tenantId) {
    throw new Error("Missing tenantId in access token");
  }

  const workspacesResponse = await page.request.get(`${API_URL}/workspaces`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  expect(workspacesResponse.ok()).toBeTruthy();
  const workspacesBody = await workspacesResponse.json();
  const workspaceId = workspacesBody?.workspaces?.[0]?.id;
  if (!workspaceId) {
    throw new Error("No workspace found for authenticated user");
  }

  return { accessToken, workspaceId, tenantId };
}

async function createClassGroup(
  page: Page,
  auth: { accessToken: string; workspaceId: string },
  name: string
) {
  const response = await page.request.post(`${API_URL}/classes/class-groups`, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": auth.workspaceId,
      "X-Idempotency-Key": createIdempotencyKey(),
    },
    data: {
      name,
      subject: "Math",
      level: "A1",
      defaultPricePerSession: 500000,
      currency: "VND",
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  return body.classGroup as { id: string; name: string };
}

async function listClassGroups(
  page: Page,
  auth: { accessToken: string; workspaceId: string }
): Promise<{ items: Array<{ id: string; name: string }>; pageInfo?: { total?: number } }> {
  const response = await page.request.get(`${API_URL}/classes/class-groups?page=1&pageSize=100`, {
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "Content-Type": "application/json",
      "X-Workspace-Id": auth.workspaceId,
    },
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as {
    items: Array<{ id: string; name: string }>;
    pageInfo?: { total?: number };
  };
}

async function setActiveWorkspace(page: Page, workspaceId: string) {
  await page.evaluate((id) => {
    localStorage.setItem("corely-active-workspace", id);
  }, workspaceId);
}

function parseSseChunks(responseText: string): Array<Record<string, any>> {
  return responseText
    .split("\n")
    .filter((line) => line.startsWith("data: "))
    .map((line) => line.replace(/^data:\s*/, "").trim())
    .filter((payload) => payload.length > 0 && payload !== "[DONE]")
    .map((payload) => {
      try {
        return JSON.parse(payload);
      } catch {
        return null;
      }
    })
    .filter((chunk): chunk is Record<string, any> => Boolean(chunk));
}

test.describe("Assistant Classes Tools", () => {
  test("renders classes_listClassGroups result for a class-group query", async ({
    page,
    testData,
  }) => {
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });
    const auth = await getAuthContext(page);
    expect(auth.tenantId).toBe(testData.tenant.id);

    const now = Date.now();
    const expectedGroupA = `E2E Math Group A ${now}`;
    const expectedGroupB = `E2E Math Group B ${now}`;
    await createClassGroup(page, auth, expectedGroupA);
    await createClassGroup(page, auth, expectedGroupB);
    const expectedGroups = await listClassGroups(page, auth);
    const expectedTotal = expectedGroups.pageInfo?.total ?? expectedGroups.items.length;
    expect(expectedTotal).toBeGreaterThanOrEqual(2);
    await setActiveWorkspace(page, auth.workspaceId);

    let capturedBody: any = null;
    let capturedWorkspaceHeader: string | null = null;
    page.on("request", (request) => {
      if (request.method() === "POST" && request.url().includes("/copilot/chat")) {
        try {
          capturedBody = request.postDataJSON();
          capturedWorkspaceHeader = request.headers()["x-workspace-id"] ?? null;
        } catch {
          capturedBody = null;
        }
      }
    });

    await page.goto("/assistant");
    await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible();

    const chatRoot = page.locator(selectors.assistant.chatContainer);
    const input = chatRoot.locator("form input").first();
    const forcedPrompt =
      "IMPORTANT: You must call tool classes_listClassGroups right now with default filters. Do not answer from memory. Return class group names and total.";
    await input.fill(forcedPrompt);

    const chatResponsePromise = page.waitForResponse(
      (response) =>
        response.request().method() === "POST" &&
        response.url().includes("/copilot/chat") &&
        response.status() === 200
    );

    const submit = chatRoot.locator("form button[type='submit']").first();
    await submit.click();

    const chatResponse = await chatResponsePromise;
    const responseText = await chatResponse.text();

    await expect.poll(() => Boolean(capturedBody)).toBe(true);
    expect(capturedBody?.requestData?.activeModule).toBe("assistant");
    expect(capturedBody?.message?.parts?.[0]?.text).toBe(forcedPrompt);
    expect(chatResponse.url()).not.toContain("localhost:4000");
    expect(capturedWorkspaceHeader).toBe(auth.workspaceId);

    const chunks = parseSseChunks(responseText);
    const listToolCallIds = new Set(
      chunks
        .filter((chunk) => chunk.type === "tool-input-available")
        .filter((chunk) => chunk.toolName === "classes_listClassGroups")
        .map((chunk) => String(chunk.toolCallId))
    );
    expect(listToolCallIds.size).toBeGreaterThan(0);

    const toolOutputs = chunks
      .filter((chunk) => chunk.type === "tool-output-available")
      .filter((chunk) => listToolCallIds.has(String(chunk.toolCallId)))
      .map((chunk) => chunk.output)
      .filter(Boolean);

    expect(toolOutputs.length).toBeGreaterThan(0);
    const latestOutput = toolOutputs[toolOutputs.length - 1] as {
      items?: Array<{ id: string; name: string }>;
      pageInfo?: { total?: number };
    };

    const names = (latestOutput.items ?? []).map((item) => item.name);
    expect(names).toContain(expectedGroupA);
    expect(names).toContain(expectedGroupB);
    expect(latestOutput.pageInfo?.total ?? 0).toBe(expectedTotal);
  });
});
