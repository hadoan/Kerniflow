import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { ChevronDown, Loader2, Plus, Search, Sparkles } from "lucide-react";
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@corely/ui";
import {
  listCopilotThreads,
  searchCopilotThreads,
  getCopilotThread,
  createCopilotThread,
  type CopilotThreadSearchResult,
} from "@corely/web-shared/lib/copilot-api";
import { Chat } from "@corely/web-shared/shared/components/Chat";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { useTranslation } from "react-i18next";
import { useToast } from "@corely/ui";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import {
  CashManagementBillingFeatureKeys,
  CashManagementProductKey,
  type CashAssistantWorkspace,
  type CashRegister,
  type CashReportPreviewDto,
  type MonthlyCashReportDto,
} from "@corely/contracts";
import { getAssistantCapabilityGroups, getAssistantSuggestions } from "./assistant-suggestions";
import { CashReportPreview } from "../../cash-management/components/cash-report-preview";
import { MonthlyCashReportPreview } from "../../cash-management/components/monthly-cash-report-preview";
import { CashClarificationRenderer } from "../components/CashClarificationRenderer";
import { CashDayConfirmationRenderer } from "../components/CashDayConfirmationRenderer";
import { CashDayConfirmationResultRenderer } from "../components/CashDayConfirmationResultRenderer";
import {
  type ThreadGroupKey,
  type ThreadGroup,
  THREAD_LIST_QUERY_KEY,
  getThreadGroupLabels,
  getChronologicalGroupKey,
} from "./assistant-utils";
import { CashAssistantEmptyState } from "../../cash-management/components/cash-assistant-empty-state";
import { CashConversationContextHeader } from "../../cash-management/components/cash-conversation-context-header";
import { CashAssistantRegisterSelector } from "../../cash-management/components/cash-assistant-register-selector";
import { AssistantSearchDialog } from "../components/AssistantSearchDialog";

interface AssistantPageProps {
  activeModule?: string;
}

type RegisterBindingRequest = {
  registerId: string;
  conversationId?: string;
};

const getErrorMessage = (error: unknown): string | undefined =>
  error instanceof Error ? error.message : undefined;

export default function AssistantPage({ activeModule = "assistant" }: AssistantPageProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();
  const [searchParams] = useSearchParams();
  const focusedMessageId = searchParams.get("m");
  const queryClient = useQueryClient();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [hasUserMessages, setHasUserMessages] = useState(false);
  const [registerBindingError, setRegisterBindingError] = useState<string | null>(null);
  const [lastBindingRequest, setLastBindingRequest] = useState<RegisterBindingRequest | null>(null);
  const lastAutoBindingKeyRef = useRef<string | null>(null);
  const previousThreadIdRef = useRef<string | undefined>(threadId);
  const [openGroups, setOpenGroups] = useState<Record<ThreadGroupKey, boolean>>({
    today: true,
    needsAttention: true,
    previousDays: true,
    monthlyReviews: true,
    generalQuestions: false,
    yesterday: true,
    week: true,
    older: true,
  });

  useEffect(() => {
    setHasUserMessages(false);
  }, [threadId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearchText(searchText.trim());
    }, 250);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [searchText]);

  const suggestions = useMemo(() => {
    const locale = i18n.resolvedLanguage ?? i18n.language ?? "en";
    return getAssistantSuggestions({ activeModule, locale, t });
  }, [activeModule, i18n.language, i18n.resolvedLanguage, t]);

  const capabilityGroups = useMemo(
    () => getAssistantCapabilityGroups({ activeModule, t }),
    [activeModule, t]
  );

  const threadsQuery = useQuery({
    queryKey: THREAD_LIST_QUERY_KEY,
    queryFn: async () => listCopilotThreads({ pageSize: 50 }),
  });

  const workspacesQuery = useQuery({
    queryKey: ["cash-workspaces"],
    queryFn: () => cashManagementApi.listWorkspaces(),
    enabled: activeModule === "cash-management",
  });

  const registersQuery = useQuery({
    queryKey: ["cash-registers"],
    queryFn: () => cashManagementApi.listRegisters(),
    enabled: activeModule === "cash-management",
  });

  const resolveWorkspaceMutation = useMutation({
    mutationFn: (params: RegisterBindingRequest) =>
      cashManagementApi.resolveWorkspace({
        type: "GENERAL_HELP",
        registerId: params.registerId,
        conversationId: params.conversationId,
      }),
    onMutate: () => {
      setRegisterBindingError(null);
    },
    onSuccess: (ws) => {
      setRegisterBindingError(null);
      queryClient.setQueryData<{ items: CashAssistantWorkspace[] }>(
        ["cash-workspaces"],
        (current) => ({
          items: [
            ...(current?.items ?? []).filter(
              (workspace) => workspace.conversationId !== ws.conversationId
            ),
            ws,
          ],
        })
      );
      void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
      if (ws.conversationId && ws.conversationId !== threadId) {
        navigate(`/assistant/t/${ws.conversationId}`);
      }
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      setRegisterBindingError(message ?? t("cashDashboard.registerSelector.error"));
      toast({
        title: t("cashDashboard.registerSelector.error", "Could not set the cash register."),
        description: message,
        variant: "destructive",
      });
    },
  });

  const threadQuery = useQuery({
    queryKey: ["assistant", "thread", threadId],
    queryFn: async () => getCopilotThread(threadId || ""),
    enabled: Boolean(threadId),
  });

  const billingProductKey =
    activeModule === "cash-management" ? CashManagementProductKey : undefined;

  const billingQuery = useQuery({
    queryKey: ["billing", "current", billingProductKey],
    queryFn: () => billingApi.getCurrent(billingProductKey ?? CashManagementProductKey),
    enabled: Boolean(billingProductKey),
  });

  const canChat =
    !billingProductKey ||
    billingQuery.data?.entitlements?.featureValues?.[
      CashManagementBillingFeatureKeys.aiAssistant
    ] === true;

  const searchQuery = useQuery({
    queryKey: ["assistant", "thread-search", debouncedSearchText],
    queryFn: async () => searchCopilotThreads({ q: debouncedSearchText, pageSize: 40 }),
    enabled: searchOpen && debouncedSearchText.length > 1,
  });

  const createThreadMutation = useMutation({
    mutationFn: async () => createCopilotThread(),
    onSuccess: (id) => {
      void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
      navigate(`/assistant/t/${id}`);
    },
  });

  const currentWorkspace = useMemo(() => {
    if (activeModule !== "cash-management" || !threadId) {
      return null;
    }
    return workspacesQuery.data?.items?.find((ws) => ws.conversationId === threadId);
  }, [activeModule, threadId, workspacesQuery.data?.items]);

  const isCashModule = activeModule === "cash-management";
  const registers = registersQuery.data?.registers ?? [];
  const isExistingConversationWorkspaceResolved = !threadId || workspacesQuery.isSuccess;
  const needsRegisterBinding =
    isCashModule &&
    isExistingConversationWorkspaceResolved &&
    !currentWorkspace?.registerId &&
    registers.length > 0;
  const soleRegister = registers.length === 1 ? registers[0] : null;
  const autoBindingKey = soleRegister ? `${threadId ?? "new"}:${soleRegister.id}` : null;
  const shouldAutoBind = Boolean(needsRegisterBinding && soleRegister && autoBindingKey);

  const bindRegister = useCallback(
    (request: RegisterBindingRequest) => {
      setLastBindingRequest(request);
      setRegisterBindingError(null);
      resolveWorkspaceMutation.mutate(request);
    },
    [resolveWorkspaceMutation.mutate]
  );

  useEffect(() => {
    if (previousThreadIdRef.current !== threadId) {
      previousThreadIdRef.current = threadId;
      lastAutoBindingKeyRef.current = null;
      setRegisterBindingError(null);
      setLastBindingRequest(null);
    }
  }, [threadId]);

  useEffect(() => {
    if (
      !shouldAutoBind ||
      !soleRegister ||
      !autoBindingKey ||
      resolveWorkspaceMutation.isPending ||
      registerBindingError ||
      lastAutoBindingKeyRef.current === autoBindingKey
    ) {
      return;
    }
    lastAutoBindingKeyRef.current = autoBindingKey;
    bindRegister({ registerId: soleRegister.id, conversationId: threadId });
  }, [
    autoBindingKey,
    bindRegister,
    registerBindingError,
    resolveWorkspaceMutation.isPending,
    shouldAutoBind,
    soleRegister,
    threadId,
  ]);

  const groupedThreads = useMemo<ThreadGroup[]>(() => {
    const groups: Record<ThreadGroupKey, ThreadGroup["items"]> = {
      today: [],
      needsAttention: [],
      previousDays: [],
      monthlyReviews: [],
      generalQuestions: [],
      yesterday: [],
      week: [],
      older: [],
    };

    const isCashModule = activeModule === "cash-management";
    const workspaces = workspacesQuery.data?.items ?? [];
    const workspaceMap = new Map(
      workspaces.map((workspace) => [workspace.conversationId, workspace])
    );

    for (const item of threadsQuery.data?.items ?? []) {
      if (
        typeof item.id !== "string" ||
        typeof item.title !== "string" ||
        typeof item.lastMessageAt !== "string"
      ) {
        continue;
      }

      let key: ThreadGroupKey = getChronologicalGroupKey(item.lastMessageAt);

      if (isCashModule) {
        const workspace = workspaceMap.get(item.id);
        if (workspace) {
          if (workspace.type === "DAILY_CASH_DAY") {
            if (new Date(workspace.businessDate).toDateString() === new Date().toDateString()) {
              key = "today";
            } else {
              key = "previousDays";
            }
          } else if (workspace.type === "MONTHLY_REVIEW") {
            key = "monthlyReviews";
          } else if (workspace.type === "GENERAL_HELP") {
            key = "generalQuestions";
          }
        }
      }

      groups[key].push({
        id: item.id,
        title: item.title,
        lastMessageAt: item.lastMessageAt,
      });
    }

    if (isCashModule && groups.generalQuestions.length > 5) {
      groups.generalQuestions = groups.generalQuestions.slice(0, 5);
    }

    const order: ThreadGroupKey[] = isCashModule
      ? ["today", "needsAttention", "previousDays", "monthlyReviews", "generalQuestions"]
      : ["today", "yesterday", "week", "older"];

    const groupLabels = getThreadGroupLabels(t);

    return order
      .map((key) => ({
        key,
        label: groupLabels[key],
        items: groups[key],
      }))
      .filter((group) => group.items.length > 0);
  }, [threadsQuery.data?.items, activeModule, workspacesQuery.data?.items, t]);

  const activeThreadTitle = threadQuery.data?.thread.title ?? t("assistant.title");

  const openThread = (id: string) => {
    navigate(`/assistant/t/${id}`);
  };

  const openSearchResult = (result: CopilotThreadSearchResult) => {
    setSearchOpen(false);
    navigate(`/assistant/t/${result.threadId}?m=${result.messageId}`);
  };

  const handleRunResolved = (resolvedRunId: string) => {
    if (!resolvedRunId) {
      return;
    }

    if (threadId !== resolvedRunId) {
      navigate(`/assistant/t/${resolvedRunId}`, {
        replace: !threadId,
      });
    }
    void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
  };

  const handleConversationUpdated = () => {
    void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
    if (threadId) {
      void queryClient.invalidateQueries({ queryKey: ["assistant", "thread", threadId] });
    }
  };

  const handleChatBlocked = () => {
    toast({
      title: t("assistant.upgradeRequiredTitle", "Upgrade required for AI chat"),
      description: t(
        "assistant.upgradeRequiredDescription",
        "Upgrade to the Pro plan to chat with the assistant."
      ),
      variant: "destructive",
    });
    if (billingProductKey) {
      navigate("/billing");
    }
  };

  const handleNewChat = () => {
    if (activeModule === "cash-management") {
      navigate("/assistant");
    } else {
      createThreadMutation.mutate();
    }
  };

  const needsRegisterSelection = Boolean(needsRegisterBinding) && registers.length > 1;

  const isRegisterContextLoading =
    isCashModule &&
    (registersQuery.isLoading ||
      (Boolean(threadId) && workspacesQuery.isLoading) ||
      resolveWorkspaceMutation.isPending ||
      (shouldAutoBind && !registerBindingError));

  const registerContextError =
    registerBindingError ??
    (registersQuery.isError
      ? t("cashDashboard.registerSelector.error", "Could not set the cash register.")
      : null) ??
    (threadId && workspacesQuery.isError
      ? t("cashDashboard.registerSelector.error", "Could not set the cash register.")
      : null);

  const handleSelectRegister = (reg: CashRegister) => {
    bindRegister({
      registerId: reg.id,
      conversationId: threadId,
    });
  };

  const handleRetryRegisterBinding = () => {
    setRegisterBindingError(null);
    if (registersQuery.isError) {
      void registersQuery.refetch();
      return;
    }
    if (threadId && workspacesQuery.isError) {
      void workspacesQuery.refetch();
      return;
    }
    if (lastBindingRequest) {
      bindRegister(lastBindingRequest);
      return;
    }
    lastAutoBindingKeyRef.current = null;
  };

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6 lg:h-screen lg:gap-6 lg:p-8"
      data-testid="assistant-chat"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-h1 text-foreground">{t("assistant.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("assistant.subtitle")}</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setSearchOpen(true)}
          >
            <Search className="mr-2 h-4 w-4" />
            {t("assistant.searchAction", "Search")}
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={handleNewChat}
            disabled={
              (isCashModule
                ? resolveWorkspaceMutation.isPending
                : createThreadMutation.isPending) || !hasUserMessages
            }
          >
            {createThreadMutation.isPending || resolveWorkspaceMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {t("assistant.newChat", "New chat")}
          </Button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="grid h-full min-h-0 md:grid-cols-[20rem_minmax(0,1fr)]">
          <aside className="hidden min-h-0 border-r border-border bg-background/40 md:flex md:flex-col">
            <div className="border-b border-border px-6 py-4 lg:px-8">
              <div className="text-sm font-semibold text-foreground">
                {t("assistant.recentChats", "Recent chats")}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {t(
                  "assistant.recentChatsDescription",
                  "Browse previous conversations or start a new one."
                )}
              </div>
            </div>

            <div className="border-b border-border px-6 py-4 lg:px-8">
              <Button
                className="w-full"
                onClick={handleNewChat}
                disabled={
                  (isCashModule
                    ? resolveWorkspaceMutation.isPending
                    : createThreadMutation.isPending) || !hasUserMessages
                }
              >
                {createThreadMutation.isPending || resolveWorkspaceMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                {t("assistant.newChat", "New chat")}
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 lg:px-8">
              {threadsQuery.isLoading ? (
                <div className="py-2 text-sm text-muted-foreground">
                  {t("assistant.loadingChats", "Loading chats...")}
                </div>
              ) : null}

              {!threadsQuery.isLoading && groupedThreads.length === 0 ? (
                <div className="space-y-1 py-2">
                  <div className="text-sm font-medium text-foreground">
                    {t("assistant.noChats", "No chats yet")}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t(
                      "assistant.noChatsDescription",
                      "Start a conversation and it will appear here."
                    )}
                  </div>
                </div>
              ) : null}

              {groupedThreads.map((group) => (
                <Collapsible
                  key={group.key}
                  open={openGroups[group.key]}
                  onOpenChange={(open) => {
                    setOpenGroups((current) => ({
                      ...current,
                      [group.key]: open,
                    }));
                  }}
                >
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg py-2 text-left text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground hover:text-foreground">
                    {group.label}
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 transition-transform",
                        openGroups[group.key] ? "" : "-rotate-90"
                      )}
                    />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-1 pb-2">
                    {group.items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => openThread(item.id)}
                        className={cn(
                          "flex w-full flex-col rounded-lg px-3 py-2 text-left transition-colors",
                          threadId === item.id ? "bg-accent/10" : "hover:bg-muted/60"
                        )}
                      >
                        <span className="truncate text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.lastMessageAt), "p")}
                        </span>
                      </button>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </aside>

          <div className="flex min-w-0 min-h-0 flex-1 flex-col">
            <header className="flex-shrink-0 border-b border-border bg-background/40">
              {currentWorkspace ? (
                <CashConversationContextHeader workspace={currentWorkspace} />
              ) : (
                <div className="flex items-center gap-3 px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
                    <Sparkles className="h-5 w-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-foreground">
                      {activeThreadTitle}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {threadId
                        ? t(
                            "assistant.threadHeaderDescription",
                            "Continue the conversation or start a new task."
                          )
                        : t("assistant.emptyStateDescription")}
                    </p>
                  </div>
                </div>
              )}
            </header>

            <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {registerContextError ? (
                <div className="flex h-full min-h-[300px] flex-col items-center justify-center gap-3 p-4 text-center sm:p-6">
                  <p className="text-sm text-destructive">{registerContextError}</p>
                  <Button type="button" variant="outline" onClick={handleRetryRegisterBinding}>
                    {t("cashDashboard.registerSelector.retry", "Try again")}
                  </Button>
                </div>
              ) : needsRegisterSelection ? (
                <CashAssistantRegisterSelector
                  registers={registers}
                  onSelectRegister={handleSelectRegister}
                  isBinding={resolveWorkspaceMutation.isPending}
                />
              ) : isRegisterContextLoading ? (
                <div className="flex h-full min-h-[300px] items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span>
                    {t("cashDashboard.registerSelector.binding", "Selecting register...")}
                  </span>
                </div>
              ) : (
                <div
                  className="flex min-h-0 flex-1 flex-col px-4 py-3 sm:px-6 sm:py-6 lg:px-8 lg:py-8"
                  data-testid="assistant-messages"
                >
                  <Chat
                    key={threadId ?? "new-thread"}
                    activeModule={activeModule}
                    locale={i18n.language}
                    runId={threadId}
                    runIdMode="controlled"
                    canSend={canChat}
                    onSendBlocked={handleChatBlocked}
                    onRunIdResolved={handleRunResolved}
                    onConversationUpdated={handleConversationUpdated}
                    onHasUserMessagesChange={setHasUserMessages}
                    focusMessageId={focusedMessageId}
                    placeholder={t("assistant.placeholder")}
                    suggestions={suggestions}
                    capabilityGroups={capabilityGroups}
                    capabilityCatalogTitle={t("cashDashboard.assistant.capabilityCatalogTitle", "")}
                    capabilityCatalogDescription={t(
                      "cashDashboard.assistant.capabilityCatalogDescription",
                      ""
                    )}
                    emptyStateTitle={t("assistant.emptyStateTitle")}
                    emptyStateDescription={t("assistant.emptyStateDescription")}
                    renderEmptyState={
                      activeModule === "cash-management"
                        ? ({ focusComposer }) => (
                            <CashAssistantEmptyState onSelectPrompt={focusComposer} />
                          )
                        : undefined
                    }
                    toolRenderers={{
                      get_cash_report_preview: (props) => {
                        if (
                          !props.output ||
                          typeof props.output !== "object" ||
                          !("business" in props.output)
                        ) {
                          return (
                            <div className="p-4 border rounded bg-muted/30">
                              {t("assistant.loadingPreview", "Loading preview...")}
                            </div>
                          );
                        }
                        return <CashReportPreview report={props.output as CashReportPreviewDto} />;
                      },
                      get_monthly_cash_report: (props) => {
                        if (
                          !props.output ||
                          typeof props.output !== "object" ||
                          !("totals" in props.output)
                        ) {
                          return (
                            <div className="p-4 border rounded bg-muted/30">
                              {t("assistant.loadingMonthlyReport", "Loading monthly report...")}
                            </div>
                          );
                        }
                        return (
                          <MonthlyCashReportPreview report={props.output as MonthlyCashReportDto} />
                        );
                      },
                      request_cash_clarification: (props) => (
                        <CashClarificationRenderer {...props} />
                      ),
                      prepare_cash_day_confirmation: (props) => (
                        <CashDayConfirmationRenderer {...props} />
                      ),
                      confirm_cash_day_draft: (props) => (
                        <CashDayConfirmationResultRenderer {...props} />
                      ),
                    }}
                  />
                </div>
              )}
            </main>
          </div>
        </div>
      </div>

      <AssistantSearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        searchText={searchText}
        onSearchTextChange={setSearchText}
        debouncedSearchText={debouncedSearchText}
        isLoading={searchQuery.isLoading}
        results={searchQuery.data?.items ?? []}
        onSelectResult={openSearchResult}
      />
    </div>
  );
}
