import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

export interface MenuItem {
  id: string;
  section: string;
  label: string;
  route?: string;
  screen?: string;
  icon: string;
  order: number;
  pinned?: boolean;
  tags?: string[];
}

export interface WorkspaceMetadata {
  kind: "PERSONAL" | "COMPANY";
  capabilities: {
    multiUser: boolean;
    quotes: boolean;
    aiCopilot: boolean;
    rbac: boolean;
  };
  terminology: {
    partyLabel: string;
    partyLabelPlural: string;
  };
}

export interface ComposedMenu {
  scope: string;
  items: MenuItem[];
  computedAt: string;
  workspace?: WorkspaceMetadata; // Server-driven UI metadata
}

export interface MenuOverrides {
  hidden?: string[];
  order?: Record<string, number>;
  renames?: Record<string, string>;
  pins?: string[];
}

/**
 * Fetch composed menu for current user with workspace metadata
 */
export function useMenu(scope: "web" | "pos" = "web") {
  const { activeWorkspace } = useWorkspace();
  const enabled = !!activeWorkspace?.id;

  console.debug("[useMenu] hook init", {
    scope,
    workspaceId: activeWorkspace?.id,
    enabled,
  });

  return useQuery({
    queryKey: ["menu", scope, activeWorkspace?.id],
    queryFn: async () => {
      console.debug("[useMenu] fetching menu", {
        scope,
        workspaceId: activeWorkspace?.id,
      });
      const workspaceParam = activeWorkspace?.id ? `&workspaceId=${activeWorkspace.id}` : "";
      const result = await apiClient.get<ComposedMenu>(`/menu?scope=${scope}${workspaceParam}`);
      console.debug("[useMenu] menu response", {
        scope,
        workspaceId: activeWorkspace?.id,
        items: result?.items?.length ?? 0,
        computedAt: result?.computedAt,
      });
      return result;
    },
    enabled, // Only fetch when workspace is available
    onError: (error) => {
      console.error("[useMenu] menu fetch failed", {
        scope,
        workspaceId: activeWorkspace?.id,
        error,
      });
    },
  });
}

/**
 * Update menu overrides (hide, reorder, rename, pin)
 */
export function useUpdateMenuOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      scope,
      overrides,
    }: {
      scope: "web" | "pos";
      overrides: MenuOverrides;
    }) => {
      return apiClient.put(`/menu/overrides?scope=${scope}`, { overrides });
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["menu", variables.scope] });
    },
  });
}

/**
 * Reset menu overrides to defaults
 */
export function useResetMenuOverrides() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (scope: "web" | "pos") => {
      return apiClient.delete(`/menu/overrides?scope=${scope}`);
    },
    onSuccess: (_data, scope) => {
      void queryClient.invalidateQueries({ queryKey: ["menu", scope] });
    },
  });
}
