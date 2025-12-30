import { Injectable } from "@nestjs/common";
import type { MenuItem } from "@kerniflow/contracts";
import { MenuComposerService } from "../services/menu-composer.service";

interface ComposeMenuInput {
  tenantId: string;
  userId: string;
  permissions: string[];
  scope: "web" | "pos";
}

interface ComposeMenuOutput {
  scope: string;
  items: MenuItem[];
  computedAt: string;
}

@Injectable()
export class ComposeMenuUseCase {
  constructor(private readonly menuComposer: MenuComposerService) {}

  async execute(input: ComposeMenuInput): Promise<ComposeMenuOutput> {
    const items = await this.menuComposer.composeMenu({
      tenantId: input.tenantId,
      userId: input.userId,
      permissions: new Set(input.permissions),
      scope: input.scope,
    });

    return {
      scope: input.scope,
      items,
      computedAt: new Date().toISOString(),
    };
  }
}
