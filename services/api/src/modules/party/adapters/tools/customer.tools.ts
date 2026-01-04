import {
  ArchiveCustomerInputSchema,
  CreateCustomerInputSchema,
  GetCustomerInputSchema,
  SearchCustomersInputSchema,
  UpdateCustomerInputSchema,
} from "@corely/contracts";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type PartyApplication } from "../../application/party.application";
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

export const buildCustomerTools = (app: PartyApplication): DomainToolPort[] => [
  {
    name: "customer_create",
    description: "Create a customer with contact and billing details.",
    kind: "server",
    inputSchema: CreateCustomerInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = CreateCustomerInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.createCustomer.execute(
        parsed.data,
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      return mapToolResult(result);
    },
  },
  {
    name: "customer_update",
    description: "Update customer fields such as name, contacts, VAT, or billing address.",
    kind: "server",
    inputSchema: UpdateCustomerInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = UpdateCustomerInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.updateCustomer.execute(
        parsed.data,
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      return mapToolResult(result);
    },
  },
  {
    name: "customer_get",
    description: "Fetch a customer by id.",
    kind: "server",
    inputSchema: GetCustomerInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = GetCustomerInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.getCustomerById.execute(
        parsed.data,
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      return mapToolResult(result);
    },
  },
  {
    name: "customer_search",
    description:
      "Search customers by name, email, phone, or VAT. If no search query is provided, returns all customers.",
    kind: "server",
    inputSchema: SearchCustomersInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const sanitizedInput =
        typeof (input as any)?.q === "string" && !(input as any).q.trim()
          ? { ...(input as any), q: undefined }
          : input;
      const parsed = SearchCustomersInputSchema.safeParse(sanitizedInput);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      const normalizedQ = parsed.data.q?.trim();
      const shouldListAll =
        normalizedQ === undefined ||
        normalizedQ === "" ||
        ["list customers", "list all customers"].includes(normalizedQ.toLowerCase());

      const result = await app.searchCustomers.execute(
        { ...parsed.data, q: shouldListAll ? undefined : normalizedQ },
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      return mapToolResult(result);
    },
  },
  {
    name: "customer_archive",
    description: "Archive a customer to prevent updates.",
    kind: "server",
    inputSchema: ArchiveCustomerInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = ArchiveCustomerInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.archiveCustomer.execute(
        parsed.data,
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      return mapToolResult(result);
    },
  },
];
