import { Inject, Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
import type { UpgradeWorkspaceInput, UpgradeWorkspaceOutput } from "@corely/contracts";
import type { WorkspaceRepositoryPort } from "../ports/workspace-repository.port";
import { WORKSPACE_REPOSITORY_PORT } from "../ports/workspace-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../../../shared/ports/idempotency-storage.port";
import type { AuditPort } from "../../../identity/application/ports/audit.port";
import { AUDIT_PORT_TOKEN } from "../../../identity/application/ports/audit.port";

export interface UpgradeWorkspaceCommand extends UpgradeWorkspaceInput {
  tenantId: string;
  userId: string;
  workspaceId: string;
  idempotencyKey?: string;
}

@Injectable()
export class UpgradeWorkspaceUseCase {
  constructor(
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN)
    private readonly idempotency: IdempotencyStoragePort,
    @Inject(AUDIT_PORT_TOKEN)
    private readonly audit: AuditPort
  ) {}

  async execute(command: UpgradeWorkspaceCommand): Promise<UpgradeWorkspaceOutput> {
    if (command.idempotencyKey) {
      const cached = await this.idempotency.get(
        "upgrade-workspace",
        command.tenantId,
        command.idempotencyKey
      );
      if (cached) {
        return cached.body as UpgradeWorkspaceOutput;
      }
    }

    const hasAccess = await this.workspaceRepo.checkUserHasWorkspaceAccess(
      command.tenantId,
      command.workspaceId,
      command.userId
    );

    if (!hasAccess) {
      throw new ForbiddenException("You do not have access to this workspace");
    }

    const membership = await this.workspaceRepo.getMembershipByUserAndWorkspace(
      command.workspaceId,
      command.userId
    );
    const isWorkspaceAdmin = membership?.role === "OWNER" || membership?.role === "ADMIN";
    if (!isWorkspaceAdmin) {
      throw new ForbiddenException("Only workspace admins can upgrade the workspace");
    }

    const existing = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      command.tenantId,
      command.workspaceId
    );
    if (!existing || !existing.legalEntity) {
      throw new NotFoundException("Workspace not found");
    }

    const currentKind = existing.legalEntity.kind === "COMPANY" ? "COMPANY" : "PERSONAL";
    if (currentKind !== "COMPANY") {
      await this.workspaceRepo.updateLegalEntity(command.tenantId, existing.legalEntityId, {
        kind: "COMPANY",
      });

      await this.audit.write({
        tenantId: command.tenantId,
        actorUserId: command.userId,
        action: "workspaces.upgrade",
        targetType: "workspace",
        targetId: existing.id,
        metadataJson: JSON.stringify({
          fromKind: currentKind,
          toKind: "COMPANY",
        }),
      });
    }

    const updated = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      command.tenantId,
      command.workspaceId
    );

    const result: UpgradeWorkspaceOutput = {
      workspace: {
        id: updated!.id,
        name: updated!.name,
        kind: updated!.legalEntity?.kind as any,
        legalName: updated!.legalEntity?.legalName,
        countryCode: updated!.legalEntity?.countryCode,
        currency: updated!.legalEntity?.currency,
        taxId: updated!.legalEntity?.taxId,
        address: updated!.legalEntity?.address as any,
        bankAccount: updated!.legalEntity?.bankAccount as any,
        invoiceSettings: updated!.invoiceSettings as any,
        onboardingStatus: updated!.onboardingStatus as any,
        onboardingCompletedAt: updated!.onboardingCompletedAt?.toISOString(),
        createdAt: updated!.createdAt.toISOString(),
        updatedAt: updated!.updatedAt.toISOString(),
      },
    };

    if (command.idempotencyKey) {
      await this.idempotency.store("upgrade-workspace", command.tenantId, command.idempotencyKey, {
        statusCode: 200,
        body: result,
      });
    }

    return result;
  }
}
