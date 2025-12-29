import {
  type LoyaltyAccountStatus,
  type LoyaltyEntryType,
  type LoyaltyReasonCode,
} from "../../domain/engagement.types";

export type LoyaltyAccountRecord = {
  loyaltyAccountId: string;
  tenantId: string;
  customerPartyId: string;
  status: LoyaltyAccountStatus;
  currentPointsBalance: number;
  createdAt: Date;
  updatedAt: Date;
};

export type LoyaltyLedgerEntryRecord = {
  entryId: string;
  tenantId: string;
  customerPartyId: string;
  entryType: LoyaltyEntryType;
  pointsDelta: number;
  reasonCode: LoyaltyReasonCode;
  sourceType?: string | null;
  sourceId?: string | null;
  createdAt: Date;
  createdByEmployeePartyId?: string | null;
};

export type Pagination = {
  cursor?: string;
  pageSize: number;
};

export type ListResult<T> = {
  items: T[];
  nextCursor?: string | null;
};

export const LOYALTY_REPOSITORY_PORT = Symbol("LOYALTY_REPOSITORY_PORT");

export interface LoyaltyRepositoryPort {
  getAccountByCustomer(
    tenantId: string,
    customerPartyId: string
  ): Promise<LoyaltyAccountRecord | null>;
  upsertAccount(
    tenantId: string,
    customerPartyId: string,
    status: LoyaltyAccountStatus
  ): Promise<LoyaltyAccountRecord>;
  updateAccountBalance(
    tenantId: string,
    customerPartyId: string,
    newBalance: number
  ): Promise<void>;
  createLedgerEntry(entry: LoyaltyLedgerEntryRecord): Promise<void>;
  findLedgerEntryBySource(
    tenantId: string,
    sourceType: string,
    sourceId: string,
    reasonCode: LoyaltyReasonCode
  ): Promise<LoyaltyLedgerEntryRecord | null>;
  listLedger(
    tenantId: string,
    customerPartyId: string,
    pagination: Pagination
  ): Promise<ListResult<LoyaltyLedgerEntryRecord>>;
}
