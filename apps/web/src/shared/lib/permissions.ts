import { useAuth } from "@/lib/auth-provider";
import type { RolePermissionState } from "@corely/contracts";

export const useActiveRoleId = () => {
  const { user } = useAuth();
  const activeTenantId = user?.activeWorkspaceId ?? user?.activeTenantId;
  const membership = user?.memberships?.find(
    (entry) => entry.tenantId === activeTenantId || entry.workspaceId === activeTenantId
  );

  return {
    roleId: membership?.roleId,
    activeTenantId,
  };
};

export const hasPermission = (grants: RolePermissionState[] | undefined, key: string): boolean => {
  return grants?.some((grant) => grant.key === key && grant.granted) ?? false;
};
