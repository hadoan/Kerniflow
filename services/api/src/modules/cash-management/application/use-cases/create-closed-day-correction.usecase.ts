import { Inject, Injectable } from "@nestjs/common";
import {
  CashEntryDirection,
  CashEntryType,
  CashManagementBillingMetricKeys,
  CashManagementProductKey,
  type CreateClosedDayCorrectionInput,
} from "@corely/contracts";
import {
  AUDIT_PORT,
  BaseUseCase,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  OUTBOX_PORT,
  RequireTenant,
  UNIT_OF_WORK,
  ValidationError,
  type AuditPort,
  type OutboxPort,
  type Result,
  type UnitOfWorkPort,
  type UseCaseContext,
  type UseCaseError,
  ok,
} from "@corely/kernel";
import { BILLING_ACCESS_PORT, type BillingAccessPort } from "../../../billing";
import { TaxCodeRepoPort } from "../../../tax/domain/ports/tax-code-repo.port";
import { TaxProfileRepoPort } from "../../../tax/domain/ports/tax-profile-repo.port";
import { TaxRateRepoPort } from "../../../tax/domain/ports/tax-rate-repo.port";
import { assertCanManageCash } from "../../policies/assert-cash-policies";
import { CashBalanceCalculator } from "../../domain/cash-balance-calculator";
import {
  normalizeCashEntryInput,
  type NormalizedCashEntryCommand,
} from "../../domain/cash-entry-rules";
import { resolveCashEntryTax, type CashEntryTaxSnapshot } from "../../domain/cash-entry-tax";
import { toEntryDto } from "../cash-management.mapper";
import {
  CASH_ATTACHMENT_REPO,
  CASH_DAY_CLOSE_REPO,
  CASH_DOCUMENTS_PORT,
  CASH_ENTRY_REPO,
  CASH_REGISTER_REPO,
  type CashAttachmentRepoPort,
  type CashDayCloseRepoPort,
  type CashEntryRepoPort,
  type CashRegisterRepoPort,
  type CreateEntryRecord,
  type DocumentsPort,
} from "../ports/cash-management.ports";
import { getCashBillingNumber, loadCashBillingState } from "./billing-guards";
import {
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
  type IdempotencyStoragePort,
} from "@/shared/ports/idempotency-storage.port";
import { getIdempotentBody, storeIdempotentBody } from "./idempotency";

const ACTION_KEY = "cash-management.closed-day-correction.create";
const isClosedStatus = (status: string) => status === "SUBMITTED" || status === "LOCKED";
const needsOriginalEntry = (correctionType: CreateClosedDayCorrectionInput["correctionType"]) =>
  correctionType === "REVERSE_ENTRY" || correctionType === "REPLACE_ENTRY";
const needsReplacementEntry = (correctionType: CreateClosedDayCorrectionInput["correctionType"]) =>
  correctionType !== "REVERSE_ENTRY";
const reverseDirection = (direction: CashEntryDirection): CashEntryDirection =>
  direction === CashEntryDirection.IN ? CashEntryDirection.OUT : CashEntryDirection.IN;
const readSnapshotNumber = (snapshot: unknown, key: string): number | null => {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) {
    return null;
  }
  const value = (snapshot as Record<string, unknown>)[key];
  return typeof value === "number" ? value : null;
};

type Response = {
  entry: ReturnType<typeof toEntryDto>;
  revision: {
    id: string;
    revisionNo: number;
    correctionType: string;
    reason: string;
    occurredAt: string;
    recordedAt: string;
    downstreamReviewRequired: boolean;
  };
};

@RequireTenant()
@Injectable()
export class CreateClosedDayCorrectionUseCase extends BaseUseCase<
  CreateClosedDayCorrectionInput,
  Response
> {
  constructor(
    @Inject(CASH_REGISTER_REPO) private readonly registerRepo: CashRegisterRepoPort,
    @Inject(CASH_ENTRY_REPO) private readonly entryRepo: CashEntryRepoPort,
    @Inject(CASH_DAY_CLOSE_REPO) private readonly dayCloseRepo: CashDayCloseRepoPort,
    @Inject(CASH_ATTACHMENT_REPO) private readonly attachmentRepo: CashAttachmentRepoPort,
    @Inject(CASH_DOCUMENTS_PORT) private readonly documentsPort: DocumentsPort,
    @Inject(BILLING_ACCESS_PORT) private readonly billingAccess: BillingAccessPort,
    @Inject(TaxProfileRepoPort) private readonly taxProfileRepo: TaxProfileRepoPort,
    @Inject(TaxCodeRepoPort) private readonly taxCodeRepo: TaxCodeRepoPort,
    @Inject(TaxRateRepoPort) private readonly taxRateRepo: TaxRateRepoPort,
    @Inject(AUDIT_PORT) private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(UNIT_OF_WORK) private readonly unitOfWork: UnitOfWorkPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotencyStore: IdempotencyStoragePort
  ) {
    super({ logger: undefined });
  }

  async listRevisions(registerId: string, dayKey: string, ctx: UseCaseContext) {
    assertCanManageCash(ctx, registerId);
    if (!ctx.tenantId || !ctx.workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }
    return this.dayCloseRepo.listRevisions(ctx.tenantId, ctx.workspaceId, registerId, dayKey);
  }

  protected async handle(
    input: CreateClosedDayCorrectionInput,
    ctx: UseCaseContext
  ): Promise<Result<Response, UseCaseError>> {
    assertCanManageCash(ctx, input.registerId);
    const { tenantId, workspaceId } = ctx;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant/workspace context");
    }

    const cached = await getIdempotentBody<Response>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
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
    const dayClose = await this.dayCloseRepo.findDayCloseByRegisterAndDay(
      tenantId,
      workspaceId,
      register.id,
      input.dayKey
    );
    if (!dayClose || !isClosedStatus(dayClose.status)) {
      throw new ConflictError(
        "A closed day correction can only be created for a closed day",
        { dayKey: input.dayKey, status: dayClose?.status ?? "OPEN" },
        "CashManagement:DayNotClosed"
      );
    }

    const requiresOriginalEntry = needsOriginalEntry(input.correctionType);
    const originalEntryId = input.originalEntryId;
    if (requiresOriginalEntry && !originalEntryId) {
      throw new ValidationError(
        "originalEntryId is required for reversal or replacement",
        undefined,
        "CashManagement:OriginalEntryRequired"
      );
    }
    const original =
      requiresOriginalEntry && originalEntryId
        ? await this.entryRepo.findEntryById(tenantId, workspaceId, originalEntryId)
        : null;
    if (needsOriginalEntry(input.correctionType) && !original) {
      throw new NotFoundError(
        "Original cash entry not found",
        { originalEntryId: input.originalEntryId },
        "CashManagement:EntryNotFound"
      );
    }
    if (original) {
      if (original.registerId !== register.id || original.dayKey !== input.dayKey) {
        throw new ValidationError(
          "The original entry must belong to the closed register day being corrected",
          {
            originalEntryId: original.id,
            originalRegisterId: original.registerId,
            originalDayKey: original.dayKey,
            registerId: register.id,
            dayKey: input.dayKey,
          },
          "CashManagement:CorrectionEntryDayMismatch"
        );
      }
      if (original.reversalOfEntryId) {
        throw new ValidationError(
          "A reversal entry cannot itself be reversed through closed-day correction",
          { originalEntryId: original.id, reversalOfEntryId: original.reversalOfEntryId },
          "CashManagement:CannotReverseReversal"
        );
      }
      if (original.reversedByEntryId) {
        throw new ConflictError(
          "Entry has already been reversed",
          { originalEntryId: original.id, reversedByEntryId: original.reversedByEntryId },
          "CashManagement:EntryAlreadyReversed"
        );
      }
    }

    const entriesNeeded = input.correctionType === "REPLACE_ENTRY" ? 2 : 1;
    const billingState = await loadCashBillingState(this.billingAccess, tenantId);
    const entriesUsed = await this.entryRepo.countEntriesForPeriod(
      tenantId,
      billingState.periodStart,
      billingState.periodEnd
    );
    const limit = getCashBillingNumber(billingState.entitlements, "maxEntriesPerMonth");
    if (limit !== null && entriesUsed + entriesNeeded > limit) {
      throw new ForbiddenError(
        "Your current plan has reached the monthly cash entry limit",
        { limit, used: entriesUsed, required: entriesNeeded },
        "CashManagement:EntryLimitReached"
      );
    }

    await Promise.all(
      input.attachmentIds.map((documentId) =>
        this.documentsPort.assertDocumentAccessible(tenantId, documentId)
      )
    );

    const replacementInput = needsReplacementEntry(input.correctionType) ? input.entry : undefined;
    if (needsReplacementEntry(input.correctionType) && !replacementInput) {
      throw new ValidationError(
        "A new entry is required for this correction type",
        undefined,
        "CashManagement:CorrectionEntryRequired"
      );
    }

    let normalized: NormalizedCashEntryCommand | null = null;
    let taxSnapshot: CashEntryTaxSnapshot | null = null;
    if (replacementInput) {
      normalized = normalizeCashEntryInput({
        registerId: register.id,
        type: replacementInput.type,
        description: replacementInput.description,
        grossAmountCents: replacementInput.grossAmountCents,
        occurredAt: input.occurredAt,
        dayKey: input.dayKey,
        tax: replacementInput.tax,
      });
      taxSnapshot = await resolveCashEntryTax({
        tenantId: workspaceId,
        occurredAt: normalized.occurredAt,
        entryType: normalized.type,
        grossAmountCents: normalized.amountCents,
        input: {
          registerId: register.id,
          type: replacementInput.type,
          description: replacementInput.description,
          grossAmountCents: replacementInput.grossAmountCents,
          tax: replacementInput.tax,
        },
        taxProfileRepo: this.taxProfileRepo,
        taxCodeRepo: this.taxCodeRepo,
        taxRateRepo: this.taxRateRepo,
      });
    }

    let nextBalance = register.currentBalanceCents;
    if (original) {
      nextBalance = CashBalanceCalculator.applyDelta(nextBalance, {
        direction: reverseDirection(original.direction),
        amountCents: original.amountCents,
      });
    }
    if (normalized) {
      nextBalance = CashBalanceCalculator.applyDelta(nextBalance, {
        direction: normalized.direction,
        amountCents: normalized.amountCents,
      });
    }
    if (register.disallowNegativeBalance && nextBalance < 0) {
      throw new ValidationError(
        "Negative cash balance is not allowed",
        { attemptedBalanceCents: nextBalance },
        "CashManagement:NegativeBalance"
      );
    }

    const downstreamCloses = (
      await this.dayCloseRepo.listDayCloses(tenantId, workspaceId, {
        registerId: register.id,
        dayKeyFrom: input.dayKey,
      })
    ).filter((close) => close.dayKey > input.dayKey && isClosedStatus(close.status));

    const previousRevisions = await this.dayCloseRepo.listRevisions(
      tenantId,
      workspaceId,
      register.id,
      input.dayKey
    );
    const expectedBalanceBeforeCorrection =
      readSnapshotNumber(previousRevisions.at(-1)?.correctedSnapshot, "expectedBalanceCents") ??
      dayClose.expectedBalanceCents;
    let revisedExpectedBalanceCents = expectedBalanceBeforeCorrection;
    if (original) {
      revisedExpectedBalanceCents = CashBalanceCalculator.applyDelta(revisedExpectedBalanceCents, {
        direction: reverseDirection(original.direction),
        amountCents: original.amountCents,
      });
    }
    if (normalized) {
      revisedExpectedBalanceCents = CashBalanceCalculator.applyDelta(revisedExpectedBalanceCents, {
        direction: normalized.direction,
        amountCents: normalized.amountCents,
      });
    }

    const result = await this.unitOfWork.withinTransaction(async (tx) => {
      let runningBalance = register.currentBalanceCents;
      let reversalEntryId: string | null = null;

      if (original) {
        const reversalDirection = reverseDirection(original.direction);
        runningBalance = CashBalanceCalculator.applyDelta(runningBalance, {
          direction: reversalDirection,
          amountCents: original.amountCents,
        });
        const reversalEntryNo = await this.entryRepo.nextEntryNo(
          tenantId,
          workspaceId,
          register.id,
          tx
        );
        const reversal = await this.entryRepo.createEntry(
          {
            tenantId,
            workspaceId,
            registerId: register.id,
            entryNo: reversalEntryNo,
            occurredAt: original.occurredAt,
            dayKey: original.dayKey,
            description: `Reversal #${original.entryNo}: ${input.reason}`,
            type: CashEntryType.CORRECTION,
            direction: reversalDirection,
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
            balanceAfterCents: runningBalance,
            sourceDocumentId: original.sourceDocumentId,
            sourceDocumentRef: original.sourceDocumentRef,
            sourceDocumentKind: original.sourceDocumentKind,
            referenceId: original.referenceId,
            reversalOfEntryId: original.id,
            lockedByDayCloseId: dayClose.id,
            createdByUserId: ctx.userId ?? "system",
          },
          tx
        );
        reversalEntryId = reversal.id;
        const markedAsReversed = await this.entryRepo.setReversedByEntryId(
          tenantId,
          workspaceId,
          original.id,
          reversal.id,
          tx
        );
        if (!markedAsReversed) {
          throw new ConflictError(
            "Entry has already been reversed",
            { originalEntryId: original.id },
            "CashManagement:EntryAlreadyReversed"
          );
        }
      }

      let replacement = null;
      if (normalized && taxSnapshot) {
        runningBalance = CashBalanceCalculator.applyDelta(runningBalance, {
          direction: normalized.direction,
          amountCents: normalized.amountCents,
        });
        const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);
        const replacementRecord: CreateEntryRecord = {
          tenantId,
          workspaceId,
          registerId: register.id,
          entryNo,
          occurredAt: normalized.occurredAt,
          dayKey: normalized.dayKey,
          description: normalized.description,
          type: normalized.type,
          direction: normalized.direction,
          source: "MANUAL",
          paymentMethod: "CASH",
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
          referenceId: input.originalEntryId ?? null,
          reversalOfEntryId: null,
          lockedByDayCloseId: dayClose.id,
          createdByUserId: ctx.userId ?? "system",
        };
        replacement = await this.entryRepo.createEntry(replacementRecord, tx);
      }

      const correctionEntry =
        replacement ??
        (reversalEntryId
          ? await this.entryRepo.findEntryById(tenantId, workspaceId, reversalEntryId, tx)
          : null);
      if (!correctionEntry) {
        throw new ValidationError(
          "The correction did not create an entry",
          undefined,
          "CashManagement:CorrectionEntryRequired"
        );
      }

      const revision = await this.dayCloseRepo.createRevision(
        {
          tenantId,
          workspaceId,
          registerId: register.id,
          dayCloseId: dayClose.id,
          correctionEntryId: correctionEntry.id,
          correctionType: input.correctionType,
          reason: input.reason,
          occurredAt: normalized?.occurredAt ?? original?.occurredAt ?? new Date(input.occurredAt),
          createdByUserId: ctx.userId ?? "system",
          originalSnapshot: {
            expectedBalanceCents: expectedBalanceBeforeCorrection,
            countedBalanceCents: dayClose.countedBalanceCents,
            differenceCents:
              dayClose.countedBalanceCents === null
                ? null
                : dayClose.countedBalanceCents - expectedBalanceBeforeCorrection,
            status: dayClose.status,
            closedAt:
              dayClose.lockedAt?.toISOString() ?? dayClose.submittedAt?.toISOString() ?? null,
          },
          correctedSnapshot: {
            expectedBalanceCents: revisedExpectedBalanceCents,
            countedBalanceCents: dayClose.countedBalanceCents,
            differenceCents:
              dayClose.countedBalanceCents === null
                ? null
                : dayClose.countedBalanceCents - revisedExpectedBalanceCents,
            originalEntryId: original?.id ?? null,
            reversalEntryId,
            replacementEntryId: replacement?.id ?? null,
          },
        },
        tx
      );
      await this.dayCloseRepo.createReviewRequirements(
        tenantId,
        workspaceId,
        revision.id,
        downstreamCloses.map((close) => close.id),
        tx
      );
      for (const documentId of input.attachmentIds) {
        await this.attachmentRepo.createAttachment(
          {
            tenantId,
            workspaceId,
            entryId: correctionEntry.id,
            documentId,
            uploadedByUserId: ctx.userId ?? null,
          },
          tx
        );
      }
      await this.registerRepo.setCurrentBalance(
        tenantId,
        workspaceId,
        register.id,
        runningBalance,
        tx
      );
      await this.audit.log(
        {
          tenantId,
          userId: ctx.userId ?? "system",
          action: "cash.closed_day.corrected",
          entityType: "CashDayCloseRevision",
          entityId: revision.id,
          metadata: {
            registerId: register.id,
            dayKey: input.dayKey,
            correctionEntryId: correctionEntry.id,
            originalEntryId: original?.id ?? null,
            reversalEntryId,
            replacementEntryId: replacement?.id ?? null,
            correctionType: input.correctionType,
            reason: input.reason,
            downstreamCloseIds: downstreamCloses.map((close) => close.id),
          },
        },
        tx
      );
      await this.outbox.enqueue(
        {
          tenantId,
          eventType: "cash.closed-day.correction-created",
          payload: {
            revisionId: revision.id,
            entryId: correctionEntry.id,
            originalEntryId: original?.id ?? null,
            reversalEntryId,
            replacementEntryId: replacement?.id ?? null,
            registerId: register.id,
            dayKey: input.dayKey,
            downstreamReviewRequired: downstreamCloses.length > 0,
          },
          correlationId: ctx.correlationId,
        },
        tx
      );
      await this.billingAccess.recordUsage(
        tenantId,
        CashManagementProductKey,
        CashManagementBillingMetricKeys.entries,
        entriesNeeded,
        tx
      );
      return { entry: correctionEntry, revision };
    });

    const response: Response = {
      entry: toEntryDto(result.entry),
      revision: {
        id: result.revision.id,
        revisionNo: result.revision.revisionNo,
        correctionType: result.revision.correctionType,
        reason: result.revision.reason,
        occurredAt: result.revision.occurredAt.toISOString(),
        recordedAt: result.revision.recordedAt.toISOString(),
        downstreamReviewRequired: downstreamCloses.length > 0,
      },
    };
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
