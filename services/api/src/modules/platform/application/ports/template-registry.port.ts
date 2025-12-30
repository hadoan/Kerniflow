import type { TemplateDefinition } from "@corely/contracts";

/**
 * Template Registry Port
 * Loads and provides access to template definitions
 */
export interface TemplateRegistryPort {
  /**
   * Get template definition by ID
   */
  get(templateId: string): TemplateDefinition | undefined;

  /**
   * List all registered templates
   */
  list(): TemplateDefinition[];

  /**
   * Find templates by category
   */
  findByCategory(category: string): TemplateDefinition[];

  /**
   * Check if a template exists
   */
  has(templateId: string): boolean;
}

export const TEMPLATE_REGISTRY_TOKEN = "platform/template-registry";
