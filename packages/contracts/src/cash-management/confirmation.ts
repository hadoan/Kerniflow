import { z } from "zod";
import { DayKeySchema } from "./schema";

export const CashDayConfirmationMovementSchema = z.object({
  type: z.string().min(1),
  amountCents: z.number().int(),
  description: z.string().optional(),
});
export type CashDayConfirmationMovement = z.infer<typeof CashDayConfirmationMovementSchema>;

export const PrepareCashDayConfirmationInputSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  registerId: z.string(),
  businessDate: DayKeySchema,
  movements: z.array(CashDayConfirmationMovementSchema).default([]),
  actualClosingCashCents: z.number().int().nonnegative(),
  idempotencyKey: z.string().optional(),
});
export type PrepareCashDayConfirmationInput = z.infer<typeof PrepareCashDayConfirmationInputSchema>;

export const ConfirmCashDayDraftInputSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  registerId: z.string(),
  confirmationId: z.string(),
  idempotencyKey: z.string(),
});
export type ConfirmCashDayDraftInput = z.infer<typeof ConfirmCashDayDraftInputSchema>;

export type CashDayConfirmationDto = {
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
  expiresAt: string;
  createdAt: string;
  summary: any;
};

export const PrepareCashEntryConfirmationInputSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  registerId: z.string(),
  businessDate: DayKeySchema,
  movementType: z.string().min(1),
  amountCents: z.number().int(),
  description: z.string().min(1),
  evidenceRequirement: z.string().optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type PrepareCashEntryConfirmationInput = z.infer<
  typeof PrepareCashEntryConfirmationInputSchema
>;

export const ConfirmCashEntryInputSchema = z.object({
  tenantId: z.string().optional(),
  workspaceId: z.string().optional(),
  registerId: z.string(),
  confirmationId: z.string(),
  idempotencyKey: z.string(),
});
export type ConfirmCashEntryInput = z.infer<typeof ConfirmCashEntryInputSchema>;

export type CashEntryConfirmationDto = {
  id: string;
  tenantId: string;
  workspaceId: string;
  registerId: string;
  conversationId: string | null;
  preparedByUserId: string;
  businessDate: string;
  candidatePayload: any;
  candidateHash: string;
  version: number;
  status: "PENDING" | "CONFIRMED" | "CONSUMED" | "EXPIRED";
  expiresAt: string;
  createdAt: string;
};

export type CashWorkspaceHandoffDto = {
  id: string;
  status: "PENDING" | "CONSUMED" | "CANCELLED" | "EXPIRED";
  viewedAt?: string;
  expiresAt: string;

  confirmation: {
    id: string;
    version: number;
  };

  context: {
    conversationId: string;
    workspaceId: string;
    businessDate: string;
    register: {
      id: string;
      name: string;
    };
  };

  movement: {
    type: string;
    amountCents: number;
    formattedAmount: string;
    description: string;

    display: {
      label: string;
      explanation: string;
    };

    evidence: {
      type: string;
      label: string;
    } | null;
  };
};
