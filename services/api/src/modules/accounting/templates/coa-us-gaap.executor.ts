import { Injectable, Inject } from "@nestjs/common";
import type { TemplatePlan, TemplateResult, TemplatePlanAction } from "@corely/contracts";
import type { TemplateExecutorPort } from "../../platform/application/ports/template-executor.port";
import type { SeededRecordMetaRepositoryPort } from "../../platform/application/ports/seeded-record-meta-repository.port";
import { SEEDED_RECORD_META_REPOSITORY_TOKEN } from "../../platform/application/ports/seeded-record-meta-repository.port";
import { PrismaService } from "@corely/data";
import {
  CoaUsGaapParamsSchema,
  type CoaUsGaapParams,
  getUsGaapAccounts,
  coaUsGaapTemplate,
} from "./coa-us-gaap.definition";

/**
 * Chart of Accounts (US GAAP) Template Executor
 * Implements plan/apply for COA template
 */
@Injectable()
export class CoaUsGaapExecutor implements TemplateExecutorPort {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(SEEDED_RECORD_META_REPOSITORY_TOKEN)
    private readonly seededRecordRepo: SeededRecordMetaRepositoryPort
  ) {}

  /**
   * Plan template execution
   * Returns a preview of what will be created/updated/skipped
   */
  async plan(tenantId: string, params: Record<string, any>): Promise<TemplatePlan> {
    // Validate params
    const validatedParams = CoaUsGaapParamsSchema.parse(params) as CoaUsGaapParams;

    // Get accounts to create
    const accounts = getUsGaapAccounts(validatedParams);

    const actions: TemplatePlanAction[] = [];

    for (const account of accounts) {
      // Check if account already exists
      const existing = await this.prisma.chartOfAccount.findFirst({
        where: {
          tenantId,
          code: account.code,
        },
      });

      if (!existing) {
        // Will create new account
        actions.push({
          type: "create",
          table: "ChartOfAccount",
          key: account.code,
          data: account,
        });
      } else {
        // Check if it's been customized
        const seededMeta = await this.seededRecordRepo.findByTargetRecord(
          tenantId,
          "ChartOfAccount",
          existing.id
        );

        if (seededMeta?.isCustomized) {
          // Skip customized accounts
          actions.push({
            type: "skip",
            table: "ChartOfAccount",
            key: account.code,
            data: account,
            reason: "Account has been customized by tenant",
          });
        } else {
          // Will update existing account
          actions.push({
            type: "update",
            table: "ChartOfAccount",
            key: account.code,
            data: account,
          });
        }
      }
    }

    // Generate summary
    const createCount = actions.filter((a) => a.type === "create").length;
    const updateCount = actions.filter((a) => a.type === "update").length;
    const skipCount = actions.filter((a) => a.type === "skip").length;

    const summary = `Will create ${createCount} accounts, update ${updateCount} accounts, skip ${skipCount} customized accounts`;

    return {
      actions,
      summary,
    };
  }

  /**
   * Apply template
   * Executes the template and returns a summary of changes
   */
  async apply(tenantId: string, params: Record<string, any>): Promise<TemplateResult> {
    // Get the plan first
    const plan = await this.plan(tenantId, params);

    let created = 0;
    let updated = 0;
    let skipped = 0;

    // Execute actions
    for (const action of plan.actions) {
      if (action.type === "skip") {
        skipped++;
        continue;
      }

      if (action.type === "create") {
        // Create new account
        const newAccount = await this.prisma.chartOfAccount.create({
          data: {
            tenantId,
            code: action.data.code as string,
            name: action.data.name as string,
            type: action.data.type as string,
            parentCode: (action.data.parentCode as string) || null,
            currency: action.data.currency as string,
            isActive: action.data.isActive as boolean,
          },
        });

        // Register seeded record
        await this.seededRecordRepo.create({
          tenantId,
          targetTable: "ChartOfAccount",
          targetId: newAccount.id,
          sourceTemplateId: coaUsGaapTemplate.templateId,
          sourceTemplateVersion: coaUsGaapTemplate.version,
          isCustomized: false,
          customizedAt: null,
          customizedByUserId: null,
        });

        created++;
      } else if (action.type === "update") {
        // Find existing account
        const existing = await this.prisma.chartOfAccount.findFirst({
          where: {
            tenantId,
            code: action.data.code as string,
          },
        });

        if (existing) {
          // Update account
          await this.prisma.chartOfAccount.update({
            where: { id: existing.id },
            data: {
              name: action.data.name as string,
              type: action.data.type as string,
              parentCode: (action.data.parentCode as string) || null,
              currency: action.data.currency as string,
              isActive: action.data.isActive as boolean,
            },
          });

          updated++;
        }
      }
    }

    return {
      summary: {
        created,
        updated,
        skipped,
        actions: plan.actions,
      },
    };
  }
}
