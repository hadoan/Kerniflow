import {
  ArchiveCustomerInputSchema,
  CreateCustomerInputSchema,
  GetCustomerInputSchema,
  SearchCustomersInputSchema,
  UpdateCustomerInputSchema,
} from "@kerniflow/contracts";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type PartyCrmApplication } from "../../application/party-crm.application";
import { mapToolResult } from "./tool-mappers";

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

export const buildCustomerTools = (app: PartyCrmApplication): DomainToolPort[] => [
  {
    name: "customer.create",
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
    name: "customer.update",
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
    name: "customer.get",
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
    name: "customer.search",
    description: "Search customers by name, email, phone, or VAT.",
    kind: "server",
    inputSchema: SearchCustomersInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = SearchCustomersInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const result = await app.searchCustomers.execute(
        parsed.data,
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      return mapToolResult(result);
    },
  },
  {
    name: "customer.archive",
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
