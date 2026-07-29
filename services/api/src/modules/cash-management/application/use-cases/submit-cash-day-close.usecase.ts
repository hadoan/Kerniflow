import { Inject, Injectable } from "@nestjs/common";
import {
  CashDayCloseStatus,
  CashEntryDirection,
  CashEntryType,
  type SubmitCashDayCloseInput,
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
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
} from "../ports/cash-management.ports";
import { toDayCloseDto } from "../cash-management.mapper";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { getIdempotentBody, storeIdempotentBody } from "./idempotency";
import { assertCanCloseCash } from "../../policies/assert-cash-policies";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../../../billing";
import { getCashBillingBoolean, loadCashBillingState } from "./billing-guards";

const ACTION_KEY = "cash-management.day-close.submit";

@RequireTenant()
@Injectable()
export class SubmitCashDayCloseUseCase extends BaseUseCase<
  SubmitCashDayCloseInput,
  { dayClose: ReturnType<typeof toDayCloseDto> }
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
    input: SubmitCashDayCloseInput,
    ctx: UseCaseContext
  ): Promise<Result<{ dayClose: ReturnType<typeof toDayCloseDto> }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    assertCanCloseCash(ctx, input.registerId);

    const dayKey = input.dayKey ?? input.businessDate;
    if (!dayKey) {
      throw new ValidationError("dayKey is required", undefined, "CashManagement:InvalidInput");
    }

    const cached = await getIdempotentBody<{ dayClose: ReturnType<typeof toDayCloseDto> }>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const billingState = await loadCashBillingState(this.billingAccess, tenantId);
    if (!getCashBillingBoolean(billingState.entitlements, "dailyClosing")) {
      throw new ForbiddenError(
        "Daily closing is available on Starter and higher plans",
        {
          planCode: billingState.subscription.planCode,
        },
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

    const unclosedPriorDayKeys = await this.entryRepo.listUnclosedDayKeysBefore(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );

    if (unclosedPriorDayKeys.length > 0) {
      throw new ValidationError(
        `Cannot close day ${dayKey} because prior days are not closed: ${unclosedPriorDayKeys.join(", ")}`,
        { unclosedPriorDayKeys },
        "CashManagement:PriorDayNotClosed"
      );
    }

    const expectedBalance = await this.entryRepo.getExpectedBalanceAtDay(
      tenantId,
      workspaceId,
      register.id,
      dayKey
    );

    let countedBalance: number | null = null;
    let difference: number | null = null;
    let verificationStatus = "NOT_COUNTED";

    const note = input.note ?? input.notes ?? null;

    const hasCounted =
      input.countedClosingCashCents !== undefined ||
      input.countedBalance !== undefined ||
      input.countedBalanceCents !== undefined ||
      input.denominationCounts.length > 0;
    const effectiveMode = input.mode ?? (hasCounted ? "COUNTED" : "SKIPPED");

    if (effectiveMode === "COUNTED") {
      const countedFromLines = input.denominationCounts.reduce(
        (total, line) => total + line.subtotal,
        0
      );
      countedBalance =
        input.countedClosingCashCents ??
        input.countedBalance ??
        input.countedBalanceCents ??
        countedFromLines;

      if (countedBalance < 0) {
        throw new ValidationError("Counted closing cash cannot be negative.", { countedBalance });
      }

      difference = countedBalance - expectedBalance;
      verificationStatus = difference === 0 ? "COUNTED_MATCH" : "COUNTED_DIFFERENCE";

      if (difference !== 0 && !note) {
        throw new ValidationError(
          "A note is required when counted and expected balances differ",
          { differenceCents: difference },
          "CashManagement:DifferenceNoteRequired"
        );
      }
    }

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
          verificationStatus,
          note,
          submittedAt: new Date(),
          submittedByUserId: ctx.userId ?? "system",
          lockedAt: new Date(),
          lockedByUserId: ctx.userId ?? "system",
        },
        tx
      );

      await this.dayCloseRepo.replaceCountLines(
        tenantId,
        workspaceId,
        close.id,
        input.denominationCounts.map((line) => ({
          denominationCents: line.denomination,
          count: line.count,
          subtotalCents: line.subtotal,
        })),
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

      if (difference !== null && difference !== 0) {
        const direction = difference >= 0 ? CashEntryDirection.IN : CashEntryDirection.OUT;
        const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);
        const amountCents = Math.abs(difference);
        const nextBalance =
          direction === CashEntryDirection.IN
            ? register.currentBalanceCents + amountCents
            : register.currentBalanceCents - amountCents;

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
      idempotencyKey: input.idempotencyKey,
      body: response,
    });

    return ok(response);
  }
}
