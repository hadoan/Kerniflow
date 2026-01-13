import React from "react";
import NotFound from "@/shared/components/NotFound";
import { hasPermission, useActiveRoleId } from "@/shared/lib/permissions";
import { useWorkspaceConfig } from "@/shared/workspaces/workspace-config-provider";
import { useRolePermissions } from "../hooks/useRolePermissions";

interface RequirePermissionProps {
  permission: string;
  children: React.ReactNode;
}

export const RequirePermission: React.FC<RequirePermissionProps> = ({ permission, children }) => {
  const { hasCapability, isLoading: isConfigLoading } = useWorkspaceConfig();
  const rbacEnabled = hasCapability("workspace.rbac");
  const { roleId } = useActiveRoleId();
  const { data, isLoading } = useRolePermissions(rbacEnabled ? roleId : undefined);

  if (isConfigLoading) {
    return null;
  }

  if (!rbacEnabled) {
    return <>{children}</>;
  }

  if (isLoading) {
    return null;
  }

  if (!roleId) {
    return <NotFound />;
  }

  if (!hasPermission(data?.grants, permission)) {
    return <NotFound />;
  }

  return <>{children}</>;
};
