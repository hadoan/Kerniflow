import { Injectable } from "@nestjs/common";
import type { TemplateExecutorPort } from "../../application/ports/template-executor.port";

/**
 * Template Executor Registry
 * Maps template IDs to their executor implementations
 */
@Injectable()
export class TemplateExecutorRegistry {
  private executors = new Map<string, TemplateExecutorPort>();

  /**
   * Register an executor for a template
   */
  register(templateId: string, executor: TemplateExecutorPort): void {
    if (this.executors.has(templateId)) {
      throw new Error(
        `Executor for template "${templateId}" is already registered. Template IDs must be unique.`
      );
    }
    this.executors.set(templateId, executor);
  }

  /**
   * Get executor for a template
   */
  get(templateId: string): TemplateExecutorPort | undefined {
    return this.executors.get(templateId);
  }

  /**
   * Check if an executor exists for a template
   */
  has(templateId: string): boolean {
    return this.executors.has(templateId);
  }

  /**
   * Load executors (to be called during module initialization)
   * This method should be extended to import executors from all modules
   */
  loadExecutors(): void {
    // TODO: Import and register template executors from modules
    // Example:
    // import { CoaUsGaapExecutor } from '../../../accounting/templates/coa-us-gaap.executor';
    // const executor = new CoaUsGaapExecutor(prisma, seededRecordRepo);
    // this.register('coa-us-gaap', executor);
    // For now, executors need to be manually registered
    // as dynamic imports with dependency injection are complex
  }
}
