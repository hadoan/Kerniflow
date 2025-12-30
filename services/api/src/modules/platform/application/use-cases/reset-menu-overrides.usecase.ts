import { Injectable, Inject } from "@nestjs/common";
import {
  TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN,
  type TenantMenuOverrideRepositoryPort,
  type MenuScope,
} from "../ports/tenant-menu-override-repository.port";

export interface ResetMenuOverridesInput {
  tenantId: string;
  scope: "web" | "pos";
}

export interface ResetMenuOverridesOutput {
  success: boolean;
}

/**
 * Reset Menu Overrides Use Case
 * Deletes tenant menu customizations, reverting to defaults
 */
@Injectable()
export class ResetMenuOverridesUseCase {
  constructor(
    @Inject(TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN)
    private readonly menuOverrideRepo: TenantMenuOverrideRepositoryPort
  ) {}

  async execute(input: ResetMenuOverridesInput): Promise<ResetMenuOverridesOutput> {
    const scope: MenuScope = input.scope === "web" ? "WEB" : "POS";

    const override = await this.menuOverrideRepo.findByTenantAndScope(input.tenantId, scope);

    if (override) {
      await this.menuOverrideRepo.delete(override.id);
    }

    return {
      success: true,
    };
  }
}
