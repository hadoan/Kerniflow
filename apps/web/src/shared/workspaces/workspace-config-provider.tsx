import React, { createContext, useContext } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { WorkspaceCapabilityKey, WorkspaceConfig } from "@corely/contracts";
import { useWorkspace } from "./workspace-provider";
import { workspacesApi } from "./workspaces-api";
import { useAuth } from "@/lib/auth-provider";

interface WorkspaceConfigContextValue {
  config: WorkspaceConfig | null;
  isLoading: boolean;
  error: Error | null;
  hasCapability: (capability: WorkspaceCapabilityKey) => boolean;
  can: (capability: WorkspaceCapabilityKey) => boolean;
  refresh: () => Promise<void>;
}

const WorkspaceConfigContext = createContext<WorkspaceConfigContextValue | undefined>(undefined);

export const WorkspaceConfigProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { isAuthenticated } = useAuth();
  const enabled = isAuthenticated && !!activeWorkspaceId;

  const {
    data: config,
    isFetching,
    error,
    refetch,
  } = useQuery<WorkspaceConfig, Error>({
    queryKey: ["workspace-config", activeWorkspaceId],
    queryFn: () =>
      workspacesApi.getWorkspaceConfig(activeWorkspaceId as string, {
        scope: "web",
      }),
    enabled,
    staleTime: 60_000,
  });

  const hasCapability = (capability: WorkspaceCapabilityKey) =>
    Boolean(config?.capabilities?.[capability]);

  const value: WorkspaceConfigContextValue = {
    config: config ?? null,
    isLoading: isFetching,
    error: error ?? null,
    hasCapability,
    can: hasCapability,
    refresh: async () => {
      await refetch();
      if (activeWorkspaceId) {
        await queryClient.invalidateQueries({ queryKey: ["workspace-config", activeWorkspaceId] });
      }
    },
  };

  return (
    <WorkspaceConfigContext.Provider value={value}>{children}</WorkspaceConfigContext.Provider>
  );
};

export const useWorkspaceConfig = (): WorkspaceConfigContextValue => {
  const ctx = useContext(WorkspaceConfigContext);
  if (!ctx) {
    throw new Error("useWorkspaceConfig must be used within WorkspaceConfigProvider");
  }
  return ctx;
};
