import { describe, expect, it, vi } from "vitest";
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
      source: "glossary",
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
        source: "glossary",
      })
    );
  });

  it("uses LLM fallback with PromptRegistry when provided", async () => {
    const generateTextMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        title: "Custom Term",
        meaning: "Meaning from LLM",
        whenToUse: "When to use from LLM",
      })
    );
    const renderMock = vi.fn().mockReturnValue("Rendered System Prompt");

    const depsWithAiAndPrompt = {
      ...deps,
      aiText: { generateText: generateTextMock },
      promptRegistry: { render: renderMock } as any,
    };

    const tool = buildCashManagementTools(depsWithAiAndPrompt).find(
      (item) => item.name === "explain_cashbook_term"
    );
    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      input: { term: "unknown custom term", locale: "vi" },
    });

    expect(renderMock).toHaveBeenCalledWith(
      "cash-management.explain-term.system",
      {},
      {
        LANG_LABEL: "Vietnamese",
        VIETNAMESE_INSTRUCTION: "Use proper Vietnamese with full diacritics (tiếng Việt có dấu).",
      }
    );
    expect(generateTextMock).toHaveBeenCalledWith(
      expect.objectContaining({
        systemPrompt: "Rendered System Prompt",
      })
    );
    expect(result).toEqual({
      ok: true,
      term: "Custom Term",
      title: "Custom Term",
      meaning: "Meaning from LLM",
      whenToUse: "When to use from LLM",
      source: "llm",
    });
  });

  it("uses LLM fallback when term is unknown and aiText is provided", async () => {
    const generateTextMock = vi.fn().mockResolvedValue(
      JSON.stringify({
        title: "Custom Term",
        meaning: "Meaning from LLM",
        whenToUse: "When to use from LLM",
      })
    );

    const depsWithAi = {
      ...deps,
      aiText: { generateText: generateTextMock },
    };

    const tool = buildCashManagementTools(depsWithAi).find(
      (item) => item.name === "explain_cashbook_term"
    );
    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      input: { term: "unknown custom term", locale: "vi" },
    });

    expect(generateTextMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      term: "Custom Term",
      title: "Custom Term",
      meaning: "Meaning from LLM",
      whenToUse: "When to use from LLM",
      source: "llm",
    });
  });

  it("returns NOT_FOUND failure when LLM is unavailable or fails to generate valid result", async () => {
    const tool = buildCashManagementTools(deps).find(
      (item) => item.name === "explain_cashbook_term"
    );
    const result = await tool?.execute?.({
      tenantId: "tenant-1",
      workspaceId: "ws-1",
      userId: "user-1",
      input: { term: "unknown term without llm", locale: "en" },
    });

    expect(result).toEqual(
      expect.objectContaining({
        ok: false,
        code: "NOT_FOUND",
      })
    );
  });
});
