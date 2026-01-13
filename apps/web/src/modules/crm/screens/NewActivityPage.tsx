import React from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Calendar as CalendarIcon, Clock3 } from "lucide-react";
import { z } from "zod";
import { format } from "date-fns";

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
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Textarea } from "@/shared/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Calendar } from "@/shared/ui/calendar";
import { cn } from "@/shared/lib/utils";
import { crmApi } from "@/lib/crm-api";
import { toast } from "sonner";

const ACTIVITY_TYPES = ["NOTE", "TASK", "CALL", "MEETING", "EMAIL_DRAFT"] as const;

const activityFormSchema = z
  .object({
    type: z.enum(ACTIVITY_TYPES),
    subject: z.string().min(1, "Subject is required"),
    body: z.string().optional(),
    partyId: z.string().optional(),
    dealId: z.string().optional(),
    dueAt: z.string().optional(),
  })
  .refine((value) => Boolean(value.partyId || value.dealId), {
    message: "Link to a deal or party",
    path: ["partyId"],
  });

type ActivityFormValues = z.infer<typeof activityFormSchema>;

export default function NewActivityPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: {
      type: "TASK",
      subject: "",
      body: "",
      partyId: "",
      dealId: "",
      dueAt: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (values: ActivityFormValues) => {
      const dueAtIso =
        values.dueAt && !Number.isNaN(Date.parse(values.dueAt))
          ? new Date(values.dueAt).toISOString()
          : undefined;

      return crmApi.createActivity({
        type: values.type,
        subject: values.subject,
        body: values.body || undefined,
        partyId: values.partyId || undefined,
        dealId: values.dealId || undefined,
        dueAt: dueAtIso,
      });
    },
    onSuccess: () => {
      toast.success("Activity created");
      void queryClient.invalidateQueries({ queryKey: ["activities"] });
      navigate("/crm/activities");
    },
    onError: (error) => {
      console.error("Error creating activity:", error);
      toast.error("Failed to create activity. Please try again.");
    },
  });

  const onSubmit = (values: ActivityFormValues) => {
    createMutation.mutate(values);
  };

  const dueAtRaw = form.watch("dueAt");
  const parsedDueAt = dueAtRaw ? new Date(dueAtRaw) : undefined;
  const dueAt = parsedDueAt && !Number.isNaN(parsedDueAt.getTime()) ? parsedDueAt : undefined;
  const dueTime = dueAt ? format(dueAt, "HH:mm") : "";

  const updateDueAt = (date: Date | undefined, time: string | undefined) => {
    if (!date) {
      form.setValue("dueAt", "");
      return;
    }
    const [hoursStr, minutesStr] = (time ?? "").split(":");
    const hours = Number(hoursStr);
    const minutes = Number(minutesStr);
    const next = new Date(date);
    if (!Number.isNaN(hours)) {
      next.setHours(hours);
    }
    if (!Number.isNaN(minutes)) {
      next.setMinutes(minutes);
    }
    next.setSeconds(0, 0);
    form.setValue("dueAt", next.toISOString(), { shouldDirty: true });
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/crm/activities")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-h1 text-foreground">New Activity</h1>
            <p className="text-muted-foreground">Create a task, call, meeting, or note.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => navigate("/crm/activities")}
            disabled={createMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            variant="accent"
            onClick={form.handleSubmit(onSubmit)}
            disabled={createMutation.isPending}
            data-testid="submit-activity-button"
          >
            {createMutation.isPending ? "Saving..." : "Create Activity"}
          </Button>
        </div>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          data-testid="activity-form"
        >
          <Card className="lg:col-span-2">
            <CardContent className="p-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="subject"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Subject</FormLabel>
                      <FormControl>
                        <Input placeholder="Follow up call with ACME" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {ACTIVITY_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due at</FormLabel>
                      <div className="grid grid-cols-[1fr_auto] gap-2 items-center">
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "justify-start text-left font-normal",
                                  !dueAt && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {dueAt ? format(dueAt, "PPP") : <span>Select date</span>}
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={dueAt}
                              onSelect={(date) => updateDueAt(date ?? undefined, dueTime)}
                            />
                          </PopoverContent>
                        </Popover>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Clock3 className="h-4 w-4 text-muted-foreground" />
                            <Input
                              type="time"
                              value={dueTime}
                              onChange={(event) =>
                                updateDueAt(dueAt ?? new Date(), event.target.value)
                              }
                            />
                          </div>
                        </FormControl>
                      </div>
                      <FormDescription>Optional reminder date & time.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dealId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Deal ID (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Link to a deal" {...field} />
                      </FormControl>
                      <FormDescription>Required: link to a deal or party.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="partyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Party ID (optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Link to a customer/contact" {...field} />
                      </FormControl>
                      <FormDescription>Required: link to a deal or party.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Details, agenda, or next steps" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tip</CardTitle>
              <CardDescription>Short, actionable subjects work best.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <div>Include who, what, and when in the subject.</div>
              <div>Link to a deal or party to keep context together.</div>
              <div>Add a due date so it shows up in your task list.</div>
            </CardContent>
          </Card>
        </form>
      </Form>
    </div>
  );
}
