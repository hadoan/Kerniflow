import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Loader2, FileText, Play, Eye, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import {
  useTemplates,
  usePlanTemplate,
  useApplyTemplate,
  type Template,
  type TemplatePlan,
} from "../hooks/useTemplates";

export function TemplatesPage() {
  const { data: templates, isLoading, error } = useTemplates();
  const planTemplate = usePlanTemplate();
  const applyTemplate = useApplyTemplate();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [plan, setPlan] = useState<TemplatePlan | null>(null);
  const [showPlanDialog, setShowPlanDialog] = useState(false);

  const handlePlanTemplate = async (template: Template) => {
    setSelectedTemplate(template);
    try {
      // For demo purposes, using empty params. In production, show param form first.
      const result = await planTemplate.mutateAsync({
        templateId: template.templateId,
        params: {},
      });
      setPlan(result);
      setShowPlanDialog(true);
    } catch (error) {
      console.error("Failed to plan template:", error);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      return;
    }

    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplate.templateId,
        params: {},
      });
      setShowPlanDialog(false);
      setPlan(null);
      setSelectedTemplate(null);
    } catch (error) {
      console.error("Failed to apply template:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <XCircle className="h-4 w-4" />
        <AlertDescription>Failed to load templates. Please try again.</AlertDescription>
      </Alert>
    );
  }

  const groupedTemplates = templates?.reduce(
    (acc, template) => {
      const category = template.category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(template);
      return acc;
    },
    {} as Record<string, Template[]>
  );

  const categoryNames: Record<string, string> = {
    accounting: "Accounting",
    tax: "Tax & Compliance",
    inventory: "Inventory",
    sales: "Sales",
    crm: "CRM",
  };

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6 animate-fade-in max-w-7xl">
        <div>
          <h1 className="text-h1 text-foreground">Templates</h1>
          <p className="text-muted-foreground mt-2">
            Apply configuration templates to quickly set up common business needs.
          </p>
        </div>

        <Alert>
          <FileText className="h-4 w-4" />
          <AlertDescription>
            Templates use a plan/apply workflow. Preview what will be created before applying to
            ensure it matches your needs.
          </AlertDescription>
        </Alert>

        <div className="space-y-8">
          {Object.entries(groupedTemplates || {}).map(([category, categoryTemplates]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4">{categoryNames[category] || category}</h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {categoryTemplates.map((template) => (
                  <Card key={template.templateId}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <CardDescription className="mt-1">v{template.version}</CardDescription>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {category}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {template.description && (
                        <p className="text-sm text-muted-foreground">{template.description}</p>
                      )}

                      {template.requiresApps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium mb-1">Requires apps:</p>
                          <div className="flex flex-wrap gap-1">
                            {template.requiresApps.map((app) => (
                              <Badge key={app} variant="secondary" className="text-xs">
                                {app}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePlanTemplate(template)}
                          disabled={
                            planTemplate.isPending &&
                            selectedTemplate?.templateId === template.templateId
                          }
                        >
                          {planTemplate.isPending &&
                          selectedTemplate?.templateId === template.templateId ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Planning...
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Preview
                            </>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Preview: {selectedTemplate?.name}</DialogTitle>
            <DialogDescription>{plan?.summary}</DialogDescription>
          </DialogHeader>

          {plan && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Will Create</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {plan.actions.filter((a) => a.type === "create").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Will Update</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">
                      {plan.actions.filter((a) => a.type === "update").length}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Will Skip</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-600">
                      {plan.actions.filter((a) => a.type === "skip").length}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-2">
                <h3 className="font-semibold">Actions ({plan.actions.length})</h3>
                <div className="space-y-1 max-h-96 overflow-y-auto">
                  {plan.actions.map((action, index) => (
                    <div key={index} className="flex items-start gap-2 p-2 rounded border text-sm">
                      {action.type === "create" && (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      )}
                      {action.type === "update" && (
                        <MinusCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      )}
                      {action.type === "skip" && (
                        <XCircle className="h-4 w-4 text-gray-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          {action.type.toUpperCase()} {action.table} ({action.key})
                        </div>
                        {action.reason && (
                          <div className="text-xs text-muted-foreground">{action.reason}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
                  Cancel
                </Button>
                <Button
                  variant="default"
                  onClick={handleApplyTemplate}
                  disabled={applyTemplate.isPending}
                >
                  {applyTemplate.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4 mr-2" />
                      Apply Template
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
