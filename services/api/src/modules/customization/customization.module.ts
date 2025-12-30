import { Module } from "@nestjs/common";
import { CustomFieldsController } from "./adapters/http/custom-fields.controller";

import { EntityLayoutController } from "./adapters/http/entity-layout.controller";
import { CustomizationService } from "./customization.service";
import {
  CustomFieldDefinitionRepository,
  EntityLayoutRepository,
  CustomFieldIndexRepository,
} from "@kerniflow/data";
import { IdentityModule } from "../identity/identity.module";
import { KernelModule } from "../../shared/kernel/kernel.module";

@Module({
  imports: [KernelModule, IdentityModule],
  controllers: [CustomFieldsController, EntityLayoutController],
  providers: [
    CustomizationService,
    CustomFieldDefinitionRepository,
    CustomFieldIndexRepository,
    EntityLayoutRepository,
  ],
  exports: [CustomizationService],
})
export class CustomizationModule {}
