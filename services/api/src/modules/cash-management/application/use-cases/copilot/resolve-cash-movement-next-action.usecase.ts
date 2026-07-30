import { Injectable } from "@nestjs/common";
import { BaseUseCase, UseCaseContext, ok, err, Result, UseCaseError } from "@corely/kernel";
import {
  CashMovementExtraction,
  CashMovementResolution,
  CashClarificationType,
  CashClarificationChoiceId,
  CashEntryDirection,
} from "@corely/contracts";
import { PrismaService } from "@corely/data";
import { createId } from "@paralleldrive/cuid2";

export type ResolveCashMovementNextActionCommand = {
  extraction: CashMovementExtraction;
  intent: string;
};

@Injectable()
export class ResolveCashMovementNextActionUseCase extends BaseUseCase<
  ResolveCashMovementNextActionCommand,
  { resolution: CashMovementResolution; resolutionId?: string }
> {
  constructor(private readonly prisma: PrismaService) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ResolveCashMovementNextActionCommand,
    ctx: UseCaseContext
  ): Promise<Result<{ resolution: CashMovementResolution; resolutionId?: string }, UseCaseError>> {
    const { extraction, intent } = input;
    const { source, destination, mentionedAsSales, customerPaymentMethod } = extraction;

    const sType = source || "UNKNOWN";
    const dType = destination || "UNKNOWN";

    // Rule 1: Explicit bank-to-bank transfers or private-to-bank directly
    if (
      dType === "BUSINESS_BANK_ACCOUNT" &&
      (sType === "BUSINESS_BANK_ACCOUNT" || sType === "PRIVATE_BANK_ACCOUNT")
    ) {
      return ok({ resolution: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "BANK_TO_BANK_TRANSFER" } });
    }

    if (dType === "BUSINESS_BANK_ACCOUNT" && sType === "PRIVATE_CASH") {
      return ok({
        resolution: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "PRIVATE_FUNDS_DIRECTLY_TO_BANK" },
      });
    }

    // Rule 2: Bank Deposit source clarification
    if (dType === "BUSINESS_BANK_ACCOUNT" && sType === "UNKNOWN") {
      return ok({
        resolution: {
          kind: "REQUEST_CLARIFICATION",
          clarificationType: "MONEY_SOURCE",
          allowedChoiceValues: [
            "STILL_IN_CURRENT_FUND",
            "ALREADY_RECORDED_OUT",
            "OTHER_REGISTER",
            "PRIVATE_FUNDS",
            "OTHER_BANK_ACCOUNT",
            "NOT_SURE"
          ],
        },
      });
    }

    // Rule 3: Known cash location to bank
    if (dType === "BUSINESS_BANK_ACCOUNT" && sType === "CURRENT_REGISTER") {
      return ok({
        resolution: { kind: "PREPARE_ENTRY", entryType: "BANK_DEPOSIT", direction: "OUT" },
      });
    }

    if (dType === "BUSINESS_BANK_ACCOUNT" && sType === "OTHER_CASH_REGISTER") {
      return ok({ resolution: { kind: "SELECT_CASH_REGISTER" } });
    }

    // Rule 4: Payment Method Clarification (only if sales mentioned and no method provided)
    if (mentionedAsSales && !customerPaymentMethod) {
      return ok({
        resolution: { 
          kind: "REQUEST_CLARIFICATION", 
          clarificationType: "PAYMENT_METHOD",
          allowedChoiceValues: ["CASH", "CARD", "MIXED"] 
        },
      });
    }

    // Rule 5: Non-cash sales (Card / Bank Transfer)
    if (
      mentionedAsSales &&
      (customerPaymentMethod === "CARD" || customerPaymentMethod === "BANK_TRANSFER")
    ) {
      return ok({ resolution: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "CARD_OR_BANK_SALE" } });
    }

    // Default: Return UNKNOWN request clarification or default to PREPARE_ENTRY if enough info
    if (mentionedAsSales && customerPaymentMethod === "CASH") {
      return ok({ resolution: { kind: "PREPARE_ENTRY", entryType: "SALE_CASH", direction: "IN" } });
    }

    if (dType === "CURRENT_REGISTER" && sType === "PRIVATE_CASH") {
      return ok({
        resolution: {
          kind: "PREPARE_ENTRY",
          entryType: "OWNER_DEPOSIT",
          direction: CashEntryDirection.IN,
        },
      });
    }

    // Default error/fallback state for untested paths, prompt will probably ask for general clarification
    let resolution: CashMovementResolution = {
      kind: "REQUEST_CLARIFICATION",
      clarificationType: "MONEY_DESTINATION",
      allowedChoiceValues: [
        "PRIVATE_WITHDRAWAL",
        "BUSINESS_BANK_DEPOSIT",
        "GOODS_PURCHASE",
        "STILL_IN_DRAWER",
        "OTHER"
      ]
    };

    if (dType === "UNKNOWN" && sType === "CURRENT_REGISTER") {
      resolution = { 
        kind: "REQUEST_CLARIFICATION", 
        clarificationType: "MONEY_DESTINATION",
        allowedChoiceValues: [
          "PRIVATE_WITHDRAWAL",
          "BUSINESS_BANK_DEPOSIT",
          "GOODS_PURCHASE",
          "STILL_IN_DRAWER",
          "OTHER"
        ]
      };
    }

    // Process the final decision (some returns above bypassed persistence for NOT_A_CASHBOOK_ENTRY or PREPARE_ENTRY)
    return this.persistAndReturn(resolution, input, ctx);
  }

  private async persistAndReturn(
    resolution: CashMovementResolution,
    input: ResolveCashMovementNextActionCommand,
    ctx: UseCaseContext
  ): Promise<Result<{ resolution: CashMovementResolution; resolutionId?: string }, UseCaseError>> {
    if (resolution.kind !== "REQUEST_CLARIFICATION" && resolution.kind !== "SELECT_CASH_REGISTER") {
      return ok({ resolution });
    }

    const resolutionId = createId();
    await this.prisma.cashMovementResolution.create({
      data: {
        id: resolutionId,
        tenantId: ctx.tenantId,
        workspaceId: ctx.workspaceId || "UNKNOWN",
        conversationId: ctx.workspaceId || "UNKNOWN", // typically workspace is conversation
        intent: input.intent || "UNKNOWN",
        extractionJson: input.extraction as any,
        status: "PENDING",
        version: 1,
      },
    });

    return ok({ resolution, resolutionId });
  }
}
