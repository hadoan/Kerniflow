import { z } from "zod";
import { StockReservationDtoSchema } from "./inventory.types";

export const ListReservationsInputSchema = z.object({
  productId: z.string().optional(),
  documentId: z.string().optional(),
  cursor: z.string().optional(),
  pageSize: z.number().int().positive().max(100).optional(),
});

export const ListReservationsOutputSchema = z.object({
  items: z.array(StockReservationDtoSchema),
  nextCursor: z.string().nullable().optional(),
});

export type ListReservationsInput = z.infer<typeof ListReservationsInputSchema>;
export type ListReservationsOutput = z.infer<typeof ListReservationsOutputSchema>;
