import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

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

async function login(page: Page, creds: { email: string; password: string; tenantId: string }) {
  await page.goto(`/auth/login?tenant=${encodeURIComponent(creds.tenantId)}`);
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 15_000 });
}

async function getAuthContext(page: Page) {
  const accessToken = await page.evaluate(() => localStorage.getItem("accessToken"));
  if (!accessToken) throw new Error("Missing access token after login");

  const payload = decodeJwtPayload(accessToken);
  const tenantId = typeof payload?.tenantId === "string" ? payload.tenantId : "";

  const storedWorkspace = await page.evaluate(() =>
    localStorage.getItem("corely-active-workspace")
  );
  const resolvedWorkspaceId = storedWorkspace || tenantId;

  const workspacesRes = await page.request.get(`${API_URL}/workspaces`, {
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  });
  let defaultWorkspaceId = resolvedWorkspaceId;
  if (workspacesRes.ok()) {
    const body = (await workspacesRes.json()) as { workspaces?: Array<{ id?: string }> };
    if (typeof body.workspaces?.[0]?.id === "string") {
      defaultWorkspaceId = body.workspaces[0].id;
    }
  }

  return { accessToken, tenantId, workspaceId: resolvedWorkspaceId, defaultWorkspaceId };
}

async function fetchThreadMessages(
  page: Page,
  auth: { accessToken: string; workspaceId: string },
  threadId: string
): Promise<Array<{ id: string; role: string; contentText: string | null }>> {
  // Try both endpoint paths
  for (const base of ["/copilot/threads", "/ai-copilot/threads"]) {
    const res = await page.request.get(`${API_URL}${base}/${threadId}/messages?pageSize=50`, {
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
        "X-Workspace-Id": auth.workspaceId,
      },
    });
    if (res.ok()) {
      const body = await res.json();
      return (body?.items ?? []) as Array<{
        id: string;
        role: string;
        contentText: string | null;
      }>;
    }
  }
  return [];
}

/** Helper: wait for message streaming to end (composer input unlocked) */
async function waitForStreamEnd(page: Page, timeoutMs = 90_000) {
  // Input is disabled while status is "submitted"/"streaming", then re-enabled when done.
  const chatInput = page.getByPlaceholder("Ask anything...");
  await expect(chatInput).toBeEnabled({ timeout: timeoutMs });
}

/** Helper: get the number of messages with the ASSISTANT role badge currently in the DOM */
async function countAssistantBadges(page: Page): Promise<number> {
  // The badge uses i18n key "assistant.assistantRole" = "Assistant" rendered uppercase via CSS
  // Playwright sees the actual text node, which is "Assistant", not "ASSISTANT"
  const badges = page.getByText("Assistant", { exact: true });
  return badges.count();
}

test.describe("Assistant – customer chat persistence", () => {
  // Generous timeout: login + AI response + DB check + follow-up + reload
  test.setTimeout(180_000);

  test("new chat → send customer message → assert response saved in DB & UI → follow-up also saved", async ({
    page,
    testData,
  }) => {
    // ── 1. Login ──────────────────────────────────────────────────────
    await login(page, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const auth = await getAuthContext(page);
    const resolvedAuth = {
      accessToken: auth.accessToken,
      workspaceId: auth.defaultWorkspaceId || auth.workspaceId,
    };

    // ── 2. Navigate to assistant ──────────────────────────────────────
    await page.goto("/assistant");
    await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible({
      timeout: 15_000,
    });

    // ── 3. Click "New chat" ───────────────────────────────────────────
    const newChatBtn = page.getByRole("button", { name: /new chat/i }).first();
    await expect(newChatBtn).toBeVisible();
    await newChatBtn.click();

    // Wait for navigation to /assistant/t/<id>
    await page.waitForURL("**/assistant/t/**", { timeout: 15_000 });
    const threadIdMatch = page.url().match(/\/assistant\/t\/([^/?]+)/);
    expect(threadIdMatch).toBeTruthy();
    const threadId = threadIdMatch![1];
    console.log(`[E2E] Thread created: ${threadId}`);

    // ── 4. Send the customer creation message ─────────────────────────
    const customerMessage =
      "add this to customer 1) The Nails 80 (Rummelsburg / Lichtenberg) " +
      "Summary: Busy nail studio. WhatsApp: +49 174 2306666 " +
      "Email: thenails8010317@gmail.com " +
      "Facebook: https://www.facebook.com/Thenail80/";

    // Use placeholder text to find the chat input
    const chatInput = page.getByPlaceholder("Ask anything...");
    await chatInput.fill(customerMessage);
    await page.keyboard.press("Enter");

    // ── 5. Wait for user message to appear ───────────────────────────
    await expect(page.getByText("The Nails 80").first()).toBeVisible({ timeout: 15_000 });
    console.log("[E2E] User message visible");

    // ── 6. Wait for assistant to respond (stream completes) ───────────
    // Wait until we see at least one "Assistant" role badge in the chat
    await expect(async () => {
      const count = await countAssistantBadges(page);
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 90_000 });
    console.log("[E2E] Assistant response appeared in UI");

    // Wait for streaming to finish (composer input re-enabled)
    await waitForStreamEnd(page, 90_000);
    console.log("[E2E] Stream finished");

    // Give DB persistence a moment to complete
    await page.waitForTimeout(3_000);

    // ── 7. Verify DB has both user & assistant messages ───────────────
    const msgs1 = await fetchThreadMessages(page, resolvedAuth, threadId);
    console.log(`[E2E] DB messages after first turn: ${msgs1.length}`);
    msgs1.forEach((m) => console.log(`  role=${m.role}: ${(m.contentText || "").slice(0, 100)}`));

    const userMsgs1 = msgs1.filter((m) => m.role === "user");
    const asstMsgs1 = msgs1.filter((m) => m.role === "assistant");

    expect(
      userMsgs1.length,
      "Expected ≥1 user message in DB after first turn"
    ).toBeGreaterThanOrEqual(1);
    expect(
      asstMsgs1.length,
      `Expected ≥1 assistant message in DB. Got: [${msgs1.map((m) => m.role).join(", ")}]`
    ).toBeGreaterThanOrEqual(1);

    // ── 8. Send a follow-up message ───────────────────────────────────
    const followUp = "What email did I just add for this customer?";
    const badgesBefore = await countAssistantBadges(page);
    await chatInput.fill(followUp);
    await page.keyboard.press("Enter");

    await expect(page.getByText(followUp).first()).toBeVisible({ timeout: 15_000 });
    console.log("[E2E] Follow-up user message visible");

    // The number of assistant badges should increase
    await expect(async () => {
      const current = await countAssistantBadges(page);
      expect(current).toBeGreaterThan(badgesBefore);
    }).toPass({ timeout: 90_000 });
    console.log("[E2E] Second assistant response appeared in UI");

    await waitForStreamEnd(page, 90_000);
    await page.waitForTimeout(3_000);

    // ── 9. Verify DB has both turns persisted ─────────────────────────
    const msgs2 = await fetchThreadMessages(page, resolvedAuth, threadId);
    console.log(`[E2E] DB messages after follow-up: ${msgs2.length}`);
    msgs2.forEach((m) => console.log(`  role=${m.role}: ${(m.contentText || "").slice(0, 100)}`));

    const userMsgs2 = msgs2.filter((m) => m.role === "user");
    const asstMsgs2 = msgs2.filter((m) => m.role === "assistant");

    expect(userMsgs2.length, "Expected ≥2 user messages after follow-up").toBeGreaterThanOrEqual(2);
    expect(
      asstMsgs2.length,
      `Expected ≥2 assistant messages after follow-up. Got: [${msgs2.map((m) => m.role).join(", ")}]`
    ).toBeGreaterThanOrEqual(2);

    // ── 10. Reload and verify history is still visible ────────────────
    await page.reload();
    await expect(page.locator(selectors.assistant.chatContainer)).toBeVisible({
      timeout: 15_000,
    });

    // Original user message should still be visible from history
    await expect(page.getByText("The Nails 80").first()).toBeVisible({ timeout: 15_000 });

    // At least one assistant badge should be visible from the reloaded history
    await expect(async () => {
      const count = await countAssistantBadges(page);
      expect(count).toBeGreaterThanOrEqual(1);
    }).toPass({ timeout: 15_000 });

    console.log("[E2E] ✅ Test passed — all messages persisted and visible after reload");
  });
});
