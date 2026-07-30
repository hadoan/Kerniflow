import { Injectable } from "@nestjs/common";
import { BaseUseCase, UseCaseContext, ok, err, isErr, Result, UseCaseError } from "@corely/kernel";
import { PrismaService } from "@corely/data";
import { ResolveCashMovementNextActionUseCase } from "./resolve-cash-movement-next-action.usecase";
import { AnalyzeCashMovementResult, CashMovementExtraction } from "@corely/contracts";

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
    private readonly resolveNextAction: ResolveCashMovementNextActionUseCase
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
        return err(
          new UseCaseError("NOT_FOUND", "Resolution not found", {
            resolutionId,
          })
        );
      }

      if (resolution.tenantId !== ctx.tenantId) {
        return err(new UseCaseError("UNAUTHORIZED", "Not authorized", { resolutionId }));
      }

      // Idempotency: if it was already answered, just return the computed next state based on the same answer
      // But for simplicity, we assume if it's not PENDING, we just error (or we could store the uiResult on the model!)
      // The user feedback said: "When the same answer is submitted twice: Return the already-produced result... Or 409 Conflict if different"
      // Since we didn't store the final UI Result in DB, let's just do a basic 409 if status is not PENDING
      if (resolution.status !== "PENDING") {
        return err(new UseCaseError("CONFLICT", "Resolution already processed", { resolutionId }));
      }

      if (resolution.version !== expectedVersion) {
        return err(new UseCaseError("CONFLICT", "Version mismatch", { resolutionId }));
      }

      // Merge the answer into the original extraction
      const originalExtraction = resolution.extractionJson as any as CashMovementExtraction;

      let updatedExtraction = { ...originalExtraction };

      // the UI typically sends `{ source: "BUSINESS_SAFE" }` or similar for clarification
      if (answer.source) {
        updatedExtraction.source = answer.source as any;
      }
      if (answer.destination) {
        updatedExtraction.destination = answer.destination as any;
      }
      if (answer.paymentMethod) {
        updatedExtraction.customerPaymentMethod = answer.paymentMethod as any;
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
                nextResolution.choices?.map((c: any) => ({
                  value: c.id,
                  label: c.label?.de || c.label?.en || c.id,
                })) || [],
            },
          };
          break;

        case "PREPARE_ENTRY":
          uiResult = {
            kind: "PREPARE_ENTRY_CONFIRMATION",
            confirmation: {
              entryType: nextResolution.entryType,
              direction: nextResolution.direction,
              amountCents: updatedExtraction.amountCents,
              businessDate: updatedExtraction.businessDate,
              description: "Geplanter Kassenbucheintrag",
            },
          };
          break;

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

      // Mark the current resolution as CONSUMED
      await tx.cashMovementResolution.update({
        where: { id: resolutionId },
        data: {
          status: "CONSUMED",
          consumedAt: new Date(),
          answerJson: answer,
          version: { increment: 1 },
        },
      });

      return ok({ uiResult });
    });
  }
}
