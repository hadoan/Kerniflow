import type {
  CashDayCloseStatus,
  CashPaymentMethod as CashPaymentMethodType,
  CashEntryDirection,
  CashEntrySource,
  CashEntryTaxMode as CashEntryTaxModeType,
  CashEntryType,
  ExportCashBookFormat,
} from "@corely/contracts";
import type { TransactionContext } from "@corely/kernel";
import type {
  CashDayCloseEntity,
  CashDayConfirmationEntity,
  CashDenominationCountEntity,
  CashEntryAttachmentEntity,
  CashEntryEntity,
  CashExportArtifactEntity,
  CashRegisterEntity,
  CashAssistantWorkspaceEntity,
  CashAssistantWorkspaceType,
} from "../../domain/entities";

export const CASH_REGISTER_REPO = Symbol("CASH_REGISTER_REPO");
export const CASH_ENTRY_REPO = Symbol("CASH_ENTRY_REPO");
export const CASH_DAY_CLOSE_REPO = Symbol("CASH_DAY_CLOSE_REPO");
export const CASH_ATTACHMENT_REPO = Symbol("CASH_ATTACHMENT_REPO");
export const CASH_EXPORT_REPO = Symbol("CASH_EXPORT_REPO");
export const CASH_CONFIRMATION_REPO = Symbol("CASH_CONFIRMATION_REPO");
export const CASH_WORKSPACE_REPO = Symbol("CASH_WORKSPACE_REPO");
export const CASH_DOCUMENTS_PORT = Symbol("CASH_DOCUMENTS_PORT");
export const CASH_EXPORT_PORT = Symbol("CASH_EXPORT_PORT");

export type RegisterListFilters = {
  q?: string;
  location?: string;
  currency?: string;
};

export type EntryListFilters = {
  registerId: string;
  dayKeyFrom?: string;
  dayKeyTo?: string;
  type?: string;
  source?: string;
  paymentMethod?: string;
  q?: string;
};

export type DayCloseListFilters = {
  registerId?: string;
  dayKeyFrom?: string;
  dayKeyTo?: string;
  status?: CashDayCloseStatus;
};

export type CreateRegisterRecord = {
  tenantId: string;
  workspaceId: string;
  name: string;
  location: string | null;
  currency: string;
  disallowNegativeBalance: boolean;
};

export type UpdateRegisterRecord = {
  name?: string;
  location?: string | null;
  disallowNegativeBalance?: boolean;
};

export interface CashRegisterRepoPort {
  createRegister(data: CreateRegisterRecord, tx?: TransactionContext): Promise<CashRegisterEntity>;
  countDistinctLocationsForTenant(tenantId: string, tx?: TransactionContext): Promise<number>;
  listRegisters(
    tenantId: string,
    workspaceId: string,
    filters?: RegisterListFilters
  ): Promise<CashRegisterEntity[]>;
  findRegisterById(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    tx?: TransactionContext
  ): Promise<CashRegisterEntity | null>;
  updateRegister(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    data: UpdateRegisterRecord,
    tx?: TransactionContext
  ): Promise<CashRegisterEntity>;
  setCurrentBalance(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    currentBalanceCents: number,
    tx?: TransactionContext
  ): Promise<void>;
}

export type CreateEntryRecord = {
  tenantId: string;
  workspaceId: string;
  registerId: string;
  entryNo: number;
  occurredAt: Date;
  dayKey: string;
  description: string;
  type: CashEntryType;
  direction: CashEntryDirection;
  source: CashEntrySource;
  paymentMethod: CashPaymentMethodType;
  amountCents: number;
  grossAmountCents: number;
  netAmountCents: number | null;
  taxAmountCents: number | null;
  taxMode: CashEntryTaxModeType | null;
  taxCodeId: string | null;
  taxCode: string | null;
  taxRateBps: number | null;
  taxLabel: string | null;
  currency: string;
  balanceAfterCents: number;
  sourceDocumentId: string | null;
  sourceDocumentRef: string | null;
  sourceDocumentKind: string | null;
  referenceId: string | null;
  reversalOfEntryId: string | null;
  lockedByDayCloseId: string | null;
  createdByUserId: string;
};

export interface CashEntryRepoPort {
  nextEntryNo(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    tx?: TransactionContext
  ): Promise<number>;
  createEntry(data: CreateEntryRecord, tx?: TransactionContext): Promise<CashEntryEntity>;
  countEntriesForPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    tx?: TransactionContext
  ): Promise<number>;
  listEntries(
    tenantId: string,
    workspaceId: string,
    filters: EntryListFilters
  ): Promise<CashEntryEntity[]>;
  findEntryById(
    tenantId: string,
    workspaceId: string,
    entryId: string,
    tx?: TransactionContext
  ): Promise<CashEntryEntity | null>;
  setReversedByEntryId(
    tenantId: string,
    workspaceId: string,
    entryId: string,
    reversedByEntryId: string,
    tx?: TransactionContext
  ): Promise<void>;
  listEntriesForMonth(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month: string
  ): Promise<CashEntryEntity[]>;
  getExpectedBalanceAtDay(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    tx?: TransactionContext
  ): Promise<number>;
  lockEntriesForDay(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    dayCloseId: string,
    tx?: TransactionContext
  ): Promise<void>;
}

export type UpsertDayCloseRecord = {
  id?: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  dayKey: string;
  status: CashDayCloseStatus;
  expectedBalanceCents: number;
  countedBalanceCents: number;
  differenceCents: number;
  note: string | null;
  submittedAt: Date | null;
  submittedByUserId: string | null;
  lockedAt: Date | null;
  lockedByUserId: string | null;
};

export interface CashDayCloseRepoPort {
  findDayCloseByRegisterAndDay(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    dayKey: string,
    tx?: TransactionContext
  ): Promise<CashDayCloseEntity | null>;
  upsertDayClose(data: UpsertDayCloseRecord, tx?: TransactionContext): Promise<CashDayCloseEntity>;
  replaceCountLines(
    tenantId: string,
    workspaceId: string,
    dayCloseId: string,
    lines: CashDenominationCountEntity[],
    tx?: TransactionContext
  ): Promise<void>;
  listDayCloses(
    tenantId: string,
    workspaceId: string,
    filters?: DayCloseListFilters
  ): Promise<CashDayCloseEntity[]>;
  listDayClosesForMonth(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month: string
  ): Promise<CashDayCloseEntity[]>;
}

export interface CashAttachmentRepoPort {
  createAttachment(
    data: {
      tenantId: string;
      workspaceId: string;
      entryId: string;
      documentId: string;
      uploadedByUserId: string | null;
    },
    tx?: TransactionContext
  ): Promise<CashEntryAttachmentEntity>;
  findAttachmentByEntryAndDocument(
    tenantId: string,
    workspaceId: string,
    entryId: string,
    documentId: string
  ): Promise<CashEntryAttachmentEntity | null>;
  listAttachments(
    tenantId: string,
    workspaceId: string,
    entryId: string
  ): Promise<CashEntryAttachmentEntity[]>;
  countAttachmentsForPeriod(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    tx?: TransactionContext
  ): Promise<number>;
  listAttachmentsForMonth(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month: string
  ): Promise<CashEntryAttachmentEntity[]>;
}

export interface CashExportRepoPort {
  createArtifact(
    data: {
      tenantId: string;
      workspaceId: string;
      registerId: string;
      month: string;
      format: ExportCashBookFormat;
      fileName: string;
      contentType: string;
      contentBase64: string;
      sizeBytes: number;
      createdByUserId: string | null;
      expiresAt: Date | null;
    },
    tx?: TransactionContext
  ): Promise<CashExportArtifactEntity>;
  findArtifactById(
    tenantId: string,
    workspaceId: string,
    artifactId: string
  ): Promise<CashExportArtifactEntity | null>;
  findLatestArtifact(
    tenantId: string,
    workspaceId: string,
    registerId: string,
    month?: string
  ): Promise<CashExportArtifactEntity | null>;
  listAuditRowsForMonth(
    tenantId: string,
    month: string
  ): Promise<
    Array<{
      action: string;
      entity: string;
      entityId: string;
      actorUserId: string | null;
      createdAt: Date;
      details: string | null;
    }>
  >;
}

export interface DocumentsPort {
  assertDocumentAccessible(tenantId: string, documentId: string): Promise<void>;
}

export type CreateCashConfirmationRecord = {
  tenantId: string;
  workspaceId: string;
  registerId: string;
  conversationId: string;
  preparedByUserId: string;
  businessDate: string;
  candidatePayload: any;
  candidateHash: string;
  version: number;
  status: "PENDING" | "CONFIRMED" | "CONSUMED" | "EXPIRED";
  expiresAt: Date;
};

export interface CashConfirmationRepoPort {
  createConfirmation(
    data: CreateCashConfirmationRecord,
    tx?: TransactionContext
  ): Promise<CashDayConfirmationEntity>;
  findConfirmationById(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<CashDayConfirmationEntity | null>;
  markConsumed(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<void>;
  markExpired(
    tenantId: string,
    workspaceId: string,
    id: string,
    tx?: TransactionContext
  ): Promise<void>;
}

export type CreateWorkspaceRecord = {
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
};

export interface CashWorkspaceRepoPort {
  createWorkspace(
    data: CreateWorkspaceRecord,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity>;

  findCanonicalWorkspace(
    tenantId: string,
    workspaceId: string,
    registerId: string | null,
    type: CashAssistantWorkspaceType,
    businessDate: Date | null,
    businessMonth: Date | null,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity | null>;

  findWorkspaceByConversationId(
    tenantId: string,
    workspaceId: string,
    conversationId: string,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity | null>;

  listWorkspaces(
    tenantId: string,
    workspaceId: string,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity[]>;
}

export type CashExportPayload = {
  fileName: string;
  contentType: string;
  data: Buffer;
};

export type ExportModel = {
  register: CashRegisterEntity;
  entries: CashEntryEntity[];
  dayCloses: CashDayCloseEntity[];
  attachments: CashEntryAttachmentEntity[];
  auditRows: Array<{
    action: string;
    entity: string;
    entityId: string;
    actorUserId: string | null;
    createdAt: Date;
    details: string | null;
  }>;
  month: string;
  format: ExportCashBookFormat;
};

export interface ExportPort {
  generate(model: ExportModel): Promise<CashExportPayload>;
}
