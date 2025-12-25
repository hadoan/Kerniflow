import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { WorkspacesController } from "./adapters/http/workspaces.controller";
import { PrismaWorkspaceRepository } from "./infrastructure/adapters/prisma-workspace-repository.adapter";
import { WORKSPACE_REPOSITORY_PORT } from "./application/ports/workspace-repository.port";
import { CreateWorkspaceUseCase } from "./application/use-cases/create-workspace.usecase";
import { ListWorkspacesUseCase } from "./application/use-cases/list-workspaces.usecase";
import { GetWorkspaceUseCase } from "./application/use-cases/get-workspace.usecase";
import { UpdateWorkspaceUseCase } from "./application/use-cases/update-workspace.usecase";
import { IdempotencyInterceptor } from "../../shared/idempotency/IdempotencyInterceptor";
import { PrismaIdempotencyStorageAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";

@Module({
  imports: [DataModule],
  controllers: [WorkspacesController],
  providers: [
    // Repository
    PrismaWorkspaceRepository,
    { provide: WORKSPACE_REPOSITORY_PORT, useExisting: PrismaWorkspaceRepository },

    // Infrastructure
    SystemIdGenerator,
    SystemClock,
    PrismaIdempotencyStorageAdapter,
    IdempotencyInterceptor,

    // Use Cases
    CreateWorkspaceUseCase,
    ListWorkspacesUseCase,
    GetWorkspaceUseCase,
    UpdateWorkspaceUseCase,

    // Token bindings
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
  ],
  exports: [
    CreateWorkspaceUseCase,
    ListWorkspacesUseCase,
    GetWorkspaceUseCase,
    UpdateWorkspaceUseCase,
  ],
})
export class WorkspacesModule {}
