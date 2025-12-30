import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { CreateRoleInput, UpdateRoleInput } from "@corely/contracts";
import { identityApi } from "@/lib/identity-api";
import { settingsQueryKeys } from "./settings.queryKeys";

export function useRoles() {
  return useQuery({
    queryKey: settingsQueryKeys.roles.list(),
    queryFn: () => identityApi.listRoles(),
    staleTime: 30 * 1000,
  });
}

export function useCreateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateRoleInput) => identityApi.createRole(input),
    onSuccess: (role) => {
      toast.success(`Role "${role.name}" created`);
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.roles.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });
}

export function useUpdateRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ roleId, patch }: { roleId: string; patch: UpdateRoleInput }) =>
      identityApi.updateRole(roleId, patch),
    onSuccess: (role) => {
      toast.success(`Role "${role.name}" updated`);
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.roles.all() });
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.roles.detail(role.id) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (roleId: string) => identityApi.deleteRole(roleId),
    onSuccess: () => {
      toast.success("Role deleted");
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.roles.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });
}
