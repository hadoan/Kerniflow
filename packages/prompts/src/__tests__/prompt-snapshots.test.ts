import { describe, expect, it } from "vitest";
import { PromptRegistry } from "../registry/prompt-registry";
import { StaticPromptProvider } from "../providers/static/static-prompt-provider";
import { promptDefinitions } from "../prompts";

const registry = new PromptRegistry([new StaticPromptProvider(promptDefinitions)]);

const context = { environment: "dev", workspaceKind: "COMPANY", tenantId: "tenant-1" };

describe("prompt snapshots", () => {
  it("renders copilot system prompt", () => {
    const result = registry.render("copilot.system", context, {
      CUSTOMER_SEARCH_TOOL: "customer_search",
      INVOICE_CREATE_FROM_CUSTOMER_TOOL: "invoice_create_from_customer",
      COLLECT_INPUTS_TOOL: "collect_inputs",
      LANGUAGE: "vi",
    });
    expect(result.content).toMatchInlineSnapshot(
      `
      "You are the Corely Copilot. Your job is to help users complete ERP tasks safely and correctly using Corely tools.

      The user's working language code is vi. Write user-facing field labels, help text, option labels, and placeholders in that language.

      You can create draft expenses from receipt details when requested by using the expense_create_draft tool.

      ## Non-negotiable rules
      1) Never fabricate or guess internal business data (customers, invoices, prices, addresses, tax IDs, payment status). If it is not in tool output, you do not know it.
      2) For any internal lookup (customers, invoices, expenses, products, payments, taxes), you MUST use tools. Do not assume values from user intent.
      3) When structured inputs are required, you MUST use collect_inputs. Do not ask for missing required fields in plain text or as a conversational checklist.
         - For create/update actions such as cash entries, expenses, invoices, or similar structured ERP records, if required fields are missing, immediately call collect_inputs instead of replying with a question list.

      ## Customer lookup and resolution
      4) If the user asks to search/list/look up customers, ALWAYS call customer_search.
         - If the user provides no query, call it with an empty/undefined query to list customers.
      5) If the user wants to create/draft an invoice for a named customer, ALWAYS resolve the customer first:
         - Call invoice_create_from_customer using the strongest identifier you have (customer ID/email > exact name > partial name).
         - Do NOT call collect_inputs for invoice fields until customer resolution is done, unless the user is explicitly providing missing identifiers needed to resolve the customer.

      ### Ambiguous or missing customer
      6) If the customer cannot be uniquely resolved:
         - If multiple matches: call collect_inputs with a select field listing the candidates (label includes name + email/company ID if available).
         - If no matches: call collect_inputs to request additional identifiers (e.g., email, VAT ID, address) or confirm spelling. Do not invent a new customer unless a dedicated "create customer" tool exists.

      ## Invoice creation flow
      7) For invoice draft/create requests:
         - Call invoice_create_from_customer first.
         - If the tool returns code MISSING_INPUTS, you MUST immediately call collect_inputs using the tool's requested fields.
         - After collect_inputs returns values, you MUST call invoice_create_from_customer again with those values to complete the draft.

      8) If the user asks for "this month", infer the billing period based on the user's locale/timezone settings already available to the system; if the period is still ambiguous, request it via collect_inputs (date range).

      ## Designing collect_inputs fields
      9) Use the most specific type:
         - date for YYYY-MM-DD
         - datetime for date+time
         - number for amounts/quantities
         - boolean for yes/no
         - select for enumerations or disambiguation (e.g., customer choice, payment terms)
         - textarea for long free-form descriptions
      10) Never use type text for dates/datetimes. Do not use regex patterns for those fields.
      11) For every field, include:
         - clear label and short help text (what and why)
         - labels/help text/options/placeholders written in the user's working language (vi)
         - sensible defaults when safe (e.g., invoice date = today; due date = +14 days if that is a product default; otherwise ask)
         - required=true only when genuinely required to proceed

      ## Tool approval (if applicable)
      12) If a tool action requires approval:
         - Present the approval request succinctly (what will happen + key consequences).
         - Wait for approval response part; do not proceed without explicit approval.
         - After approval/denial, continue the workflow using the latest approval response + server-side history.

      13) For classes WRITE actions (\`classes_markSessionDone\`, \`classes_bulkUpsertAttendance\`):
         - Treat these as high-risk state changes.
         - Ask for explicit yes/no confirmation tied to the exact session and intended change before executing.
         - If user intent is ambiguous, ask a clarifying question first; do not execute.

      ## Output quality
      14) When returning an invoice draft, summarize:
         - customer, billing period, line items, subtotal, tax, total, due date, payment method (if known)
         - clearly label assumptions and unknowns; request unknown required fields via collect_inputs.
      "
    `
    );
  });

  it("renders collect_inputs description with user language guidance", () => {
    const result = registry.render("copilot.collect_inputs.description", context, {
      LANGUAGE: "vi",
    });

    expect(result.content).toMatchInlineSnapshot(
      `"Ask the user for structured inputs (form fields) before proceeding. The user's working language code is vi. Title, labels, help text, option labels, and placeholders in the form must be written in that language. Supported field types: text, number, select, textarea, date (YYYY-MM-DD), datetime (date+time), boolean (yes/no), repeater (rows of nested fields). Use the most specific type. Example: dueDate should be type date with placeholder YYYY-MM-DD (not text with regex)."`
    );
  });

  it("does not re-ask known cash-day facts after same-fund storage confirmation", () => {
    const result = registry.render("cash.copilot.system", context, {
      LANGUAGE: "vi",
      REQUEST_CLARIFICATION_TOOL: "request_cash_clarification",
    });

    expect(result.content).toContain(
      "Do not call ACTUAL_CLOSING_CASH or collect_inputs for businessDate or actualClosingCashCents"
    );
    expect(result.promptVersion).toBe("v3");
    expect(result.content).toContain(
      "Call at most one request_cash_clarification per assistant response"
    );
    expect(result.content).toContain("SALE_CASH=12960 cents, actualClosingCashCents=12960");
    expect(result.content).toContain("Ask no additional date, payment-method, or cash-count form");
    expect(result.content).toContain(
      "the unaccented Vietnamese 'xac nhan'—call confirm_cash_day_draft immediately"
    );
  });

  it("renders approvals policy prompt", () => {
    const result = registry.render("approvals.suggest_policy", context, {
      ACTION_KEY: "sales.create-invoice",
      DESCRIPTION: "Issue invoice",
      SAMPLE_PAYLOAD: '{"amountCents":12000}',
    });
    expect(result.content).toMatchInlineSnapshot(
      `"Suggest an approval policy for the following action.\n\nAction key: sales.create-invoice\nDescription: Issue invoice\nSample payload:\n<<SAMPLE_PAYLOAD>>\n{"amountCents":12000}\n<<END:SAMPLE_PAYLOAD>>\n\nReturn steps and rules that indicate when approval is required."`
    );
  });

  it("renders CRM follow-up prompt", () => {
    const result = registry.render("crm.follow_up_suggestions", context, {
      DEAL_TITLE: "Website redesign",
      DEAL_STAGE: "proposal",
      DEAL_AMOUNT: "EUR 12000",
      DEAL_EXPECTED_CLOSE: "2025-02-01",
      DEAL_NOTES: "Asked about timeline",
      EXISTING_ACTIVITIES: "- CALL: Intro call",
      CONTEXT_SECTION: "Recent Context:\nCustomer asked for revised scope.",
    });

    expect(result.content).toMatchInlineSnapshot(
      `"Generate 2-4 suggested follow-up activities for this deal:\n\nDeal: Website redesign\nStage: proposal\nAmount: EUR 12000\nExpected Close: 2025-02-01\nNotes: Asked about timeline\n\nExisting Activities:\n<<EXISTING_ACTIVITIES>>\n- CALL: Intro call\n<<END:EXISTING_ACTIVITIES>>\n\n<<CONTEXT_SECTION>>\nRecent Context:\nCustomer asked for revised scope.\n<<END:CONTEXT_SECTION>>\n\nSuggest practical next steps to move this deal forward."`
    );
  });
});
