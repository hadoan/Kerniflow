import { z } from "zod";
import { CashClarificationType, CashClarificationChoiceId } from "./cash-clarification";
import { CashEntryType, CashEntryDirection } from "../cash-management/constants";

export const CashMovementExtractionSchema = z.object({
  amountCents: z.number().int().positive().optional(),
  businessDate: z.string().optional(),
  
  source: z.enum([
    "CURRENT_REGISTER",
    "OTHER_CASH_REGISTER",
    "BUSINESS_CASH_UNKNOWN_LOCATION",
    "PRIVATE_CASH",
    "BUSINESS_BANK_ACCOUNT",
    "PRIVATE_BANK_ACCOUNT",
    "UNKNOWN",
  ]).optional(),

  destination: z.enum([
    "CURRENT_REGISTER",
    "OTHER_CASH_REGISTER",
    "BUSINESS_BANK_ACCOUNT",
    "PRIVATE_BANK_ACCOUNT",
    "BUSINESS_EXPENSE",
    "PRIVATE_USE",
    "UNKNOWN",
  ]).optional(),

  mentionedAsSales: z.boolean().optional(),
  customerPaymentMethod: z
    .enum(["CASH", "CARD", "BANK_TRANSFER", "MIXED"])
    .optional(),

  explicitFacts: z.array(z.string()).default([]),
});

export type CashMovementExtraction = z.infer<typeof CashMovementExtractionSchema>;

export type NonCashbookReason = "BANK_TO_BANK_TRANSFER" | "PRIVATE_FUNDS_DIRECTLY_TO_BANK" | "CARD_OR_BANK_SALE";
export const NonCashbookReasonSchema = z.enum(["BANK_TO_BANK_TRANSFER", "PRIVATE_FUNDS_DIRECTLY_TO_BANK", "CARD_OR_BANK_SALE"]);

export type CashMovementResolution =
  | {
      kind: "REQUEST_CLARIFICATION";
      clarificationType: typeof CashClarificationType[keyof typeof CashClarificationType];
      allowedChoiceValues?: string[];
    }
  | {
      kind: "PREPARE_ENTRY";
      entryType: typeof CashEntryType[keyof typeof CashEntryType];
      direction: typeof CashEntryDirection[keyof typeof CashEntryDirection];
    }
  | {
      kind: "NOT_A_CASHBOOK_ENTRY";
      reason: NonCashbookReason;
    }
  | {
      kind: "SELECT_CASH_REGISTER";
    };

// UI Cards
export const CashClarificationChoiceSchema = z.object({
  value: z.string(),
  label: z.string(),
});

export const CashClarificationCardSchema = z.object({
  type: z.string(),
  question: z.string(),
  choices: z.array(CashClarificationChoiceSchema),
});

export const CashEntryConfirmationCardSchema = z.object({
  entryType: z.string(),
  direction: z.string(),
  amountCents: z.number().int().positive().optional(),
  businessDate: z.string().optional(),
  description: z.string(),
});

export const CashRegisterSelectorCardSchema = z.object({
  // TBD based on what frontend needs, typically just a signal to open register selector
});

export const AnalyzeCashMovementResultSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("REQUEST_CLARIFICATION"),
    resolutionId: z.string(),
    clarification: CashClarificationCardSchema,
  }),

  z.object({
    kind: z.literal("PREPARE_ENTRY_CONFIRMATION"),
    confirmation: CashEntryConfirmationCardSchema,
  }),

  z.object({
    kind: z.literal("NOT_A_CASHBOOK_ENTRY"),
    reason: NonCashbookReasonSchema,
    explanation: z.string(),
  }),

  z.object({
    kind: z.literal("SELECT_REGISTER"),
    resolutionId: z.string(),
    registerSelector: CashRegisterSelectorCardSchema,
  }),
]);

export type AnalyzeCashMovementResult = z.infer<typeof AnalyzeCashMovementResultSchema>;
