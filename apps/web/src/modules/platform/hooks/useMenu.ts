import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

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

export interface ComposedMenu {
  scope: string;
  items: MenuItem[];
  computedAt: string;
}

export interface MenuOverrides {
  hidden?: string[];
  order?: Record<string, number>;
  renames?: Record<string, string>;
  pins?: string[];
}

/**
 * Fetch composed menu for current user
 */
export function useMenu(scope: "web" | "pos" = "web") {
  return useQuery({
    queryKey: ["menu", scope],
    queryFn: async () => {
      const response = await apiClient.get<ComposedMenu>(`/menu?scope=${scope}`);
      return response.data;
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
      const response = await apiClient.put(`/menu/overrides?scope=${scope}`, { overrides });
      return response.data;
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
      const response = await apiClient.delete(`/menu/overrides?scope=${scope}`);
      return response.data;
    },
    onSuccess: (_data, scope) => {
      void queryClient.invalidateQueries({ queryKey: ["menu", scope] });
    },
  });
}
