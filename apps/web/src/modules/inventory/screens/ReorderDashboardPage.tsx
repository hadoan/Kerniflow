import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function ReorderDashboardPage() {
  const queryClient = useQueryClient();
  const { data: suggestions } = useQuery({
    queryKey: inventoryQueryKeys.reorder.suggestions(),
    queryFn: () => inventoryApi.getReorderSuggestions(),
  });

  const [productId, setProductId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [minQty, setMinQty] = useState(0);
  const [reorderPoint, setReorderPoint] = useState(0);

  const createPolicy = useMutation({
    mutationFn: () =>
      inventoryApi.createReorderPolicy({
        productId,
        warehouseId,
        minQty,
        reorderPoint,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.reorder.policies() });
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.reorder.suggestions() });
      setProductId("");
      setWarehouseId("");
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <h1 className="text-h1 text-foreground">Reorder Dashboard</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Product Id</Label>
              <Input value={productId} onChange={(event) => setProductId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Warehouse Id</Label>
              <Input value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Min Qty</Label>
              <Input
                type="number"
                min="0"
                value={minQty}
                onChange={(event) => setMinQty(Number(event.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Reorder Point</Label>
              <Input
                type="number"
                min="0"
                value={reorderPoint}
                onChange={(event) => setReorderPoint(Number(event.target.value))}
              />
            </div>
          </div>
          <Button
            variant="accent"
            onClick={() => createPolicy.mutate()}
            disabled={!productId || !warehouseId || createPolicy.isPending}
          >
            Add Policy
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Product</th>
                <th>Warehouse</th>
                <th>Available</th>
                <th>Suggested Qty</th>
              </tr>
            </thead>
            <tbody>
              {suggestions?.items.map((item) => (
                <tr
                  key={`${item.productId}-${item.warehouseId}`}
                  className="border-t border-border"
                >
                  <td className="py-2 font-medium">{item.productId}</td>
                  <td>{item.warehouseId}</td>
                  <td>{item.availableQty}</td>
                  <td>{item.suggestedQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
