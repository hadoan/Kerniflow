import {
  Body,
  Controller,
  Delete,
  Get,
  BadRequestException,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { CustomEntityType } from "@corely/contracts";
import {
  CustomEntityTypes,
  CreateCustomFieldDefinitionSchema,
  UpdateCustomFieldDefinitionSchema,
} from "@corely/contracts";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import type { CustomizationService } from "../../customization.service";

@UseGuards(AuthGuard)
@Controller("customization/custom-fields")
export class CustomFieldsController {
  constructor(private readonly customization: CustomizationService) {}

  @Get()
  async list(
    @Query("entityType") entityType: CustomEntityType,
    @CurrentTenantId() tenantId: string
  ) {
    if (!tenantId) {
      throw new BadRequestException("Missing tenant");
    }
    if (!entityType || !CustomEntityTypes.includes(entityType)) {
      throw new BadRequestException("Invalid entityType");
    }
    const defs = await this.customization.listCustomFields(tenantId, entityType);
    return defs.map(serializeDefinition);
  }

  @Post()
  async create(
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Headers("x-idempotency-key") idem?: string
  ) {
    const input = CreateCustomFieldDefinitionSchema.parse({ ...(body as object), tenantId });
    const def = await this.customization.createCustomField(tenantId, userId, input, idem as string);
    return serializeDefinition(def);
  }

  @Put(":id")
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Headers("x-idempotency-key") idem?: string
  ) {
    const patch = UpdateCustomFieldDefinitionSchema.parse(body);
    const def = await this.customization.updateCustomField(
      tenantId,
      userId,
      id,
      patch,
      idem as string
    );
    return serializeDefinition(def);
  }

  @Delete(":id")
  async remove(
    @Param("id") id: string,
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string
  ) {
    await this.customization.deleteCustomField(tenantId, userId, id);
    return { success: true };
  }
}

function serializeDefinition(def: any) {
  return {
    ...def,
    createdAt: def.createdAt instanceof Date ? def.createdAt.toISOString() : def.createdAt,
    updatedAt: def.updatedAt instanceof Date ? def.updatedAt.toISOString() : def.updatedAt,
  };
}
