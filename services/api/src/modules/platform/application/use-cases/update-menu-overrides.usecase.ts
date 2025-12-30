import { Injectable, Inject } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type { MenuOverrides } from "@corely/contracts";
import {
  TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN,
  type TenantMenuOverrideRepositoryPort,
  type MenuScope,
} from "../ports/tenant-menu-override-repository.port";

export interface UpdateMenuOverridesInput {
  tenantId: string;
  userId: string;
  scope: "web" | "pos";
  overrides: MenuOverrides;
}

export interface UpdateMenuOverridesOutput {
  success: boolean;
  overrides: MenuOverrides;
}

/**
 * Update Menu Overrides Use Case
 * Saves tenant menu customizations (hide, reorder, rename, pin)
 */
@Injectable()
export class UpdateMenuOverridesUseCase {
  constructor(
    @Inject(TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN)
    private readonly menuOverrideRepo: TenantMenuOverrideRepositoryPort
  ) {}

  async execute(input: UpdateMenuOverridesInput): Promise<UpdateMenuOverridesOutput> {
    const scope: MenuScope = input.scope === "web" ? "WEB" : "POS";

    await this.menuOverrideRepo.upsert({
      id: randomUUID(),
      tenantId: input.tenantId,
      scope,
      overridesJson: JSON.stringify(input.overrides),
      updatedByUserId: input.userId,
    });

    return {
      success: true,
      overrides: input.overrides,
    };
  }
}
