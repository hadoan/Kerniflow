import { describe, it, expect, beforeEach } from "vitest";
import { ResolveCashMovementNextActionUseCase } from "./resolve-cash-movement-next-action.usecase";
import { PrismaService } from "@corely/data";
import { UseCaseContext } from "@corely/kernel";

describe("ResolveCashMovementNextActionUseCase", () => {
  let useCase: ResolveCashMovementNextActionUseCase;
  let mockPrisma: any;
  let ctx: UseCaseContext;

  beforeEach(() => {
    mockPrisma = {
      cashMovementResolution: {
        create: async () => ({}),
      },
    };
    useCase = new ResolveCashMovementNextActionUseCase(mockPrisma as PrismaService);
    ctx = { tenantId: "tenant-1", workspaceId: "workspace-1", userId: "user-1" } as any;
  });

  const testCases = [
    {
      id: "TC1",
      input: {
        amountCents: 1000,
        source: "UNKNOWN",
        destination: "BUSINESS_BANK_ACCOUNT",
        explicitFacts: [],
      },
      expected: { kind: "REQUEST_CLARIFICATION", clarificationType: "MONEY_SOURCE" },
    },
    {
      id: "TC2",
      input: { source: "CURRENT_REGISTER", destination: "BUSINESS_BANK_ACCOUNT" },
      expected: { kind: "PREPARE_ENTRY", entryType: "BANK_DEPOSIT", direction: "OUT" },
    },
    {
      id: "TC3",
      input: { source: "OTHER_CASH_REGISTER", destination: "BUSINESS_BANK_ACCOUNT" },
      expected: { kind: "SELECT_CASH_REGISTER" },
    },
    {
      id: "TC4",
      input: { source: "PRIVATE_CASH", destination: "BUSINESS_BANK_ACCOUNT" },
      expected: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "PRIVATE_FUNDS_DIRECTLY_TO_BANK" },
    },
    {
      id: "TC5",
      input: { source: "PRIVATE_BANK_ACCOUNT", destination: "BUSINESS_BANK_ACCOUNT" },
      expected: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "BANK_TO_BANK_TRANSFER" },
    },
    {
      id: "TC6",
      input: { source: "BUSINESS_BANK_ACCOUNT", destination: "BUSINESS_BANK_ACCOUNT" },
      expected: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "BANK_TO_BANK_TRANSFER" },
    },
    {
      id: "TC7",
      input: { source: "CURRENT_REGISTER", destination: "UNKNOWN" },
      expected: { kind: "REQUEST_CLARIFICATION", clarificationType: "MONEY_DESTINATION" },
    },
    {
      id: "TC8",
      input: { mentionedAsSales: true, customerPaymentMethod: "CASH" },
      expected: { kind: "PREPARE_ENTRY", entryType: "SALE_CASH", direction: "IN" },
    },
    {
      id: "TC9",
      input: { mentionedAsSales: true },
      expected: { kind: "REQUEST_CLARIFICATION", clarificationType: "PAYMENT_METHOD" },
    },
    {
      id: "TC10",
      input: { mentionedAsSales: true, customerPaymentMethod: "CARD" },
      expected: { kind: "NOT_A_CASHBOOK_ENTRY", reason: "CARD_OR_BANK_SALE" },
    },
  ];

  for (const tc of testCases) {
    it(`should resolve ${tc.id} correctly`, async () => {
      const result = await useCase.execute(
        { extraction: tc.input as any, intent: "CASH_MOVEMENT" },
        ctx
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.resolution).toMatchObject(tc.expected);
      }
    });
  }
});
