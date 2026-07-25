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

export const THREAD_GROUP_LABELS: Record<ThreadGroupKey, string> = {
  today: "Today",
  needsAttention: "Needs attention",
  previousDays: "Previous days",
  monthlyReviews: "Monthly reviews",
  generalQuestions: "General questions",
  yesterday: "Yesterday",
  week: "This week",
  older: "Older",
};

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
