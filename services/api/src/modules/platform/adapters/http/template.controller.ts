import { Controller, Get, Post, Body, Param, UseGuards, Query } from "@nestjs/common";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { PlanTemplateUseCase } from "../../application/use-cases/plan-template.usecase";
import { ApplyTemplateUseCase } from "../../application/use-cases/apply-template.usecase";
import type { TemplatePlan, TemplateResult, TemplateCatalogItem } from "@corely/contracts";
import { TemplateRegistry } from "../../infrastructure/registries/template-registry";

/**
 * Template Controller
 * HTTP endpoints for template operations (plan/apply)
 */
@Controller("platform/templates")
@UseGuards(AuthGuard, RbacGuard)
export class TemplateController {
  constructor(
    private readonly planTemplateUseCase: PlanTemplateUseCase,
    private readonly applyTemplateUseCase: ApplyTemplateUseCase,
    private readonly templateRegistry: TemplateRegistry
  ) {}

  /**
   * List all available templates
   */
  @Get()
  @RequirePermission("platform.templates.apply")
  async listTemplates(
    @Query("category") category?: string
  ): Promise<{ templates: TemplateCatalogItem[] }> {
    let templates = this.templateRegistry.list();

    // Filter by category if provided
    if (category) {
      templates = templates.filter((t) => t.category === category);
    }

    // Map to catalog items
    const catalogItems: TemplateCatalogItem[] = templates.map((t) => ({
      templateId: t.templateId,
      name: t.name,
      category: t.category,
      version: t.version,
      description: t.description,
      requiresApps: t.requiresApps,
    }));

    return { templates: catalogItems };
  }

  /**
   * Get template details
   */
  @Get(":templateId")
  @RequirePermission("platform.templates.apply")
  async getTemplate(@Param("templateId") templateId: string) {
    const template = this.templateRegistry.get(templateId);

    if (!template) {
      throw new Error(`Template "${templateId}" not found`);
    }

    return template;
  }

  /**
   * Plan template execution
   * Returns preview of what will be created/updated/skipped
   */
  @Post(":templateId/plan")
  @RequirePermission("platform.templates.apply")
  async planTemplate(
    @Param("templateId") templateId: string,
    @Body() body: { params: Record<string, any> },
    @CurrentTenantId() tenantId: string
  ): Promise<TemplatePlan> {
    return await this.planTemplateUseCase.execute({
      tenantId,
      templateId,
      params: body.params || {},
    });
  }

  /**
   * Apply template
   * Executes template and records installation
   */
  @Post(":templateId/apply")
  @RequirePermission("platform.templates.apply")
  async applyTemplate(
    @Param("templateId") templateId: string,
    @Body() body: { params: Record<string, any> },
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ): Promise<TemplateResult> {
    return await this.applyTemplateUseCase.execute({
      tenantId,
      templateId,
      params: body.params || {},
      userId,
    });
  }
}
