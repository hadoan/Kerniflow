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
  CreateVendorBillInput,
  CreateVendorBillOutput,
  UpdateVendorBillInput,
  UpdateVendorBillOutput,
  ApproveVendorBillInput,
  ApproveVendorBillOutput,
  PostVendorBillInput,
  PostVendorBillOutput,
  VoidVendorBillInput,
  VoidVendorBillOutput,
  GetVendorBillInput,
  GetVendorBillOutput,
  ListVendorBillsInput,
  ListVendorBillsOutput,
  CreateJournalEntryInput,
  PostJournalEntryInput,
} from "@corely/contracts";
import { VendorBillAggregate } from "../../domain/vendor-bill.aggregate";
import type { VendorBillLineItem } from "../../domain/purchasing.types";
import type { VendorBillRepositoryPort } from "../ports/vendor-bill-repository.port";
import type { PurchasingSettingsRepositoryPort } from "../ports/settings-repository.port";
import type { PurchasingAccountMappingRepositoryPort } from "../ports/account-mapping-repository.port";
import { PurchasingSettingsAggregate } from "../../domain/settings.aggregate";
import { toVendorBillDto } from "../mappers/purchasing-dto.mapper";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import type { SupplierQueryPort } from "../ports/supplier-query.port";
import type { AccountingApplication } from "../../../accounting/application/accounting.application";

const buildLineItems = (params: {
  idGenerator: IdGeneratorPort;
  lineItems: Array<{
    id?: string;
    description: string;
    quantity: number;
    unitCostCents: number;
    category?: string;
    glAccountId?: string;
    taxCode?: string;
    sortOrder?: number;
  }>;
}): VendorBillLineItem[] =>
  params.lineItems.map((item, idx) => ({
    id: item.id ?? params.idGenerator.newId(),
    description: item.description,
    quantity: item.quantity,
    unitCostCents: item.unitCostCents,
    category: item.category,
    glAccountId: item.glAccountId,
    taxCode: item.taxCode,
    sortOrder: item.sortOrder ?? idx,
  }));

type VendorBillDeps = {
  logger: LoggerPort;
  repo: VendorBillRepositoryPort;
  settingsRepo: PurchasingSettingsRepositoryPort;
  mappingRepo: PurchasingAccountMappingRepositoryPort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
  idempotency: IdempotencyStoragePort;
  supplierQuery: SupplierQueryPort;
  accounting: AccountingApplication;
  audit: AuditPort;
};

const resolveAccountForLine = async (params: {
  line: VendorBillLineItem;
  tenantId: string;
  supplierPartyId: string;
  mappingRepo: PurchasingAccountMappingRepositoryPort;
  defaultExpenseAccountId?: string | null;
}): Promise<string | null> => {
  if (params.line.glAccountId) {
    return params.line.glAccountId;
  }
  if (params.line.category) {
    const mapping = await params.mappingRepo.findBySupplierCategory(
      params.tenantId,
      params.supplierPartyId,
      params.line.category
    );
    if (mapping) {
      return mapping.glAccountId;
    }
  }
  return params.defaultExpenseAccountId ?? null;
};

export class CreateVendorBillUseCase extends BaseUseCase<
  CreateVendorBillInput,
  CreateVendorBillOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected validate(input: CreateVendorBillInput): CreateVendorBillInput {
    if (!input.supplierPartyId) {
      throw new ValidationError("supplierPartyId is required");
    }
    if (!input.currency) {
      throw new ValidationError("currency is required");
    }
    if (!input.lineItems?.length) {
      throw new ValidationError("At least one line item is required");
    }
    return input;
  }

  protected async handle(
    input: CreateVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<CreateVendorBillOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<CreateVendorBillOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-bill",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const supplier = await this.services.supplierQuery.getSupplierById(
      ctx.tenantId,
      input.supplierPartyId
    );
    if (!supplier) {
      return err(new NotFoundError("Supplier not found"));
    }

    if (input.billNumber) {
      const existing = await this.services.repo.findBySupplierBillNumber(
        ctx.tenantId,
        input.supplierPartyId,
        input.billNumber
      );
      if (existing) {
        return err(
          new ValidationError(
            "Duplicate vendor bill",
            {
              existingBillId: existing.id,
              billNumber: existing.billNumber,
            },
            "DUPLICATE_BILL"
          )
        );
      }
    }

    const now = this.services.clock.now();
    const lineItems = buildLineItems({
      idGenerator: this.services.idGenerator,
      lineItems: input.lineItems,
    });

    const vendorBill = VendorBillAggregate.createDraft({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      supplierPartyId: input.supplierPartyId,
      supplierContactPartyId: input.supplierContactPartyId ?? null,
      billNumber: input.billNumber ?? null,
      internalBillRef: input.internalBillRef ?? null,
      billDate: parseLocalDate(input.billDate),
      dueDate: parseLocalDate(input.dueDate),
      currency: input.currency,
      paymentTerms: input.paymentTerms,
      notes: input.notes,
      lineItems,
      purchaseOrderId: input.purchaseOrderId ?? null,
      now,
    });

    await this.services.repo.create(ctx.tenantId, vendorBill);

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.create-bill",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class UpdateVendorBillUseCase extends BaseUseCase<
  UpdateVendorBillInput,
  UpdateVendorBillOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpdateVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<UpdateVendorBillOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const vendorBill = await this.services.repo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    const now = this.services.clock.now();
    if (input.headerPatch) {
      vendorBill.updateHeader(
        {
          supplierPartyId: input.headerPatch.supplierPartyId,
          supplierContactPartyId: input.headerPatch.supplierContactPartyId,
          billNumber: input.headerPatch.billNumber,
          internalBillRef: input.headerPatch.internalBillRef,
          billDate: input.headerPatch.billDate
            ? parseLocalDate(input.headerPatch.billDate)
            : undefined,
          dueDate: input.headerPatch.dueDate
            ? parseLocalDate(input.headerPatch.dueDate)
            : undefined,
          currency: input.headerPatch.currency,
          paymentTerms: input.headerPatch.paymentTerms,
          notes: input.headerPatch.notes,
          purchaseOrderId: input.headerPatch.purchaseOrderId,
        },
        now
      );
    }

    if (input.lineItems) {
      const lineItems = buildLineItems({
        idGenerator: this.services.idGenerator,
        lineItems: input.lineItems,
      });
      vendorBill.replaceLineItems(lineItems, now);
    }

    await this.services.repo.save(ctx.tenantId, vendorBill);
    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}

export class ApproveVendorBillUseCase extends BaseUseCase<
  ApproveVendorBillInput,
  ApproveVendorBillOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ApproveVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<ApproveVendorBillOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const vendorBill = await this.services.repo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    const now = this.services.clock.now();
    try {
      vendorBill.approve(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(ctx.tenantId, vendorBill);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.approved",
      entityType: "VendorBill",
      entityId: vendorBill.id,
    });

    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}

export class PostVendorBillUseCase extends BaseUseCase<PostVendorBillInput, PostVendorBillOutput> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: PostVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<PostVendorBillOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const cached = await getIdempotentResult<PostVendorBillOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.post-bill",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const vendorBill = await this.services.repo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
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
      return err(new ValidationError("Default AP account is required for posting"));
    }

    const accountIds: string[] = [];
    for (let idx = 0; idx < vendorBill.lineItems.length; idx += 1) {
      const line = vendorBill.lineItems[idx];
      const resolved = await resolveAccountForLine({
        line,
        tenantId: ctx.tenantId,
        supplierPartyId: vendorBill.supplierPartyId,
        mappingRepo: this.services.mappingRepo,
        defaultExpenseAccountId: settings.defaultExpenseAccountId,
      });
      if (!resolved) {
        return err(
          new ValidationError(
            `Missing GL account mapping for line ${idx + 1}`,
            { lineIndex: idx },
            "MISSING_GL_MAPPING"
          )
        );
      }
      accountIds.push(resolved);
    }

    const debitBuckets = new Map<string, number>();
    vendorBill.lineItems.forEach((line, idx) => {
      const accountId = accountIds[idx];
      const amount = line.quantity * line.unitCostCents;
      debitBuckets.set(accountId, (debitBuckets.get(accountId) ?? 0) + amount);
    });

    const createInput: CreateJournalEntryInput = {
      postingDate: vendorBill.billDate,
      memo: `Vendor Bill ${vendorBill.billNumber ?? vendorBill.id} posted`,
      lines: [
        ...Array.from(debitBuckets.entries()).map(([ledgerAccountId, amountCents]) => ({
          ledgerAccountId,
          direction: "Debit" as const,
          amountCents,
          currency: vendorBill.currency,
        })),
        {
          ledgerAccountId: settings.defaultAccountsPayableAccountId,
          direction: "Credit" as const,
          amountCents: vendorBill.totals.totalCents,
          currency: vendorBill.currency,
        },
      ],
      sourceType: "VendorBill",
      sourceId: vendorBill.id,
      sourceRef: vendorBill.billNumber ?? undefined,
    };

    const created = await this.services.accounting.createJournalEntry.execute(createInput, ctx);
    if ("error" in created) {
      return err(created.error);
    }

    const postInput: PostJournalEntryInput = {
      entryId: created.value.entry.id,
    };
    const posted = await this.services.accounting.postJournalEntry.execute(postInput, ctx);
    if ("error" in posted) {
      return err(posted.error);
    }

    const now = this.services.clock.now();
    try {
      vendorBill.setPostedJournalEntry(created.value.entry.id, now);
      vendorBill.post(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }

    await this.services.repo.save(ctx.tenantId, vendorBill);
    await this.services.settingsRepo.save(settings);
    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.posted",
      entityType: "VendorBill",
      entityId: vendorBill.id,
      metadata: { journalEntryId: created.value.entry.id },
    });

    const result = { vendorBill: toVendorBillDto(vendorBill) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.post-bill",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}

export class VoidVendorBillUseCase extends BaseUseCase<VoidVendorBillInput, VoidVendorBillOutput> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: VoidVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<VoidVendorBillOutput, UseCaseError>> {
    if (!ctx.tenantId || !ctx.userId) {
      return err(new ValidationError("tenantId and userId are required"));
    }

    const vendorBill = await this.services.repo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    const now = this.services.clock.now();
    try {
      vendorBill.void(now, now);
    } catch (error) {
      return err(new ValidationError((error as Error).message));
    }
    await this.services.repo.save(ctx.tenantId, vendorBill);

    await this.services.audit.log({
      tenantId: ctx.tenantId,
      userId: ctx.userId,
      action: "purchasing.bill.voided",
      entityType: "VendorBill",
      entityId: vendorBill.id,
    });

    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}

export class GetVendorBillUseCase extends BaseUseCase<GetVendorBillInput, GetVendorBillOutput> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: GetVendorBillInput,
    ctx: UseCaseContext
  ): Promise<Result<GetVendorBillOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const vendorBill = await this.services.repo.findById(ctx.tenantId, input.vendorBillId);
    if (!vendorBill) {
      return err(new NotFoundError("Vendor bill not found"));
    }

    return ok({ vendorBill: toVendorBillDto(vendorBill) });
  }
}

export class ListVendorBillsUseCase extends BaseUseCase<
  ListVendorBillsInput,
  ListVendorBillsOutput
> {
  constructor(private readonly services: VendorBillDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListVendorBillsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListVendorBillsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const result = await this.services.repo.list(ctx.tenantId, {
      status: input.status,
      supplierPartyId: input.supplierPartyId,
      fromDate: input.fromDate,
      toDate: input.toDate,
      dueFromDate: input.dueFromDate,
      dueToDate: input.dueToDate,
      search: input.search,
      cursor: input.cursor,
      pageSize: input.pageSize,
    });

    return ok({
      items: result.items.map(toVendorBillDto),
      nextCursor: result.nextCursor ?? null,
    });
  }
}
