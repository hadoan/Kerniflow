import type { TemplatePlan, TemplateResult } from "@corely/contracts";

/**
 * Template Executor Port
 * Interface for templates that can plan and apply changes
 */
export interface TemplateExecutorPort {
  /**
   * Plan template execution
   * Returns a preview of what will be created/updated/skipped
   */
  plan(tenantId: string, params: Record<string, any>): Promise<TemplatePlan>;

  /**
   * Apply template
   * Executes the template and returns a summary of changes
   */
  apply(tenantId: string, params: Record<string, any>): Promise<TemplateResult>;
}

export const TEMPLATE_EXECUTOR_TOKEN = "platform/template-executor";
