import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { WorkspaceDto } from "@corely/contracts";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { workspacesApi } from "./workspaces-api";
import { getActiveWorkspaceId, setActiveWorkspaceId, subscribeWorkspace } from "./workspace-store";
import { useAuth } from "@/lib/auth-provider";

interface WorkspaceContextValue {
  workspaces: WorkspaceDto[];
  activeWorkspace: WorkspaceDto | null;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  setWorkspace: (workspaceId: string) => void;
  refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const [activeId, setActiveId] = useState<string | null>(getActiveWorkspaceId());

  console.debug("[WorkspaceProvider] init", {
    isAuthenticated,
    initialActiveId: activeId,
  });

  const {
    data: workspaces = [],
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => workspacesApi.listWorkspaces(),
    enabled: isAuthenticated,
    staleTime: 30_000,
    onSuccess: (ws) => {
      console.debug("[WorkspaceProvider] workspaces fetched", {
        count: ws.length,
        enabled: isAuthenticated,
        activeId,
      });
    },
  });

  // keep local and persisted workspace id in sync
  useEffect(() => {
    return subscribeWorkspace((id) => setActiveId(id));
  }, []);

  // Set default workspace once we have list
  useEffect(() => {
    console.debug("[WorkspaceProvider] evaluate default workspace", {
      activeId,
      workspaces: workspaces.length,
      isFetching,
    });

    if (!activeId && workspaces.length > 0) {
      console.debug("[WorkspaceProvider] setting default workspace", {
        id: workspaces[0].id,
        name: workspaces[0].name,
      });
      const defaultId = workspaces[0].id;
      setActiveWorkspaceId(defaultId);
      setActiveId(defaultId);
    }
  }, [activeId, workspaces]);

  // If stored activeId does not exist in fetched workspaces, fall back to first
  useEffect(() => {
    if (activeId && workspaces.length > 0) {
      const exists = workspaces.some((w) => w.id === activeId);
      if (!exists) {
        const fallbackId = workspaces[0].id;
        console.debug("[WorkspaceProvider] activeId not found, resetting to first workspace", {
          staleActiveId: activeId,
          fallbackId,
        });
        setActiveWorkspaceId(fallbackId);
        setActiveId(fallbackId);
      }
    }
  }, [activeId, workspaces]);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeId) ?? null,
    [activeId, workspaces]
  );

  const setWorkspace = (workspaceId: string) => {
    setActiveWorkspaceId(workspaceId);
    setActiveId(workspaceId);
    console.debug("[WorkspaceProvider] workspace selected", { workspaceId });
    void queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  };

  const value: WorkspaceContextValue = {
    workspaces,
    activeWorkspace,
    activeWorkspaceId: activeId,
    isLoading: isFetching,
    setWorkspace,
    refresh: async () => {
      await refetch();
    },
  };

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
};

export const useWorkspace = (): WorkspaceContextValue => {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within WorkspaceProvider");
  }
  return ctx;
};
