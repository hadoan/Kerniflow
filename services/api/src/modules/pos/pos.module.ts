import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { PosController } from "./adapters/http/pos.controller";
import { CreateRegisterUseCase } from "./application/use-cases/create-register.usecase";
import { ListRegistersUseCase } from "./application/use-cases/list-registers.usecase";
import { OpenShiftUseCase } from "./application/use-cases/open-shift.usecase";
import { CloseShiftUseCase } from "./application/use-cases/close-shift.usecase";
import { GetCurrentShiftUseCase } from "./application/use-cases/get-current-shift.usecase";
import { SyncPosSaleUseCase } from "./application/use-cases/sync-pos-sale.usecase";
import { GetCatalogSnapshotUseCase } from "./application/use-cases/get-catalog-snapshot.usecase";
import { PrismaRegisterRepositoryAdapter } from "./infrastructure/adapters/prisma-register-repository.adapter";
import { PrismaShiftSessionRepositoryAdapter } from "./infrastructure/adapters/prisma-shift-session-repository.adapter";
import { PrismaPosSaleIdempotencyAdapter } from "./infrastructure/adapters/prisma-pos-sale-idempotency.adapter";
import { REGISTER_REPOSITORY_PORT } from "./application/ports/register-repository.port";
import { SHIFT_SESSION_REPOSITORY_PORT } from "./application/ports/shift-session-repository.port";
import { POS_SALE_IDEMPOTENCY_PORT } from "./application/ports/pos-sale-idempotency.port";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";

@Module({
  imports: [DataModule],
  controllers: [PosController],
  providers: [
    // Infrastructure adapters
    PrismaRegisterRepositoryAdapter,
    PrismaShiftSessionRepositoryAdapter,
    PrismaPosSaleIdempotencyAdapter,
    SystemIdGenerator,

    // Port bindings
    { provide: REGISTER_REPOSITORY_PORT, useExisting: PrismaRegisterRepositoryAdapter },
    { provide: SHIFT_SESSION_REPOSITORY_PORT, useExisting: PrismaShiftSessionRepositoryAdapter },
    { provide: POS_SALE_IDEMPOTENCY_PORT, useExisting: PrismaPosSaleIdempotencyAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },

    // Use cases
    CreateRegisterUseCase,
    ListRegistersUseCase,
    OpenShiftUseCase,
    CloseShiftUseCase,
    GetCurrentShiftUseCase,
    SyncPosSaleUseCase,
    GetCatalogSnapshotUseCase,
  ],
  exports: [],
})
export class PosModule {}
