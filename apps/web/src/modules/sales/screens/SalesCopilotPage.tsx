import React, { useMemo, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createIdempotencyKey } from "@kerniflow/api-client";
import {
  QuoteDraftProposalCardSchema,
  LineItemsProposalCardSchema,
  PricingSuggestionCardSchema,
  MessageDraftCardSchema,
  StalledQuotesCardSchema,
  PostingExplanationCardSchema,
  SalesSummaryCardSchema,
  type QuoteDraftProposalCard,
  type LineItemsProposalCard,
  type MessageDraftCard,
  type Provenance,
} from "@kerniflow/contracts";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { formatMoney } from "@/shared/lib/formatters";
import { salesApi } from "@/lib/sales-api";
import { customersApi } from "@/lib/customers-api";
import { authClient } from "@/lib/auth-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { salesQueryKeys } from "../queries/sales.queryKeys";

type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolName: string; toolCallId: string; input: unknown }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: unknown }
  | { type: "data"; data: any };

const MessageBubble: React.FC<{
  role: string;
  children: React.ReactNode;
}> = ({ role, children }) => (
  <div
    className={`max-w-3xl w-full p-4 rounded-lg ${
      role === "user" ? "bg-blue-50 text-gray-900 ml-auto" : "bg-gray-50 text-gray-900"
    } border border-gray-200 shadow-sm`}
  >
    <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">{role}</div>
    <div className="space-y-2 text-sm leading-relaxed">{children}</div>
  </div>
);

const MetaFooter: React.FC<{
  confidence: number;
  rationale: string;
  provenance: Provenance;
}> = ({ confidence, rationale, provenance }) => (
  <div className="border-t border-border pt-3 mt-3 space-y-1 text-xs text-muted-foreground">
    <div>Confidence: {Math.round(confidence * 100)}%</div>
    <div>Why: {rationale}</div>
    {provenance.sourceText ? <div>Source: {provenance.sourceText}</div> : null}
    {provenance.extractedFields?.length ? (
      <div>Extracted: {provenance.extractedFields.join(", ")}</div>
    ) : null}
    {provenance.referencedEntities?.length ? (
      <div>
        References:{" "}
        {provenance.referencedEntities.map((ref) => `${ref.type}:${ref.name}`).join(", ")}
      </div>
    ) : null}
  </div>
);

export default function SalesCopilotPage() {
  const navigate = useNavigate();
  const apiBase = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";
  const tenantId = getActiveWorkspaceId() ?? "demo-tenant";
  const accessToken = authClient.getAccessToken() ?? "";

  const [dismissedToolCalls, setDismissedToolCalls] = useState<string[]>([]);
  const [customerOverrides, setCustomerOverrides] = useState<Record<string, string>>({});

  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => customersApi.listCustomers(),
  });

  const { data: settingsData } = useQuery({
    queryKey: salesQueryKeys.settings(),
    queryFn: () => salesApi.getSettings(),
  });

  const customers = customersData?.customers ?? [];
  const defaultCurrency = settingsData?.settings.defaultCurrency ?? "EUR";
  const defaultPaymentTerms = settingsData?.settings.defaultPaymentTerms ?? "";

  const createQuoteMutation = useMutation({
    mutationFn: (input: QuoteDraftProposalCard["proposal"]) => {
      if (!input.customerPartyId) {
        throw new Error("Missing customer");
      }
      return salesApi.createQuote({
        customerPartyId: input.customerPartyId,
        customerContactPartyId: input.customerContactPartyId,
        currency: defaultCurrency,
        paymentTerms: input.paymentTerms ?? (defaultPaymentTerms || undefined),
        validUntilDate: input.validUntilDate,
        notes: input.notes,
        lineItems: input.lineItems.map((line) => ({
          description: line.description,
          quantity: line.quantity,
          unitPriceCents: line.unitPriceCents,
          discountCents: line.discountCents,
          revenueCategory: line.revenueCategory,
        })),
      });
    },
    onSuccess: (data) => {
      toast.success("Quote draft created");
      navigate(`/sales/quotes/${data.quote.id}`);
    },
    onError: () => toast.error("Failed to create quote draft"),
  });

  const chatOptions = useMemo(
    () =>
      ({
        api: `${apiBase}/copilot/chat`,
        headers: {
          Authorization: accessToken ? `Bearer ${accessToken}` : "",
          "X-Tenant-Id": tenantId,
          "X-Idempotency-Key": createIdempotencyKey(),
        },
        body: {
          requestData: {
            tenantId,
            locale: "en",
            activeModule: "sales",
          },
        },
      }) as any,
    [apiBase, tenantId, accessToken]
  );

  const { messages, input, handleInputChange, handleSubmit } = useChat(chatOptions);

  const dismissTool = (toolCallId: string) => {
    setDismissedToolCalls((prev) => (prev.includes(toolCallId) ? prev : [...prev, toolCallId]));
  };

  const getCustomerName = (customerId?: string) =>
    customers.find((customer) => customer.id === customerId)?.displayName ?? "Unknown";

  const handleCreateQuote = (proposal: QuoteDraftProposalCard["proposal"], toolCallId: string) => {
    const customerPartyId = proposal.customerPartyId ?? customerOverrides[toolCallId];
    if (!customerPartyId) {
      toast.error("Select a customer before creating the quote");
      return;
    }
    createQuoteMutation.mutate({ ...proposal, customerPartyId });
  };

  const handleUseLineItems = (proposal: LineItemsProposalCard["proposal"]) => {
    navigate("/sales/quotes/new", {
      state: {
        prefill: {
          currency: defaultCurrency,
          paymentTerms: defaultPaymentTerms,
          lineItems: proposal.lineItems.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPriceCents: line.unitPriceCents,
            discountCents: line.discountCents,
          })),
        },
      },
    });
  };

  const copyMessageDraft = async (draft: MessageDraftCard["draft"]) => {
    const payload = `${draft.subject}\n\n${draft.body}`;
    try {
      await navigator.clipboard?.writeText(payload);
      toast.success("Draft copied to clipboard");
    } catch {
      toast.error("Unable to copy draft");
    }
  };

  const renderToolResult = (result: unknown, toolCallId: string) => {
    if (dismissedToolCalls.includes(toolCallId)) {
      return null;
    }

    const quoteCard = QuoteDraftProposalCardSchema.safeParse(result);
    if (quoteCard.success) {
      const proposal = quoteCard.data.proposal;
      const selectedCustomerId =
        proposal.customerPartyId ?? customerOverrides[toolCallId] ?? "";
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Quote Draft Proposal</div>
              <Badge variant="secondary">Draft</Badge>
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Customer</div>
              {proposal.customerPartyId ? (
                <div className="text-sm font-medium">{getCustomerName(proposal.customerPartyId)}</div>
              ) : (
                <Select
                  value={selectedCustomerId}
                  onValueChange={(value) =>
                    setCustomerOverrides((prev) => ({ ...prev, [toolCallId]: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.displayName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">Line Items</div>
              <div className="space-y-2">
                {proposal.lineItems.map((line, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <div>
                      {line.description} · {line.quantity} x {formatMoney(line.unitPriceCents, "en-US", defaultCurrency)}
                    </div>
                    <div className="font-medium">
                      {formatMoney(line.quantity * line.unitPriceCents, "en-US", defaultCurrency)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {proposal.paymentTerms ? (
              <div className="text-sm text-muted-foreground">
                Payment Terms: <span className="text-foreground">{proposal.paymentTerms}</span>
              </div>
            ) : null}
            {proposal.validUntilDate ? (
              <div className="text-sm text-muted-foreground">
                Valid Until: <span className="text-foreground">{proposal.validUntilDate}</span>
              </div>
            ) : null}
            {proposal.missingFields?.length ? (
              <div className="text-sm text-muted-foreground">
                Missing: <span className="text-foreground">{proposal.missingFields.join(", ")}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                variant="accent"
                size="sm"
                onClick={() => handleCreateQuote(proposal, toolCallId)}
                disabled={!selectedCustomerId}
              >
                Create Quote Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
            </div>
            <MetaFooter
              confidence={quoteCard.data.confidence}
              rationale={quoteCard.data.rationale}
              provenance={quoteCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    const lineItemsCard = LineItemsProposalCardSchema.safeParse(result);
    if (lineItemsCard.success) {
      const proposal = lineItemsCard.data.proposal;
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Line Item Suggestions</div>
              <Badge variant="secondary">Draft</Badge>
            </div>
            <div className="space-y-2">
              {proposal.lineItems.map((line, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    {line.description} · {line.quantity} x {formatMoney(line.unitPriceCents, "en-US", defaultCurrency)}
                  </div>
                  <div className="font-medium">
                    {formatMoney(line.quantity * line.unitPriceCents, "en-US", defaultCurrency)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" size="sm" onClick={() => handleUseLineItems(proposal)}>
                Use in New Quote
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
            </div>
            <MetaFooter
              confidence={lineItemsCard.data.confidence}
              rationale={lineItemsCard.data.rationale}
              provenance={lineItemsCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    const pricingCard = PricingSuggestionCardSchema.safeParse(result);
    if (pricingCard.success) {
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Pricing Suggestions</div>
              <Badge variant="secondary">Draft</Badge>
            </div>
            <div className="space-y-2">
              {pricingCard.data.suggestions.map((suggestion, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div>
                    {suggestion.label}{" "}
                    {suggestion.marginPercent ? (
                      <span className="text-muted-foreground">· {suggestion.marginPercent}% margin</span>
                    ) : null}
                  </div>
                  <div className="font-medium">
                    {formatMoney(suggestion.totalCents, "en-US", defaultCurrency)}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
            </div>
            <MetaFooter
              confidence={pricingCard.data.confidence}
              rationale={pricingCard.data.rationale}
              provenance={pricingCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    const messageCard = MessageDraftCardSchema.safeParse(result);
    if (messageCard.success) {
      const draft = messageCard.data.draft;
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Follow-up Draft</div>
              <Badge variant="secondary">{draft.tone ?? "draft"}</Badge>
            </div>
            <div className="text-sm font-medium">Subject: {draft.subject}</div>
            <div className="text-sm whitespace-pre-wrap">{draft.body}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="accent" size="sm" onClick={() => copyMessageDraft(draft)}>
                Copy Draft
              </Button>
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
            </div>
            <MetaFooter
              confidence={messageCard.data.confidence}
              rationale={messageCard.data.rationale}
              provenance={messageCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    const stalledCard = StalledQuotesCardSchema.safeParse(result);
    if (stalledCard.success) {
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Stalled Quotes</div>
              <Badge variant="secondary">{stalledCard.data.alerts.length} alerts</Badge>
            </div>
            <div className="space-y-2 text-sm">
              {stalledCard.data.alerts.map((alert) => (
                <div key={alert.quoteId} className="flex items-center justify-between">
                  <div>
                    Quote {alert.quoteNumber ?? alert.quoteId} · {alert.daysSinceSent} days
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/sales/quotes/${alert.quoteId}`)}>
                    Open
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
            </div>
            <MetaFooter
              confidence={stalledCard.data.confidence}
              rationale={stalledCard.data.rationale}
              provenance={stalledCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    const postingCard = PostingExplanationCardSchema.safeParse(result);
    if (postingCard.success) {
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Posting Explanation</div>
              <Badge variant="secondary">Accounting</Badge>
            </div>
            <div className="text-sm">{postingCard.data.explanation}</div>
            {postingCard.data.journalEntryId ? (
              <div className="text-sm text-muted-foreground">
                Journal Entry: <span className="text-foreground">{postingCard.data.journalEntryId}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
              <Button variant="secondary" size="sm" onClick={() => navigate("/accounting/journal-entries")}>
                View Journal Entries
              </Button>
            </div>
            <MetaFooter
              confidence={postingCard.data.confidence}
              rationale={postingCard.data.rationale}
              provenance={postingCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    const summaryCard = SalesSummaryCardSchema.safeParse(result);
    if (summaryCard.success) {
      return (
        <Card className="bg-white">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-semibold">Summary</div>
              <Badge variant="secondary">Overview</Badge>
            </div>
            <div className="text-sm">{summaryCard.data.summary.summary}</div>
            {summaryCard.data.summary.risks?.length ? (
              <div className="text-sm text-muted-foreground">
                Risks: <span className="text-foreground">{summaryCard.data.summary.risks.join(", ")}</span>
              </div>
            ) : null}
            {summaryCard.data.summary.nextSteps?.length ? (
              <div className="text-sm text-muted-foreground">
                Next Steps:{" "}
                <span className="text-foreground">{summaryCard.data.summary.nextSteps.join(", ")}</span>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
                Dismiss
              </Button>
            </div>
            <MetaFooter
              confidence={summaryCard.data.confidence}
              rationale={summaryCard.data.rationale}
              provenance={summaryCard.data.provenance}
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-white">
        <CardContent className="p-4 space-y-2 text-sm">
          <div className="font-medium">Tool result</div>
          <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
          <Button variant="ghost" size="sm" onClick={() => dismissTool(toolCallId)}>
            Dismiss
          </Button>
        </CardContent>
      </Card>
    );
  };

  const renderPart = (part: MessagePart, messageId: string) => {
    if (part.type === "text") return <p className="whitespace-pre-wrap">{part.text}</p>;
    if (part.type === "tool-call") {
      return (
        <div className="text-xs text-muted-foreground">
          Tool call: {part.toolName} ({part.toolCallId})
        </div>
      );
    }
    if (part.type === "tool-result") {
      return <div className="space-y-2">{renderToolResult(part.result, part.toolCallId)}</div>;
    }
    if (part.type === "data") {
      return (
        <div className="text-[11px] text-muted-foreground">
          meta {messageId}: {JSON.stringify(part.data)}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-h1 text-foreground">Sales Copilot</h1>
        <p className="text-muted-foreground">
          Draft quotes, line items, and follow-ups with AI, then apply with explicit confirmation.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="text-sm text-muted-foreground">
            Try prompts like: “Create a quote for website redesign,” “Draft a follow-up for quote 123,”
            or “Explain posting for invoice 456.”
          </div>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              className="min-h-[80px]"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Sales Copilot..."
            />
            <Button type="submit" variant="accent">
              Send
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {messages.map((message) => (
          <div key={message.id} className="flex flex-col gap-2">
            <MessageBubble role={message.role}>
              {(message.parts as MessagePart[] | undefined)?.length
                ? (message.parts as MessagePart[]).map((part, idx) => (
                    <div key={idx}>{renderPart(part, message.id)}</div>
                  ))
                : message.content && <p className="whitespace-pre-wrap">{message.content}</p>}
            </MessageBubble>
          </div>
        ))}
      </div>
    </div>
  );
}
