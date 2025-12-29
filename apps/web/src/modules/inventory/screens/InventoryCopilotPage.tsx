import React, { useMemo } from "react";
import { useChat } from "@ai-sdk/react";
import { createIdempotencyKey } from "@kerniflow/api-client";
import {
  ProductProposalCardSchema,
  ReceiptDraftProposalCardSchema,
  DeliveryDraftProposalCardSchema,
  ReorderPolicyProposalCardSchema,
  InventoryAnomaliesCardSchema,
  PickListCardSchema,
  StockChangeExplanationCardSchema,
  type Provenance,
} from "@kerniflow/contracts";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { inventoryApi } from "@/lib/inventory-api";
import { authClient } from "@/lib/auth-client";
import { getActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

type MessagePart =
  | { type: "text"; text: string }
  | { type: "tool-call"; toolName: string; toolCallId: string; input: unknown }
  | { type: "tool-result"; toolName: string; toolCallId: string; result: unknown }
  | { type: "data"; data: any };

const ProposalCard: React.FC<{
  title: string;
  summary?: string;
  onApply?: () => void;
  applyDisabled?: boolean;
  meta?: { confidence: number; rationale: string; provenance: Provenance };
  children?: React.ReactNode;
}> = ({ title, summary, onApply, applyDisabled, meta, children }) => (
  <Card className="border border-border bg-muted/30">
    <CardContent className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          {summary && <div className="text-xs text-muted-foreground">{summary}</div>}
        </div>
        {onApply && (
          <Button size="sm" onClick={onApply} disabled={applyDisabled}>
            Apply
          </Button>
        )}
      </div>
      {children}
      {meta && (
        <div className="border-t border-border pt-3 mt-3 space-y-1 text-xs text-muted-foreground">
          <div>Confidence: {Math.round(meta.confidence * 100)}%</div>
          <div>Why: {meta.rationale}</div>
          {meta.provenance.sourceText ? <div>Source: {meta.provenance.sourceText}</div> : null}
          {meta.provenance.extractedFields?.length ? (
            <div>Extracted: {meta.provenance.extractedFields.join(", ")}</div>
          ) : null}
          {meta.provenance.referencedEntities?.length ? (
            <div>
              References:{" "}
              {meta.provenance.referencedEntities
                .map((ref) => `${ref.type}:${ref.name}`)
                .join(", ")}
            </div>
          ) : null}
        </div>
      )}
    </CardContent>
  </Card>
);

export default function InventoryCopilotPage() {
  const apiBase =
    import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3000";
  const tenantId = getActiveWorkspaceId() ?? "demo-tenant";
  const accessToken = authClient.getAccessToken() ?? "";

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
            activeModule: "inventory",
          },
        },
      }) as any,
    [apiBase, tenantId, accessToken]
  );

  const { messages, input, handleInputChange, handleSubmit } = useChat(chatOptions);
  const setPrompt = (value: string) =>
    handleInputChange({ target: { value } } as React.ChangeEvent<HTMLInputElement>);

  const renderHints = (missingFields?: string[], followUpQuestions?: string[]) => {
    if (!missingFields?.length && !followUpQuestions?.length) {
      return null;
    }
    return (
      <div className="text-xs text-muted-foreground space-y-1">
        {missingFields?.length ? <div>Missing: {missingFields.join(", ")}</div> : null}
        {followUpQuestions?.length ? <div>Questions: {followUpQuestions.join(" | ")}</div> : null}
      </div>
    );
  };

  const renderToolResult = (result: unknown) => {
    const productCard = ProductProposalCardSchema.safeParse(result);
    if (productCard.success) {
      const proposal = productCard.data.proposal;
      const canApply = Boolean(proposal.sku && proposal.name && proposal.unitOfMeasure);
      return (
        <ProposalCard
          title="Product Proposal"
          summary={`Confidence ${Math.round(productCard.data.confidence * 100)}%`}
          meta={{
            confidence: productCard.data.confidence,
            rationale: productCard.data.rationale,
            provenance: productCard.data.provenance,
          }}
          onApply={async () => {
            await inventoryApi.createProduct({
              sku: proposal.sku || "",
              name: proposal.name,
              productType: proposal.productType,
              unitOfMeasure: proposal.unitOfMeasure,
              barcode: proposal.barcode,
              defaultSalesPriceCents: proposal.defaultSalesPriceCents,
              defaultPurchaseCostCents: proposal.defaultPurchaseCostCents,
              tags: proposal.tags,
            });
          }}
          applyDisabled={!canApply}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
        </ProposalCard>
      );
    }

    const receiptCard = ReceiptDraftProposalCardSchema.safeParse(result);
    if (receiptCard.success) {
      const proposal = receiptCard.data.proposal;
      const canApply =
        proposal.lineItems.length > 0 && proposal.lineItems.every((line) => line.productId);
      return (
        <ProposalCard
          title="Receipt Draft"
          summary={`Confidence ${Math.round(receiptCard.data.confidence * 100)}%`}
          meta={{
            confidence: receiptCard.data.confidence,
            rationale: receiptCard.data.rationale,
            provenance: receiptCard.data.provenance,
          }}
          onApply={async () => {
            await inventoryApi.createDocument({
              documentType: "RECEIPT",
              partyId: proposal.supplierPartyId,
              postingDate: proposal.postingDate,
              scheduledDate: proposal.scheduledDate,
              reference: proposal.reference,
              notes: proposal.notes,
              lineItems: proposal.lineItems.map((line) => ({
                productId: line.productId || "",
                quantity: line.quantity,
                unitCostCents: line.unitCostCents,
                toLocationId: line.toLocationId,
              })),
            });
          }}
          applyDisabled={!canApply}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
          {renderHints(proposal.missingFields, proposal.followUpQuestions)}
        </ProposalCard>
      );
    }

    const deliveryCard = DeliveryDraftProposalCardSchema.safeParse(result);
    if (deliveryCard.success) {
      const proposal = deliveryCard.data.proposal;
      const canApply =
        proposal.lineItems.length > 0 && proposal.lineItems.every((line) => line.productId);
      return (
        <ProposalCard
          title="Delivery Draft"
          summary={`Confidence ${Math.round(deliveryCard.data.confidence * 100)}%`}
          meta={{
            confidence: deliveryCard.data.confidence,
            rationale: deliveryCard.data.rationale,
            provenance: deliveryCard.data.provenance,
          }}
          onApply={async () => {
            await inventoryApi.createDocument({
              documentType: "DELIVERY",
              partyId: proposal.customerPartyId,
              postingDate: proposal.postingDate,
              scheduledDate: proposal.scheduledDate,
              reference: proposal.reference,
              notes: proposal.notes,
              lineItems: proposal.lineItems.map((line) => ({
                productId: line.productId || "",
                quantity: line.quantity,
                fromLocationId: line.fromLocationId,
              })),
            });
          }}
          applyDisabled={!canApply}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
          {renderHints(proposal.missingFields, proposal.followUpQuestions)}
        </ProposalCard>
      );
    }

    const reorderCard = ReorderPolicyProposalCardSchema.safeParse(result);
    if (reorderCard.success) {
      const proposal = reorderCard.data.proposal;
      const canApply = Boolean(proposal.productId && proposal.warehouseId);
      return (
        <ProposalCard
          title="Reorder Policy Proposal"
          summary={`Confidence ${Math.round(reorderCard.data.confidence * 100)}%`}
          meta={{
            confidence: reorderCard.data.confidence,
            rationale: reorderCard.data.rationale,
            provenance: reorderCard.data.provenance,
          }}
          onApply={async () => {
            await inventoryApi.createReorderPolicy({
              productId: proposal.productId,
              warehouseId: proposal.warehouseId,
              minQty: proposal.minQty,
              maxQty: proposal.maxQty,
              reorderPoint: proposal.reorderPoint,
              preferredSupplierPartyId: proposal.preferredSupplierPartyId,
              leadTimeDays: proposal.leadTimeDays,
            });
          }}
          applyDisabled={!canApply}
        >
          <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(proposal, null, 2)}</pre>
          {renderHints(proposal.missingFields, proposal.followUpQuestions)}
        </ProposalCard>
      );
    }

    const anomalyCard = InventoryAnomaliesCardSchema.safeParse(result);
    if (anomalyCard.success) {
      return (
        <ProposalCard
          title="Anomaly Scan"
          summary={`Confidence ${Math.round(anomalyCard.data.confidence * 100)}%`}
          meta={{
            confidence: anomalyCard.data.confidence,
            rationale: anomalyCard.data.rationale,
            provenance: anomalyCard.data.provenance,
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(anomalyCard.data.anomalies, null, 2)}
          </pre>
        </ProposalCard>
      );
    }

    const pickCard = PickListCardSchema.safeParse(result);
    if (pickCard.success) {
      return (
        <ProposalCard
          title="Pick List"
          summary={`Confidence ${Math.round(pickCard.data.confidence * 100)}%`}
          meta={{
            confidence: pickCard.data.confidence,
            rationale: pickCard.data.rationale,
            provenance: pickCard.data.provenance,
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(pickCard.data, null, 2)}
          </pre>
        </ProposalCard>
      );
    }

    const explainCard = StockChangeExplanationCardSchema.safeParse(result);
    if (explainCard.success) {
      return (
        <ProposalCard
          title="Stock Change Explanation"
          summary={`Confidence ${Math.round(explainCard.data.confidence * 100)}%`}
          meta={{
            confidence: explainCard.data.confidence,
            rationale: explainCard.data.rationale,
            provenance: explainCard.data.provenance,
          }}
        >
          <pre className="text-xs whitespace-pre-wrap">
            {JSON.stringify(explainCard.data, null, 2)}
          </pre>
        </ProposalCard>
      );
    }

    return <div className="text-xs text-muted-foreground">No structured output.</div>;
  };

  const renderPart = (part: MessagePart) => {
    if (part.type === "text") {
      return <p className="whitespace-pre-wrap">{part.text}</p>;
    }
    if (part.type === "tool-call") {
      return <div className="text-xs text-muted-foreground">Tool call: {part.toolName}</div>;
    }
    if (part.type === "tool-result") {
      return <div className="space-y-2">{renderToolResult(part.result)}</div>;
    }
    return null;
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Inventory Copilot</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setPrompt("Create a product from this text: ...")}
          >
            Prompt: Product
          </Button>
          <Button
            variant="outline"
            onClick={() => setPrompt("Create a receipt from this text: ...")}
          >
            Prompt: Receipt
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
              placeholder="Ask Inventory Copilot..."
            />
            <Button type="submit">Send</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
