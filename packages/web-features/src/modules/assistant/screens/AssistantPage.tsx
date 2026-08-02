import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2, Plus, Search, Sparkles, Menu } from "lucide-react";
import { Button, Sheet, SheetContent, SheetTrigger, useToast } from "@corely/ui";
import {
  listCopilotThreads,
  searchCopilotThreads,
  getCopilotThread,
  createCopilotThread,
  type CopilotThreadSearchResult,
} from "@corely/web-shared/lib/copilot-api";
import { Chat } from "@corely/web-shared/shared/components/Chat";
import { useTranslation } from "react-i18next";
import { billingApi } from "@corely/web-shared/lib/billing-api";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import {
  CashManagementBillingFeatureKeys,
  CashManagementProductKey,
  type CashRegister,
} from "@corely/contracts";
import { getAssistantCapabilityGroups, getAssistantSuggestions } from "./assistant-suggestions";
import { CashHandoffConfirmationCard } from "../components/CashHandoffConfirmationCard";
import { type ThreadGroupKey, THREAD_LIST_QUERY_KEY } from "./assistant-utils";
import { CashAssistantEmptyState } from "../../cash-management/components/cash-assistant-empty-state";
import { CashConversationContextHeader } from "../../cash-management/components/cash-conversation-context-header";
import { CashAssistantRegisterSelector } from "../../cash-management/components/cash-assistant-register-selector";
import { AssistantSearchDialog } from "../components/AssistantSearchDialog";
import { useAssistantRegisterBinding } from "./use-assistant-register-binding";
import { useAssistantHandoffs } from "./use-assistant-handoffs";
import { useAssistantToolRenderers } from "./use-assistant-tool-renderers";
import { useGroupedThreads } from "./use-grouped-threads";
import { AssistantSidebar } from "./AssistantSidebar";

interface AssistantPageProps {
  activeModule?: string;
}

const getErrorMessage = (e: unknown): string | undefined => {
  if (e instanceof Error) {
    return e.message;
  }
  if (typeof e === "string") {
    return e;
  }
  return undefined;
};

export default function AssistantPage({ activeModule = "assistant" }: AssistantPageProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { threadId } = useParams<{ threadId?: string }>();
  const toolRenderers = useAssistantToolRenderers(threadId);
  const [searchParams, setSearchParams] = useSearchParams();
  const focusedMessageId = searchParams.get("m");
  const handoffId = searchParams.get("handoffId");
  const queryClient = useQueryClient();
  const { handoffQuery, confirmHandoffMutation, cancelHandoffMutation } = useAssistantHandoffs(
    threadId,
    handoffId,
    searchParams,
    setSearchParams
  );

  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearchText, setDebouncedSearchText] = useState("");
  const [hasUserMessages, setHasUserMessages] = useState(false);

  const previousThreadIdRef = useRef<string | undefined>(threadId);
  const {
    registerBindingError,
    setRegisterBindingError,
    lastBindingRequest,
    setLastBindingRequest,
    lastAutoBindingKeyRef,
    resolveWorkspaceMutation,
    bindRegister,
  } = useAssistantRegisterBinding(activeModule, threadId, t, toast, getErrorMessage);
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

  const activeThreadTitle = threadQuery.data?.thread.title ?? t("assistant.title");

  const openThread = (id: string) => {
    setSheetOpen(false);
    navigate(`/assistant/t/${id}`);
  };

  const openSearchResult = (result: CopilotThreadSearchResult) => {
    setSearchOpen(false);
    setSheetOpen(false);
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
    setSheetOpen(false);
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

  const groupedThreads = useGroupedThreads(
    threadsQuery.data?.threads ?? [],
    workspacesQuery.data?.items ?? [],
    isCashModule,
    t
  );

  const sidebarContent = (
    <AssistantSidebar
      threadsQuery={threadsQuery}
      groupedThreads={groupedThreads}
      openGroups={openGroups}
      setOpenGroups={setOpenGroups}
      handleNewChat={handleNewChat}
      isCreating={createThreadMutation.isPending}
      hasUserMessages={hasUserMessages}
      threadId={threadId}
      openThread={openThread}
    />
  );

  return (
    <div
      className="flex h-[calc(100dvh-3.5rem)] min-h-0 flex-col gap-4 px-4 py-5 sm:px-5 sm:py-6 lg:h-screen lg:gap-6 lg:p-8"
      data-testid="assistant-chat"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-h1 text-foreground">{t("assistant.title")}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("assistant.subtitle")}</p>
          </div>
          <div className="md:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="flex w-80 flex-col p-0">
                {sidebarContent}
              </SheetContent>
            </Sheet>
          </div>
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
            {sidebarContent}
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
                  {handoffId && handoffQuery.data && (
                    <CashHandoffConfirmationCard
                      handoff={handoffQuery.data}
                      isConfirming={confirmHandoffMutation.isPending}
                      onConfirm={() => confirmHandoffMutation.mutate()}
                      isCancelling={cancelHandoffMutation.isPending}
                      onCancel={() => cancelHandoffMutation.mutate()}
                      onNextAction={() => {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.delete("handoffId");
                        setSearchParams(nextParams, { replace: true });
                      }}
                    />
                  )}
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
                    toolRenderers={toolRenderers}
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
