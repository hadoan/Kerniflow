import { describe, expect, it } from "vitest";
import { buildCashManagementTools } from "./cash-management.tools";
import type { CashToolDeps } from "./cash-management.tools";

describe("cash-management tools - explain_cashbook_term", () => {
  const deps = {} as unknown as CashToolDeps;

  it("returns exact match entry from glossary", async () => {
    const tool = buildCashManagementTools(deps).find(
      (item) => item.name === "explain_cashbook_term"
    );
    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      input: { term: "opening balance", locale: "en" },
    });

    expect(result).toEqual({
      ok: true,
      term: "Opening balance",
      title: "Opening balance",
      meaning:
        "The cash amount in the drawer at the start of the day before new entries are recorded.",
      whenToUse: "Use it as the baseline for today's expected closing balance.",
      canonicalKey: "opening_balance",
      matchType: "exact",
      matchedAlias: "opening balance",
      confidence: 1.0,
    });
  });

  it("returns fuzzy match for typos", async () => {
    const tool = buildCashManagementTools(deps).find(
      (item) => item.name === "explain_cashbook_term"
    );
    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      input: { term: "opning balance", locale: "en" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: true,
        term: "Opening balance",
        canonicalKey: "opening_balance",
        matchType: "fuzzy",
      })
    );
    // @ts-expect-error test
    expect(result?.confidence).toBeGreaterThan(0.8);
  });

  it("returns NOT_FOUND failure when term is unknown or ambiguous", async () => {
    const tool = buildCashManagementTools(deps).find(
      (item) => item.name === "explain_cashbook_term"
    );
    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      input: { term: "unknown term completely", locale: "en" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "NOT_FOUND",
      })
    );
  });
});
