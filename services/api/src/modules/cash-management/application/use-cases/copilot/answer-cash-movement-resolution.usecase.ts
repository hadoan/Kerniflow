import { Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
  UseCaseContext,
  ok,
  err,
  isErr,
  Result,
  UseCaseError,
} from "@corely/kernel";
import { PrismaService } from "@corely/data";
import { ResolveCashMovementNextActionUseCase } from "./resolve-cash-movement-next-action.usecase";
import { PrepareCashEntryConfirmationUseCase } from "../prepare-cash-entry-confirmation.usecase";
import { AnalyzeCashMovementResult, CashMovementExtraction } from "@corely/contracts";

const sourceChoices: Record<string, CashMovementExtraction["source"]> = {
  STILL_IN_CURRENT_FUND: "CURRENT_REGISTER",
  ALREADY_RECORDED_OUT: "BUSINESS_CASH_UNKNOWN_LOCATION",
  OTHER_REGISTER: "OTHER_CASH_REGISTER",
  PRIVATE_FUNDS: "PRIVATE_CASH",
  OTHER_BANK_ACCOUNT: "BUSINESS_BANK_ACCOUNT",
  NOT_SURE: "UNKNOWN",
};

const destinationChoices: Record<string, CashMovementExtraction["destination"]> = {
  PRIVATE_WITHDRAWAL: "PRIVATE_USE",
  BUSINESS_BANK_DEPOSIT: "BUSINESS_BANK_ACCOUNT",
  GOODS_PURCHASE: "BUSINESS_EXPENSE",
  STILL_IN_DRAWER: "CURRENT_REGISTER",
  OTHER: "UNKNOWN",
};

const paymentMethodChoices: Record<string, CashMovementExtraction["customerPaymentMethod"]> = {
  CASH: "CASH",
  CARD: "CARD",
  MIXED: "MIXED",
};

export type AnswerCashMovementResolutionCommand = {
  resolutionId: string;
  expectedVersion: number;
  answer: { [key: string]: any }; // The UI passes back `{ source: "..." }` or `{ destination: "..." }`
};

@Injectable()
export class AnswerCashMovementResolutionUseCase extends BaseUseCase<
  AnswerCashMovementResolutionCommand,
  { uiResult: AnalyzeCashMovementResult }
> {
  constructor(
    private readonly prisma: PrismaService,
    private readonly resolveNextAction: ResolveCashMovementNextActionUseCase,
    private readonly prepareEntryConfirmation: PrepareCashEntryConfirmationUseCase
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: AnswerCashMovementResolutionCommand,
    ctx: UseCaseContext
  ): Promise<Result<{ uiResult: AnalyzeCashMovementResult }, UseCaseError>> {
    const { resolutionId, expectedVersion, answer } = input;

    // We use a transaction to lock the row and update it idempotently
    return await this.prisma.$transaction(async (tx) => {
      const resolution = await tx.cashMovementResolution.findUnique({
        where: { id: resolutionId },
      });

      if (!resolution) {
        return err(new NotFoundError("Resolution not found", { resolutionId }));
      }

      if (resolution.tenantId !== ctx.tenantId) {
        return err(new UnauthorizedError("Not authorized", { resolutionId }));
      }

      // Idempotency: if it was already answered, just return the computed next state based on the same answer
      // But for simplicity, we assume if it's not PENDING, we just error (or we could store the uiResult on the model!)
      // The user feedback said: "When the same answer is submitted twice: Return the already-produced result... Or 409 Conflict if different"
      // Since we didn't store the final UI Result in DB, let's just do a basic 409 if status is not PENDING
      if (resolution.status !== "PENDING") {
        return err(new ConflictError("Resolution already processed", { resolutionId }));
      }

      if (resolution.version !== expectedVersion) {
        return err(new ConflictError("Version mismatch", { resolutionId }));
      }

      // 1. Optimistic Concurrency Control: Ensure no other request has processed this resolution
      const updateResult = await tx.cashMovementResolution.updateMany({
        where: {
          id: resolutionId,
          version: expectedVersion,
          status: "PENDING",
        },
        data: {
          status: "CONSUMED",
          consumedAt: new Date(),
          answerJson: answer,
          version: { increment: 1 },
        },
      });

      if (updateResult.count === 0) {
        return err(new ConflictError("Resolution was modified concurrently", { resolutionId }));
      }

      // Merge the answer into the original extraction
      const originalExtraction = resolution.extractionJson as any as CashMovementExtraction;

      const updatedExtraction = { ...originalExtraction };

      const choiceId = typeof answer.choiceId === "string" ? answer.choiceId : undefined;

      // Accept explicit facts for backwards compatibility, while mapping the server-defined
      // choice values supplied by the clarification card.
      if (answer.source) {
        updatedExtraction.source = answer.source as any;
      } else if (choiceId && sourceChoices[choiceId]) {
        updatedExtraction.source = sourceChoices[choiceId];
      }
      if (answer.destination) {
        updatedExtraction.destination = answer.destination as any;
      } else if (choiceId && destinationChoices[choiceId]) {
        updatedExtraction.destination = destinationChoices[choiceId];
      }
      if (answer.paymentMethod) {
        updatedExtraction.customerPaymentMethod = answer.paymentMethod as any;
      } else if (choiceId && paymentMethodChoices[choiceId]) {
        updatedExtraction.customerPaymentMethod = paymentMethodChoices[choiceId];
      }

      // Run the resolver again with the new extraction
      const nextActionResult = await this.resolveNextAction.execute(
        {
          extraction: updatedExtraction,
          intent: resolution.intent,
        },
        ctx
      );

      if (isErr(nextActionResult)) {
        return err(nextActionResult.error);
      }

      const { resolution: nextResolution, resolutionId: nextResolutionId } = nextActionResult.value;

      // Map to UI result
      let uiResult: AnalyzeCashMovementResult;
      switch (nextResolution.kind) {
        case "REQUEST_CLARIFICATION":
          uiResult = {
            kind: "REQUEST_CLARIFICATION",
            resolutionId: nextResolutionId!,
            clarification: {
              type: nextResolution.clarificationType,
              question: "Bitte klären Sie diese Information (TODO: Localization)",
              choices:
                nextResolution.allowedChoiceValues?.map((value: string) => ({
                  value,
                  label: value,
                })) || [],
            },
          };
          break;

        case "PREPARE_ENTRY": {
          if (!updatedExtraction.amountCents || !updatedExtraction.businessDate) {
            return err(
              new ValidationError("Amount and business date are required to prepare the entry")
            );
          }

          const cashWorkspace = await tx.cashAssistantWorkspace.findUnique({
            where: { conversationId: resolution.conversationId },
            select: { tenantId: true, workspaceId: true, registerId: true },
          });
          if (
            !cashWorkspace ||
            cashWorkspace.tenantId !== ctx.tenantId ||
            cashWorkspace.workspaceId !== ctx.workspaceId ||
            !cashWorkspace.registerId
          ) {
            return err(new ValidationError("Cash register context is required"));
          }

          const prepared = await this.prepareEntryConfirmation.execute(
            {
              registerId: cashWorkspace.registerId,
              businessDate: updatedExtraction.businessDate,
              movementType: nextResolution.entryType,
              amountCents: updatedExtraction.amountCents,
              description: "Bank deposit",
              evidenceRequirement: null,
            },
            { ...ctx, correlationId: resolution.conversationId }
          );
          if (isErr(prepared)) {
            return err(prepared.error);
          }

          uiResult = {
            kind: "PREPARE_ENTRY_CONFIRMATION",
            confirmation: {
              id: prepared.value.confirmation.id,
              registerId: prepared.value.confirmation.registerId,
              status: prepared.value.confirmation.status,
              entryType: nextResolution.entryType,
              direction: nextResolution.direction,
              amountCents: updatedExtraction.amountCents,
              businessDate: updatedExtraction.businessDate,
              description: "Geplanter Kassenbucheintrag",
              candidatePayload: {
                ...prepared.value.confirmation.candidatePayload,
                direction: nextResolution.direction,
              },
            },
          };
          break;
        }

        case "NOT_A_CASHBOOK_ENTRY":
          uiResult = {
            kind: "NOT_A_CASHBOOK_ENTRY",
            reason: nextResolution.reason,
            explanation: "Dies ist kein Kassenbucheintrag.",
          };
          break;

        case "SELECT_CASH_REGISTER":
          uiResult = {
            kind: "SELECT_REGISTER",
            resolutionId: nextResolutionId!,
            registerSelector: {},
          };
          break;
      }

      // The resolution is already marked as CONSUMED via updateMany at the beginning of the transaction.
      // We don't need to update it again here.

      return ok({ uiResult });
    });
  }
}
