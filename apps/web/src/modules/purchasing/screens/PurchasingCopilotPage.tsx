import React, { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { createIdempotencyKey } from "@kerniflow/api-client";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { purchasingApi } from "@/lib/purchasing-api";

type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolName: string; toolCallId: string; input: unknown }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: any }
  | { type: "data"; data: any };

const ProposalCard: React.FC<{
  title: string;
  summary?: string;
  onApply?: () => void;
  children?: React.ReactNode;
}> = ({ title, summary, onApply, children }) => (
  <Card className="border border-border bg-muted/30">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {summary && <div className="text-xs text-muted-foreground">{summary}</div>}
        </div>
        {onApply && (
          <Button size="sm" onClick={onApply}>
            Apply
          </Button>
        )}
      </div>
      {children}
    </CardContent>
  </Card>
);

export default function PurchasingCopilotPage() {
  const apiBase = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
  const tenantId = "demo-tenant";
  const accessToken = "";

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
            activeModule: "purchasing",
          },
        },
      }) as any,
    [apiBase, tenantId, accessToken]
  );

  const { messages, input, handleInputChange, handleSubmit } = useChat(chatOptions);

  const renderToolResult = (toolName: string, result: any) => {
    if (!result || result.ok !== true) {
      return <div className="text-xs text-muted-foreground">No structured output.</div>;
    }

    if (toolName === "purchasing_createPOFromText") {
      const proposal = result.proposal;
      return (
        <ProposalCard
          title="Purchase Order Draft"
          summary={`Confidence ${(result.confidence * 100).toFixed(0)}%`}
          onApply={async () => {
            await purchasingApi.createPurchaseOrder({
              supplierPartyId: proposal.supplierPartyId || "",
              currency: proposal.currency || "EUR",
              orderDate: proposal.orderDate,
              expectedDeliveryDate: proposal.expectedDeliveryDate,
              notes: proposal.notes,
              lineItems: proposal.lineItems,
            });
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
        </ProposalCard>
      );
    }

    if (toolName === "purchasing_createBillFromText") {
      const proposal = result.proposal;
      return (
        <ProposalCard
          title="Vendor Bill Draft"
          summary={`Confidence ${(result.confidence * 100).toFixed(0)}%`}
          onApply={async () => {
            await purchasingApi.createVendorBill({
              supplierPartyId: proposal.supplierPartyId || "",
              billNumber: proposal.billNumber,
              billDate: proposal.billDate,
              dueDate: proposal.dueDate,
              currency: proposal.currency || "EUR",
              notes: proposal.notes,
              paymentTerms: proposal.paymentTerms,
              lineItems: proposal.lineItems,
            });
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
        </ProposalCard>
      );
    }

    return (
      <ProposalCard
        title={toolName}
        summary={`Confidence ${(result.confidence * 100).toFixed(0)}%`}
      >
        <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
      </ProposalCard>
    );
  };

  const renderPart = (part: MessagePart) => {
    if (part.type === "text") {
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if (part.type === "tool-call") {
      return <div className="text-xs text-muted-foreground">Tool call: {part.toolName}</div>;
    }
    if (part.type === "tool-result") {
      return <div className="space-y-2">{renderToolResult(part.toolName, part.result)}</div>;
    }
    return null;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Purchasing Copilot</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              handleInputChange({
                target: { value: "Create a vendor bill from this text: ..." },
              } as any)
            }
          >
            Prompt: Bill from text
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              handleInputChange({
                target: { value: "Create a purchase order from this text: ..." },
              } as any)
            }
          >
            Prompt: PO from text
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="h-[60vh] overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div className="text-xs uppercase text-muted-foreground">{m.role}</div>
                {(m.parts as MessagePart[] | undefined)?.length
                  ? (m.parts as MessagePart[]).map((p, idx) => <div key={idx}>{renderPart(p)}</div>)
                  : m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              className="flex-1 border rounded px-3 py-2 text-sm"
              value={input}
              onChange={handleInputChange}
              placeholder="Ask Purchasing Copilot..."
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
