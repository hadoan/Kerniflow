export interface CopilotAuthSession {
  ensureValidAccessToken: () => Promise<void>;
  refreshAccessToken: () => Promise<void>;
  getAccessToken: () => string | null;
  clearTokens: () => Promise<void>;
}

export const COPILOT_AUTH_RETURN_TO_KEY = "copilot:auth-return-to";

export const createCopilotAuthFetch = (
  auth: CopilotAuthSession,
  fetchImplementation: typeof fetch,
  onAuthFailure: () => void
): typeof fetch => {
  let tokenOperation: Promise<void> | null = null;

  const runTokenOperation = async (operation: () => Promise<void>) => {
    if (!tokenOperation) {
      tokenOperation = operation().finally(() => {
        tokenOperation = null;
      });
    }
    await tokenOperation;
  };

  const expireSession = async (cause: unknown): Promise<never> => {
    await auth.clearTokens();
    onAuthFailure();
    throw cause instanceof Error ? cause : new Error("Authentication session expired");
  };

  const withCurrentToken = (init?: RequestInit): RequestInit => {
    const headers = new Headers(init?.headers);
    const accessToken = auth.getAccessToken();
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    } else {
      headers.delete("Authorization");
    }
    return { ...init, headers };
  };

  return async (input, init) => {
    try {
      await runTokenOperation(() => auth.ensureValidAccessToken());
    } catch (error) {
      return expireSession(error);
    }

    const attemptedToken = auth.getAccessToken();
    let response = await fetchImplementation(input, withCurrentToken(init));
    if (response.status !== 401) {
      return response;
    }

    try {
      if (auth.getAccessToken() === attemptedToken) {
        await runTokenOperation(() => auth.refreshAccessToken());
      }
    } catch (error) {
      return expireSession(error);
    }

    response = await fetchImplementation(input, withCurrentToken(init));
    if (response.status === 401) {
      return expireSession(new Error("Authentication session expired"));
    }
    return response;
  };
};
