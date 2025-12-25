import type { Workspace, WorkspaceMembership, LegalEntity } from "../../domain/workspace.entity";

export interface CreateLegalEntityInput {
  id: string;
  tenantId: string;
  kind: string;
  legalName: string;
  countryCode: string;
  currency: string;
  taxId?: string;
  address?: any;
  bankAccount?: any;
}

export interface CreateWorkspaceInput {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  onboardingStatus?: string;
  invoiceSettings?: any;
}

export interface UpdateWorkspaceInput {
  name?: string;
  onboardingStatus?: string;
  onboardingCompletedAt?: Date;
  invoiceSettings?: any;
}

export interface UpdateLegalEntityInput {
  legalName?: string;
  countryCode?: string;
  currency?: string;
  taxId?: string;
  address?: any;
  bankAccount?: any;
}

export interface CreateMembershipInput {
  id: string;
  workspaceId: string;
  userId: string;
  role: string;
  status?: string;
}

export interface WorkspaceRepositoryPort {
  // Legal Entity operations
  createLegalEntity(input: CreateLegalEntityInput): Promise<LegalEntity>;
  getLegalEntityById(tenantId: string, id: string): Promise<LegalEntity | null>;
  updateLegalEntity(
    tenantId: string,
    id: string,
    input: UpdateLegalEntityInput
  ): Promise<LegalEntity>;

  // Workspace operations
  createWorkspace(input: CreateWorkspaceInput): Promise<Workspace>;
  getWorkspaceById(tenantId: string, id: string): Promise<Workspace | null>;
  getWorkspaceByIdWithLegalEntity(tenantId: string, id: string): Promise<Workspace | null>;
  listWorkspacesByTenant(tenantId: string, userId: string): Promise<Workspace[]>;
  updateWorkspace(tenantId: string, id: string, input: UpdateWorkspaceInput): Promise<Workspace>;

  // Membership operations
  createMembership(input: CreateMembershipInput): Promise<WorkspaceMembership>;
  getMembershipByUserAndWorkspace(
    workspaceId: string,
    userId: string
  ): Promise<WorkspaceMembership | null>;
  listMembershipsByWorkspace(workspaceId: string): Promise<WorkspaceMembership[]>;
  checkUserHasWorkspaceAccess(
    tenantId: string,
    workspaceId: string,
    userId: string
  ): Promise<boolean>;
}

export const WORKSPACE_REPOSITORY_PORT = Symbol("WORKSPACE_REPOSITORY_PORT");
