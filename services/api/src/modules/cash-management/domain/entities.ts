import type {
  CashDayCloseStatus,
  CashPaymentMethod as CashPaymentMethodType,
  CashEntryDirection,
  CashEntrySource,
  CashEntryTaxMode as CashEntryTaxModeType,
  CashEntryType,
} from "@corely/contracts";

export type CashRegisterEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  name: string;
  location: string | null;
  currency: string;
  currentBalanceCents: number;
  disallowNegativeBalance: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CashEntryEntity = {
  id: string;
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
  reversedByEntryId: string | null;
  lockedByDayCloseId: string | null;
  createdAt: Date;
  createdByUserId: string;
};

export type CashDenominationCountEntity = {
  denominationCents: number;
  count: number;
  subtotalCents: number;
};

export type CashDayCloseEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  dayKey: string;
  expectedBalanceCents: number;
  countedBalanceCents: number;
  differenceCents: number;
  status: CashDayCloseStatus;
  note: string | null;
  submittedAt: Date | null;
  submittedByUserId: string | null;
  lockedAt: Date | null;
  lockedByUserId: string | null;
  counts: CashDenominationCountEntity[];
  createdAt: Date;
  updatedAt: Date;
};

export type CashDayCloseRevisionEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  dayCloseId: string;
  correctionEntryId: string;
  revisionNo: number;
  correctionType: string;
  reason: string;
  occurredAt: Date;
  recordedAt: Date;
  createdByUserId: string;
  downstreamReviewRequired: boolean;
};

export type CashEntryAttachmentEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  entryId: string;
  documentId: string;
  uploadedByUserId: string | null;
  createdAt: Date;
};

export type CashExportArtifactEntity = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  month: string;
  format: string;
  fileName: string;
  contentType: string;
  contentBase64: string;
  sizeBytes: number;
  createdByUserId: string | null;
  createdAt: Date;
  expiresAt: Date | null;
};

export type CashDayConfirmationEntity = {
  id: string;
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
  confirmedAt: Date | null;
  consumedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CashAssistantWorkspaceType = "DAILY_CASH_DAY" | "MONTHLY_REVIEW" | "GENERAL_HELP";

export type CashAssistantWorkspaceEntity = {
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
};
