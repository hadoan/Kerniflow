import { apiClient } from "./api-client";
import type {
  RoleDto,
  CreateRoleInput,
  UpdateRoleInput,
  RolePermissionsResponse,
  UpdateRolePermissionsRequest,
  PermissionCatalogResponse,
} from "@corely/contracts";

export const identityApi = {
  async listRoles(): Promise<RoleDto[]> {
    const response = await apiClient.get<{ roles: RoleDto[] }>("/identity/roles");
    return response.roles;
  },

  async createRole(input: CreateRoleInput): Promise<RoleDto> {
    const response = await apiClient.post<{ role: RoleDto }>("/identity/roles", input);
    return response.role;
  },

  async updateRole(roleId: string, input: UpdateRoleInput): Promise<RoleDto> {
    const response = await apiClient.patch<{ role: RoleDto }>(`/identity/roles/${roleId}`, input);
    return response.role;
  },

  async deleteRole(roleId: string): Promise<void> {
    await apiClient.delete(`/identity/roles/${roleId}`);
  },

  async getPermissionCatalog(): Promise<PermissionCatalogResponse["catalog"]> {
    const response = await apiClient.get<PermissionCatalogResponse>(
      "/identity/permissions/catalog"
    );
    return response.catalog;
  },

  async getRolePermissions(roleId: string): Promise<RolePermissionsResponse> {
    return apiClient.get<RolePermissionsResponse>(`/identity/roles/${roleId}/permissions`);
  },

  async updateRolePermissions(roleId: string, input: UpdateRolePermissionsRequest): Promise<void> {
    await apiClient.put(`/identity/roles/${roleId}/permissions`, input);
  },
};
