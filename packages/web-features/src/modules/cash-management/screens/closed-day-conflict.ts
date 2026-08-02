import { HttpError } from "@corely/api-client";
import type { ClosedDayConflict } from "./closed-day-correction-dialog";

export const getClosedDayConflict = (error: unknown): ClosedDayConflict | null => {
  if (
    !(error instanceof HttpError) ||
    error.status !== 409 ||
    !error.body ||
    typeof error.body !== "object"
  ) {
    return null;
  }

  const body = error.body as { code?: unknown; data?: unknown };
  if (
    body.code !== "CashManagement:DayAlreadyClosed" ||
    !body.data ||
    typeof body.data !== "object"
  ) {
    return null;
  }

  const data = body.data as Record<string, unknown>;
  return typeof data.dayKey === "string" && typeof data.currentBalanceCents === "number"
    ? {
        dayKey: data.dayKey,
        closedAt: typeof data.closedAt === "string" ? data.closedAt : null,
        currentBalanceCents: data.currentBalanceCents,
      }
    : null;
};
