import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { inventoryApi } from "@/lib/inventory-api";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: product } = useQuery({
    queryKey: inventoryQueryKeys.products.detail(id || ""),
    queryFn: () => inventoryApi.getProduct(id || ""),
    enabled: Boolean(id),
  });

  const { data: stock } = useQuery({
    queryKey: inventoryQueryKeys.stock.available({ productId: id || "" }),
    queryFn: () => inventoryApi.getAvailable({ productId: id || "" }),
    enabled: Boolean(id),
  });

  const toggleStatus = useMutation({
    mutationFn: () =>
      product?.isActive
        ? inventoryApi.deactivateProduct(product.id)
        : inventoryApi.activateProduct(product?.id || ""),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.products.details() });
    },
  });

  if (!product) {
    return null;
  }

  const summary = stock?.items.reduce(
    (acc, item) => {
      acc.onHand += item.onHandQty;
      acc.reserved += item.reservedQty;
      acc.available += item.availableQty;
      return acc;
    },
    { onHand: 0, reserved: 0, available: 0 }
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/inventory/products")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">{product.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{product.sku}</span>
              <Badge variant={product.isActive ? "secondary" : "outline"}>
                {product.isActive ? "Active" : "Inactive"}
              </Badge>
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          onClick={() => toggleStatus.mutate()}
          disabled={toggleStatus.isPending}
        >
          {product.isActive ? "Deactivate" : "Activate"}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Type</div>
                <div className="text-sm font-medium">{product.productType}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Unit</div>
                <div className="text-sm font-medium">{product.unitOfMeasure}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Barcode</div>
                <div className="text-sm font-medium">{product.barcode || "-"}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-3">
            <h2 className="text-lg font-semibold">Stock Summary</h2>
            <div className="flex items-center justify-between text-sm">
              <span>On-hand</span>
              <span>{summary?.onHand ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>Reserved</span>
              <span>{summary?.reserved ?? 0}</span>
            </div>
            <div className="flex items-center justify-between font-semibold">
              <span>Available</span>
              <span>{summary?.available ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
