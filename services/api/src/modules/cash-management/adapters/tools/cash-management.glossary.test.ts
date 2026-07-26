import { describe, expect, it } from "vitest";
import {
  glossary,
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
      expect(resolveGlossaryEntry("opening balance")).toBe(glossary.opening_balance);
      expect(resolveGlossaryEntry("anfangsbestand")).toBe(glossary.opening_balance);
      expect(resolveGlossaryEntry("số dư đầu ngày")).toBe(glossary.opening_balance);
      expect(resolveGlossaryEntry("so du dau ngay")).toBe(glossary.opening_balance);
    });

    it("returns undefined for unknown terms", () => {
      expect(resolveGlossaryEntry("random non existing term")).toBeUndefined();
    });
  });

  describe("fuzzyResolveGlossaryEntry (Layer 2: Substring & Levenshtein)", () => {
    it("resolves terms with typos using Levenshtein distance", () => {
      expect(fuzzyResolveGlossaryEntry("opning balance")).toBe(glossary.opening_balance);
      expect(fuzzyResolveGlossaryEntry("diffrence")).toBe(glossary.difference);
    });

    it("resolves phrases containing known aliases (substring)", () => {
      expect(fuzzyResolveGlossaryEntry("what is opening balance?")).toBe(glossary.opening_balance);
      expect(fuzzyResolveGlossaryEntry("giải thích số dư đầu ngày")).toBe(glossary.opening_balance);
    });

    it("returns undefined for completely unrelated terms", () => {
      expect(fuzzyResolveGlossaryEntry("xyzabc12345")).toBeUndefined();
    });
  });
});
