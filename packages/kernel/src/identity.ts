export type TenantId = string;
export type EntityId = string;

export interface TenantScoped {
  tenantId: TenantId;
}

export interface Identifiable {
  id: EntityId;
}
