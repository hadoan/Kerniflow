import { randomUUID } from "node:crypto";
import { expect, test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

type ApiOptions = {
  token: string;
  workspaceId: string;
};

async function login(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, email);
  await page.fill(selectors.auth.loginPasswordInput, password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 20_000 });
}

async function apiRequest(
  method: "GET" | "POST" | "PUT",
  path: string,
  options: ApiOptions,
  body?: unknown
) {
  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.token}`,
      "X-Workspace-Id": options.workspaceId,
      "Idempotency-Key": randomUUID(),
    },
  };

  if (body !== undefined) {
    requestInit.body = JSON.stringify(body);
  }

  const response = await fetch(
    `${process.env.API_URL || "http://localhost:3000"}${path}`,
    requestInit
  );

  if (!response.ok) {
    const responseBody = await response.text();
    throw new Error(`${method} ${path} failed: ${response.status} ${responseBody}`);
  }

  return response.json() as Promise<any>;
}

test.describe("Classes Programs", () => {
  test("happy path: create program and persist templates", async ({ page, testData }) => {
    await login(page, testData.user.email, testData.user.password);

    const auth = await page.evaluate(() => {
      const accessToken = localStorage.getItem("accessToken") ?? "";
      const workspaceId = localStorage.getItem("corely-active-workspace") ?? "";
      return { accessToken, workspaceId };
    });

    expect(auth.accessToken).toBeTruthy();
    expect(auth.workspaceId).toBeTruthy();

    const apiOptions: ApiOptions = {
      token: auth.accessToken,
      workspaceId: auth.workspaceId,
    };

    const runLabel = Date.now().toString();
    const programTitle = `A1.1 - Aussprache ${runLabel}`;

    const created = await apiRequest("POST", "/classes/programs", apiOptions, {
      title: programTitle,
      description: "Pronunciation combo",
      levelTag: "A1.1",
      expectedSessionsCount: 25,
    });

    expect(created.program.id).toBeTruthy();

    await apiRequest(
      "PUT",
      `/classes/programs/${created.program.id}/session-templates`,
      apiOptions,
      {
        items: [
          { index: 1, title: "Kickoff", type: "LECTURE", defaultDurationMin: 120 },
          { index: 2, title: "Shadowing", type: "LAB", defaultDurationMin: 90 },
        ],
      }
    );

    await apiRequest(
      "PUT",
      `/classes/programs/${created.program.id}/milestone-templates`,
      apiOptions,
      {
        items: [{ index: 1, title: "A1.1 checkpoint", type: "CHECKPOINT", required: true }],
      }
    );

    const detail = await apiRequest("GET", `/classes/programs/${created.program.id}`, apiOptions);
    expect(detail.program.title).toBe(programTitle);
    expect(detail.sessionTemplates).toHaveLength(2);
    expect(detail.milestoneTemplates).toHaveLength(1);

    await page.locator(selectors.navigation.classesProgramsNavLink).click();
    await expect(page.locator(selectors.classes.programsList)).toBeVisible({ timeout: 20_000 });
  });
});
