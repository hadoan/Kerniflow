import { describe, expect, it, vi } from "vitest";
import { createCopilotAuthFetch, type CopilotAuthSession } from "../copilot-auth-fetch";

const createAuth = (accessToken = "token-old") => {
  let token: string | null = accessToken;
  const auth: CopilotAuthSession = {
    ensureValidAccessToken: vi.fn(async () => undefined),
    refreshAccessToken: vi.fn(async () => {
      token = "token-new";
    }),
    getAccessToken: vi.fn(() => token),
    clearTokens: vi.fn(async () => {
      token = null;
    }),
  };
  return auth;
};

describe("createCopilotAuthFetch", () => {
  it("sends the current access token", async () => {
    const auth = createAuth();
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer token-old");
      return new Response(null, { status: 200 });
    });
    const onAuthFailure = vi.fn();
    const authenticatedFetch = createCopilotAuthFetch(auth, fetchImplementation, onAuthFailure);

    const response = await authenticatedFetch("https://example.test/copilot");

    expect(response.status).toBe(200);
    expect(auth.ensureValidAccessToken).toHaveBeenCalledOnce();
    expect(onAuthFailure).not.toHaveBeenCalled();
  });

  it("refreshes once and retries a 401 with the new token", async () => {
    const auth = createAuth();
    const authorizations: Array<string | null> = [];
    const fetchImplementation = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      authorizations.push(new Headers(init?.headers).get("Authorization"));
      return new Response(null, { status: authorizations.length === 1 ? 401 : 200 });
    });
    const authenticatedFetch = createCopilotAuthFetch(auth, fetchImplementation, vi.fn());

    const response = await authenticatedFetch("https://example.test/copilot");

    expect(response.status).toBe(200);
    expect(auth.refreshAccessToken).toHaveBeenCalledOnce();
    expect(authorizations).toEqual(["Bearer token-old", "Bearer token-new"]);
  });

  it("clears the session and reports auth failure when refresh is revoked", async () => {
    const auth = createAuth();
    auth.refreshAccessToken = vi.fn(async () => {
      throw new Error("Invalid refresh token");
    });
    const fetchImplementation = vi.fn(async () => new Response(null, { status: 401 }));
    const onAuthFailure = vi.fn();
    const authenticatedFetch = createCopilotAuthFetch(auth, fetchImplementation, onAuthFailure);

    await expect(authenticatedFetch("https://example.test/copilot")).rejects.toThrow(
      "Invalid refresh token"
    );
    expect(auth.clearTokens).toHaveBeenCalledOnce();
    expect(onAuthFailure).toHaveBeenCalledOnce();
  });
});
