import { useMemo } from "react";
import {
  type ThreadGroup,
  type ThreadGroupKey,
  getChronologicalGroupKey,
  getThreadGroupLabels,
} from "./assistant-utils";

export function useGroupedThreads(
  threadsQueryDataItems: any[],
  workspacesQueryDataItems: any[],
  isCashModule: boolean,
  t: any
): ThreadGroup[] {
  return useMemo<ThreadGroup[]>(() => {
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

    const workspaces = workspacesQueryDataItems ?? [];
    const workspaceMap = new Map(
      workspaces.map((workspace) => [workspace.conversationId, workspace])
    );

    for (const item of threadsQueryDataItems ?? []) {
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
  }, [threadsQueryDataItems, isCashModule, workspacesQueryDataItems, t]);
}
