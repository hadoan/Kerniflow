import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export interface App {
  appId: string;
  name: string;
  tier: number;
  version: string;
  description?: string;
  dependencies: string[];
  capabilities: string[];
  permissions: string[];
  enabled?: boolean;
  installedVersion?: string;
}

export interface AppWithStatus extends App {
  enabled: boolean;
  installedVersion?: string;
}

/**
 * Fetch all apps with tenant install status
 */
export function usePlatformApps() {
  return useQuery({
    queryKey: ["platform", "apps"],
    queryFn: async () => {
      const response = await apiClient.get<{ apps: AppWithStatus[] }>("/platform/apps");
      return response.data.apps;
    },
  });
}

/**
 * Enable an app for the current tenant
 */
export function useEnableApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (appId: string) => {
      const response = await apiClient.post<{ appId: string; enabledDependencies: string[] }>(
        `/platform/apps/${appId}/enable`
      );
      return response.data;
    },
    onSuccess: () => {
      // Invalidate apps list to refetch with updated status
      void queryClient.invalidateQueries({ queryKey: ["platform", "apps"] });
    },
  });
}

/**
 * Disable an app for the current tenant
 */
export function useDisableApp() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ appId, force }: { appId: string; force?: boolean }) => {
      const response = await apiClient.post<{ appId: string }>(`/platform/apps/${appId}/disable`, {
        force,
      });
      return response.data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["platform", "apps"] });
    },
  });
}
