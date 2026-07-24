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
