import {
  BaseUseCase,
  type ClockPort,
  ConflictError,
  type IdGeneratorPort,
  type LoggerPort,
  NotFoundError,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
  parseLocalDate,
} from "@corely/kernel";
import { type UpdateInvoiceInput, type UpdateInvoiceOutput } from "@corely/contracts";
import { type InvoiceRepoPort } from "../../ports/invoice-repository.port";
import { toInvoiceDto } from "../shared/invoice-dto.mapper";
import { type CustomerQueryPort } from "../../ports/customer-query.port";

type Deps = {
  logger: LoggerPort;
  invoiceRepo: InvoiceRepoPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  customerQuery: CustomerQueryPort;
};

export class UpdateInvoiceUseCase extends BaseUseCase<UpdateInvoiceInput, UpdateInvoiceOutput> {
  constructor(private readonly useCaseDeps: Deps) {
    super({ logger: useCaseDeps.logger });
  }

  protected validate(input: UpdateInvoiceInput): UpdateInvoiceInput {
    if (!input.invoiceId) {
      throw new ValidationError("invoiceId is required");
    }
    if (
      (!input.headerPatch || Object.keys(input.headerPatch).length === 0) &&
      (!input.lineItems || input.lineItems.length === 0)
    ) {
      throw new ValidationError("Nothing to update");
    }
    return input;
  }

  protected async handle(
    input: UpdateInvoiceInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateInvoiceOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId is required"));
    }

    const invoice = await this.useCaseDeps.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Invoice not found"));
    }

    let draftCustomerSnapshot: {
      name: string;
      email?: string | null;
      vatId?: string | null;
      address?:
        | {
            line1: string;
            line2?: string | null;
            city?: string | null;
            postalCode?: string | null;
            country?: string | null;
          }
        | undefined;
    } | null = null;

    if (input.headerPatch?.customerPartyId !== undefined) {
      if (invoice.status !== "DRAFT") {
        return err(new ConflictError("Cannot change customer after finalize"));
      }
      const customer = await this.useCaseDeps.customerQuery.getCustomerBillingSnapshot(
        ctx.tenantId,
        input.headerPatch.customerPartyId
      );
      if (!customer) {
        return err(new NotFoundError("Customer not found"));
      }
      draftCustomerSnapshot = {
        name: customer.displayName,
        email: customer.email ?? null,
        vatId: customer.vatId ?? null,
        address: customer.billingAddress
          ? {
              line1: customer.billingAddress.line1,
              line2: customer.billingAddress.line2 ?? null,
              city: customer.billingAddress.city ?? null,
              postalCode: customer.billingAddress.postalCode ?? null,
              country: customer.billingAddress.country ?? null,
            }
          : undefined,
      };
    }

    try {
      const now = this.useCaseDeps.clock.now();
      if (input.headerPatch) {
        invoice.updateHeader(
          {
            customerPartyId: input.headerPatch.customerPartyId,
            currency: input.headerPatch.currency,
            notes: input.headerPatch.notes,
            terms: input.headerPatch.terms,
          },
          now
        );
        if (
          input.headerPatch.invoiceDate !== undefined ||
          input.headerPatch.dueDate !== undefined
        ) {
          invoice.updateDates(
            {
              invoiceDate:
                input.headerPatch.invoiceDate !== undefined
                  ? parseLocalDate(input.headerPatch.invoiceDate)
                  : undefined,
              dueDate:
                input.headerPatch.dueDate !== undefined
                  ? parseLocalDate(input.headerPatch.dueDate)
                  : undefined,
            },
            now
          );
        }
      }

      if (draftCustomerSnapshot) {
        invoice.setBillToSnapshot(draftCustomerSnapshot);
      }

      if (input.lineItems) {
        const newLines = input.lineItems.map((line) => ({
          id: line.id ?? this.useCaseDeps.idGenerator.newId(),
          description: line.description,
          qty: line.qty,
          unitPriceCents: line.unitPriceCents,
        }));
        invoice.replaceLineItems(newLines, now);
      }
    } catch (error) {
      if (error instanceof ValidationError || error instanceof ConflictError) {
        return err(error);
      }
      return err(new ConflictError((error as Error).message));
    }

    await this.useCaseDeps.invoiceRepo.save(ctx.tenantId, invoice);

    return ok({ invoice: toInvoiceDto(invoice) });
  }
}
