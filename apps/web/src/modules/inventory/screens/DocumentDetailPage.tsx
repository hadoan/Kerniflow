import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Upload, XCircle, Save } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: inventoryQueryKeys.documents.detail(id || ""),
    queryFn: () => inventoryApi.getDocument(id || ""),
    enabled: Boolean(id),
  });

  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState<
    {
      id: string;
      productId: string;
      quantity: number;
      fromLocationId?: string | null;
      toLocationId?: string | null;
    }[]
  >([]);

  useEffect(() => {
    if (data) {
      setNotes(data.notes || "");
      setLineItems(
        data.lines.map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: line.quantity,
          fromLocationId: line.fromLocationId,
          toLocationId: line.toLocationId,
        }))
      );
    }
  }, [data]);

  const updateDocument = useMutation({
    mutationFn: () =>
      inventoryApi.updateDocument(id || "", {
        headerPatch: { notes },
        lineItems: lineItems.map((line) => ({
          id: line.id,
          productId: line.productId,
          quantity: Number(line.quantity),
          fromLocationId: line.fromLocationId || undefined,
          toLocationId: line.toLocationId || undefined,
        })),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.documents.detail(id || ""),
      });
    },
  });

  const confirmDocument = useMutation({
    mutationFn: () => inventoryApi.confirmDocument(id || ""),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.documents.detail(id || ""),
      }),
  });

  const postDocument = useMutation({
    mutationFn: () => inventoryApi.postDocument(id || ""),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.documents.detail(id || ""),
      }),
  });

  const cancelDocument = useMutation({
    mutationFn: () => inventoryApi.cancelDocument(id || ""),
    onSuccess: () =>
      void queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.documents.detail(id || ""),
      }),
  });

  if (!data) {
    return null;
  }

  const editable = data.status === "DRAFT";

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/documents")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">Inventory Document</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{data.documentNumber || "Draft"}</span>
              <Badge>{data.status}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {editable && (
            <Button variant="accent" onClick={() => updateDocument.mutate()}>
              <Save className="h-4 w-4" />
              Save Draft
            </Button>
          )}
          {data.status === "DRAFT" && (
            <Button variant="outline" onClick={() => confirmDocument.mutate()}>
              <Check className="h-4 w-4" />
              Confirm
            </Button>
          )}
          {data.status === "CONFIRMED" && (
            <Button variant="outline" onClick={() => postDocument.mutate()}>
              <Upload className="h-4 w-4" />
              Post
            </Button>
          )}
          {data.status !== "POSTED" && data.status !== "CANCELED" && (
            <Button variant="ghost" onClick={() => cancelDocument.mutate()}>
              <XCircle className="h-4 w-4" />
              Cancel
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div>
              <Label>Type</Label>
              <Input value={data.documentType} disabled />
            </div>
            <div>
              <Label>Party</Label>
              <Input value={data.partyId || ""} disabled={!editable} />
            </div>
            <div>
              <Label>Posting Date</Label>
              <Input value={data.postingDate || ""} disabled />
            </div>
          </div>

          <div>
            <Label>Notes</Label>
            <Input
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              disabled={!editable}
            />
          </div>

          <div className="space-y-3">
            <Label>Line Items</Label>
            {lineItems.map((line, index) => (
              <div key={line.id} className="grid grid-cols-12 gap-2">
                <Input className="col-span-4" value={line.productId} disabled />
                <Input
                  className="col-span-2"
                  type="number"
                  value={line.quantity}
                  disabled={!editable}
                  onChange={(event) => {
                    const next = [...lineItems];
                    next[index] = { ...next[index], quantity: Number(event.target.value) };
                    setLineItems(next);
                  }}
                />
                <Input className="col-span-3" value={line.fromLocationId || ""} disabled />
                <Input className="col-span-3" value={line.toLocationId || ""} disabled />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
