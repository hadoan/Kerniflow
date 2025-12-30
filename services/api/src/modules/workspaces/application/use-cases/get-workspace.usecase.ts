import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import type { GetWorkspaceOutput } from "@corely/contracts";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";

export interface GetWorkspaceCommand {
  tenantId: string;
  userId: string;
  workspaceId: string;
}

@Injectable()
export class GetWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(command: GetWorkspaceCommand): Promise<GetWorkspaceOutput> {
    // Check user has access to this workspace
    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      command.tenantId,
      command.workspaceId
    );

    if (!workspace) {
      throw new NotFoundException("Workspace not found");
    }

    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        kind: workspace.legalEntity?.kind as any,
        legalName: workspace.legalEntity?.legalName,
        countryCode: workspace.legalEntity?.countryCode,
        currency: workspace.legalEntity?.currency,
        taxId: workspace.legalEntity?.taxId,
        address: workspace.legalEntity?.address as any,
        bankAccount: workspace.legalEntity?.bankAccount as any,
        invoiceSettings: workspace.invoiceSettings as any,
        onboardingStatus: workspace.onboardingStatus as any,
        onboardingCompletedAt: workspace.onboardingCompletedAt?.toISOString(),
        createdAt: workspace.createdAt.toISOString(),
        updatedAt: workspace.updatedAt.toISOString(),
      },
    };
  }
}
