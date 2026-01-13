import { Module, forwardRef } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { WorkspacesController } from "./adapters/http/workspaces.controller";
import { PrismaWorkspaceRepository } from "./infrastructure/adapters/prisma-workspace-repository.adapter";
import { WORKSPACE_REPOSITORY_PORT } from "./application/ports/workspace-repository.port";
import { CreateWorkspaceUseCase } from "./application/use-cases/create-workspace.usecase";
import { ListWorkspacesUseCase } from "./application/use-cases/list-workspaces.usecase";
import { GetWorkspaceUseCase } from "./application/use-cases/get-workspace.usecase";
import { UpdateWorkspaceUseCase } from "./application/use-cases/update-workspace.usecase";
import { UpgradeWorkspaceUseCase } from "./application/use-cases/upgrade-workspace.usecase";
import { IdempotencyInterceptor } from "../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { KernelModule } from "../../shared/kernel/kernel.module";

@Module({
  imports: [DataModule, forwardRef(() => IdentityModule), KernelModule],
  controllers: [WorkspacesController],
  providers: [
    // Repository
    PrismaWorkspaceRepository,
    { provide: WORKSPACE_REPOSITORY_PORT, useExisting: PrismaWorkspaceRepository },

    IdempotencyInterceptor,

    // Use Cases
    CreateWorkspaceUseCase,
    ListWorkspacesUseCase,
    GetWorkspaceUseCase,
    UpdateWorkspaceUseCase,
    UpgradeWorkspaceUseCase,
  ],
  exports: [
    // Expose repository + token so external modules (e.g., TestHarness) can inject it
    PrismaWorkspaceRepository,
    WORKSPACE_REPOSITORY_PORT,
    CreateWorkspaceUseCase,
    ListWorkspacesUseCase,
    GetWorkspaceUseCase,
    UpdateWorkspaceUseCase,
    UpgradeWorkspaceUseCase,
  ],
})
export class WorkspacesModule {}
