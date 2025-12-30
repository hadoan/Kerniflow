import type { WorkspaceKind, WorkspaceOnboardingStatus } from "@corely/contracts";

export interface WorkspaceAddress {
  line1: string;
  line2?: string;
  city: string;
  postalCode: string;
  countryCode: string;
}

export interface WorkspaceBankAccount {
  iban?: string;
  bic?: string;
  bankName?: string;
  accountHolder?: string;
  accountNumber?: string;
  routingNumber?: string;
}

export interface WorkspaceInvoiceSettings {
  prefix?: string;
  nextNumber?: number;
  defaultPaymentTermsDays?: number;
}

export interface LegalEntity {
  id: string;
  tenantId: string;
  kind: WorkspaceKind;
  legalName: string;
  countryCode: string;
  currency: string;
  taxId?: string;
  address?: WorkspaceAddress;
  bankAccount?: WorkspaceBankAccount;
  createdAt: Date;
  updatedAt: Date;
}

export interface Workspace {
  id: string;
  tenantId: string;
  legalEntityId: string;
  name: string;
  onboardingStatus: WorkspaceOnboardingStatus;
  onboardingCompletedAt?: Date;
  invoiceSettings?: WorkspaceInvoiceSettings;
  createdAt: Date;
  updatedAt: Date;

  // Populated from relation
  legalEntity?: LegalEntity;
}

export interface WorkspaceMembershipRole {
  OWNER: "OWNER";
  ADMIN: "ADMIN";
  MEMBER: "MEMBER";
  ACCOUNTANT: "ACCOUNTANT";
  VIEWER: "VIEWER";
}

export type WorkspaceMembershipRoleType = keyof WorkspaceMembershipRole;

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceMembershipRoleType;
  status: "ACTIVE" | "INVITED" | "DISABLED";
  createdAt: Date;
}
