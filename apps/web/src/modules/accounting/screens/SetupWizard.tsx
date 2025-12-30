import React, { type FC } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import { Calculator, CheckCircle2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { RadioGroup, RadioGroupItem } from "@/shared/ui/radio-group";
import { Label } from "@/shared/ui/label";
import { useSetupAccounting } from "../queries";

const setupFormSchema = z.object({
  baseCurrency: z.string().min(3).max(3),
  fiscalYearStartMonthDay: z.string().regex(/^\d{2}-\d{2}$/),
  periodLockingEnabled: z.boolean(),
  entryNumberPrefix: z.string().min(1),
  template: z.enum(["minimal", "freelancer", "smallBusiness", "standard"]),
});

type SetupFormData = z.infer<typeof setupFormSchema>;

const templates = [
  {
    value: "minimal" as const,
    label: "Minimal (5 accounts)",
    description: "Basic setup for very simple accounting needs",
  },
  {
    value: "freelancer" as const,
    label: "Freelancer (16 accounts)",
    description: "Ideal for independent contractors and consultants",
  },
  {
    value: "smallBusiness" as const,
    label: "Small Business (35 accounts)",
    description: "Comprehensive setup for small businesses",
  },
  {
    value: "standard" as const,
    label: "Standard (79 accounts) (Recommended)",
    description: "Full-featured chart of accounts for most businesses",
  },
];

/**
 * Setup wizard for initializing accounting module
 */
export const SetupWizard: FC = () => {
  const navigate = useNavigate();
  const setupMutation = useSetupAccounting();

  const form = useForm<SetupFormData>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      baseCurrency: "EUR",
      fiscalYearStartMonthDay: "01-01",
      periodLockingEnabled: false,
      entryNumberPrefix: "JE-",
      template: "standard",
    },
  });

  const onSubmit = async (data: SetupFormData) => {
    await setupMutation.mutateAsync({
      baseCurrency: data.baseCurrency,
      fiscalYearStartMonthDay: data.fiscalYearStartMonthDay,
      periodLockingEnabled: data.periodLockingEnabled,
      entryNumberPrefix: data.entryNumberPrefix,
      template: data.template,
    });
    navigate("/accounting");
  };

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-4">
          <div className="p-3 bg-primary/10 rounded-full">
            <Calculator className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold mb-2">Set Up Accounting</h1>
        <p className="text-muted-foreground">
          Configure your accounting settings and chart of accounts to get started
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Settings</CardTitle>
              <CardDescription>Configure your fundamental accounting preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="baseCurrency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Base Currency</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="EUR">EUR - Euro</SelectItem>
                        <SelectItem value="USD">USD - US Dollar</SelectItem>
                        <SelectItem value="GBP">GBP - British Pound</SelectItem>
                        <SelectItem value="CHF">CHF - Swiss Franc</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The primary currency for your accounting records
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fiscalYearStartMonthDay"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiscal Year Start</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select fiscal year start" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="01-01">January 1st (Calendar Year)</SelectItem>
                        <SelectItem value="04-01">April 1st</SelectItem>
                        <SelectItem value="07-01">July 1st</SelectItem>
                        <SelectItem value="10-01">October 1st</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      When your fiscal year begins (affects period generation)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="periodLockingEnabled"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="h-4 w-4 mt-1"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>Enable Period Locking</FormLabel>
                      <FormDescription>
                        Prevent posting entries to closed periods (recommended for production use)
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Chart of Accounts Template */}
          <Card>
            <CardHeader>
              <CardTitle>Chart of Accounts</CardTitle>
              <CardDescription>
                Choose a pre-built template to start with (you can add more accounts later)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="template"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid gap-4"
                      >
                        {templates.map((template) => (
                          <div key={template.value}>
                            <RadioGroupItem
                              value={template.value}
                              id={template.value}
                              className="peer sr-only"
                            />
                            <Label
                              htmlFor={template.value}
                              className="flex flex-col items-start justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-semibold">{template.label}</span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                What Happens Next
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    Your selected chart of accounts template will be created with all predefined
                    accounts
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    12 monthly accounting periods will be generated for the current fiscal year
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>
                    You can customize accounts, add new ones, and start creating journal entries
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-0.5">•</span>
                  <span>All financial reports will be available immediately</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate("/")}>
              Cancel
            </Button>
            <Button type="submit" disabled={setupMutation.isPending}>
              {setupMutation.isPending ? "Setting up..." : "Complete Setup"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
