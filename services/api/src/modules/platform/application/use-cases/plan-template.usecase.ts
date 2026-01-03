import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import type { TemplatePlan } from "@corely/contracts";
import type { TemplateRegistryPort } from "../ports/template-registry.port";
import type { TemplateExecutorPort } from "../ports/template-executor.port";
import { TEMPLATE_REGISTRY_TOKEN } from "../ports/template-registry.port";
import { TenantEntitlementService } from "../services/tenant-entitlement.service";
import { TemplateExecutorRegistry } from "../../infrastructure/registries/template-executor-registry";
import { ForbiddenError } from "@corely/kernel";

export interface PlanTemplateInput {
  tenantId: string;
  templateId: string;
  params: Record<string, any>;
}

/**
 * Plan Template Use Case
 * Generates a preview of what will happen when template is applied
 */
@Injectable()
export class PlanTemplateUseCase {
  constructor(
    @Inject(TEMPLATE_REGISTRY_TOKEN)
    private readonly templateRegistry: TemplateRegistryPort,
    private readonly entitlementService: TenantEntitlementService,
    private readonly executorRegistry: TemplateExecutorRegistry
  ) {}

  async execute(input: PlanTemplateInput): Promise<TemplatePlan> {
    const { tenantId, templateId, params } = input;

    // 1. Get template definition
    const template = this.templateRegistry.get(templateId);
    if (!template) {
      throw new NotFoundException(`Template "${templateId}" not found`);
    }

    // 2. Check that tenant has required apps enabled
    const entitlement = await this.entitlementService.getTenantEntitlement(tenantId);

    for (const requiredApp of template.requiresApps) {
      if (!entitlement.isAppEnabled(requiredApp)) {
        throw new ForbiddenError(
          `Template "${templateId}" requires app "${requiredApp}" to be enabled`,
          {
            templateId,
            requiredApp,
            enabledApps: entitlement.getEnabledApps(),
          }
        );
      }
    }

    // 3. Get the executor for this template
    // Note: Executors need to be registered/injected separately
    // For now, we'll need to import them dynamically or use a factory pattern
    // This is a placeholder - actual implementation needs executor resolution
    const executor = this.getExecutorForTemplate(templateId);

    if (!executor) {
      throw new Error(
        `No executor registered for template "${templateId}". Ensure the template executor is properly registered.`
      );
    }

    // 4. Execute plan
    const plan = await executor.plan(tenantId, params);

    return plan;
  }

  /**
   * Get executor for a template
   */
  private getExecutorForTemplate(templateId: string): TemplateExecutorPort | null {
    return this.executorRegistry.get(templateId) || null;
  }
}
