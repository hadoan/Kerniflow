import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { inventoryApi } from "@/lib/inventory-api";
import type { LocationType } from "@corely/contracts";
import { inventoryQueryKeys } from "../queries/inventory.queryKeys";

export default function WarehousesPage() {
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: inventoryQueryKeys.warehouses.list(),
    queryFn: () => inventoryApi.listWarehouses(),
  });

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("INTERNAL");

  const { data: locations } = useQuery({
    queryKey: selectedWarehouseId
      ? inventoryQueryKeys.warehouses.locations(selectedWarehouseId)
      : ["inventory", "locations"],
    queryFn: () => inventoryApi.listLocations(selectedWarehouseId || ""),
    enabled: Boolean(selectedWarehouseId),
  });

  const createWarehouse = useMutation({
    mutationFn: () => inventoryApi.createWarehouse({ name, address: address || undefined }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.warehouses.list() });
      setName("");
      setAddress("");
    },
  });

  const createLocation = useMutation({
    mutationFn: () =>
      inventoryApi.createLocation({
        warehouseId: selectedWarehouseId || "",
        name: locationName,
        locationType,
      }),
    onSuccess: () => {
      if (selectedWarehouseId) {
        void queryClient.invalidateQueries({
          queryKey: inventoryQueryKeys.warehouses.locations(selectedWarehouseId),
        });
      }
      setLocationName("");
    },
  });

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <h1 className="text-h1 text-foreground">Warehouses</h1>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(event) => setName(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Address</Label>
              <Input value={address} onChange={(event) => setAddress(event.target.value)} />
            </div>
            <div className="flex items-end">
              <Button
                variant="accent"
                onClick={() => createWarehouse.mutate()}
                disabled={!name || createWarehouse.isPending}
              >
                Create Warehouse
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardContent className="p-6">
            <div className="space-y-2">
              {data?.items.map((warehouse) => (
                <Button
                  key={warehouse.id}
                  variant={warehouse.id === selectedWarehouseId ? "accent" : "ghost"}
                  className="w-full justify-between"
                  onClick={() => setSelectedWarehouseId(warehouse.id)}
                >
                  {warehouse.name}
                  {warehouse.isDefault ? <span className="text-xs">Default</span> : null}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="p-6 space-y-4">
            <h2 className="text-lg font-semibold">Locations</h2>
            {selectedWarehouseId ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={locationName}
                      onChange={(event) => setLocationName(event.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={locationType}
                      onChange={(event) => setLocationType(event.target.value as LocationType)}
                    >
                      <option value="INTERNAL">Internal</option>
                      <option value="RECEIVING">Receiving</option>
                      <option value="SHIPPING">Shipping</option>
                      <option value="VIRTUAL">Virtual</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => createLocation.mutate()}
                      disabled={!locationName || createLocation.isPending}
                    >
                      Add Location
                    </Button>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="py-2">Name</th>
                      <th>Type</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locations?.items.map((location) => (
                      <tr key={location.id} className="border-t border-border">
                        <td className="py-2 font-medium">{location.name}</td>
                        <td>{location.locationType}</td>
                        <td>{location.isActive ? "Active" : "Inactive"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Select a warehouse to view locations.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
