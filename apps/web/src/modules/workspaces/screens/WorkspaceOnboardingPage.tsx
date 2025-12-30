import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckCircle2, User, ArrowRight } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useToast } from "@/shared/ui/use-toast";
import { workspacesApi } from "@/shared/workspaces/workspaces-api";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

const steps = ["Workspace", "Legal & Address", "Tax & Bank"];

export const WorkspaceOnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { workspaces, setWorkspace, refresh } = useWorkspace();
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    kind: "PERSONAL",
    legalName: "",
    countryCode: "DE",
    currency: "EUR",
    address: {
      line1: "",
      city: "",
      postalCode: "",
      countryCode: "DE",
    },
    taxId: "",
    bankAccount: {
      iban: "",
      bic: "",
    },
  });

  const canSubmit = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.legalName.trim().length > 0 &&
      form.address.line1.trim().length > 0 &&
      form.address.city.trim().length > 0 &&
      form.address.postalCode.trim().length > 0
    );
  }, [form]);

  const canGoToNextStep = useMemo(() => {
    if (currentStep === 0) {
      return form.name.trim().length > 0;
    }
    if (currentStep === 1) {
      return (
        form.legalName.trim().length > 0 &&
        form.address.line1.trim().length > 0 &&
        form.address.city.trim().length > 0 &&
        form.address.postalCode.trim().length > 0
      );
    }
    return true;
  }, [currentStep, form]);

  const goNext = () => {
    if (!canGoToNextStep) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields before continuing.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast({ title: "Missing fields", description: "Please complete the required fields." });
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        kind: form.kind as "PERSONAL" | "COMPANY",
        legalName: form.legalName.trim(),
        countryCode: form.countryCode,
        currency: form.currency,
        address: {
          line1: form.address.line1.trim(),
          city: form.address.city.trim(),
          postalCode: form.address.postalCode.trim(),
          countryCode: form.address.countryCode,
        },
        taxId: form.taxId || undefined,
        bankAccount:
          form.bankAccount.iban || form.bankAccount.bic
            ? {
                iban: form.bankAccount.iban || undefined,
                bic: form.bankAccount.bic || undefined,
              }
            : undefined,
      };
      const result = await workspacesApi.createWorkspace(payload);
      const createdId = result.workspace.id;
      setWorkspace(createdId);
      await refresh();
      toast({ title: "Workspace created", description: `${result.workspace.name} is now active.` });
      navigate("/dashboard");
    } catch (error) {
      toast({
        title: "Workspace creation failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // If user already has a workspace, send them back to dashboard/settings
  if (workspaces.length > 0) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/40">
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">Workspace Setup</p>
          <h1 className="text-3xl font-bold">Create your workspace</h1>
          <p className="text-muted-foreground">
            Workspaces are the home for your company data. You can create more later or join
            invitations from teammates.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <span className="flex gap-2">
                {steps.map((label, idx) => (
                  <span
                    key={label}
                    className={`h-2 w-16 rounded-full ${
                      idx <= currentStep ? "bg-primary" : "bg-muted"
                    }`}
                  />
                ))}
              </span>
              <span className="text-base text-muted-foreground">{steps[currentStep]}</span>
            </CardTitle>
            <CardDescription>
              Tell us about your business so we can tailor invoices and taxes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {currentStep === 0 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Workspace name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="e.g. Corely GmbH"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    data-testid="onboarding-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kind</Label>
                  <Select
                    value={form.kind}
                    onValueChange={(v) => setForm((f) => ({ ...f, kind: v }))}
                    data-testid="onboarding-kind"
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PERSONAL">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" /> Personal / freelancer
                        </div>
                      </SelectItem>
                      <SelectItem value="COMPANY">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" /> Company
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Display currency</Label>
                  <Input
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))
                    }
                    data-testid="onboarding-currency"
                    placeholder="EUR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input
                    value={form.countryCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, countryCode: e.target.value.toUpperCase() }))
                    }
                    data-testid="onboarding-country"
                    placeholder="DE"
                  />
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>
                    Legal name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.legalName}
                    onChange={(e) => setForm((f) => ({ ...f, legalName: e.target.value }))}
                    data-testid="onboarding-legal-name"
                    placeholder="Registered legal entity"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tax ID / VAT</Label>
                  <Input
                    value={form.taxId}
                    onChange={(e) => setForm((f) => ({ ...f, taxId: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    Address line <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address.line1}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: { ...f.address, line1: e.target.value } }))
                    }
                    data-testid="onboarding-address-line1"
                    placeholder="Street and number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    City <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address.city}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, address: { ...f.address, city: e.target.value } }))
                    }
                    data-testid="onboarding-city"
                    placeholder="City"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Postal code <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.address.postalCode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        address: { ...f.address, postalCode: e.target.value },
                      }))
                    }
                    data-testid="onboarding-postal"
                    placeholder="Postal code"
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>IBAN</Label>
                  <Input
                    value={form.bankAccount.iban}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bankAccount: { ...f.bankAccount, iban: e.target.value },
                      }))
                    }
                    data-testid="onboarding-iban"
                    placeholder="Optional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>BIC</Label>
                  <Input
                    value={form.bankAccount.bic}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        bankAccount: { ...f.bankAccount, bic: e.target.value },
                      }))
                    }
                    data-testid="onboarding-bic"
                    placeholder="Optional"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              <Button
                variant="ghost"
                onClick={goBack}
                disabled={currentStep === 0 || isSubmitting}
                data-testid="onboarding-back"
              >
                Back
              </Button>
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={goNext}
                  disabled={!canGoToNextStep || isSubmitting}
                  data-testid="onboarding-next"
                >
                  Continue <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={!canSubmit || isSubmitting}
                  data-testid="onboarding-submit"
                >
                  Finish <CheckCircle2 className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
