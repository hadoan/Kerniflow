import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { fetchCopilotHistory, useCopilotChatOptions } from "@corely/web-shared/lib/copilot-api";
import { useRotatingStatusText } from "@corely/web-shared/shared/components/chat/useRotatingStatusText";
import { type StatusPhase } from "@corely/web-shared/shared/components/chat/statusTexts";
import i18n from "@corely/web-shared/shared/i18n";
import { useTranslation } from "react-i18next";

import { type MessagePart, hasVisiblePart, hasVisibleText } from "./chat/ChatParts";
import { ChatComposer } from "./chat/chat-composer";
import {
  ChatEmptyState,
  type CapabilityAction,
  type CapabilityGroup,
  type Suggestion,
} from "./chat/chat-empty-state";
import { ChatMessageList, type ChatMessage, type RoleStyle } from "./chat/chat-message-list";
import {
  fileToChatPart,
  formatBytes,
  isSupportedAttachment,
  MAX_ATTACHMENT_SIZE_BYTES,
} from "./chat/chat-utils";
import type { ToolRenderer } from "./chat/ChatParts";

export interface ChatProps {
  activeModule: string;
  locale?: string;
  placeholder?: string;
  suggestions?: Suggestion[];
  capabilityGroups?: CapabilityGroup[];
  capabilityCatalogTitle?: string;
  capabilityCatalogDescription?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  canSend?: boolean;
  onSendBlocked?: () => void;
  runId?: string;
  runIdMode?: "persisted" | "controlled";
  onRunIdResolved?: (runId: string) => void;
  onConversationUpdated?: () => void;
  onHasUserMessagesChange?: (hasUserMessages: boolean) => void;
  focusMessageId?: string | null;
  toolRenderers?: Record<string, ToolRenderer>;
  renderEmptyState?: (props: { focusComposer: (value: string) => void }) => React.ReactNode;
}

export type { CapabilityAction, CapabilityGroup, Suggestion };

export function Chat({
  activeModule,
  locale = "en",
  placeholder = "Type your message",
  suggestions = [],
  capabilityGroups = [],
  capabilityCatalogTitle,
  capabilityCatalogDescription,
  emptyStateTitle,
  emptyStateDescription,
  canSend = true,
  onSendBlocked,
  runId: controlledRunId,
  runIdMode = "persisted",
  onRunIdResolved,
  onConversationUpdated,
  onHasUserMessagesChange,
  focusMessageId,
  toolRenderers,
  renderEmptyState,
}: ChatProps) {
  const { t } = useTranslation();
  const [streamEventStarted, setStreamEventStarted] = useState(false);
  const [toolRequestPending, setToolRequestPending] = useState(false);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const previousStatusRef = useRef<string | undefined>(undefined);

  const handleStreamData = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== "object") {
        return;
      }
      const payload = data as { type?: string; data?: { runId?: string } };
      const type = payload.type;
      if (type === "text-start" || type === "text-delta") {
        setStreamEventStarted(true);
      }
      if (type === "data-run" && payload.data?.runId) {
        onRunIdResolved?.(payload.data.runId);
      }
    },
    [onRunIdResolved]
  );

  const {
    options: chatOptions,
    runId,
    apiBase,
    workspaceId,
    accessToken,
  } = useCopilotChatOptions({
    activeModule,
    locale,
    runId: controlledRunId,
    runIdMode,
    onData: handleStreamData,
  });

  const chat = useChat(chatOptions);
  const [submittingToolIds, setSubmittingToolIds] = useState<Set<string>>(new Set());
  const [hydratedRunId, setHydratedRunId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerRef = useRef<HTMLFormElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);

  // AI SDK v3 API - manage input state ourselves
  const messages = (chat.messages ?? []) as ChatMessage[];
  const sendMessage = (chat as any).sendMessage;
  const addToolResult = (chat as any).addToolResult;
  const addToolApprovalResponse = (chat as any).addToolApprovalResponse;
  const setMessages = chat.setMessages;
  const status = (chat as any).status;
  const isLoading = status === "streaming" || status === "submitted";
  const roleConfig: Record<string, RoleStyle> = {
    user: {
      label: i18n.t("assistant.userRole"),
      align: "items-end",
      badge: "accent" as const,
      bubble:
        "bg-accent text-accent-foreground border border-accent/30 shadow-[0_12px_30px_-20px_rgba(0,0,0,0.5)]",
      tail: "rounded-br-md",
    },
    assistant: {
      label: i18n.t("assistant.assistantRole"),
      align: "items-start",
      badge: "muted" as const,
      bubble:
        "bg-panel/80 text-foreground border border-border/70 shadow-[0_12px_30px_-22px_rgba(0,0,0,0.45)]",
      tail: "rounded-bl-md",
    },
    system: {
      label: i18n.t("assistant.systemRole"),
      align: "items-center",
      badge: "warning" as const,
      bubble:
        "bg-warning-muted text-warning border border-warning/30 shadow-[0_12px_30px_-24px_rgba(0,0,0,0.4)]",
      tail: "",
    },
  };

  const getRoleStyle = (role: string) =>
    roleConfig[role as keyof typeof roleConfig] ?? roleConfig.assistant;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.currentTarget.style.height = "auto";
    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 128)}px`;
  };

  const focusComposer = useCallback((value: string) => {
    setInput(value);
    window.requestAnimationFrame(() => {
      composerRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
      window.setTimeout(() => {
        composerInputRef.current?.focus();
      }, 180);
    });
  }, []);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) {
      return;
    }

    const validFiles: File[] = [];
    let firstError: string | null = null;
    for (const file of selected) {
      if (!isSupportedAttachment(file)) {
        firstError ??= t("assistant.attachments.invalidType", { name: file.name });
        continue;
      }
      if (file.size > MAX_ATTACHMENT_SIZE_BYTES) {
        firstError ??= t("assistant.attachments.tooLarge", {
          name: file.name,
          maxSize: formatBytes(MAX_ATTACHMENT_SIZE_BYTES),
        });
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      setPendingFiles((current) => [...current, ...validFiles]);
    }
    setAttachmentError(firstError);

    e.target.value = "";
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
    setAttachmentError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if ((!trimmedInput && pendingFiles.length === 0) || !sendMessage) {
      return;
    }
    if (!canSend) {
      onSendBlocked?.();
      return;
    }

    setStreamEventStarted(false);
    setToolRequestPending(false);
    try {
      const fileParts =
        pendingFiles.length > 0
          ? await Promise.all(pendingFiles.map((file) => fileToChatPart(file)))
          : undefined;

      await Promise.resolve(
        sendMessage({
          text: trimmedInput || undefined,
          files: fileParts,
        })
      );
      setInput("");
      setPendingFiles([]);
      setAttachmentError(null);
      onConversationUpdated?.();
    } catch (error) {
      console.error("Failed to send message with attachments:", error);
    }
  };

  const markSubmitting = (id: string, value: boolean) => {
    setSubmittingToolIds((prev) => {
      const next = new Set(prev);
      if (value) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (status === "submitted") {
      setStreamEventStarted(false);
    }
  }, [status]);

  useEffect(() => {
    if (!isLoading) {
      setStreamEventStarted(false);
      setToolRequestPending(false);
    }
  }, [isLoading]);

  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    const wasLoading = previousStatus === "streaming" || previousStatus === "submitted";
    if (wasLoading && !isLoading) {
      onConversationUpdated?.();
    }
    previousStatusRef.current = status;
  }, [isLoading, onConversationUpdated, status]);

  useEffect(() => {
    // Reset messages immediately when runId changes
    if (hydratedRunId && hydratedRunId !== runId) {
      setMessages([]);
      setHydratedRunId(null);
    }

    let cancelled = false;
    void fetchCopilotHistory({ runId, apiBase, workspaceId, accessToken })
      .then((history) => {
        if (cancelled) {
          return;
        }
        if (!hydratedRunId || hydratedRunId !== runId) {
          setMessages(history as any);
          setHydratedRunId(runId);
        }
      })
      .catch((error) => {
        console.error("Failed to fetch copilot history:", error);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken, apiBase, hydratedRunId, runId, setMessages, workspaceId]);

  const lastUserIndex = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i].role === "user") {
        return i;
      }
    }
    return -1;
  }, [messages]);

  const hasUserMessages = lastUserIndex >= 0;

  useEffect(() => {
    onHasUserMessagesChange?.(hasUserMessages);
  }, [hasUserMessages, onHasUserMessagesChange]);

  const assistantHasOutputAfterLastUser = useMemo(() => {
    if (lastUserIndex < 0) {
      return false;
    }
    return messages.slice(lastUserIndex + 1).some((message) => {
      if (message.role !== "assistant") {
        return false;
      }
      if (Array.isArray(message.parts) && message.parts.length > 0) {
        return (message.parts as MessagePart[]).some((part) => hasVisiblePart(part));
      }
      if (typeof message.content === "string") {
        return hasVisibleText(message.content);
      }
      return false;
    });
  }, [lastUserIndex, messages]);

  const responseStarted = streamEventStarted || assistantHasOutputAfterLastUser;
  const showWaitingStatus =
    (isLoading && !responseStarted) || (toolRequestPending && !streamEventStarted);
  const toolPhase: StatusPhase | undefined =
    showWaitingStatus && (toolRequestPending || submittingToolIds.size > 0) ? "tool" : undefined;

  const { text: statusText } = useRotatingStatusText({
    enabled: showWaitingStatus,
    phase: toolPhase,
    tone: "calm",
  });

  useEffect(() => {
    if (responseStarted) {
      setToolRequestPending(false);
    }
  }, [responseStarted]);

  useEffect(() => {
    if (!focusMessageId || !messages.some((message) => message.id === focusMessageId)) {
      return;
    }
    const element = document.querySelector(`[data-message-id="${focusMessageId}"]`);
    if (!element) {
      return;
    }
    element.scrollIntoView({ behavior: "smooth", block: "center" });
    setHighlightedMessageId(focusMessageId);
    const timeoutId = window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === focusMessageId ? null : current));
    }, 1600);
    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [focusMessageId, messages]);

  const addToolResultWithTracking = useCallback(
    async (params: { toolCallId: string; output: unknown; tool: string }) => {
      if (!addToolResult) {
        return;
      }
      setStreamEventStarted(false);
      setToolRequestPending(true);
      await Promise.resolve(addToolResult(params));
      onConversationUpdated?.();
    },
    [addToolResult, onConversationUpdated]
  );

  const addToolApprovalResponseWithTracking = useCallback(
    async (params: { id: string; approved: boolean; reason?: string }) => {
      if (!addToolApprovalResponse) {
        return;
      }
      setStreamEventStarted(false);
      setToolRequestPending(true);
      await Promise.resolve(addToolApprovalResponse(params));
      onConversationUpdated?.();
    },
    [addToolApprovalResponse, onConversationUpdated]
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative min-h-0 flex-1 overflow-y-auto rounded-xl border border-border/60 bg-card/40 p-4 sm:rounded-3xl md:p-6 animate-fade-in">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute -right-20 -top-8 h-72 w-72 rounded-full bg-warning/20 blur-3xl" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background/70 to-transparent" />
        </div>
        <div className="relative space-y-6">
          {messages.length === 0 ? (
            renderEmptyState ? (
              renderEmptyState({ focusComposer })
            ) : (
              <ChatEmptyState
                suggestions={suggestions}
                capabilityGroups={capabilityGroups}
                capabilityCatalogTitle={capabilityCatalogTitle}
                capabilityCatalogDescription={capabilityCatalogDescription}
                emptyStateTitle={emptyStateTitle}
                emptyStateDescription={emptyStateDescription}
                onSelectPrompt={focusComposer}
              />
            )
          ) : null}

          <ChatMessageList
            messages={messages}
            highlightedMessageId={highlightedMessageId}
            getRoleStyle={getRoleStyle}
            submittingToolIds={submittingToolIds}
            markSubmitting={markSubmitting}
            addToolResult={addToolResult ? addToolResultWithTracking : undefined}
            addToolApprovalResponse={
              addToolApprovalResponse ? addToolApprovalResponseWithTracking : undefined
            }
            showWaitingStatus={showWaitingStatus}
            statusText={statusText}
            toolRenderers={toolRenderers}
          />
        </div>
      </div>

      <div className="sticky bottom-0 z-10 bg-background/95 pt-2 backdrop-blur">
        <ChatComposer
          input={input}
          placeholder={placeholder}
          isLoading={isLoading}
          pendingFiles={pendingFiles}
          attachmentError={attachmentError}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
          onFileSelection={handleFileSelection}
          removePendingFile={removePendingFile}
          fileInputRef={fileInputRef}
          composerRef={composerRef}
          inputRef={composerInputRef}
          sendLabel={t("assistant.send")}
          sendingLabel={t("assistant.sending")}
          canSubmit={Boolean(input.trim()) || pendingFiles.length > 0}
          addAttachmentLabel={t("assistant.attachments.add")}
          removeAttachmentLabel={t("assistant.attachments.remove")}
        />
      </div>
    </div>
  );
}
