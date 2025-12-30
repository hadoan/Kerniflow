import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Put,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { CustomEntityType } from "@corely/contracts";
import { CustomEntityTypes, EntityLayoutSchema } from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import type { CustomizationService } from "../../customization.service";

@UseGuards(AuthGuard)
@Controller("customization/layouts")
export class EntityLayoutController {
  constructor(private readonly customization: CustomizationService) {}

  @Get(":entityType")
  async getLayout(
    @Param("entityType") entityType: CustomEntityType,
    @CurrentTenantId() tenantId: string
  ) {
    if (!CustomEntityTypes.includes(entityType)) {
      throw new BadRequestException("Invalid entity type");
    }
    const layout = await this.customization.getLayout(tenantId, entityType);
    if (!layout) {
      return null;
    }
    return serializeLayout(layout);
  }

  @Put(":entityType")
  async upsertLayout(
    @Param("entityType") entityType: CustomEntityType,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Headers("x-idempotency-key") idem?: string
  ) {
    if (!CustomEntityTypes.includes(entityType)) {
      throw new BadRequestException("Invalid entity type");
    }
    const parsed = EntityLayoutSchema.parse({
      ...(body as object),
      entityType,
      tenantId,
    });
    const saved = await this.customization.upsertLayout(
      tenantId,
      userId,
      entityType,
      parsed.layout,
      parsed.version,
      idem as string
    );
    return serializeLayout(saved);
  }
}

function serializeLayout(layout: any) {
  return {
    id: layout.id,
    tenantId: layout.tenantId,
    entityType: layout.entityType,
    layout: layout.layout,
    version: layout.version,
    updatedAt: layout.updatedAt instanceof Date ? layout.updatedAt.toISOString() : layout.updatedAt,
  };
}
