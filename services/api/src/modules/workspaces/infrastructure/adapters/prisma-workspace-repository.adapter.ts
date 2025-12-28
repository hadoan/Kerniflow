import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type {
  WorkspaceRepositoryPort,
  CreateLegalEntityInput,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  UpdateLegalEntityInput,
  CreateMembershipInput,
} from "../../application/ports/workspace-repository.port";
import type { Workspace, WorkspaceMembership, LegalEntity } from "../../domain/workspace.entity";

@Injectable()
export class PrismaWorkspaceRepository implements WorkspaceRepositoryPort {
  constructor(@Inject(PrismaService) private prisma: PrismaService | null) {
    // Fallback for test environments where DI might not inject PrismaService
    this.prisma = this.prisma ?? new PrismaService();
  }

  // === Legal Entity Operations ===

  async createLegalEntity(input: CreateLegalEntityInput): Promise<LegalEntity> {
    const entity = await this.prisma.legalEntity.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        kind: input.kind,
        legalName: input.legalName,
        countryCode: input.countryCode,
        currency: input.currency,
        taxId: input.taxId,
        address: input.address || null,
        bankAccount: input.bankAccount || null,
      },
    });

    return this.mapLegalEntityFromPrisma(entity);
  }

  async getLegalEntityById(tenantId: string, id: string): Promise<LegalEntity | null> {
    const entity = await this.prisma.legalEntity.findFirst({
      where: { id, tenantId },
    });

    return entity ? this.mapLegalEntityFromPrisma(entity) : null;
  }

  async updateLegalEntity(
    tenantId: string,
    id: string,
    input: UpdateLegalEntityInput
  ): Promise<LegalEntity> {
    const entity = await this.prisma.legalEntity.update({
      where: { id },
      data: {
        legalName: input.legalName,
        countryCode: input.countryCode,
        currency: input.currency,
        taxId: input.taxId,
        address: input.address,
        bankAccount: input.bankAccount,
      },
    });

    return this.mapLegalEntityFromPrisma(entity);
  }

  // === Workspace Operations ===

  async createWorkspace(input: CreateWorkspaceInput): Promise<Workspace> {
    const workspace = await this.prisma.workspace.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        legalEntityId: input.legalEntityId,
        name: input.name,
        onboardingStatus: (input.onboardingStatus || "NEW") as any,
        invoiceSettings: input.invoiceSettings || null,
      },
    });

    return this.mapWorkspaceFromPrisma(workspace);
  }

  async getWorkspaceById(tenantId: string, id: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, tenantId },
    });

    return workspace ? this.mapWorkspaceFromPrisma(workspace) : null;
  }

  async getWorkspaceByIdWithLegalEntity(tenantId: string, id: string): Promise<Workspace | null> {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, tenantId },
      include: { legalEntity: true },
    });

    if (!workspace) {
      return null;
    }

    const mapped = this.mapWorkspaceFromPrisma(workspace);
    if (workspace.legalEntity) {
      mapped.legalEntity = this.mapLegalEntityFromPrisma(workspace.legalEntity);
    }

    return mapped;
  }

  async listWorkspacesByTenant(tenantId: string, userId: string): Promise<Workspace[]> {
    // Get workspaces where user has active membership
    const workspaces = await this.prisma.workspace.findMany({
      where: {
        tenantId,
        memberships: {
          some: {
            userId,
            status: "ACTIVE",
          },
        },
      },
      include: { legalEntity: true },
      orderBy: { createdAt: "desc" },
    });

    return workspaces.map((ws) => {
      const mapped = this.mapWorkspaceFromPrisma(ws);
      if (ws.legalEntity) {
        mapped.legalEntity = this.mapLegalEntityFromPrisma(ws.legalEntity);
      }
      return mapped;
    });
  }

  async updateWorkspace(
    tenantId: string,
    id: string,
    input: UpdateWorkspaceInput
  ): Promise<Workspace> {
    const workspace = await this.prisma.workspace.update({
      where: { id },
      data: {
        name: input.name,
        onboardingStatus: input.onboardingStatus as any,
        onboardingCompletedAt: input.onboardingCompletedAt,
        invoiceSettings: input.invoiceSettings,
      },
    });

    return this.mapWorkspaceFromPrisma(workspace);
  }

  // === Membership Operations ===

  async createMembership(input: CreateMembershipInput): Promise<WorkspaceMembership> {
    const membership = await this.prisma.workspaceMembership.create({
      data: {
        id: input.id,
        workspaceId: input.workspaceId,
        userId: input.userId,
        role: input.role as any,
        status: (input.status || "ACTIVE") as any,
      },
    });

    return this.mapMembershipFromPrisma(membership);
  }

  async getMembershipByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMembership | null> {
    const membership = await this.prisma.workspaceMembership.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    return membership ? this.mapMembershipFromPrisma(membership) : null;
  }

  async listMembershipsByWorkspace(workspaceId: string): Promise<WorkspaceMembership[]> {
    const memberships = await this.prisma.workspaceMembership.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "asc" },
    });

    return memberships.map(this.mapMembershipFromPrisma);
  }

  async checkUserHasWorkspaceAccess(
    tenantId: string,
    workspaceId: string,
    userId: string
  ): Promise<boolean> {
    const count = await this.prisma.workspaceMembership.count({
      where: {
        workspaceId,
        userId,
        status: "ACTIVE",
        workspace: { tenantId },
      },
    });

    return count > 0;
  }

  // === Mappers ===

  private mapLegalEntityFromPrisma(entity: any): LegalEntity {
    return {
      id: entity.id,
      tenantId: entity.tenantId,
      kind: entity.kind,
      legalName: entity.legalName,
      countryCode: entity.countryCode,
      currency: entity.currency,
      taxId: entity.taxId || undefined,
      address: entity.address || undefined,
      bankAccount: entity.bankAccount || undefined,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  private mapWorkspaceFromPrisma(workspace: any): Workspace {
    return {
      id: workspace.id,
      tenantId: workspace.tenantId,
      legalEntityId: workspace.legalEntityId,
      name: workspace.name,
      onboardingStatus: workspace.onboardingStatus,
      onboardingCompletedAt: workspace.onboardingCompletedAt || undefined,
      invoiceSettings: workspace.invoiceSettings || undefined,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    };
  }

  private mapMembershipFromPrisma(membership: any): WorkspaceMembership {
    return {
      id: membership.id,
      workspaceId: membership.workspaceId,
      userId: membership.userId,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
    };
  }
}
