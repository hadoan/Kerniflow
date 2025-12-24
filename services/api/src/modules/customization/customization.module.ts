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
import { PrismaAuditAdapter } from "../../shared/infrastructure/persistence/prisma-audit.adapter";
import { PrismaIdempotencyStorageAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";

@Module({
  imports: [IdentityModule],
  controllers: [CustomFieldsController, EntityLayoutController],
  providers: [
    CustomizationService,
    CustomFieldDefinitionRepository,
    CustomFieldIndexRepository,
    EntityLayoutRepository,
    PrismaAuditAdapter,
    PrismaIdempotencyStorageAdapter,
    SystemIdGenerator,
    SystemClock,
    { provide: AUDIT_PORT_TOKEN, useClass: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CustomizationService],
})
export class CustomizationModule {}
