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
  RecordBillPaymentInput,
  RecordBillPaymentOutput,
  ListBillPaymentsInput,
  ListBillPaymentsOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
} from "@corely/contracts";
import type { VendorBillRepositoryPort } from "../ports/vendor-bill-repository.port";
import type { BillPaymentRepositoryPort } from "../ports/bill-payment-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toBillPaymentDto, toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { AccountingApplication } from "../../../accounting/application/accounting.application";
import type { BillPayment } from "../../domain/purchasing.types";

type PaymentDeps = {
  logger: LoggerPort;
  billRepo: VendorBillRepositoryPort;
  paymentRepo: BillPaymentRepositoryPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  accounting: AccountingApplication;
  audit: AuditPort;
};

export class RecordBillPaymentUseCase extends BaseUseCase<
  RecordBillPaymentInput,
  RecordBillPaymentOutput
> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: RecordBillPaymentInput,
    ctx: UseCaseContext
  ): Promise<Result<RecordBillPaymentOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<RecordBillPaymentOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.record-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const vendorBill = await this.services.billRepo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    if (vendorBill.totals.dueCents < input.amountCents) {
      return err(new ValidationError("Payment exceeds remaining balance"));
    }

    let settings = await this.services.settingsRepo.findByTenant(ctx.tenantId);
    if (!settings) {
      settings = PurchasingSettingsAggregate.createDefault({
        id: this.services.idGenerator.newId(),
        tenantId: ctx.tenantId,
        now: this.services.clock.now(),
      });
    }

    if (!settings.defaultAccountsPayableAccountId) {
      return err(new ValidationError("Default AP account is required for payments"));
    }

    const bankAccountId = input.bankAccountId || settings.defaultBankAccountId;
    if (!bankAccountId) {
      return err(new ValidationError("Bank account is required for payment posting"));
    }

    const paymentDate = parseLocalDate(input.paymentDate);
    const now = this.services.clock.now();

    const payment: BillPayment = {
      id: this.services.idGenerator.newId(),
      vendorBillId: vendorBill.id,
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

    const createInput: CreateJournalEntryInput = {
      postingDate: paymentDate,
      memo: `Payment for Vendor Bill ${vendorBill.billNumber ?? vendorBill.id}`,
      lines: [
        {
          ledgerAccountId: settings.defaultAccountsPayableAccountId,
          direction: "Debit",
          amountCents: payment.amountCents,
          currency: payment.currency,
        },
        {
          ledgerAccountId: bankAccountId,
          direction: "Credit",
          amountCents: payment.amountCents,
          currency: payment.currency,
        },
      ],
      sourceType: "BillPayment",
      sourceId: payment.id,
      sourceRef: vendorBill.billNumber ?? undefined,
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

    try {
      vendorBill.addPayment(payment, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.services.paymentRepo.create(ctx.tenantId, payment);
    await this.services.billRepo.save(ctx.tenantId, vendorBill);
    await this.services.settingsRepo.save(settings);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.payment.recorded",
      entityType: "VendorBill",
      entityId: vendorBill.id,
      metadata: { paymentId: payment.id, journalEntryId: payment.journalEntryId },
    });

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.record-payment",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class ListBillPaymentsUseCase extends BaseUseCase<
  ListBillPaymentsInput,
  ListBillPaymentsOutput
> {
  constructor(private readonly services: PaymentDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListBillPaymentsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListBillPaymentsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const payments = await this.services.paymentRepo.listByBill(ctx.tenantId, input.vendorBillId);

    return ok({ payments: payments.map(toBillPaymentDto) });
  }
}
