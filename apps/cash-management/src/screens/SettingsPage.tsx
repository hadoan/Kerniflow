import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@corely/ui";
import {
  ContactDetailsDialog,
  PaymentMethodSwitcher,
  TaxDetailsDialog,
} from "@corely/web-shared/settings";
import { useWorkspace } from "@corely/web-shared/shared/workspaces/workspace-provider";

export const SettingsPage = () => {
  const { activeWorkspace } = useWorkspace();
  const [paymentMethodId, setPaymentMethodId] = useState<string | undefined>(undefined);
  const [taxDialogOpen, setTaxDialogOpen] = useState(false);
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const legalEntityId = activeWorkspace?.legalEntityId ?? activeWorkspace?.id;

  return (
    <>
      <TaxDetailsDialog open={taxDialogOpen} onOpenChange={setTaxDialogOpen} />
      <ContactDetailsDialog open={contactDialogOpen} onOpenChange={setContactDialogOpen} />

      <div className="min-w-0 space-y-5 px-4 py-5 sm:px-5 sm:py-6 lg:space-y-6 lg:p-8">
        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Minimal operations settings for cash register and payment method workflows.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile & contact info</CardTitle>
              <CardDescription>
                Maintain the workspace contact details used in operational documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="outline" onClick={() => setContactDialogOpen(true)}>
                Edit profile
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax defaults</CardTitle>
              <CardDescription>
                Maintain tax identifiers used across exports and financial workflows.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setTaxDialogOpen(true)}>
                Edit tax info
              </Button>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Payment methods</CardTitle>
              <CardDescription>
                Choose the default payment method and open the full payment method settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {legalEntityId ? (
                <PaymentMethodSwitcher
                  legalEntityId={legalEntityId}
                  selectedId={paymentMethodId}
                  onSelect={setPaymentMethodId}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No active legal entity found.</p>
              )}
              <Button asChild variant="ghost">
                <Link to="/settings/payment-methods">Manage payment methods</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
};
