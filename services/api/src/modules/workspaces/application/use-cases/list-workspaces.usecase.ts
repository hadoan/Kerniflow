import { Inject, Injectable } from "@nestjs/common";
import type { ListWorkspacesOutput } from "@corely/contracts";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";

export interface ListWorkspacesCommand {
  tenantId: string;
  userId: string;
}

@Injectable()
export class ListWorkspacesUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async execute(command: ListWorkspacesCommand): Promise<ListWorkspacesOutput> {
    const workspaces = await this.workspaceRepo.listWorkspacesByTenant(
      command.tenantId,
      command.userId
    );

    return {
      workspaces: workspaces.map((ws) => ({
        id: ws.id,
        name: ws.name,
        kind: ws.legalEntity?.kind as any,
        legalName: ws.legalEntity?.legalName,
        countryCode: ws.legalEntity?.countryCode,
        currency: ws.legalEntity?.currency,
        taxId: ws.legalEntity?.taxId,
        address: ws.legalEntity?.address as any,
        bankAccount: ws.legalEntity?.bankAccount as any,
        invoiceSettings: ws.invoiceSettings as any,
        onboardingStatus: ws.onboardingStatus as any,
        onboardingCompletedAt: ws.onboardingCompletedAt?.toISOString(),
        createdAt: ws.createdAt.toISOString(),
        updatedAt: ws.updatedAt.toISOString(),
      })),
    };
  }
}
