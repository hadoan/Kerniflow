import {
  BaseUseCase,
  IdGeneratorPort,
  IdempotencyPort,
  LoggerPort,
  Result,
  UnitOfWorkPort,
  UseCaseContext,
  UseCaseError,
  ValidationError,
  err,
  ok,
} from "@kerniflow/kernel";
import {
  CustomFieldDefinitionPort,
  CustomFieldIndexPort,
  buildCustomFieldIndexes,
  validateAndNormalizeCustomValues,
} from "@kerniflow/domain";

import { InvoiceRepositoryPort } from "../../ports/InvoiceRepositoryPort";
import { OutboxPort } from "../../../../shared/ports/outbox.port";
import { AuditPort } from "../../../../shared/ports/audit.port";
import { Invoice } from "../../../domain/entities/Invoice";
import { InvoiceLine } from "../../../domain/entities/InvoiceLine";

export type CreateInvoiceDraftCommand = {
  tenantId: string;
  currency: string;
  clientId?: string | null;
  lines: Array<{ description: string; qty: number; unitPriceCents: number }>;
  actorUserId: string;
  custom?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type CreateInvoiceDraftResult = {
  id: string;
  tenantId: string;
  status: string;
  totalCents: number;
  currency: string;
  clientId: string | null;
  issuedAt: string | null;
  lines: Array<{
    id: string;
    description: string;
    qty: number;
    unitPriceCents: number;
    lineTotal: number;
  }>;
  custom: Record<string, unknown> | null;
};

type Deps = {
  logger: LoggerPort;
  uow?: UnitOfWorkPort;
  idempotency?: IdempotencyPort;
  invoiceRepo: InvoiceRepositoryPort;
  outbox: OutboxPort;
  audit: AuditPort;
  idGenerator: IdGeneratorPort;
  customFieldDefinitions: CustomFieldDefinitionPort;
  customFieldIndexes: CustomFieldIndexPort;
};

export class CreateInvoiceDraftUseCase extends BaseUseCase<
  CreateInvoiceDraftCommand,
  CreateInvoiceDraftResult
> {
  private readonly useCaseKey = "invoices.create_draft";

  constructor(private readonly deps: Deps) {
    super({
      logger: deps.logger,
      uow: deps.uow,
      idempotency: deps.idempotency,
    });
  }

  protected validate(input: CreateInvoiceDraftCommand): CreateInvoiceDraftCommand {
    if (!input.tenantId) {
      throw new ValidationError("tenantId is required");
    }
    if (!input.currency) {
      throw new ValidationError("currency is required");
    }
    if (!Array.isArray(input.lines) || input.lines.length === 0) {
      throw new ValidationError("At least one invoice line is required");
    }

    input.lines.forEach((line, index) => {
      if (!line.description) {
        throw new ValidationError(`Line ${index + 1} is missing description`);
      }
      if (line.qty <= 0 || line.unitPriceCents < 0) {
        throw new ValidationError(`Line ${index + 1} has invalid quantity or price`);
      }
    });

    return input;
  }

  protected getIdempotencyKey(
    input: CreateInvoiceDraftCommand,
    ctx: UseCaseContext
  ): string | undefined {
    if (!input.idempotencyKey) return undefined;
    return `${ctx.tenantId}:${this.useCaseKey}:${input.idempotencyKey}`;
  }

  protected async handle(
    input: CreateInvoiceDraftCommand,
    ctx: UseCaseContext
  ): Promise<Result<CreateInvoiceDraftResult, UseCaseError>> {
    if (ctx.tenantId !== input.tenantId) {
      return err(new ValidationError("Context tenant does not match payload tenant"));
    }

    let normalizedCustom: Record<string, unknown> = {};
    let definitions: Awaited<ReturnType<CustomFieldDefinitionPort["listActiveByEntityType"]>> = [];
    try {
      definitions = await this.deps.customFieldDefinitions.listActiveByEntityType(
        input.tenantId,
        "invoice"
      );
      normalizedCustom = validateAndNormalizeCustomValues(definitions, input.custom);
    } catch (error) {
      return err(new ValidationError("Invalid custom fields", error));
    }

    try {
      const lines = this.buildLines(input.lines);
      const total = lines.reduce((sum, line) => sum + line.lineTotal, 0);
      const invoice = new Invoice(
        this.deps.idGenerator.newId(),
        input.tenantId,
        "DRAFT",
        total,
        input.currency,
        input.clientId ?? null,
        lines,
        null,
        Object.keys(normalizedCustom).length ? normalizedCustom : null
      );

      await this.deps.invoiceRepo.save(invoice);
      await this.deps.audit.write({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        action: "invoice.draft_created",
        targetType: "Invoice",
        targetId: invoice.id,
        context: {
          requestId: ctx.requestId,
          tenantId: ctx.tenantId,
          actorUserId: ctx.userId ?? input.actorUserId,
        },
      });

      await this.deps.outbox.enqueue({
        tenantId: input.tenantId,
        eventType: "invoice.draft_created",
        payload: { invoiceId: invoice.id, totalCents: invoice.totalCents },
      });

      const indexRows = buildCustomFieldIndexes({
        tenantId: input.tenantId,
        entityType: "invoice",
        entityId: invoice.id,
        definitions,
        values: normalizedCustom,
      });
      if (indexRows.length) {
        await this.deps.customFieldIndexes.upsertIndexesForEntity(
          input.tenantId,
          "invoice",
          invoice.id,
          indexRows
        );
      }

      return ok(this.toResult(invoice));
    } catch (error) {
      if (error instanceof UseCaseError) {
        return err(error);
      }

      return err(
        new UseCaseError("CREATE_INVOICE_DRAFT_FAILED", "Failed to create invoice draft", error)
      );
    }
  }

  private buildLines(
    lines: Array<{ description: string; qty: number; unitPriceCents: number }>
  ): InvoiceLine[] {
    return lines.map(
      (line) =>
        new InvoiceLine(
          this.deps.idGenerator.newId(),
          line.description,
          line.qty,
          line.unitPriceCents
        )
    );
  }

  private toResult(invoice: Invoice): CreateInvoiceDraftResult {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      status: invoice.status,
      totalCents: invoice.totalCents,
      currency: invoice.currency,
      clientId: invoice.clientId,
      issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
      lines: invoice.lines.map((line) => ({
        id: line.id,
        description: line.description,
        qty: line.qty,
        unitPriceCents: line.unitPriceCents,
        lineTotal: line.lineTotal,
      })),
      custom: invoice.custom ?? null,
    };
  }
}
