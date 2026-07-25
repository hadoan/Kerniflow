export type CashAssistantWorkspaceType = "DAILY_CASH_DAY" | "MONTHLY_REVIEW" | "GENERAL_HELP";

export interface CashAssistantWorkspaceEntity {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string | null;
  locationId: string | null;
  type: CashAssistantWorkspaceType;
  businessDate: Date | null;
  businessMonth: Date | null;
  conversationId: string;
  cashDayId: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
}
