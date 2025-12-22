import { describe, expect, it } from "vitest";
import { RoundingPolicy } from "../rounding.policy";

describe("RoundingPolicy", () => {
  describe("roundCents", () => {
    it("rounds half up for positive values", () => {
      expect(RoundingPolicy.roundCents(10.5)).toBe(11);
      expect(RoundingPolicy.roundCents(10.4)).toBe(10);
      expect(RoundingPolicy.roundCents(10.6)).toBe(11);
    });

    it("rounds half up for negative values", () => {
      expect(RoundingPolicy.roundCents(-10.5)).toBe(-10);
      expect(RoundingPolicy.roundCents(-10.4)).toBe(-10);
      expect(RoundingPolicy.roundCents(-10.6)).toBe(-11);
    });

    it("handles exact integers", () => {
      expect(RoundingPolicy.roundCents(100)).toBe(100);
      expect(RoundingPolicy.roundCents(0)).toBe(0);
      expect(RoundingPolicy.roundCents(-100)).toBe(-100);
    });
  });

  describe("calculateTaxCents", () => {
    it("calculates 19% VAT correctly", () => {
      // 19% = 1900 bps
      const netAmount = 10000; // €100.00
      const rateBps = 1900;
      const tax = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      expect(tax).toBe(1900); // €19.00
    });

    it("calculates 7% reduced VAT correctly", () => {
      // 7% = 700 bps
      const netAmount = 10000; // €100.00
      const rateBps = 700;
      const tax = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      expect(tax).toBe(700); // €7.00
    });

    it("rounds tax amounts correctly", () => {
      // Edge case: 19% of €10.53 = €2.0007 -> should round to €2.00
      const netAmount = 1053; // €10.53
      const rateBps = 1900;
      const tax = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      expect(tax).toBe(200); // €2.00 (not 201)
    });

    it("handles zero rate", () => {
      const netAmount = 10000;
      const rateBps = 0;
      const tax = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      expect(tax).toBe(0);
    });

    it("handles zero amount", () => {
      const netAmount = 0;
      const rateBps = 1900;
      const tax = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      expect(tax).toBe(0);
    });

    it("is deterministic for same inputs", () => {
      const netAmount = 12345;
      const rateBps = 1900;
      const tax1 = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      const tax2 = RoundingPolicy.calculateTaxCents(netAmount, rateBps);
      expect(tax1).toBe(tax2);
    });
  });

  describe("applyRoundingMode", () => {
    it("PER_LINE mode rounds each line independently", () => {
      const lineTaxes = [100.4, 100.5, 100.6];
      const result = RoundingPolicy.applyRoundingMode("PER_LINE", lineTaxes);

      expect(result.lineRounded).toEqual([100, 101, 101]);
      expect(result.roundedTotal).toBe(302); // Sum of rounded lines
    });

    it("PER_DOCUMENT mode sums then rounds", () => {
      const lineTaxes = [100.4, 100.4, 100.4];
      // Sum = 301.2 -> rounds to 301
      const result = RoundingPolicy.applyRoundingMode("PER_DOCUMENT", lineTaxes);

      // In v1, we still round lines individually but show the total
      expect(result.roundedTotal).toBe(301);
    });

    it("handles empty line array", () => {
      const result = RoundingPolicy.applyRoundingMode("PER_LINE", []);
      expect(result.lineRounded).toEqual([]);
      expect(result.roundedTotal).toBe(0);
    });

    it("handles single line", () => {
      const result = RoundingPolicy.applyRoundingMode("PER_LINE", [1900.5]);
      expect(result.lineRounded).toEqual([1901]);
      expect(result.roundedTotal).toBe(1901);
    });
  });
});
