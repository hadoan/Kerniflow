import { Inject, Injectable } from "@nestjs/common";
import { CashEntryDirection, CashEntryType, type ReverseCashEntryInput } from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  OUTBOX_PORT,
  UNIT_OF_WORK,
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

const ACTION_KEY = "cash-management.entry.reverse";

const reverseDirection = (direction: CashEntryDirection): CashEntryDirection => {
  return direction === CashEntryDirection.IN ? CashEntryDirection.OUT : CashEntryDirection.IN;
};

@RequireTenant()
@Injectable()
export class ReverseCashEntryUseCase extends BaseUseCase<
  ReverseCashEntryInput,
  { entry: ReturnType<typeof toEntryDto> }
> {
  constructor(
    @Inject(CASH_REGISTER_REPO)
    private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO)
    private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO)
    private readonly dayCloseRepo: CashDayCloseRepoPort,
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
    input: ReverseCashEntryInput,
    ctx: UseCaseContext
  ): Promise<Result<{ entry: ReturnType<typeof toEntryDto> }, UseCaseError>> {
    const originalEntryId = input.entryId ?? input.originalEntryId;
    if (!originalEntryId) {
      throw new ValidationError("entryId is required", undefined, "CashManagement:InvalidInput");
    }

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

    const original = await this.entryRepo.findEntryById(tenantId, workspaceId, originalEntryId);
    if (!original) {
      throw new NotFoundError("Cash entry not found", undefined, "CashManagement:EntryNotFound");
    }

    assertCanManageCash(ctx, original.registerId);

    if (original.reversedByEntryId) {
      throw new ValidationError(
        "Entry has already been reversed",
        { entryId: original.id, reversedByEntryId: original.reversedByEntryId },
        "CashManagement:EntryAlreadyReversed"
      );
    }

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      original.registerId
    );
    if (!register) {
      throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );
    }

    // A reversal is a new, immutable correction. It must be recorded on the
    // current business day rather than silently changing a historical cash day.
    const occurredAt = new Date();
    const dayKey = occurredAt.toISOString().slice(0, 10);
    const dayClose = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      original.registerId,
      dayKey
    );

    if (dayClose?.status === "SUBMITTED" || dayClose?.status === "LOCKED") {
      throw new ValidationError(
        `Day ${dayKey} is already closed`,
        { dayKey, dayCloseId: dayClose.id },
        "CashManagement:DayAlreadyClosed"
      );
    }

    const direction = reverseDirection(original.direction);
    const nextBalance = CashBalanceCalculator.applyDelta(register.currentBalanceCents, {
      direction,
      amountCents: original.amountCents,
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

    const reversal = await this.unitOfWork.withinTransaction(async (tx) => {
      const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);
      const created = await this.entryRepo.createEntry(
        {
          tenantId,
          workspaceId,
          registerId: register.id,
          entryNo,
          occurredAt,
          dayKey,
          description: `Reversal #${original.entryNo}: ${input.reason}`,
          type: CashEntryType.CORRECTION,
          direction,
          source: "MANUAL",
          paymentMethod: original.paymentMethod,
          amountCents: original.amountCents,
          grossAmountCents: original.grossAmountCents,
          netAmountCents: original.netAmountCents,
          taxAmountCents: original.taxAmountCents,
          taxMode: original.taxMode,
          taxCodeId: original.taxCodeId,
          taxCode: original.taxCode,
          taxRateBps: original.taxRateBps,
          taxLabel: original.taxLabel,
          currency: original.currency,
          balanceAfterCents: nextBalance,
          sourceDocumentId: original.sourceDocumentId,
          sourceDocumentRef: original.sourceDocumentRef,
          sourceDocumentKind: original.sourceDocumentKind,
          referenceId: original.referenceId,
          reversalOfEntryId: original.id,
          lockedByDayCloseId: null,
          createdByUserId: ctx.userId ?? "system",
        },
        tx
      );

      await this.entryRepo.setReversedByEntryId(tenantId, workspaceId, original.id, created.id, tx);

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
          action: "cash.entry.reversed",
          entityType: "CashEntry",
          entityId: created.id,
          metadata: {
            originalEntryId: original.id,
            reason: input.reason,
          },
        },
        tx
      );

      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.entry.reversed",
          payload: {
            originalEntryId: original.id,
            reversalEntryId: created.id,
            registerId: register.id,
            reason: input.reason,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );

      return created;
    });

    const response = { entry: toEntryDto(reversal) };
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
