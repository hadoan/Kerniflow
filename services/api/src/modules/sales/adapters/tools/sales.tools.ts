import {
  SalesCreateQuoteFromTextInputSchema,
  SalesGenerateLineItemsInputSchema,
  SalesPriceAssistInputSchema,
  SalesSummarizeDealOrQuoteInputSchema,
  SalesDraftFollowUpMessageInputSchema,
  SalesDetectStalledQuotesInputSchema,
  SalesExplainPostingInputSchema,
} from "@corely/contracts";
import type {
  QuoteDraftProposalCard,
  LineItemsProposalCard,
  PricingSuggestionCard,
  SalesSummaryCard,
  MessageDraftCard,
  StalledQuotesCard,
  PostingExplanationCard,
} from "@corely/contracts";
import { type DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type SalesApplication } from "../../application/sales.application";

const validationError = (issues: unknown) => ({
  ok: false,
  code: "VALIDATION_ERROR",
  message: "Invalid input for tool call",
  details: issues,
});

const buildCtx = (tenantId: string, userId: string, toolCallId?: string, runId?: string) => ({
  tenantId,
  userId,
  correlationId: toolCallId ?? runId,
  requestId: toolCallId,
});

export const buildSalesTools = (app: SalesApplication): DomainToolPort[] => [
  {
    name: "sales_createQuoteFromText",
    description: "Draft a sales quote proposal from free-form text.",
    kind: "server",
    inputSchema: SalesCreateQuoteFromTextInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = SalesCreateQuoteFromTextInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const proposal: QuoteDraftProposalCard = {
        ok: true,
        proposal: {
          customerPartyId: parsed.data.customerPartyId,
          paymentTerms: parsed.data.paymentTerms,
          lineItems: [
            {
              description: parsed.data.userText,
              quantity: 1,
              unitPriceCents: 0,
            },
          ],
          missingFields: ["Confirm unit price", "Confirm customer"],
        },
        confidence: 0.4,
        rationale:
          "Draft generated from the provided description. Please confirm prices and customer details.",
        provenance: {
          sourceText: parsed.data.userText,
          extractedFields: ["description"],
          referencedEntities: [],
        },
      };
      return proposal;
    },
  },
  {
    name: "sales_generateLineItems",
    description: "Suggest line items for a sales scope.",
    kind: "server",
    inputSchema: SalesGenerateLineItemsInputSchema,
    execute: async ({ input }) => {
      const parsed = SalesGenerateLineItemsInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const card: LineItemsProposalCard = {
        ok: true,
        proposal: {
          lineItems: [
            {
              description: parsed.data.goalText,
              quantity: 1,
              unitPriceCents: parsed.data.budgetCents ?? 0,
            },
          ],
        },
        confidence: 0.35,
        rationale:
          "Drafted a simple line item based on the goal. Please refine quantities and pricing.",
        provenance: {
          sourceText: parsed.data.goalText,
          extractedFields: ["scope"],
          referencedEntities: [],
        },
      };
      return card;
    },
  },
  {
    name: "sales_priceAssist",
    description: "Suggest pricing packages and margin targets.",
    kind: "server",
    inputSchema: SalesPriceAssistInputSchema,
    execute: async ({ input }) => {
      const parsed = SalesPriceAssistInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const card: PricingSuggestionCard = {
        ok: true,
        suggestions: [
          {
            label: "Standard",
            totalCents: 0,
            notes: "Set based on scope; adjust for margin target.",
            marginPercent: parsed.data.targetMarginPercent,
          },
        ],
        confidence: 0.3,
        rationale:
          "Provide a baseline package; refine with historical pricing for higher confidence.",
        provenance: {
          sourceText: parsed.data.scope,
          extractedFields: ["scope"],
          referencedEntities: [],
        },
      };
      return card;
    },
  },
  {
    name: "sales_summarizeDealOrQuote",
    description: "Summarize a quote or deal with risks and next steps.",
    kind: "server",
    inputSchema: SalesSummarizeDealOrQuoteInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = SalesSummarizeDealOrQuoteInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      if (parsed.data.quoteId) {
        const result = await app.getQuote.execute(
          { quoteId: parsed.data.quoteId },
          buildCtx(tenantId, userId, toolCallId, runId)
        );
        if ("error" in result) {
          return {
            ok: false,
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
          };
        }
        const card: SalesSummaryCard = {
          ok: true,
          summary: {
            summary: `Quote ${result.value.quote.number ?? result.value.quote.id} for ${result.value.quote.customerPartyId}`,
            risks: result.value.quote.status === "SENT" ? ["Awaiting customer response"] : [],
            nextSteps: ["Follow up with customer", "Confirm acceptance"],
          },
          confidence: 0.6,
          rationale: "Summary based on quote status and metadata.",
          provenance: {
            referencedEntities: [
              {
                type: "quote",
                id: result.value.quote.id,
                name: result.value.quote.number ?? "Quote",
              },
            ],
          },
        };
        return card;
      }

      const card: SalesSummaryCard = {
        ok: true,
        summary: {
          summary: "Deal summary is not yet connected. Provide a quote id for best results.",
          risks: ["Limited context"],
          nextSteps: ["Attach a quote"],
        },
        confidence: 0.2,
        rationale: "Deal support is not wired; provide quote context.",
        provenance: {
          referencedEntities: [],
        },
      };
      return card;
    },
  },
  {
    name: "sales_draftFollowUpMessage",
    description: "Draft a follow-up message for a quote or invoice.",
    kind: "server",
    inputSchema: SalesDraftFollowUpMessageInputSchema,
    execute: async ({ input }) => {
      const parsed = SalesDraftFollowUpMessageInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const card: MessageDraftCard = {
        ok: true,
        draft: {
          subject: "Quick follow-up on your quote",
          body: "Hi there,\n\nJust checking in to see if you had any questions on the quote. Happy to clarify details or adjust scope.\n\nBest regards,",
          tone: parsed.data.tone ?? "professional",
        },
        confidence: 0.5,
        rationale: "Standard follow-up template based on the provided objective.",
        provenance: {
          referencedEntities: [],
        },
      };
      return card;
    },
  },
  {
    name: "sales_detectStalledQuotes",
    description: "Detect quotes that have been sent but not responded to.",
    kind: "server",
    inputSchema: SalesDetectStalledQuotesInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = SalesDetectStalledQuotesInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }
      const list = await app.listQuotes.execute(
        {
          status: "SENT",
          fromDate: parsed.data.fromDate,
          toDate: parsed.data.toDate,
        },
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      if ("error" in list) {
        return {
          ok: false,
          code: list.error.code,
          message: list.error.message,
          details: list.error.details,
        };
      }

      const alerts = list.value.items
        .filter((quote) => quote.sentAt)
        .map((quote) => {
          const sentAt = new Date(quote.sentAt!);
          const daysSinceSent = Math.floor((Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24));
          return {
            quoteId: quote.id,
            quoteNumber: quote.number ?? undefined,
            customerPartyId: quote.customerPartyId,
            daysSinceSent,
            suggestedNudge: "Send a polite follow-up message.",
          };
        })
        .filter((alert) =>
          parsed.data.minimumDaysSinceSent
            ? alert.daysSinceSent >= parsed.data.minimumDaysSinceSent
            : true
        );

      const card: StalledQuotesCard = {
        ok: true,
        alerts,
        confidence: 0.7,
        rationale: "Computed from sent timestamps within the selected range.",
        provenance: {
          referencedEntities: alerts.map((alert) => ({
            type: "quote",
            id: alert.quoteId,
            name: alert.quoteNumber ?? "Quote",
          })),
        },
      };
      return card;
    },
  },
  {
    name: "sales_explainAccountingPosting",
    description: "Explain accounting postings for an invoice or payment.",
    kind: "server",
    inputSchema: SalesExplainPostingInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = SalesExplainPostingInputSchema.safeParse(input);
      if (!parsed.success) {
        return validationError(parsed.error.flatten());
      }

      if (parsed.data.invoiceId) {
        const result = await app.getInvoice.execute(
          { invoiceId: parsed.data.invoiceId },
          buildCtx(tenantId, userId, toolCallId, runId)
        );
        if ("error" in result) {
          return {
            ok: false,
            code: result.error.code,
            message: result.error.message,
            details: result.error.details,
          };
        }
        const card: PostingExplanationCard = {
          ok: true,
          explanation: `Invoice ${result.value.invoice.number ?? result.value.invoice.id} was posted to Accounts Receivable (debit) and Revenue (credit).`,
          journalEntryId: result.value.invoice.issuedJournalEntryId ?? undefined,
          confidence: 0.85,
          rationale: "Based on the deterministic invoice posting rule (AR/Revenue).",
          provenance: {
            referencedEntities: [
              {
                type: "invoice",
                id: result.value.invoice.id,
                name: result.value.invoice.number ?? "Invoice",
              },
            ],
          },
        };
        return card;
      }

      const card: PostingExplanationCard = {
        ok: true,
        explanation: "Payment postings debit Bank and credit Accounts Receivable.",
        confidence: 0.8,
        rationale: "Based on the deterministic payment posting rule (Bank/AR).",
        provenance: {
          referencedEntities: [],
        },
      };
      return card;
    },
  },
];
