import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Textarea } from "@/shared/ui/textarea";
import { purchasingApi } from "@/lib/purchasing-api";

export default function NewPurchaseOrderPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: () => purchasingApi.listSuppliers(),
  });

  const suppliers = suppliersData?.suppliers ?? [];
  const [supplierPartyId, setSupplierPartyId] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, unitCostCents: 0 }]);

  useEffect(() => {
    if (!supplierPartyId && suppliers.length) {
      setSupplierPartyId(suppliers[0].id);
    }
  }, [supplierPartyId, suppliers]);

  const createMutation = useMutation({
    mutationFn: () =>
      purchasingApi.createPurchaseOrder({
        supplierPartyId,
        currency,
        orderDate,
        expectedDeliveryDate: expectedDeliveryDate || undefined,
        notes: notes || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitCostCents: Number(item.unitCostCents),
        })),
      }),
    onSuccess: (po) => {
      void queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      navigate(`/purchasing/purchase-orders/${po.id}`);
    },
  });

  const updateLineItem = (index: number, field: string, value: string | number) => {
    const next = [...lineItems];
    next[index] = { ...next[index], [field]: value } as any;
    setLineItems(next);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: "", quantity: 1, unitCostCents: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length === 1) {
      return;
    }
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/purchasing/purchase-orders")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-h1 text-foreground">New Purchase Order</h1>
        </div>
        <Button variant="outline" onClick={() => navigate("/purchasing/purchase-orders")}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={supplierPartyId}
                  onChange={(event) => setSupplierPartyId(event.target.value)}
                >
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.displayName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Currency</Label>
                <Input value={currency} onChange={(event) => setCurrency(event.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Order Date</Label>
                <Input
                  type="date"
                  value={orderDate}
                  onChange={(event) => setOrderDate(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Expected Delivery</Label>
                <Input
                  type="date"
                  value={expectedDeliveryDate}
                  onChange={(event) => setExpectedDeliveryDate(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button variant="outline" size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4" />
                  Add line
                </Button>
              </div>
              {lineItems.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-6">
                    <Label>Description</Label>
                    <Input
                      value={item.description}
                      onChange={(event) => updateLineItem(index, "description", event.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Qty</Label>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) =>
                        updateLineItem(index, "quantity", Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Label>Unit Cost (cents)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={item.unitCostCents}
                      onChange={(event) =>
                        updateLineItem(index, "unitCostCents", Number(event.target.value))
                      }
                    />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h2 className="text-lg font-semibold">Review</h2>
              <p className="text-sm text-muted-foreground">
                Confirm supplier, dates, and line items before creating the draft.
              </p>
              <Button
                variant="accent"
                className="w-full"
                onClick={() => createMutation.mutate()}
                disabled={!supplierPartyId || createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create PO Draft"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
