import React from "react";
import { format } from "date-fns";
import { ChevronDown, Loader2, Plus } from "lucide-react";
import { Button, Collapsible, CollapsibleContent, CollapsibleTrigger } from "@corely/ui";
import { cn } from "@corely/web-shared/shared/lib/utils";
import { useTranslation } from "react-i18next";
import { type ThreadGroup, type ThreadGroupKey } from "./assistant-utils";

interface AssistantSidebarProps {
  threadsQuery: any;
  groupedThreads: ThreadGroup[];
  openGroups: Record<ThreadGroupKey, boolean>;
  setOpenGroups: React.Dispatch<React.SetStateAction<Record<ThreadGroupKey, boolean>>>;
  handleNewChat: () => void;
  isCreating: boolean;
  hasUserMessages: boolean;
  threadId?: string;
  openThread: (id: string) => void;
}

export function AssistantSidebar({
  threadsQuery,
  groupedThreads,
  openGroups,
  setOpenGroups,
  handleNewChat,
  isCreating,
  hasUserMessages,
  threadId,
  openThread,
}: AssistantSidebarProps) {
  const { t } = useTranslation();

  return (
    <>
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
          disabled={isCreating || !hasUserMessages}
        >
          {isCreating ? (
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
              {t("assistant.noChatsDescription", "Start a conversation and it will appear here.")}
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
                  <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(item.lastMessageAt), "p")}
                  </span>
                </button>
              ))}
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>
    </>
  );
}
