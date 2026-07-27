import { Inject, Injectable } from "@nestjs/common";
import type { CreateCashEntryInput } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  UNIT_OF_WORK,
  ForbiddenError,
  NotFoundError,
  ValidationError,
  type AuditPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  RequireTenant,
  ok,
} from "@corely/kernel";
import {
  CASH_DAY_CLOSE_REPO,
  CASH_ENTRY_REPO,
  CASH_REGISTER_REPO,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
} from "../ports/cash-management.ports";
import { toEntryDto } from "../cash-management.mapper";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { getIdempotentBody, storeIdempotentBody } from "./idempotency";
import { assertCanManageCash } from "../../policies/assert-cash-policies";
import { CashBalanceCalculator } from "../../domain/cash-balance-calculator";
import { canPostIntoClosedDay, normalizeCashEntryInput } from "../../domain/cash-entry-rules";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../../../billing";
import { getCashBillingNumber, loadCashBillingState } from "./billing-guards";
import { CashManagementBillingMetricKeys, CashManagementProductKey } from "@corely/contracts";
import { TaxCodeRepoPort } from "../../../tax/domain/ports/tax-code-repo.port";
import { TaxProfileRepoPort } from "../../../tax/domain/ports/tax-profile-repo.port";
import { TaxRateRepoPort } from "../../../tax/domain/ports/tax-rate-repo.port";
import { resolveCashEntryTax, type CashEntryTaxSnapshot } from "../../domain/cash-entry-tax";
import type { NormalizedCashEntryCommand } from "../../domain/cash-entry-rules";

const ACTION_KEY = "cash-management.entry.create";

const isClosedStatus = (status: string): boolean => {
  return status === "SUBMITTED" || status === "LOCKED";
};

@RequireTenant()
@Injectable()
export class CreateCashEntryUseCase extends BaseUseCase<
  CreateCashEntryInput,
  { entry: ReturnType<typeof toEntryDto> }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(BILLING_ACCESS_PORT)
    private readonly billingAccess: BillingAccessPort,
    @Inject(TaxProfileRepoPort)
    private readonly taxProfileRepo: TaxProfileRepoPort,
    @Inject(TaxCodeRepoPort)
    private readonly taxCodeRepo: TaxCodeRepoPort,
    @Inject(TaxRateRepoPort)
    private readonly taxRateRepo: TaxRateRepoPort,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotencyStore: IdempotencyStoragePort
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: CreateCashEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<{ entry: ReturnType<typeof toEntryDto> }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const cached = await getIdempotentBody<{ entry: ReturnType<typeof toEntryDto> }>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    let normalized: NormalizedCashEntryCommand;
    try {
      normalized = normalizeCashEntryInput(input);
    } catch (error) {
      throw new ValidationError(
        "Invalid cash entry input",
        { reason: error instanceof Error ? error.message : "UNKNOWN" },
        "CashManagement:InvalidInput"
      );
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!register) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    const billingState = await loadCashBillingState(this.billingAccess, tenantId);
    const entriesUsed = await this.entryRepo.countEntriesForPeriod(
      tenantId,
      billingState.periodStart,
      billingState.periodEnd
    );
    const maxEntriesPerMonth = getCashBillingNumber(
      billingState.entitlements,
      "maxEntriesPerMonth"
    );
    if (maxEntriesPerMonth !== null && entriesUsed >= maxEntriesPerMonth) {
      throw new ForbiddenError(
        "Your current plan has reached the monthly cash entry limit",
        {
          limit: maxEntriesPerMonth,
          used: entriesUsed,
          planCode: billingState.subscription.planCode,
          periodStart: billingState.periodStart.toISOString(),
          periodEnd: billingState.periodEnd.toISOString(),
        },
        "CashManagement:EntryLimitReached"
      );
    }

    const dayClose = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      register.id,
      normalized.dayKey
    );

    if (dayClose && isClosedStatus(dayClose.status) && !canPostIntoClosedDay(normalized.type)) {
      throw new ValidationError(
        `Day ${normalized.dayKey} is already closed`,
        { dayKey: normalized.dayKey, dayCloseId: dayClose.id },
        "CashManagement:DayAlreadyClosed"
      );
    }

    const nextBalance = CashBalanceCalculator.applyDelta(register.currentBalanceCents, {
      direction: normalized.direction,
      amountCents: normalized.amountCents,
    });

    if (register.disallowNegativeBalance && nextBalance < 0) {
      throw new ValidationError(
        "Negative cash balance is not allowed",
        {
          registerId: register.id,
          attemptedBalanceCents: nextBalance,
          currentBalanceCents: register.currentBalanceCents,
        },
        "CashManagement:NegativeBalance"
      );
    }

    let taxSnapshot: CashEntryTaxSnapshot;
    try {
      taxSnapshot = await resolveCashEntryTax({
        tenantId: workspaceId,
        occurredAt: normalized.occurredAt,
        entryType: normalized.type,
        grossAmountCents: normalized.amountCents,
        input,
        taxProfileRepo: this.taxProfileRepo,
        taxCodeRepo: this.taxCodeRepo,
        taxRateRepo: this.taxRateRepo,
      });
    } catch (error) {
      throw new ValidationError(
        "Invalid VAT/tax configuration for cash entry",
        { reason: error instanceof Error ? error.message : "UNKNOWN" },
        "CashManagement:InvalidTaxInput"
      );
    }

    const sourceDocumentId = input.sourceDocument?.documentId?.trim() || null;
    const sourceDocumentRef = input.sourceDocument?.reference?.trim() || null;
    const sourceDocumentKind = input.sourceDocument?.kind?.trim() || null;

    const entry = await this.unitOfWork.withinTransaction(async (tx) => {
      const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);

      const created = await this.entryRepo.createEntry(
        {
          tenantId,
          workspaceId,
          registerId: register.id,
          entryNo,
          occurredAt: normalized.occurredAt,
          dayKey: normalized.dayKey,
          description: normalized.description,
          type: normalized.type,
          direction: normalized.direction,
          source: normalized.source,
          paymentMethod: normalized.paymentMethod,
          amountCents: normalized.amountCents,
          grossAmountCents: taxSnapshot.grossAmountCents,
          netAmountCents: taxSnapshot.netAmountCents,
          taxAmountCents: taxSnapshot.taxAmountCents,
          taxMode: taxSnapshot.taxMode,
          taxCodeId: taxSnapshot.taxCodeId,
          taxCode: taxSnapshot.taxCode,
          taxRateBps: taxSnapshot.taxRateBps,
          taxLabel: taxSnapshot.taxLabel,
          currency: normalized.currency,
          balanceAfterCents: nextBalance,
          sourceDocumentId,
          sourceDocumentRef,
          sourceDocumentKind,
          referenceId: normalized.referenceId,
          reversalOfEntryId: normalized.reversalOfEntryId,
          lockedByDayCloseId: dayClose && isClosedStatus(dayClose.status) ? dayClose.id : null,
          createdByUserId: ctx.userId ?? "system",
        },
        tx
      );

      await this.registerRepo.setCurrentBalance(
        tenantId,
        workspaceId,
        register.id,
        nextBalance,
        tx
      );

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.entry.created",
          entityType: "CashEntry",
          entityId: created.id,
          metadata: {
            registerId: created.registerId,
            dayKey: created.dayKey,
            amountCents: created.amountCents,
            taxMode: created.taxMode,
            taxCode: created.taxCode,
            taxAmountCents: created.taxAmountCents,
            direction: created.direction,
            entryType: created.type,
            source: created.source,
            entryNo: created.entryNo,
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.entry.created",
          payload: {
            entryId: created.id,
            registerId: created.registerId,
            entryNo: created.entryNo,
            amountCents: created.amountCents,
            grossAmountCents: created.grossAmountCents,
            taxAmountCents: created.taxAmountCents,
            taxMode: created.taxMode,
            type: created.direction,
            direction: created.direction,
            sourceType: created.source,
            businessDate: created.dayKey,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      await this.billingAccess.recordUsage(
        tenantId,
        CashManagementProductKey,
        CashManagementBillingMetricKeys.entries,
        1,
        tx
      );

      return created;
    });

    const response = { entry: toEntryDto(entry) };
    await storeIdempotentBody({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
      body: response,
    });

    return ok(response);
  }
}
