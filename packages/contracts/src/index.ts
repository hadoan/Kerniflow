import { z } from "zod";
import { CustomValuesSchema } from "./common/customization/custom-field";
export * from "./documents";
export * from "./invoices";
export * from "./customers";
export * from "./workspaces";
export * from "./shared/local-date.schema";
export * from "./expenses";
export * from "./tax";
export * from "./accounting";
export * from "./crm";
export * from "./sales";
export {
  RecordPaymentInputSchema as SalesRecordPaymentInputSchema,
  RecordPaymentOutputSchema as SalesRecordPaymentOutputSchema,
  type RecordPaymentInput as SalesRecordPaymentInput,
  type RecordPaymentOutput as SalesRecordPaymentOutput,
} from "./sales/record-payment.schema";
export * from "./sales-ai";
export * from "./purchasing";
export * from "./purchasing-ai";
export * from "./inventory";
export * from "./inventory-ai";
export * from "./pos";
export * from "./pos-ai";
export * from "./engagement";
export * from "./engagement-ai";
export * from "./workflows";
export * from "./approvals";
export * from "./identity";
export * from "./errors";
export * from "./platform";

export const CONTRACTS_HELLO = "Kerniflow contracts loaded ✅";

// Legacy helpers used by domain utils
export type Currency = "EUR";
export type Locale = "de-DE" | "en-US";
export type ExpenseCategory = "Office" | "Meals" | "Travel" | "Software" | "Other";
export interface Receipt {
  id: string;
  merchant: string;
  issuedAtISO: string;
  totalCents: number;
  vatRate: number;
  currency: Currency;
  category?: ExpenseCategory;
}
export const mockReceipts: Receipt[] = [];

// Common
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

// Identity
export const UserDtoSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().nullable().optional(),
  status: z.string(),
});
export type UserDto = z.infer<typeof UserDtoSchema>;

export const TenantDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
});
export type TenantDto = z.infer<typeof TenantDtoSchema>;

export const MembershipDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  roleId: z.string(),
});
export type MembershipDto = z.infer<typeof MembershipDtoSchema>;

export const SignupInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  tenantName: z.string().min(1),
  idempotencyKey: z.string(),
});
export type SignupInput = z.infer<typeof SignupInputSchema>;

export const SignupOutputSchema = z.object({
  user: UserDtoSchema,
  tenant: TenantDtoSchema,
  membership: MembershipDtoSchema,
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type SignupOutput = z.infer<typeof SignupOutputSchema>;

export const LoginInputSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  tenantId: z.string().optional(),
  idempotencyKey: z.string().optional(),
});
export type LoginInput = z.infer<typeof LoginInputSchema>;

export const LoginOutputSchema = z.object({
  user: UserDtoSchema,
  tenantId: z.string(),
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type LoginOutput = z.infer<typeof LoginOutputSchema>;

export const RefreshInputSchema = z.object({
  refreshToken: z.string(),
});
export type RefreshInput = z.infer<typeof RefreshInputSchema>;

export const RefreshOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshOutput = z.infer<typeof RefreshOutputSchema>;

export const SwitchTenantInputSchema = z.object({
  tenantId: z.string(),
});
export type SwitchTenantInput = z.infer<typeof SwitchTenantInputSchema>;

export const SwitchTenantOutputSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  tenantId: z.string(),
});
export type SwitchTenantOutput = z.infer<typeof SwitchTenantOutputSchema>;

// Expenses
export const CreateExpenseInputSchema = z.object({
  tenantId: z.string(),
  merchant: z.string(),
  totalCents: z.number().int().positive(),
  currency: z.string().min(1),
  category: z.string().nullable().optional(),
  issuedAt: z.string(),
  createdByUserId: z.string(),
  idempotencyKey: z.string(),
  custom: CustomValuesSchema.optional(),
});
export type CreateExpenseInput = z.infer<typeof CreateExpenseInputSchema>;

export const CreateExpenseOutputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  merchant: z.string(),
  totalCents: z.number(),
  currency: z.string(),
  category: z.string().nullable(),
  issuedAt: z.string(),
  createdByUserId: z.string(),
  custom: CustomValuesSchema.optional(),
});
export type CreateExpenseOutput = z.infer<typeof CreateExpenseOutputSchema>;

// Invoices
export const InvoiceLineInputSchema = z.object({
  description: z.string(),
  qty: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative(),
});
export type InvoiceLineInput = z.infer<typeof InvoiceLineInputSchema>;

export const CreateInvoiceDraftInputSchema = z.object({
  tenantId: z.string(),
  currency: z.string(),
  clientId: z.string().optional(),
  lines: z.array(InvoiceLineInputSchema).min(1),
  idempotencyKey: z.string(),
  actorUserId: z.string(),
  custom: CustomValuesSchema.optional(),
});
export type CreateInvoiceDraftInput = z.infer<typeof CreateInvoiceDraftInputSchema>;

export const CreateInvoiceDraftOutputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.literal("DRAFT"),
  totalCents: z.number(),
  currency: z.string(),
  lines: z.array(InvoiceLineInputSchema.extend({ id: z.string() })),
  custom: CustomValuesSchema.optional(),
});
export type CreateInvoiceDraftOutput = z.infer<typeof CreateInvoiceDraftOutputSchema>;

export const IssueInvoiceInputSchema = z.object({
  invoiceId: z.string(),
  tenantId: z.string(),
  idempotencyKey: z.string(),
  actorUserId: z.string(),
});
export type IssueInvoiceInput = z.infer<typeof IssueInvoiceInputSchema>;

export const IssueInvoiceOutputSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  status: z.literal("ISSUED"),
  issuedAt: z.string(),
  custom: CustomValuesSchema.optional(),
});
export type IssueInvoiceOutput = z.infer<typeof IssueInvoiceOutputSchema>;

// Events
export const IdentityUserCreatedPayloadSchema = z.object({
  userId: z.string(),
  email: z.string(),
});
export type IdentityUserCreatedPayload = z.infer<typeof IdentityUserCreatedPayloadSchema>;

export const ExpenseCreatedPayloadSchema = z.object({
  expenseId: z.string(),
  tenantId: z.string(),
  totalCents: z.number(),
});
export type ExpenseCreatedPayload = z.infer<typeof ExpenseCreatedPayloadSchema>;

export const InvoiceIssuedPayloadSchema = z.object({
  invoiceId: z.string(),
  tenantId: z.string(),
});
export type InvoiceIssuedPayload = z.infer<typeof InvoiceIssuedPayloadSchema>;

export const EVENT_NAMES = {
  IDENTITY_USER_CREATED: "identity.user.created",
  EXPENSE_CREATED: "expense.created",
  INVOICE_ISSUED: "invoice.issued",
} as const;

export * from "./common/customization/custom-field";
