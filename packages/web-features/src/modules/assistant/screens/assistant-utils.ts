import { isToday, isYesterday, startOfWeek } from "date-fns";

export type ThreadGroupKey =
  | "today"
  | "needsAttention"
  | "previousDays"
  | "monthlyReviews"
  | "generalQuestions"
  | "yesterday"
  | "week"
  | "older";

export interface ThreadGroup {
  key: ThreadGroupKey;
  label: string;
  items: Array<{
    id: string;
    title: string;
    lastMessageAt: string;
  }>;
}

export const THREAD_LIST_QUERY_KEY = ["assistant", "threads", "recent"] as const;

import type { TFunction } from "i18next";

export const getThreadGroupLabels = (t: TFunction): Record<ThreadGroupKey, string> => ({
  today: t("assistant.groups.today", "Today"),
  needsAttention: t("assistant.groups.needsAttention", "Needs attention"),
  previousDays: t("assistant.groups.previousDays", "Previous days"),
  monthlyReviews: t("assistant.groups.monthlyReviews", "Monthly reviews"),
  generalQuestions: t("assistant.groups.generalQuestions", "General questions"),
  yesterday: t("assistant.groups.yesterday", "Yesterday"),
  week: t("assistant.groups.week", "This week"),
  older: t("assistant.groups.older", "Older"),
});

export const getChronologicalGroupKey = (isoDate: string): ThreadGroupKey => {
  const date = new Date(isoDate);
  if (isToday(date)) {
    return "today";
  }
  if (isYesterday(date)) {
    return "yesterday";
  }
  const start = startOfWeek(new Date(), { weekStartsOn: 1 });
  if (date >= start) {
    return "week";
  }
  return "older";
};
