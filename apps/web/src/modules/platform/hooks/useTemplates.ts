import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface Template {
  templateId: string;
  name: string;
  category: string;
  version: string;
  description?: string;
  requiresApps: string[];
}

export interface TemplatePlanAction {
  type: "create" | "update" | "skip";
  table: string;
  key: string;
  data: Record<string, any>;
  reason?: string;
}

export interface TemplatePlan {
  actions: TemplatePlanAction[];
  summary: string;
}

export interface TemplateResultSummary {
  created: number;
  updated: number;
  skipped: number;
  actions: TemplatePlanAction[];
}

export interface TemplateResult {
  summary: TemplateResultSummary;
}

/**
 * Fetch all available templates
 */
export function useTemplates(category?: string) {
  return useQuery({
    queryKey: ["platform", "templates", category],
    queryFn: async () => {
      const params = category ? `?category=${category}` : "";
      const response = await apiClient.get<{ templates: Template[] }>(
        `/platform/templates${params}`
      );
      return response.data.templates;
    },
  });
}

/**
 * Fetch template details
 */
export function useTemplate(templateId: string) {
  return useQuery({
    queryKey: ["platform", "templates", templateId],
    queryFn: async () => {
      const response = await apiClient.get<Template>(`/platform/templates/${templateId}`);
      return response.data;
    },
    enabled: !!templateId,
  });
}

/**
 * Plan template execution (preview)
 */
export function usePlanTemplate() {
  return useMutation({
    mutationFn: async ({
      templateId,
      params,
    }: {
      templateId: string;
      params: Record<string, any>;
    }) => {
      const response = await apiClient.post<TemplatePlan>(
        `/platform/templates/${templateId}/plan`,
        { params }
      );
      return response.data;
    },
  });
}

/**
 * Apply template
 */
export function useApplyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateId,
      params,
    }: {
      templateId: string;
      params: Record<string, any>;
    }) => {
      const response = await apiClient.post<TemplateResult>(
        `/platform/templates/${templateId}/apply`,
        { params }
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate relevant queries after template application
      void queryClient.invalidateQueries({ queryKey: ["accounting"] });
      void queryClient.invalidateQueries({ queryKey: ["tax"] });
    },
  });
}
