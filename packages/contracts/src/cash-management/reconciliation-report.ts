import { z } from "zod";

const LocalDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const GetCashReconciliationReportQuerySchema = z
  .object({ registerId: z.string(), fromDate: LocalDateSchema, toDate: LocalDateSchema })
  .refine((value) => value.fromDate <= value.toDate, {
    message: "fromDate must not be after toDate",
  })
  .refine(
    (value) => {
      const from = new Date(`${value.fromDate}T00:00:00Z`).getTime();
      const to = new Date(`${value.toDate}T00:00:00Z`).getTime();
      return (to - from) / 86_400_000 <= 366;
    },
    { message: "The maximum report range is 366 days" }
  );
export type GetCashReconciliationReportQuery = z.infer<
  typeof GetCashReconciliationReportQuerySchema
>;
export const TranslateCashReconciliationDescriptionsInputSchema = z
  .object({ fromDate: LocalDateSchema, toDate: LocalDateSchema })
  .refine((value) => value.fromDate <= value.toDate, {
    message: "fromDate must not be after toDate",
  });
export type TranslateCashReconciliationDescriptionsInput = z.infer<
  typeof TranslateCashReconciliationDescriptionsInputSchema
>;

export const CashReconciliationReportDtoSchema = z.object({
  register: z.object({ id: z.string(), name: z.string(), currency: z.string() }),
  fromDate: LocalDateSchema,
  toDate: LocalDateSchema,
  openingBalanceCents: z.number().int(),
  rows: z.array(
    z.object({
      id: z.string(),
      dayKey: LocalDateSchema,
      entryNo: z.number().int(),
      description: z.string(),
      direction: z.enum(["IN", "OUT"]),
      amountCents: z.number().int(),
      balanceAfterCents: z.number().int(),
      receiptNumber: z.string().nullable(),
    })
  ),
  totalIncomeCents: z.number().int(),
  totalExpenseCents: z.number().int(),
  calculatedClosingBalanceCents: z.number().int(),
  actualCountedClosingBalanceCents: z.number().int().nullable(),
  differenceCents: z.number().int().nullable(),
  entryCount: z.number().int(),
  unclosedDayCount: z.number().int(),
  generatedAt: z.string().datetime(),
});
export type CashReconciliationReportDto = z.infer<typeof CashReconciliationReportDtoSchema>;
