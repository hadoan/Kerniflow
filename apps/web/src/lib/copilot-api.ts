import { useMemo } from "react";
import type { UseChatOptions } from "@ai-sdk/react";
import { createIdempotencyKey } from "@corely/api-client";
import { authClient } from "./auth-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

export const resolveCopilotBaseUrl = () => {
  const mode = import.meta.env.VITE_API_MODE;
  const mockBase =
    import.meta.env.VITE_MOCK_API_BASE_URL ||
    import.meta.env.VITE_API_MOCK_BASE_URL ||
    "http://localhost:4000";
  const realBase =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";
  return mode === "mock" ? mockBase : realBase;
};

export interface CopilotOptionsInput {
  activeModule: string;
  locale?: string;
  runId?: string;
}

export const useCopilotChatOptions = (input: CopilotOptionsInput): UseChatOptions => {
  return useMemo(() => {
    const apiBase = resolveCopilotBaseUrl();
    const tenantId = getActiveWorkspaceId() ?? "demo-tenant";
    const accessToken = authClient.getAccessToken() ?? "";

    const options: UseChatOptions = {
      api: input.runId
        ? `${apiBase}/copilot/runs/${input.runId}/messages`
        : `${apiBase}/copilot/chat`,
      headers: {
        Authorization: accessToken ? `Bearer ${accessToken}` : "",
        "X-Tenant-Id": tenantId,
        "X-Idempotency-Key": createIdempotencyKey(),
      },
      body: {
        id: input.runId,
        requestData: {
          tenantId,
          locale: input.locale || "en",
          activeModule: input.activeModule,
        },
      },
      onError: (error: Error) => {
        console.error("[Copilot] Stream error:", error);
      },
    };

    return options;
  }, [input.activeModule, input.locale, input.runId]);
};
