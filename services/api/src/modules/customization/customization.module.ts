import { Module, Logger } from "@nestjs/common";
import { CustomFieldsController } from "./presentation/custom-fields.controller";

const logger = new Logger("CustomizationModule");
import { EntityLayoutController } from "./presentation/entity-layout.controller";
import { CustomizationService } from "./customization.service";
import {
  CustomFieldDefinitionRepository,
  EntityLayoutRepository,
  CustomFieldIndexRepository,
} from "@kerniflow/data";
import { IdentityModule } from "../identity/identity.module";
import { PrismaAuditAdapter } from "../../shared/infrastructure/persistence/prisma-audit.adapter";
import { PrismaIdempotencyAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";
import { IDEMPOTENCY_PORT_TOKEN } from "../../shared/ports/idempotency.port";
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
    PrismaIdempotencyAdapter,
    SystemIdGenerator,
    SystemClock,
    { provide: AUDIT_PORT_TOKEN, useClass: PrismaAuditAdapter },
    { provide: IDEMPOTENCY_PORT_TOKEN, useClass: PrismaIdempotencyAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [CustomizationService],
})
export class CustomizationModule {}
