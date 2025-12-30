import {
  BaseUseCase,
  type ClockPort,
  type IdGeneratorPort,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  NotFoundError,
  type AuditPort,
  err,
  ok,
  parseLocalDate,
} from "@corely/kernel";
import type {
  SalesRecordPaymentInput,
  SalesRecordPaymentOutput,
  ListPaymentsInput,
  ListPaymentsOutput,
  ReversePaymentInput,
  ReversePaymentOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
  ReverseJournalEntryInput,
} from "@corely/contracts";
import type { SalesPaymentRepositoryPort } from "../ports/payment-repository.port";
import type { SalesInvoiceRepositoryPort } from "../ports/invoice-repository.port";
import type { SalesSettingsRepositoryPort } from "../ports/settings-repository.port";
import { toInvoiceDto, toPaymentDto } from "../mappers/sales-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { AccountingApplication } from "../../../accounting/application/accounting.application";

type PaymentDeps = {
  logger: LoggerPort;
  paymentRepo: SalesPaymentRepositoryPort;
  invoiceRepo: SalesInvoiceRepositoryPort;
  settingsRepo: SalesSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  accounting: AccountingApplication;
  audit: AuditPort;
};

export class RecordPaymentUseCase extends BaseUseCase<
  SalesRecordPaymentInput,
  SalesRecordPaymentOutput
> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: SalesRecordPaymentInput): SalesRecordPaymentInput {
    if (input.amountCents <= 0) {
      throw new ValidationError("Payment amount must be positive");
    }
    return input;
  }

  protected async handle(
    input: SalesRecordPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<SalesRecordPaymentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<SalesRecordPaymentOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.record-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const invoice = await this.services.invoiceRepo.findById(ctx.tenantId, input.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Sales invoice not found"));
    }

    if (invoice.status !== "ISSUED" && invoice.status !== "PARTIALLY_PAID") {
      return err(new ValidationError("Payments can only be recorded for issued invoices"));
    }

    if (input.amountCents > invoice.totals.dueCents) {
      return err(new ValidationError("Payment amount exceeds remaining balance"));
    }

    const now = this.services.clock.now();
    const paymentDate = parseLocalDate(input.paymentDate);

    const payment = {
      id: this.services.idGenerator.newId(),
      invoiceId: invoice.id,
      amountCents: input.amountCents,
      currency: input.currency,
      paymentDate,
      method: input.method,
      reference: input.reference ?? null,
      notes: input.notes ?? null,
      recordedAt: now,
      recordedByUserId: ctx.userId,
      journalEntryId: null,
    };

    const settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (settings?.autoPostOnPayment) {
      const bankAccountId = input.bankAccountId ?? settings.defaultBankAccountId;
      if (!bankAccountId) {
        return err(new ValidationError("Bank account is required for posting"));
      }
      if (!settings.defaultAccountsReceivableAccountId) {
        return err(new ValidationError("Default AR account is required for posting"));
      }

      const createInput: CreateJournalEntryInput = {
        postingDate: paymentDate,
        memo: `Payment for Invoice ${invoice.number ?? invoice.id}`,
        lines: [
          {
            ledgerAccountId: bankAccountId,
            direction: "Debit",
            amountCents: payment.amountCents,
            currency: invoice.currency,
          },
          {
            ledgerAccountId: settings.defaultAccountsReceivableAccountId,
            direction: "Credit",
            amountCents: payment.amountCents,
            currency: invoice.currency,
          },
        ],
        sourceType: "Payment",
        sourceId: payment.id,
        sourceRef: invoice.number ?? undefined,
      };

      const created = await this.services.accounting.createJournalEntry.execute(createInput, ctx);
      if ("error" in created) {
        return err(created.error);
      }

      const postInput: PostJournalEntryInput = { entryId: created.value.entry.id };
      const posted = await this.services.accounting.postJournalEntry.execute(postInput, ctx);
      if ("error" in posted) {
        return err(posted.error);
      }

      payment.journalEntryId = created.value.entry.id;
    }

    invoice.addPayment(payment, now);

    await this.services.paymentRepo.create(ctx.tenantId, payment);
    await this.services.invoiceRepo.save(ctx.tenantId, invoice);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.payment.recorded",
      entityType: "SalesPayment",
      entityId: payment.id,
      metadata: { invoiceId: invoice.id, amountCents: payment.amountCents },
    });

    const result = { payment: toPaymentDto(payment), invoice: toInvoiceDto(invoice) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.record-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class ListPaymentsUseCase extends BaseUseCase<ListPaymentsInput, ListPaymentsOutput> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListPaymentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListPaymentsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const payments = await this.services.paymentRepo.listByInvoice(ctx.tenantId, input.invoiceId);
    return ok({ items: payments.map(toPaymentDto) });
  }
}

export class ReversePaymentUseCase extends BaseUseCase<ReversePaymentInput, ReversePaymentOutput> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ReversePaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<ReversePaymentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<ReversePaymentOutput>({
      idempotency: this.services.idempotency,
      actionKey: "sales.reverse-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const payment = await this.services.paymentRepo.findById(ctx.tenantId, input.paymentId);
    if (!payment) {
      return err(new NotFoundError("Payment not found"));
    }

    const invoice = await this.services.invoiceRepo.findById(ctx.tenantId, payment.invoiceId);
    if (!invoice) {
      return err(new NotFoundError("Sales invoice not found"));
    }

    if (payment.journalEntryId) {
      const reversalInput: ReverseJournalEntryInput = {
        entryId: payment.journalEntryId,
        reversalDate: payment.paymentDate,
        reversalMemo: input.reason,
      };
      const reversed = await this.services.accounting.reverseJournalEntry.execute(
        reversalInput,
        ctx
      );
      if ("error" in reversed) {
        return err(reversed.error);
      }
    }

    const now = this.services.clock.now();
    invoice.removePayment(payment.id, now);

    await this.services.paymentRepo.delete(ctx.tenantId, payment.id);
    await this.services.invoiceRepo.save(ctx.tenantId, invoice);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "sales.payment.reversed",
      entityType: "SalesPayment",
      entityId: payment.id,
      metadata: { invoiceId: invoice.id, reason: input.reason ?? null },
    });

    const result = { payment: toPaymentDto(payment), invoice: toInvoiceDto(invoice) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "sales.reverse-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
