import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";
import type { UpdateAccountingSettingsInput, SetupAccountingInput } from "@corely/contracts";

// Query: Get accounting settings
export function useAccountingSettings() {
  return useQuery({
    queryKey: accountingQueryKeys.settings(),
    queryFn: () => accountingApi.getSettings(),
    staleTime: 5 * 60 * 1000, // 5 minutes - settings change rarely
  });
}

// Mutation: Setup accounting (initial setup)
export function useSetupAccounting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SetupAccountingInput) => accountingApi.setupAccounting(input),
    onSuccess: () => {
      toast.success("Accounting setup completed successfully");
      // Invalidate setup status, settings, accounts, and periods
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.setupStatus() });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.settings() });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.all() });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.periods.all() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to setup accounting: ${error.message}`);
    },
  });
}

// Mutation: Update accounting settings
export function useUpdateAccountingSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (patch: UpdateAccountingSettingsInput) => accountingApi.updateSettings(patch),
    onSuccess: () => {
      toast.success("Accounting settings updated successfully");
      // Invalidate settings
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.settings() });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update settings: ${error.message}`);
    },
  });
}
