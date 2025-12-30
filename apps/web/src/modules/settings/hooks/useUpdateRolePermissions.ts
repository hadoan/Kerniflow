import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { UpdateRolePermissionsRequest } from "@corely/contracts";
import { identityApi } from "@/lib/identity-api";
import { settingsQueryKeys } from "./settings.queryKeys";

export function useUpdateRolePermissions(roleId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: UpdateRolePermissionsRequest) =>
      identityApi.updateRolePermissions(roleId, input),
    onSuccess: () => {
      toast.success("Permissions updated");
      void queryClient.invalidateQueries({ queryKey: settingsQueryKeys.roles.permissions(roleId) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update permissions: ${error.message}`);
    },
  });
}
