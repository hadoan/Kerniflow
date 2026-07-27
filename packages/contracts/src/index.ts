import { z } from "zod";
import { CustomValuesSchema } from "./common/customization/custom-field";
import { ListQuerySchema, PageInfoSchema } from "./common/list.contract";
export * from "./common/list.contract";
export * from "./documents";
export * from "./invoices";
export * from "./customers";
export * from "./workspaces";
export * from "./shared/local-date.schema";
export * from "./expenses";
export * from "./forms";
export * from "./tax";
export * from "./accounting";
export * from "./reporting";
export * from "./crm";
export * from "./directory";
export * from "./directory-admin";
export * from "./cms";
export * from "./website";
export * from "./sales";
export * from "./rentals";
export * from "./classes";
export {
  RecordPaymentInputSchema as SalesRecordPaymentInputSchema,
  RecordPaymentOutputSchema as SalesRecordPaymentOutputSchema,
  type RecordPaymentInput as SalesRecordPaymentInput,
  type RecordPaymentOutput as SalesRecordPaymentOutput,
} from "./sales/record-payment.schema";
// Payment Methods exports (aliased as PaymentMethodConfig to avoid conflict with Sales PaymentMethod enum)
export {
  PaymentMethodTypeEnum,
  PaymentMethodSchema as PaymentMethodConfigSchema,
  PaymentMethodSnapshotSchema,
  CreatePaymentMethodInputSchema,
  UpdatePaymentMethodInputSchema,
  BankAccountSchema,
  CreateBankAccountInputSchema,
  UpdateBankAccountInputSchema,
  ListBankAccountsOutputSchema,
  ListPaymentMethodsOutputSchema,
} from "./payment-methods";

// Export both aliased and unaliased types
export type {
  // Aliased for frontend (to avoid conflict with Sales PaymentMethod)
  PaymentMethod as PaymentMethodConfig,
  // Unaliased for backend use
  PaymentMethod,
  PaymentMethodSnapshot,
  CreatePaymentMethodInput,
  UpdatePaymentMethodInput,
  BankAccount,
  BankAccountDto,
  CreateBankAccountInput,
  UpdateBankAccountInput,
  ListBankAccountsOutput,
  ListPaymentMethodsOutput,
} from "./payment-methods";
export * from "./sales-ai";
export * from "./purchasing";
export * from "./purchasing-ai";
export * from "./inventory";
export * from "./inventory-ai";
export * from "./import";
export * from "./catalog";
export * from "./restaurant";
export * from "./restaurant-ai";
export * from "./portfolio";
export * from "./issues";
export * from "./integrations";
// POS exports (aliased to avoid clashing with Sales PaymentMethod)
export {
  PaymentMethod as PosPaymentMethod,
  PaymentMethodSchema as PosPaymentMethodSchema,
  PosSaleLineItemSchema,
  type PosSaleLineItem,
  PosSalePaymentSchema,
  type PosSalePayment,
  PosSaleStatus,
  PosSaleStatusSchema,
  PosSaleSchema,
  type PosSale,
  PosTicketLineItemSchema,
  type PosTicketLineItem,
  PosTicketStatus,
  PosTicketStatusSchema,
  PosTicketSchema,
  type PosTicket,
} from "./pos/pos-sale.types";
export * from "./pos/register.types";
export * from "./pos/shift-session.types";
export * from "./pos/create-register.schema";
export * from "./pos/list-registers.schema";
export * from "./pos/open-shift.schema";
export * from "./pos/close-shift.schema";
export * from "./pos/get-current-shift.schema";
export * from "./pos/sync-pos-sale.schema";
export * from "./pos/transaction.types";
export * from "./pos/list-pos-transactions.schema";
export * from "./pos/get-pos-transaction.schema";
export * from "./pos/get-catalog-snapshot.schema";
export * from "./pos/start-cashless-payment.schema";
export * from "./pos/get-cashless-payment-status.schema";
export * from "./pos-ai";
export * from "./engagement";
export * from "./engagement-ai";
export * from "./workflows";
export * from "./approvals";
export * from "./identity";
export * from "./errors";
export * from "./platform";
export * from "./copilot/collect-inputs.schema";
export * from "./copilot/chat.schema";
export * from "./copilot/chat-history.schema";
export * from "./copilot/cash-clarification";
export * from "./cash-management";
export * from "./booking";
export * from "./ai/richtext";
export * from "./notifications";
export * from "./billing";
export * from "./onboarding";
export * from "./coaching";

export const CONTRACTS_HELLO = "Corely contracts loaded ✅";

// Legacy helpers used by domain utils
import type { CurrencyCode } from "./money/currency.schema";
export * from "./money/currency.schema";

// Legacy helpers used by domain utils
export type Currency = CurrencyCode;

export type Locale = "de-DE" | "en-US";
export type ExpenseCategory = "Office" | "Meals" | "Travel" | "Software" | "Other";
export interface Receipt {
  id: string;
  merchant: string;
  issuedAtISO: string;
  totalCents: number;
  vatRate: number;
  currency: CurrencyCode;
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

export const TenantStatusSchema = z.enum(["ACTIVE", "SUSPENDED", "ARCHIVED"]);
export type TenantStatus = z.infer<typeof TenantStatusSchema>;

export const TenantPlanSchema = z.enum(["free", "starter", "pro", "multi_location"]);
export type TenantPlan = z.infer<typeof TenantPlanSchema>;

export const TenantPlanStatusSchema = z.enum(["active", "inactive", "trial"]);
export type TenantPlanStatus = z.infer<typeof TenantPlanStatusSchema>;

export const BillingMethodSchema = z.enum(["stripe", "bank_transfer", "cash", "manual"]);
export type BillingMethod = z.infer<typeof BillingMethodSchema>;

export const TenantDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  status: TenantStatusSchema,
  plan: TenantPlanSchema.nullable().optional(),
  planStatus: TenantPlanStatusSchema.nullable().optional(),
  billingMethod: BillingMethodSchema.nullable().optional(),
  billingNote: z.string().nullable().optional(),
  planUpdatedAt: z.string().nullable().optional(),
  planUpdatedBy: z.string().nullable().optional(),
});
export type TenantDto = z.infer<typeof TenantDtoSchema>;

export const UpdateTenantInputSchema = z.object({
  status: TenantStatusSchema.optional(),
  plan: TenantPlanSchema.nullable().optional(),
  planStatus: TenantPlanStatusSchema.nullable().optional(),
  billingMethod: BillingMethodSchema.nullable().optional(),
  billingNote: z.string().nullable().optional(),
});
export type UpdateTenantInput = z.infer<typeof UpdateTenantInputSchema>;

export const ListTenantsInputSchema = ListQuerySchema.extend({
  status: TenantStatusSchema.optional(),
});
export type ListTenantsInput = z.infer<typeof ListTenantsInputSchema>;

export const ListTenantsOutputSchema = z.object({
  tenants: z.array(TenantDtoSchema),
  pageInfo: PageInfoSchema.optional(),
});
export type ListTenantsOutput = z.infer<typeof ListTenantsOutputSchema>;

export const CreateTenantInputSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
  status: TenantStatusSchema.optional(),
  notes: z.string().max(2000).optional().nullable(),
  idempotencyKey: z.string().optional(),
});
export type CreateTenantInput = z.infer<typeof CreateTenantInputSchema>;

export const CreateTenantResponseSchema = z.object({
  tenant: TenantDtoSchema,
});
export type CreateTenantResponse = z.infer<typeof CreateTenantResponseSchema>;

export const MembershipDtoSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  roleId: z.string(),
});
export type MembershipDto = z.infer<typeof MembershipDtoSchema>;

export const SignupInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
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

export const PlatformEntityDeletedPayloadSchema = z.object({
  tenantId: z.string(),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
});
export type PlatformEntityDeletedPayload = z.infer<typeof PlatformEntityDeletedPayloadSchema>;

export const EVENT_NAMES = {
  IDENTITY_USER_CREATED: "identity.user.created",
  EXPENSE_CREATED: "expense.created",
  INVOICE_ISSUED: "invoice.issued",
  PLATFORM_ENTITY_DELETED: "platform.entity.deleted",
} as const;

export * from "./common/customization/custom-field";
export * from "./common/customization/custom-attributes";
