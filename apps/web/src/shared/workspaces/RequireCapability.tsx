import React from "react";
import type { WorkspaceCapabilityKey } from "@corely/contracts";
import NotFound from "@/shared/components/NotFound";
import { useWorkspaceConfig } from "./workspace-config-provider";

interface RequireCapabilityProps {
  capability: WorkspaceCapabilityKey;
  children: React.ReactNode;
}

export const RequireCapability: React.FC<RequireCapabilityProps> = ({ capability, children }) => {
  const { isLoading, hasCapability } = useWorkspaceConfig();

  if (isLoading) {
    return null;
  }

  if (!hasCapability(capability)) {
    return <NotFound />;
  }

  return <>{children}</>;
};
