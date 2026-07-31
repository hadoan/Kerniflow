import { describe, expect, it, vi } from "vitest";
import { enrichCashMovementExtraction } from "./cash-movement-fallback-extractor";

describe("enrichCashMovementExtraction", () => {
  it("recovers the standard Vietnamese business-bank deposit facts", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-31T12:00:00Z"));

    const result = enrichCashMovementExtraction(
      { explicitFacts: [] },
      undefined,
      "Ngày 29.7 e có bỏ 400€ vào Bankkonto Geschäft"
    );

    expect(result).toEqual({
      amountCents: 40000,
      businessDate: "2026-07-29",
      destination: "BUSINESS_BANK_ACCOUNT",
      explicitFacts: [],
      mentionedAsSales: false,
      customerPaymentMethod: undefined,
    });

    vi.useRealTimers();
  });
});
