import { Inject, Injectable } from "@nestjs/common";
import {
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntryType,
  CashManagementBillingMetricKeys,
  CashManagementProductKey,
  type ConfirmCashDayDraftInput,
  type CashDayClose,
} from "@corely/contracts";
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
  CASH_CONFIRMATION_REPO,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
  type CashConfirmationRepoPort,
} from "../ports/cash-management.ports";
import { toDayCloseDto } from "../cash-management.mapper";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { getIdempotentBody, storeIdempotentBody } from "./idempotency";
import { assertCanManageCash, assertCanCloseCash } from "../../policies/assert-cash-policies";
import { CashBalanceCalculator } from "../../domain/cash-balance-calculator";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../../../billing";
import {
  getCashBillingBoolean,
  getCashBillingNumber,
  loadCashBillingState,
} from "./billing-guards";
import { TaxCodeRepoPort } from "../../../tax/domain/ports/tax-code-repo.port";
import { TaxProfileRepoPort } from "../../../tax/domain/ports/tax-profile-repo.port";
import { TaxRateRepoPort } from "../../../tax/domain/ports/tax-rate-repo.port";
import { resolveCashEntryTax, type CashEntryTaxSnapshot } from "../../domain/cash-entry-tax";
import { normalizeCashEntryInput } from "../../domain/cash-entry-rules";

const ACTION_KEY = "cash-management.draft.confirm";

@RequireTenant()
@Injectable()
export class ConfirmCashDayDraftUseCase extends BaseUseCase<
  ConfirmCashDayDraftInput,
  { dayClose: CashDayClose }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(CASH_CONFIRMATION_REPO)
    private readonly confirmationRepo: CashConfirmationRepoPort,
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
    input: ConfirmCashDayDraftInput,
    ctx: UseCaseContext
  ): Promise<Result<{ dayClose: CashDayClose }, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);
    assertCanCloseCash(ctx, input.registerId);

    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const cached = await getIdempotentBody<{ dayClose: CashDayClose }>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey || input.confirmationId,
    });
    if (cached) {
      return ok(cached);
    }

    const confirmation = await this.confirmationRepo.findConfirmationById(
      tenantId,
      workspaceId,
      input.confirmationId
    );
    if (!confirmation) {
      throw new NotFoundError(
        "Confirmation not found",
        undefined,
        "CashManagement:ConfirmationNotFound"
      );
    }

    if (confirmation.status !== "PENDING") {
      throw new ValidationError(
        `Confirmation is no longer pending (status: ${confirmation.status})`,
        undefined,
        "CashManagement:ConfirmationNotPending"
      );
    }

    if (new Date() > confirmation.expiresAt) {
      await this.confirmationRepo.markExpired(tenantId, workspaceId, confirmation.id);
      throw new ValidationError(
        "Confirmation has expired",
        undefined,
        "CashManagement:ConfirmationExpired"
      );
    }

    if (confirmation.registerId !== input.registerId) {
      throw new ValidationError(
        "Register ID mismatch",
        undefined,
        "CashManagement:RegisterMismatch"
      );
    }

    const billingState = await loadCashBillingState(this.billingAccess, tenantId);
    if (!getCashBillingBoolean(billingState.entitlements, "dailyClosing")) {
      throw new ForbiddenError(
        "Daily closing is available on Starter and higher plans",
        { planCode: billingState.subscription.planCode },
        "CashManagement:DailyClosingUnavailable"
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

    const payload = confirmation.candidatePayload as any;
    const movements = payload.movements || [];
    const dayKey = payload.businessDate;
    const countedBalance = payload.actualClosingCashCents;

    const existing = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );
    if (existing && existing.status === CashDayCloseStatus.SUBMITTED) {
      throw new ValidationError(
        "Day is already closed",
        { dayCloseId: existing.id, dayKey },
        "CashManagement:DayAlreadyClosed"
      );
    }

    const dayClose = await this.unitOfWork.withinTransaction(async (tx) => {
      let currentBalance = register.currentBalanceCents;
      let entriesCreated = 0;

      for (const movement of movements) {
        const normalized = normalizeCashEntryInput({
          registerId: register.id,
          type: movement.type,
          amountCents: movement.amountCents,
          occurredAt: movement.occurredAt || new Date().toISOString(),
          description: movement.description,
          paymentMethod: movement.paymentMethod || "CASH",
          tax: movement.tax,
        });

        const nextBalance = CashBalanceCalculator.applyDelta(currentBalance, {
          direction: normalized.direction,
          amountCents: normalized.amountCents,
        });

        if (register.disallowNegativeBalance && nextBalance < 0) {
          throw new ValidationError(
            "Negative cash balance is not allowed",
            {
              registerId: register.id,
              attemptedBalanceCents: nextBalance,
              currentBalanceCents: currentBalance,
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
            input: movement as any,
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

        const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);

        await this.entryRepo.createEntry(
          {
            tenantId,
            workspaceId,
            registerId: register.id,
            entryNo,
            occurredAt: normalized.occurredAt,
            dayKey,
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
            sourceDocumentId: null,
            sourceDocumentRef: null,
            sourceDocumentKind: null,
            referenceId: normalized.referenceId,
            reversalOfEntryId: normalized.reversalOfEntryId,
            lockedByDayCloseId: null,
            createdByUserId: ctx.userId ?? "system",
          },
          tx
        );

        currentBalance = nextBalance;
        entriesCreated++;
      }

      await this.registerRepo.setCurrentBalance(
        tenantId,
        workspaceId,
        register.id,
        currentBalance,
        tx
      );

      if (entriesCreated > 0) {
        await this.billingAccess.recordUsage(
          tenantId,
          CashManagementProductKey,
          CashManagementBillingMetricKeys.entries,
          entriesCreated,
          tx
        );
      }

      // Re-calculate expected balance dynamically from the database
      const expectedBalance = await this.entryRepo.getExpectedBalanceAtDay(
        tenantId,
        workspaceId,
        register.id,
        dayKey,
        tx
      );
      const difference = countedBalance - expectedBalance;

      const close = await this.dayCloseRepo.upsertDayClose(
        {
          id: existing?.id,
          tenantId,
          workspaceId,
          registerId: register.id,
          dayKey,
          status: CashDayCloseStatus.SUBMITTED,
          expectedBalanceCents: expectedBalance,
          countedBalanceCents: countedBalance,
          differenceCents: difference,
          note: difference !== 0 ? "Conversational closing adjustment" : null,
          submittedAt: new Date(),
          submittedByUserId: ctx.userId ?? "system",
          lockedAt: new Date(),
          lockedByUserId: ctx.userId ?? "system",
        },
        tx
      );

      await this.entryRepo.lockEntriesForDay(
        tenantId,
        workspaceId,
        register.id,
        dayKey,
        close.id,
        tx
      );

      if (difference !== 0) {
        const direction = difference >= 0 ? CashEntryDirection.IN : CashEntryDirection.OUT;
        const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);
        const amountCents = Math.abs(difference);
        const nextBalance =
          direction === CashEntryDirection.IN
            ? currentBalance + amountCents
            : currentBalance - amountCents;

        await this.entryRepo.createEntry(
          {
            tenantId,
            workspaceId,
            registerId: register.id,
            entryNo,
            occurredAt: new Date(),
            dayKey,
            description: `Day close adjustment ${dayKey}`,
            type: CashEntryType.CLOSING_ADJUSTMENT,
            direction,
            source: "DIFFERENCE",
            paymentMethod: "CASH",
            amountCents,
            grossAmountCents: amountCents,
            netAmountCents: amountCents,
            taxAmountCents: 0,
            taxMode: "NONE",
            taxCodeId: null,
            taxCode: null,
            taxRateBps: null,
            taxLabel: null,
            currency: register.currency,
            balanceAfterCents: nextBalance,
            sourceDocumentId: null,
            sourceDocumentRef: null,
            sourceDocumentKind: null,
            referenceId: close.id,
            reversalOfEntryId: null,
            lockedByDayCloseId: close.id,
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
      }

      await this.confirmationRepo.markConsumed(tenantId, workspaceId, confirmation.id, tx);

      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.day-close.submitted",
          entityType: "CashDayClose",
          entityId: close.id,
          metadata: {
            registerId: close.registerId,
            dayKey: close.dayKey,
            expectedBalanceCents: close.expectedBalanceCents,
            countedBalanceCents: close.countedBalanceCents,
            differenceCents: close.differenceCents,
            viaConfirmationId: confirmation.id,
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.day.closed",
          payload: {
            dayCloseId: close.id,
            registerId: close.registerId,
            dayKey: close.dayKey,
            differenceCents: close.differenceCents,
            status: close.status,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return close;
    });

    const refreshed = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );
    const response = { dayClose: toDayCloseDto(refreshed ?? dayClose) };

    await storeIdempotentBody({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey || input.confirmationId,
      body: response,
    });

    return ok(response);
  }
}
