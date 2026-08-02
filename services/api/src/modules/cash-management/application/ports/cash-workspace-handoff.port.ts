import type { TransactionContext } from "@corely/kernel";

export type CreateCashWorkspaceHandoffRecord = {
  tenantId: string;
  locationId: string | null;
  registerId: string;
  sourceWorkspaceId: string;
  targetWorkspaceId: string;
  sourceConversationId: string;
  sourceMessageId: string;
  businessDate: string;
  movementType: string;
  amountCents: number;
  description: string;
  evidenceRequirement: string | null;
  candidateHash: string;
  version: number;
  confirmationId: string | null;
  status: "PENDING" | "CONSUMED" | "CANCELLED" | "EXPIRED";
  expiresAt: Date;
};

export interface CashWorkspaceHandoffRepoPort {
  createHandoff(data: CreateCashWorkspaceHandoffRecord, tx?: TransactionContext): Promise<any>;
  findHandoffById(tenantId: string, id: string, tx?: TransactionContext): Promise<any | null>;
  getHandoffForUpdate(id: string, tx?: TransactionContext): Promise<any | null>;
  markHandoffViewed(id: string, userId: string, tx?: TransactionContext): Promise<void>;
  markHandoffConsumed(id: string, tx?: TransactionContext): Promise<void>;
  markHandoffCancelled(id: string, tx?: TransactionContext): Promise<void>;
}
