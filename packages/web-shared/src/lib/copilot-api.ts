import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseChatOptions } from "@ai-sdk/react";
import {
  type UIMessage,
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithApprovalResponses,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { createIdempotencyKey } from "@corely/api-client";
import { authClient } from "./auth-client";
import { apiClient } from "./api-client";
import { COPILOT_AUTH_RETURN_TO_KEY, createCopilotAuthFetch } from "./copilot-auth-fetch";
import { parseCopilotHistoryPayload } from "./copilot-history";
import {
  getActiveWorkspaceId,
  subscribeWorkspace,
} from "@corely/web-shared/shared/workspaces/workspace-store";
import {
  type CopilotUIMessage,
  CreateCopilotThreadResponseSchema,
  GetCopilotThreadResponseSchema,
  ListCopilotThreadMessagesResponseSchema,
  ListCopilotThreadsResponseSchema,
  SearchCopilotThreadsResponseSchema,
  type CreateCopilotThreadResponse,
  type GetCopilotThreadResponse,
  type ListCopilotThreadMessagesResponse,
  type ListCopilotThreadsRequest,
  type ListCopilotThreadsResponse,
  type CopilotThreadSearchResult,
  type SearchCopilotThreadsRequest,
  type SearchCopilotThreadsResponse,
} from "@corely/contracts";

export type CopilotChatMessage = UIMessage & { content?: unknown };
export type { CopilotThreadSearchResult };

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
  runIdMode?: "persisted" | "controlled";
  onData?: (data: unknown) => void;
}

const RUN_ID_STORAGE_KEY = "copilot:run";

const handleCopilotAuthFailure = () => {
  if (typeof window === "undefined") {
    return;
  }
  const returnTo = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  window.sessionStorage.setItem(COPILOT_AUTH_RETURN_TO_KEY, returnTo);
  window.location.assign("/auth/login");
};

const copilotAuthFetch = createCopilotAuthFetch(
  authClient.client,
  globalThis.fetch.bind(globalThis),
  handleCopilotAuthFailure
);

const buildRunIdStorageKey = (
  activeModule: string,
  tenantId: string,
  workspaceId: string
): string => `${RUN_ID_STORAGE_KEY}:${tenantId}:${workspaceId}:${activeModule}`;

const loadStoredRunId = (
  activeModule: string,
  tenantId: string,
  workspaceId: string
): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const scopedKey = buildRunIdStorageKey(activeModule, tenantId, workspaceId);
    const stored = window.localStorage.getItem(scopedKey);
    if (stored) {
      return stored;
    }
    if (tenantId === workspaceId) {
      const legacy = window.localStorage.getItem(
        `${RUN_ID_STORAGE_KEY}:${workspaceId}:${activeModule}`
      );
      return legacy || null;
    }
    return null;
  } catch {
    return null;
  }
};

const persistRunId = (
  activeModule: string,
  tenantId: string,
  workspaceId: string,
  runId: string
) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const scopedKey = buildRunIdStorageKey(activeModule, tenantId, workspaceId);
    window.localStorage.setItem(scopedKey, runId);
  } catch {
    // ignore storage errors
  }
};

const contentToText = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }
  if (content == null) {
    return "";
  }
  try {
    return JSON.stringify(content);
  } catch {
    return String(content);
  }
};

const normalizeMessages = (
  messages: Array<CopilotUIMessage | CopilotChatMessage>
): CopilotChatMessage[] =>
  messages.map((msg) => {
    const role = (msg.role === "tool" ? "assistant" : msg.role) as CopilotChatMessage["role"];
    const fallbackText = contentToText((msg as CopilotUIMessage).content);
    const parts = (
      Array.isArray(msg.parts) && msg.parts.length > 0
        ? msg.parts
        : fallbackText
          ? [{ type: "text", text: fallbackText }]
          : []
    ) as CopilotChatMessage["parts"];
    const id =
      msg.id ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : createIdempotencyKey());

    return {
      ...msg,
      id,
      role,
      parts,
    };
  });

const decodeTenantIdFromToken = (token: string | null): string | null => {
  if (!token) {
    return null;
  }
  if (typeof atob !== "function") {
    return null;
  }
  const parts = token.split(".");
  if (parts.length < 2) {
    return null;
  }
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
  try {
    const decoded = JSON.parse(atob(padded));
    return typeof decoded?.tenantId === "string" ? decoded.tenantId : null;
  } catch {
    return null;
  }
};

export const useCopilotChatOptions = (
  input: CopilotOptionsInput
): {
  options: UseChatOptions<CopilotChatMessage>;
  runId: string;
  apiBase: string;
  tenantId: string;
  workspaceId: string;
  accessToken: string;
} => {
  const apiBase = resolveCopilotBaseUrl();
  const runIdMode = input.runIdMode ?? "persisted";
  const isControlledRunId = runIdMode === "controlled";
  const accessToken = authClient.getAccessToken() ?? "";
  const tenantId = useMemo(
    () => decodeTenantIdFromToken(accessToken) ?? "demo-tenant",
    [accessToken]
  );
  const [workspaceId, setWorkspaceId] = useState<string>(getActiveWorkspaceId() ?? tenantId);

  useEffect(() => {
    const unsubscribe = subscribeWorkspace((workspaceId) => {
      setWorkspaceId(workspaceId ?? tenantId);
    });
    return unsubscribe;
  }, [tenantId]);

  const [runId, setRunId] = useState<string>(() => {
    if (isControlledRunId) {
      return input.runId ?? "";
    }
    const initialWorkspace = getActiveWorkspaceId() ?? tenantId;
    return (
      input.runId ||
      loadStoredRunId(input.activeModule, tenantId, initialWorkspace) ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : createIdempotencyKey())
    );
  });

  useEffect(() => {
    if (isControlledRunId) {
      if (input.runId && input.runId !== runId) {
        setRunId(input.runId);
      }
      return;
    }
    const nextRunId =
      input.runId ||
      loadStoredRunId(input.activeModule, tenantId, workspaceId) ||
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : createIdempotencyKey());
    setRunId(nextRunId);
  }, [input.activeModule, input.runId, isControlledRunId, runId, tenantId, workspaceId]);

  useEffect(() => {
    if (isControlledRunId || !runId) {
      return;
    }
    persistRunId(input.activeModule, tenantId, workspaceId, runId);
  }, [isControlledRunId, runId, input.activeModule, tenantId, workspaceId]);

  // Get auth headers dynamically on each request to ensure fresh token
  const getAuthHeaders = useCallback(() => {
    const accessToken = authClient.getAccessToken() ?? "";
    return {
      Authorization: accessToken ? `Bearer ${accessToken}` : "",
      "X-Workspace-Id": workspaceId,
    };
  }, [workspaceId]);

  const transport = useMemo(
    () =>
      new DefaultChatTransport<CopilotChatMessage>({
        api: `${apiBase}/copilot/chat`,
        fetch: copilotAuthFetch,
        headers: async () => ({
          ...getAuthHeaders(),
          "X-Idempotency-Key": createIdempotencyKey(),
        }),
        body: {
          id: runId || undefined,
          threadId: runId || undefined,
          requestData: {
            tenantId,
            locale: input.locale || "en",
            activeModule: input.activeModule,
          },
        },
        prepareSendMessagesRequest: async ({ messages, trigger, messageId }) => {
          const idempotencyKey = createIdempotencyKey();
          const safeMessages = normalizeMessages(messages);
          const latestMessage = safeMessages[safeMessages.length - 1];

          return {
            api: `${apiBase}/copilot/chat`,
            headers: {
              ...getAuthHeaders(),
              "X-Idempotency-Key": idempotencyKey,
            },
            body: {
              id: runId || undefined,
              threadId: runId || undefined,
              trigger,
              messageId,
              requestData: {
                tenantId,
                locale: input.locale || "en",
                activeModule: input.activeModule,
              },
              message: latestMessage,
            },
          };
        },
      }),
    [apiBase, getAuthHeaders, input.activeModule, input.locale, runId, tenantId]
  );

  const options: UseChatOptions<CopilotChatMessage> = useMemo(
    () => ({
      id: runId || `${input.activeModule}-draft`,
      transport,
      onData: (data: unknown) => {
        if (!data || typeof data !== "object") {
          input.onData?.(data);
          return;
        }
        const runData = data as { type?: string; data?: { runId?: string; threadId?: string } };
        if (runData.type === "data-run" && runData.data?.runId) {
          setRunId(runData.data.runId);
        }
        input.onData?.(data);
      },
      onError: (error: Error) => {
        console.error("[Copilot] Stream error:", error);
      },
      sendAutomaticallyWhen: ({ messages }) =>
        lastAssistantMessageIsCompleteWithApprovalResponses({
          messages: normalizeMessages(messages),
        }) ||
        lastAssistantMessageIsCompleteWithToolCalls({
          messages: normalizeMessages(messages),
        }),
    }),
    [input, runId, transport]
  );

  return { options, runId, apiBase, tenantId, workspaceId, accessToken };
};

export const fetchCopilotHistory = async (params: {
  runId: string;
  apiBase: string;
  workspaceId: string;
  accessToken: string;
}): Promise<CopilotChatMessage[]> => {
  if (!params.runId) {
    return [];
  }
  const response = await copilotAuthFetch(
    `${params.apiBase}/copilot/threads/${params.runId}/messages?pageSize=200`,
    {
      headers: {
        Authorization: params.accessToken ? `Bearer ${params.accessToken}` : "",
        "X-Workspace-Id": params.workspaceId,
      },
    }
  );
  if (!response.ok) {
    return [];
  }
  const json = await response.json();
  return normalizeMessages(parseCopilotHistoryPayload(json));
};

const encodeQuery = (params: Record<string, string | number | undefined>): string => {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      query.append(key, String(value));
    }
  });
  return query.toString();
};

export const listCopilotThreads = async (
  params: ListCopilotThreadsRequest = {}
): Promise<ListCopilotThreadsResponse> => {
  const query = encodeQuery({
    cursor: params.cursor,
    pageSize: params.pageSize,
    q: params.q,
  });
  const endpoint = query ? `/copilot/threads?${query}` : "/copilot/threads";
  const response = await apiClient.get<ListCopilotThreadsResponse>(endpoint, {
    correlationId: apiClient.generateCorrelationId(),
  });
  return ListCopilotThreadsResponseSchema.parse(response);
};

export const getCopilotThread = async (threadId: string): Promise<GetCopilotThreadResponse> => {
  const response = await apiClient.get<GetCopilotThreadResponse>(`/copilot/threads/${threadId}`, {
    correlationId: apiClient.generateCorrelationId(),
  });
  return GetCopilotThreadResponseSchema.parse(response);
};

export const listCopilotThreadMessages = async (
  threadId: string,
  params: { cursor?: string; pageSize?: number } = {}
): Promise<ListCopilotThreadMessagesResponse> => {
  const query = encodeQuery({
    cursor: params.cursor,
    pageSize: params.pageSize,
  });
  const endpoint = query
    ? `/copilot/threads/${threadId}/messages?${query}`
    : `/copilot/threads/${threadId}/messages`;
  const response = await apiClient.get<ListCopilotThreadMessagesResponse>(endpoint, {
    correlationId: apiClient.generateCorrelationId(),
  });
  return ListCopilotThreadMessagesResponseSchema.parse(response);
};

export const searchCopilotThreads = async (
  params: SearchCopilotThreadsRequest
): Promise<SearchCopilotThreadsResponse> => {
  const query = encodeQuery({
    q: params.q,
    cursor: params.cursor,
    pageSize: params.pageSize,
  });
  const endpoint = `/copilot/threads/search?${query}`;
  const response = await apiClient.get<SearchCopilotThreadsResponse>(endpoint, {
    correlationId: apiClient.generateCorrelationId(),
  });
  return SearchCopilotThreadsResponseSchema.parse(response);
};

export const createCopilotThread = async (
  input: { title?: string; metadata?: Record<string, unknown> } = {}
): Promise<string> => {
  const response = await apiClient.post<CreateCopilotThreadResponse>("/copilot/threads", input, {
    idempotencyKey: apiClient.generateIdempotencyKey(),
    correlationId: apiClient.generateCorrelationId(),
  });
  return CreateCopilotThreadResponseSchema.parse(response).thread.id;
};
