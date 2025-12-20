import { UseCaseContext } from "@kerniflow/kernel";
import { CreateInvoiceDraftCommand } from "../../application/use-cases/create-invoice-draft/CreateInvoiceDraftUseCase";

export const buildCreateDraftInput = (
  overrides: Partial<CreateInvoiceDraftCommand> = {},
  ctxOverrides: Partial<UseCaseContext> = {}
): { cmd: CreateInvoiceDraftCommand; ctx: UseCaseContext } => {
  const cmd: CreateInvoiceDraftCommand = {
    tenantId: "tenant-1",
    currency: "USD",
    clientId: "client-1",
    lines: [{ description: "Line 1", qty: 1, unitPriceCents: 1000 }],
    idempotencyKey: "invoice-draft-1",
    actorUserId: "user-1",
    ...overrides,
  };

  const ctx: UseCaseContext = {
    tenantId: cmd.tenantId,
    userId: cmd.actorUserId,
    requestId: "req-1",
    ...ctxOverrides,
  };

  return { cmd, ctx };
};
