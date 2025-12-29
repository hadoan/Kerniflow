import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Separator } from "@/shared/ui/separator";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useToast } from "@/shared/ui/use-toast";

export const WorkspaceSettingsPage: React.FC = () => {
  const { activeWorkspace, activeWorkspaceId, refresh } = useWorkspace();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    countryCode: "",
    currency: "",
    taxId: "",
    addressLine1: "",
    city: "",
    postalCode: "",
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (activeWorkspace) {
      setForm({
        name: activeWorkspace.name,
        legalName: activeWorkspace.legalName ?? "",
        countryCode: activeWorkspace.countryCode ?? "",
        currency: activeWorkspace.currency ?? "",
        taxId: activeWorkspace.taxId ?? "",
        addressLine1: activeWorkspace.address?.line1 ?? "",
        city: activeWorkspace.address?.city ?? "",
        postalCode: activeWorkspace.address?.postalCode ?? "",
      });
    }
  }, [activeWorkspace]);

  if (!activeWorkspaceId) {
    navigate("/onboarding");
    return null;
  }

  const handleSave = async () => {
    if (!activeWorkspaceId) {
      return;
    }
    setIsSaving(true);
    try {
      await workspacesApi.updateWorkspace(activeWorkspaceId, {
        name: form.name,
        legalName: form.legalName,
        countryCode: form.countryCode,
        currency: form.currency,
        taxId: form.taxId || undefined,
        address:
          form.addressLine1 || form.city || form.postalCode
            ? {
                line1: form.addressLine1,
                city: form.city,
                postalCode: form.postalCode,
                countryCode: form.countryCode || activeWorkspace?.countryCode || "DE",
              }
            : undefined,
      });
      await refresh();
      toast({ title: "Workspace updated", description: "Your workspace settings were saved." });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-h1">Workspace settings</h1>
          <p className="text-muted-foreground">Update legal details, currency, and address.</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>
          Save changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Legal name</Label>
            <Input
              value={form.legalName}
              onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
              placeholder="Registered name for invoices"
            />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input
              value={form.currency}
              onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
              placeholder="EUR"
            />
          </div>
          <div className="space-y-2">
            <Label>Country code</Label>
            <Input
              value={form.countryCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
              }
              placeholder="DE"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Address</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2 md:col-span-3">
            <Label>Street</Label>
            <Input
              value={form.addressLine1}
              onChange={(e) => setForm((f) => ({ ...f, addressLine1: e.target.value }))}
              placeholder="Street and number"
            />
          </div>
          <div className="space-y-2">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Postal code</Label>
            <Input
              value={form.postalCode}
              onChange={(e) => setForm((f) => ({ ...f, postalCode: e.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Tax ID</Label>
            <Input
              value={form.taxId}
              onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle>Danger zone</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Removing a workspace will delete its data. This action will be restricted to owners in a
            future update.
          </p>
          <Button variant="destructive" disabled>
            Delete workspace (coming soon)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
