import { CreateInvoiceFromCustomerInputSchema, type CreateInvoiceInput } from "@corely/contracts";
import { isErr } from "@corely/kernel";
import { type DomainToolPort } from "../../application/ports/domain-tool.port";
import { type InvoicesApplication } from "../../../invoices/application/invoices.application";
import { type PartyApplication } from "../../../party/application/party.application";
import { mapToolResult } from "../../../../shared/adapters/tools/tool-mappers";

const validationError = (issues: unknown) => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Invalid input for tool call",
  details: issues,
});

const buildCtx = (tenantId: string, userId: string, toolCallId?: string, runId?: string) => ({
  tenantId,
  userId,
  correlationId: toolCallId ?? runId,
  requestId: toolCallId,
});

const toCustomerCandidate = (customer: { id: string; displayName: string }) => ({
  id: customer.id,
  displayName: customer.displayName,
});

export const buildInvoiceWorkflowTools = (
  invoices: InvoicesApplication,
  party: PartyApplication
): DomainToolPort[] => [
  {
    name: "invoice_create_from_customer",
    description:
      "Resolve a customer by name and create a draft invoice when required fields are present.",
    kind: "server",
    inputSchema: CreateInvoiceFromCustomerInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = CreateInvoiceFromCustomerInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const ctx = buildCtx(tenantId, userId, toolCallId, runId);
      const customerQuery = parsed.data.customerQuery;

      const searchResult = await party.searchCustomers.execute(
        { q: customerQuery, pageSize: 5 },
        ctx
      );
      if (isErr(searchResult)) {
        return mapToolResult(searchResult);
      }

      const candidates = searchResult.value.items.map(toCustomerCandidate);
      if (candidates.length === 0) {
        return {
          ok: false,
          code: "NOT_FOUND",
          message: `No customer found matching "${customerQuery}".`,
          details: { customerQuery },
        };
      }

      if (candidates.length > 1) {
        return {
          ok: false,
          code: "AMBIGUOUS_CUSTOMER",
          message: `Multiple customers matched "${customerQuery}".`,
          details: { candidates },
        };
      }

      const currency = parsed.data.currency?.trim();
      const lineItems = parsed.data.lineItems ?? [];
      if (!currency || lineItems.length === 0) {
        const missingFields = [];
        if (!currency) {
          missingFields.push("currency");
        }
        if (lineItems.length === 0) {
          missingFields.push("lineItems");
        }
        return {
          ok: false,
          code: "MISSING_INPUTS",
          message: "Missing required invoice fields.",
          details: {
            missingFields,
            customer: candidates[0],
          },
        };
      }

      const createInput: CreateInvoiceInput = {
        customerPartyId: candidates[0].id,
        currency,
        notes: parsed.data.notes,
        terms: parsed.data.terms,
        invoiceDate: parsed.data.invoiceDate,
        dueDate: parsed.data.dueDate,
        lineItems,
        idempotencyKey: parsed.data.idempotencyKey,
      };

      const createResult = await invoices.createInvoice.execute(createInput, ctx);

      const mapped = mapToolResult(createResult);
      if (!mapped.ok) {
        return mapped;
      }

      return { ...mapped, customer: candidates[0] };
    },
  },
];
