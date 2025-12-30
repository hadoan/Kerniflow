import { Injectable } from "@nestjs/common";
import type { TemplateDefinition } from "@corely/contracts";
import type { TemplateRegistryPort } from "../../application/ports/template-registry.port";

/**
 * Template Registry
 * Central registry for all template definitions
 * Templates are loaded statically from each module
 */
@Injectable()
export class TemplateRegistry implements TemplateRegistryPort {
  private templates = new Map<string, TemplateDefinition>();

  /**
   * Register a template definition
   */
  register(template: TemplateDefinition): void {
    if (this.templates.has(template.templateId)) {
      throw new Error(
        `Template "${template.templateId}" is already registered. Template IDs must be unique.`
      );
    }
    this.templates.set(template.templateId, template);
  }

  /**
   * Get template definition by ID
   */
  get(templateId: string): TemplateDefinition | undefined {
    return this.templates.get(templateId);
  }

  /**
   * List all registered templates
   */
  list(): TemplateDefinition[] {
    return Array.from(this.templates.values());
  }

  /**
   * Find templates by category
   */
  findByCategory(category: string): TemplateDefinition[] {
    return this.list().filter((t) => t.category === category);
  }

  /**
   * Check if a template exists
   */
  has(templateId: string): boolean {
    return this.templates.has(templateId);
  }

  /**
   * Load template definitions (to be called during module initialization)
   * This method should be extended to import templates from all modules
   */
  loadTemplates(): void {
    // Import and register template definitions from modules
    // Example: Chart of Accounts template
    // Uncomment once the accounting module is ready
    // import { coaUsGaapTemplate } from '../../../accounting/templates/coa-us-gaap.definition';
    // this.register(coaUsGaapTemplate);
    // For now, templates need to be manually registered
    // as dynamic imports are not supported in this context
  }
}
