/**
 * Invoice Form Schema
 * Extends the contract schema for UI forms, converting Date objects to ISO strings
 */

import { z } from "zod";
import type { CreateInvoiceInput } from "@corely/contracts";
import { CreateInvoiceInputSchema, InvoiceLineInputSchema } from "@corely/contracts";
import { format } from "date-fns";

/**
 * Form schema for line items (extends contract with unit field for UI)
 */
export const invoiceLineFormSchema = InvoiceLineInputSchema.extend({
  unit: z.string().default("h"), // UI-only field for display
});

/**
 * Form schema for invoice creation
 * Extends contract schema with Date objects for better UX
 */
export const invoiceFormSchema = CreateInvoiceInputSchema.extend({
  // Add UI-specific date fields (Date objects for form)
  invoiceDate: z.date(),
  serviceDateStart: z.date().optional(),
  serviceDateEnd: z.date().optional(),
  dueDate: z.date().optional(),

  // Add UI-specific fields
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  vatRate: z.number().min(0).max(100),

  // Override lineItems to use form schema
  lineItems: z.array(invoiceLineFormSchema).min(1, "At least one line item is required"),
}).omit({
  idempotencyKey: true, // This will be added by the API client
});

export type InvoiceFormData = z.infer<typeof invoiceFormSchema>;
export type InvoiceLineFormData = z.infer<typeof invoiceLineFormSchema>;

/**
 * Transform form data to API request format
 * Converts Date objects to ISO strings
 */
export function toCreateInvoiceInput(form: InvoiceFormData): CreateInvoiceInput {
  const toLocalDate = (date: Date | undefined) => (date ? format(date, "yyyy-MM-dd") : undefined);

  return {
    customerPartyId: form.customerPartyId,
    currency: form.currency,
    notes: form.notes,
    terms: form.terms,
    invoiceDate: toLocalDate(form.invoiceDate),
    dueDate: toLocalDate(form.dueDate),
    lineItems: form.lineItems.map((item) => ({
      description: item.description,
      qty: item.qty,
      unitPriceCents: item.unitPriceCents,
    })),
  };
}

/**
 * Default values for new invoice form
 */
export function getDefaultInvoiceFormValues(): Partial<InvoiceFormData> {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(Math.random() * 10000);

  return {
    invoiceDate: now,
    invoiceNumber: `${year}${month}${day}-${year}${month}${random}`,
    currency: "EUR",
    vatRate: 19,
    customerPartyId: undefined,
    lineItems: [
      {
        description: "",
        qty: 1,
        unit: "h",
        unitPriceCents: 0,
      },
    ],
  };
}
