import { Inject, Injectable } from "@nestjs/common";
import {
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
import { normalizeCashEntryInput } from "../../domain/cash-entry-rules";
import { resolveCashEntryTax } from "../../domain/cash-entry-tax";
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
    if (!tenantId || !workspaceId) {throw new ValidationError("Missing tenant/workspace context");}

    const cached = await getIdempotentBody<Response>({
      idempotency: this.idempotencyStore,
      tenantId,
      actionKey: ACTION_KEY,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {return ok(cached);}

    const register = await this.registerRepo.findRegisterById(
      tenantId,
      workspaceId,
      input.registerId
    );
    if (!register)
      {throw new NotFoundError(
        "Cash register not found",
        undefined,
        "CashManagement:RegisterNotFound"
      );}
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

    const billingState = await loadCashBillingState(this.billingAccess, tenantId);
    const entriesUsed = await this.entryRepo.countEntriesForPeriod(
      tenantId,
      billingState.periodStart,
      billingState.periodEnd
    );
    const limit = getCashBillingNumber(billingState.entitlements, "maxEntriesPerMonth");
    if (limit !== null && entriesUsed >= limit) {
      throw new ForbiddenError(
        "Your current plan has reached the monthly cash entry limit",
        { limit, used: entriesUsed },
        "CashManagement:EntryLimitReached"
      );
    }

    await Promise.all(
      input.attachmentIds.map((documentId) =>
        this.documentsPort.assertDocumentAccessible(tenantId, documentId)
      )
    );

    const normalized = normalizeCashEntryInput({
      registerId: register.id,
      type: input.entry.type,
      description: input.entry.description,
      grossAmountCents: input.entry.grossAmountCents,
      occurredAt: input.occurredAt,
      dayKey: input.dayKey,
      tax: input.entry.tax,
    });
    const taxSnapshot = await resolveCashEntryTax({
      tenantId: workspaceId,
      occurredAt: normalized.occurredAt,
      entryType: normalized.type,
      grossAmountCents: normalized.amountCents,
      input: {
        registerId: register.id,
        type: input.entry.type,
        description: input.entry.description,
        grossAmountCents: input.entry.grossAmountCents,
        tax: input.entry.tax,
      },
      taxProfileRepo: this.taxProfileRepo,
      taxCodeRepo: this.taxCodeRepo,
      taxRateRepo: this.taxRateRepo,
    });
    const nextBalance = CashBalanceCalculator.applyDelta(register.currentBalanceCents, {
      direction: normalized.direction,
      amountCents: normalized.amountCents,
    });
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

    const result = await this.unitOfWork.withinTransaction(async (tx) => {
      const entryNo = await this.entryRepo.nextEntryNo(tenantId, workspaceId, register.id, tx);
      const entry = await this.entryRepo.createEntry(
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
        },
        tx
      );
      const revisedExpectedBalanceCents = CashBalanceCalculator.applyDelta(
        dayClose.expectedBalanceCents,
        {
          direction: normalized.direction,
          amountCents: normalized.amountCents,
        }
      );
      const revision = await this.dayCloseRepo.createRevision(
        {
          tenantId,
          workspaceId,
          registerId: register.id,
          dayCloseId: dayClose.id,
          correctionEntryId: entry.id,
          correctionType: input.correctionType,
          reason: input.reason,
          occurredAt: normalized.occurredAt,
          createdByUserId: ctx.userId ?? "system",
          originalSnapshot: {
            expectedBalanceCents: dayClose.expectedBalanceCents,
            countedBalanceCents: dayClose.countedBalanceCents,
            differenceCents: dayClose.differenceCents,
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
            entryId: entry.id,
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
        nextBalance,
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
            correctionEntryId: entry.id,
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
            entryId: entry.id,
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
        1,
        tx
      );
      return { entry, revision };
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
