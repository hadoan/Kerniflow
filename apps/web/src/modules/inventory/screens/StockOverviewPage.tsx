import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function StockOverviewPage() {
  const [warehouseId, setWarehouseId] = useState<string>("");

  const { data: warehouses } = useQuery({
    queryKey: inventoryQueryKeys.warehouses.list(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const { data: stock } = useQuery({
    queryKey: inventoryQueryKeys.stock.available({ warehouseId: warehouseId || undefined }),
    queryFn: () => inventoryApi.getAvailable({ warehouseId: warehouseId || undefined }),
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <h1 className="text-h1 text-foreground">Stock Overview</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2 max-w-sm">
            <Label>Warehouse</Label>
            <select
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={warehouseId}
              onChange={(event) => setWarehouseId(event.target.value)}
            >
              <option value="">All warehouses</option>
              {warehouses?.items.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">Product</th>
                <th>Location</th>
                <th>On-hand</th>
                <th>Reserved</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {stock?.items.map((item) => (
                <tr key={`${item.productId}-${item.locationId}`} className="border-t border-border">
                  <td className="py-2 font-medium">{item.productId}</td>
                  <td>{item.locationId || "-"}</td>
                  <td>{item.onHandQty}</td>
                  <td>{item.reservedQty}</td>
                  <td>{item.availableQty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
