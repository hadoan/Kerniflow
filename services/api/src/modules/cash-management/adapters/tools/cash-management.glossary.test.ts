import { describe, expect, it } from "vitest";
import {
  normalizeTerm,
  levenshtein,
  resolveGlossaryEntry,
  fuzzyResolveGlossaryEntry,
} from "./cash-management.glossary";

describe("cash-management.glossary", () => {
  describe("normalizeTerm", () => {
    it("strips Vietnamese diacritics and converts to lowercase", () => {
      expect(normalizeTerm("Số Dư Đầu Ngày")).toBe("so du dau ngay");
      expect(normalizeTerm("Nộp Tiền Cá Nhân")).toBe("nop tien ca nhan");
      expect(normalizeTerm("   Chênh Lệch   ")).toBe("chenh lech");
    });
  });

  describe("levenshtein distance", () => {
    it("calculates edit distance correctly", () => {
      expect(levenshtein("opening", "opning")).toBe(1);
      expect(levenshtein("opening balance", "opneing balance")).toBe(2);
      expect(levenshtein("difference", "diffrence")).toBe(1);
    });
  });

  describe("resolveGlossaryEntry (Layer 1: Exact)", () => {
    it("resolves exact aliases across languages", () => {
      const matchEn = resolveGlossaryEntry("opening balance", "en");
      expect(matchEn?.canonicalKey).toBe("opening_balance");
      expect(matchEn?.matchType).toBe("exact");
      expect(matchEn?.confidence).toBe(1.0);
      expect(matchEn?.content.title).toBe("Opening balance");

      const matchDe = resolveGlossaryEntry("anfangsbestand", "de");
      expect(matchDe?.canonicalKey).toBe("opening_balance");

      const matchVi = resolveGlossaryEntry("số dư đầu ngày", "vi");
      expect(matchVi?.canonicalKey).toBe("opening_balance");
      expect(matchVi?.content.title).toBe("Số dư đầu ngày");
    });

    it("returns undefined for unknown terms", () => {
      expect(resolveGlossaryEntry("random non existing term", "en")).toBeUndefined();
    });
  });

  describe("fuzzyResolveGlossaryEntry (Layer 2: Levenshtein)", () => {
    it("resolves terms with typos using length-aware Levenshtein distance", () => {
      const match = fuzzyResolveGlossaryEntry("opning balance", "en");
      expect(match?.canonicalKey).toBe("opening_balance");
      expect(match?.matchType).toBe("fuzzy");
      expect(match?.confidence).toBeGreaterThan(0.8);

      expect(fuzzyResolveGlossaryEntry("diffrence", "en")?.canonicalKey).toBe("difference");
    });

    it("returns undefined for short terms (less than 3 characters)", () => {
      expect(fuzzyResolveGlossaryEntry("ab", "en")).toBeUndefined();
    });

    it("returns undefined for completely unrelated terms (false positives)", () => {
      expect(fuzzyResolveGlossaryEntry("xyzabc12345", "en")).toBeUndefined();
    });

    it("does not match when edit distance is too large relative to length", () => {
      // "priv" (len 4) vs "private deposit" (len 15) -> dist 11.
      // Fails length-aware check.
      expect(fuzzyResolveGlossaryEntry("priv", "en")).toBeUndefined();

      // "private" (len 7, max dist 2) vs "private deposit" (len 15) -> dist 8.
      expect(fuzzyResolveGlossaryEntry("private", "en")).toBeUndefined();
    });
  });
});
