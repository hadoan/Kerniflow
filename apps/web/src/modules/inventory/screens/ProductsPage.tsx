import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Badge } from "@/shared/ui/badge";
import { inventoryApi } from "@/lib/inventory-api";
import type { ProductType } from "@corely/contracts";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";
import { useNavigate } from "react-router-dom";

export default function ProductsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: inventoryQueryKeys.products.list(),
    queryFn: () => inventoryApi.listProducts(),
  });

  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [productType, setProductType] = useState<ProductType>("STOCKABLE");
  const [unitOfMeasure, setUnitOfMeasure] = useState("pcs");

  const createProduct = useMutation({
    mutationFn: () =>
      inventoryApi.createProduct({
        sku,
        name,
        productType,
        unitOfMeasure,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.products.lists() });
      setSku("");
      setName("");
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-h1 text-foreground">Products</h1>
        <Button variant="outline" onClick={() => navigate("/inventory/copilot")}>
          AI: Create product
        </Button>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="space-y-2 flex-1">
              <Label>SKU</Label>
              <Input value={sku} onChange={(event) => setSku(event.target.value)} />
            </div>
            <div className="space-y-2 flex-1">
              <Label>Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <select
                className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={productType}
                onChange={(event) => setProductType(event.target.value as ProductType)}
              >
                <option value="STOCKABLE">Stockable</option>
                <option value="CONSUMABLE">Consumable</option>
                <option value="SERVICE">Service</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>UoM</Label>
              <Input
                value={unitOfMeasure}
                onChange={(event) => setUnitOfMeasure(event.target.value)}
              />
            </div>
            <Button
              variant="accent"
              className="mt-7"
              onClick={() => createProduct.mutate()}
              disabled={!sku || !name || createProduct.isPending}
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-2">SKU</th>
                <th>Name</th>
                <th>Type</th>
                <th>UoM</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((product) => (
                <tr key={product.id} className="border-t border-border">
                  <td className="py-2 font-medium">{product.sku}</td>
                  <td>{product.name}</td>
                  <td>{product.productType}</td>
                  <td>{product.unitOfMeasure}</td>
                  <td>
                    <Badge variant={product.isActive ? "secondary" : "outline"}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/inventory/products/${product.id}`)}
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
