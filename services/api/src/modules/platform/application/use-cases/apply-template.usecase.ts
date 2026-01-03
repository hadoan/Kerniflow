import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import type { TemplateResult } from "@corely/contracts";
import type { TemplateRegistryPort } from "../ports/template-registry.port";
import type { TemplateExecutorPort } from "../ports/template-executor.port";
import type { TenantTemplateInstallRepositoryPort } from "../ports/tenant-template-install-repository.port";
import { TEMPLATE_REGISTRY_TOKEN } from "../ports/template-registry.port";
import { TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN } from "../ports/tenant-template-install-repository.port";
import { TenantEntitlementService } from "../services/tenant-entitlement.service";
import { TemplateExecutorRegistry } from "../../infrastructure/registries/template-executor-registry";
import { ForbiddenError } from "@corely/kernel";
import { randomUUID } from "crypto";

export interface ApplyTemplateInput {
  tenantId: string;
  templateId: string;
  params: Record<string, any>;
  userId: string;
}

/**
 * Apply Template Use Case
 * Executes template and records installation
 */
@Injectable()
export class ApplyTemplateUseCase {
  constructor(
    @Inject(TEMPLATE_REGISTRY_TOKEN)
    private readonly templateRegistry: TemplateRegistryPort,
    @Inject(TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN)
    private readonly templateInstallRepo: TenantTemplateInstallRepositoryPort,
    private readonly entitlementService: TenantEntitlementService,
    private readonly executorRegistry: TemplateExecutorRegistry
  ) {}

  async execute(input: ApplyTemplateInput): Promise<TemplateResult> {
    const { tenantId, templateId, params, userId } = input;

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
    const executor = this.getExecutorForTemplate(templateId);

    if (!executor) {
      throw new Error(
        `No executor registered for template "${templateId}". Ensure the template executor is properly registered.`
      );
    }

    // 4. Execute template
    const result = await executor.apply(tenantId, params);

    // 5. Record installation
    await this.templateInstallRepo.upsert({
      id: randomUUID(),
      tenantId,
      templateId,
      version: template.version,
      paramsJson: JSON.stringify(params),
      appliedByUserId: userId,
      appliedAt: new Date(),
      resultSummaryJson: JSON.stringify(result.summary),
    });

    return result;
  }

  /**
   * Get executor for a template
   */
  private getExecutorForTemplate(templateId: string): TemplateExecutorPort | null {
    return this.executorRegistry.get(templateId) || null;
  }
}
