import { expect, type APIRequestContext } from "@playwright/test";
import { API_BASE_URL } from "./http.ts";

const TEST_HARNESS_SECRET = process.env.TEST_HARNESS_SECRET ?? "test-secret-key";

export async function assertApiReady(request: APIRequestContext): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/test/health`, {
    headers: {
      "X-Test-Secret": TEST_HARNESS_SECRET,
    },
  });

  expect(response.ok()).toBeTruthy();

  const body = (await response.json()) as { status?: string };
  expect(body.status).toBe("ok");
}
