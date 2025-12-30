import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { useNavigate } from "react-router-dom";
import type { InventoryDocumentType } from "@corely/contracts";

export default function DocumentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: inventoryQueryKeys.documents.list(),
    queryFn: () => inventoryApi.listDocuments(),
  });

  const [documentType, setDocumentType] = useState<InventoryDocumentType>("RECEIPT");
  const [partyId, setPartyId] = useState("");
  const [postingDate, setPostingDate] = useState(new Date().toISOString().slice(0, 10));
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");

  const createDocument = useMutation({
    mutationFn: () =>
      inventoryApi.createDocument({
        documentType,
        partyId: partyId || undefined,
        postingDate,
        lineItems: [
          {
            productId,
            quantity: Number(quantity),
            fromLocationId: fromLocationId || undefined,
            toLocationId: toLocationId || undefined,
          },
        ],
      }),
    onSuccess: (doc) => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.documents.lists() });
      navigate(`/inventory/documents/${doc.id}`);
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Documents</h1>
        <Button variant="outline" onClick={() => navigate("/inventory/copilot")}>
          AI: Create doc
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={documentType}
                onChange={(event) => setDocumentType(event.target.value as InventoryDocumentType)}
              >
                <option value="RECEIPT">Receipt</option>
                <option value="DELIVERY">Delivery</option>
                <option value="TRANSFER">Transfer</option>
                <option value="ADJUSTMENT">Adjustment</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Party Id</Label>
              <Input value={partyId} onChange={(event) => setPartyId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Posting Date</Label>
              <Input
                type="date"
                value={postingDate}
                onChange={(event) => setPostingDate(event.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button
                variant="accent"
                onClick={() => createDocument.mutate()}
                disabled={!productId || createDocument.isPending}
              >
                Create Draft
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Product Id</Label>
              <Input value={productId} onChange={(event) => setProductId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>From Location</Label>
              <Input
                value={fromLocationId}
                onChange={(event) => setFromLocationId(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>To Location</Label>
              <Input
                value={toLocationId}
                onChange={(event) => setToLocationId(event.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Number</th>
                <th>Type</th>
                <th>Status</th>
                <th>Posting Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((doc) => (
                <tr key={doc.id} className="border-t border-border">
                  <td className="py-2 font-medium">{doc.documentNumber || "Draft"}</td>
                  <td>{doc.documentType}</td>
                  <td>{doc.status}</td>
                  <td>{doc.postingDate || "-"}</td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/inventory/documents/${doc.id}`)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
