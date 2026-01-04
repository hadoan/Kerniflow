import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseChatOptions } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithApprovalResponses } from "ai";
import { createIdempotencyKey } from "@corely/api-client";
import { authClient } from "./auth-client";
import { getActiveWorkspaceId, subscribeWorkspace } from "@/shared/workspaces/workspace-store";
import { CopilotUIMessageSchema, type CopilotUIMessage } from "@corely/contracts";

export const resolveCopilotBaseUrl = () => {
  const mode = import.meta.env.VITE_API_MODE;
  const mockBase =
    import.meta.env.VITE_MOCK_API_BASE_URL ||
    import.meta.env.VITE_API_MOCK_BASE_URL ||
    "http://localhost:4000";

  // Use /api proxy in development (Vite dev server proxies to backend)
  const realBase =
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    (import.meta.env.DEV ? "/api" : "http://localhost:3000");

  return mode === "mock" ? mockBase : realBase;
};

export interface CopilotOptionsInput {
  activeModule: string;
  locale?: string;
  runId?: string;
  onData?: (data: any) => void;
}

const RUN_ID_STORAGE_KEY = "copilot:run";

const loadStoredRunId = (activeModule: string, tenantId: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(`${RUN_ID_STORAGE_KEY}:${tenantId}:${activeModule}`);
    return stored || null;
  } catch {
    return null;
  }
};

const persistRunId = (activeModule: string, tenantId: string, runId: string) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(`${RUN_ID_STORAGE_KEY}:${tenantId}:${activeModule}`, runId);
  } catch {
    // ignore storage errors
  }
};

const normalizeMessages = (messages: CopilotUIMessage[]) =>
  messages.map((msg) => ({
    ...msg,
    parts: Array.isArray(msg.parts) ? msg.parts : [],
  }));

export const useCopilotChatOptions = (
  input: CopilotOptionsInput
): {
  options: UseChatOptions;
  runId: string;
  apiBase: string;
  tenantId: string;
  accessToken: string;
} => {
  const apiBase = resolveCopilotBaseUrl();
  const [tenantId, setTenantId] = useState<string>(getActiveWorkspaceId() ?? "demo-tenant");

  useEffect(() => {
    const unsubscribe = subscribeWorkspace((workspaceId) => {
      setTenantId(workspaceId ?? "demo-tenant");
    });
    return unsubscribe;
  }, []);

  const [runId, setRunId] = useState<string>(() => {
    const initialTenant = getActiveWorkspaceId() ?? "demo-tenant";
    return (
      input.runId ||
      loadStoredRunId(input.activeModule, initialTenant) ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : createIdempotencyKey())
    );
  });

  useEffect(() => {
    const nextRunId =
      input.runId ||
      loadStoredRunId(input.activeModule, tenantId) ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : createIdempotencyKey());
    setRunId(nextRunId);
  }, [input.activeModule, input.runId, tenantId]);

  useEffect(() => {
    persistRunId(input.activeModule, tenantId, runId);
  }, [runId, input.activeModule, tenantId]);

  // Get auth headers dynamically on each request to ensure fresh token
  const getAuthHeaders = useCallback(() => {
    const accessToken = authClient.getAccessToken() ?? "";
    return {
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      "X-Tenant-Id": tenantId,
    };
  }, [tenantId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<CopilotUIMessage>({
        api: `${apiBase}/copilot/chat`,
        headers: async () => ({
          ...getAuthHeaders(),
          "X-Idempotency-Key": createIdempotencyKey(),
        }),
        body: {
          id: runId,
          requestData: {
            tenantId,
            locale: input.locale || "en",
            activeModule: input.activeModule,
          },
        },
        prepareSendMessagesRequest: async ({ messages, trigger, messageId }) => {
          const idempotencyKey = createIdempotencyKey();
          const safeMessages = normalizeMessages(messages);
          const shouldSendFullHistory = lastAssistantMessageIsCompleteWithApprovalResponses({
            messages: safeMessages,
          });
          const latestMessage = safeMessages[safeMessages.length - 1];

          return {
            api: `${apiBase}/copilot/chat`,
            headers: {
              ...getAuthHeaders(),
              "X-Idempotency-Key": idempotencyKey,
            },
            body: {
              id: runId,
              trigger,
              messageId,
              requestData: {
                tenantId,
                locale: input.locale || "en",
                activeModule: input.activeModule,
              },
              ...(shouldSendFullHistory ? { messages: safeMessages } : { message: latestMessage }),
            },
          };
        },
      }),
    [apiBase, getAuthHeaders, input.activeModule, input.locale, runId, tenantId]
  );

  const options: UseChatOptions = useMemo(
    () => ({
      id: runId,
      transport,
      onData: (data: any) => {
        if (data.type === "data-run" && data.data?.runId) {
          setRunId(data.data.runId);
        }
        input.onData?.(data);
      },
      onError: (error: Error) => {
        console.error("[Copilot] Stream error:", error);
      },
      sendAutomaticallyWhen: ({ messages }) =>
        lastAssistantMessageIsCompleteWithApprovalResponses({
          messages: normalizeMessages(messages),
        }),
    }),
    [input, runId, transport]
  );

  return { options, runId, apiBase, tenantId, accessToken: authClient.getAccessToken() ?? "" };
};

export const fetchCopilotHistory = async (params: {
  runId: string;
  apiBase: string;
  tenantId: string;
  accessToken: string;
}): Promise<CopilotUIMessage[]> => {
  if (!params.runId) {
    return [];
  }
  const response = await fetch(`${params.apiBase}/copilot/chat/${params.runId}/history`, {
    headers: {
      Authorization: params.accessToken ? `Bearer ${params.accessToken}` : "",
      "X-Tenant-Id": params.tenantId,
    },
  });
  if (!response.ok) {
    return [];
  }
  const json = await response.json();
  const parsed = CopilotUIMessageSchema.array().safeParse(json.items ?? []);
  if (parsed.success) {
    return parsed.data.map((msg) => ({
      ...msg,
      parts: Array.isArray(msg.parts) ? msg.parts : [],
    }));
  }
  return [];
};
