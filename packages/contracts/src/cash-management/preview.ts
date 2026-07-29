export type CashReportWarningSeverity = "INFO" | "WARNING" | "BLOCKING";

export type CashReportWarningCode =
  | "COUNTED_CASH_MISSING"
  | "BALANCE_MISMATCH"
  | "PREVIOUS_DAY_MISMATCH"
  | "MISSING_RECEIPT"
  | "MISSING_BANK_SLIP"
  | "MISSING_EIGENBELEG"
  | "NEGATIVE_CASH"
  | "DAY_ALREADY_CLOSED"
  | "OTHER";

export type CashReportWarning = {
  code: CashReportWarningCode;
  severity: CashReportWarningSeverity;
  message: string;
  relatedEntryId?: string;
};

export type CashReportEvidenceRequirement = {
  entryId: string;
  movementType: string;
  type: "RECEIPT" | "BANK_SLIP" | "EIGENBELEG";
  satisfied: boolean;
  documentId?: string;
};

export type CashReportCalculationOperand = {
  key: string;
  label: string;
  amountCents: number;
  operator: "ADD" | "SUBTRACT" | "RESULT";
};

export type OpeningBalanceResolution = {
  amountCents: number;
  source:
    | "PREVIOUS_FINALIZED_CLOSE"
    | "PROJECTED_FROM_LEDGER"
    | "REGISTER_INITIAL_BALANCE";
  baselineDayKey: string | null;
  projectedThroughDayKey: string | null;
  isProvisional: boolean;
  unclosedPriorDayKeys: string[];
};

export type CashReportPreviewDto = {
  businessDate: string;
  reportNumber?: string;

  business: {
    name: string;
    locationName?: string;
  };

  previousClosingCashCents: number;
  openingBalanceResolution?: OpeningBalanceResolution;

  expectedClosingCashCents: number;
  countedClosingCashCents: number | null;
  effectiveClosingCashCents: number;
  cashDifferenceCents: number | null;
  verificationStatus: "NOT_COUNTED" | "COUNTED_MATCH" | "COUNTED_DIFFERENCE";

  goodsPurchasesCents: number;
  businessExpensesCents: number;
  privateWithdrawalsCents: number;
  bankDepositsCents: number;
  otherCashOutflowsCents: number;

  subtotalCents: number;

  cashInflowCents: number;
  otherNonSalesCashInflowsCents: number;
  privateDepositsCents: number;
  bankWithdrawalsToCashCents: number;

  calculatedCashSalesCents: number;

  customerCount?: number;

  calculation: {
    operands: CashReportCalculationOperand[];
  };

  status: "DRAFT" | "NEEDS_REVIEW" | "READY_TO_CLOSE" | "CLOSED";

  warnings: CashReportWarning[];
  evidenceRequirements: CashReportEvidenceRequirement[];

  generatedAt: string;
  version: number;
};

export type GetCashReportPreviewQuery = {
  registerId: string;
  businessDate: string;
};
