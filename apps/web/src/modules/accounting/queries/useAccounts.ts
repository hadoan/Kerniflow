import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";
import type {
  ListLedgerAccountsInput,
  CreateLedgerAccountInput,
  UpdateLedgerAccountInput,
} from "@kerniflow/contracts";

// Query: List accounts
export function useAccounts(query?: ListLedgerAccountsInput) {
  return useQuery({
    queryKey: accountingQueryKeys.accounts.list(query),
    queryFn: () => accountingApi.listAccounts(query),
    staleTime: 30 * 1000, // 30 seconds
  });
}

// Query: Get single account
export function useAccount(accountId: string | undefined) {
  return useQuery({
    queryKey: accountingQueryKeys.accounts.detail(accountId || ""),
    queryFn: () => accountingApi.getAccount(accountId || ""),
    enabled: !!accountId,
    staleTime: 30 * 1000,
  });
}

// Mutation: Create account
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateLedgerAccountInput) => accountingApi.createAccount(input),
    onSuccess: (account) => {
      toast.success(`Account "${account.name}" created successfully`);
      // Invalidate all account lists and the detail
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.lists() });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.detail(account.id) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });
}

// Mutation: Update account
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      patch,
    }: {
      accountId: string;
      patch: Omit<UpdateLedgerAccountInput, "accountId">;
    }) => accountingApi.updateAccount(accountId, patch),
    onSuccess: (account) => {
      toast.success(`Account "${account.name}" updated successfully`);
      // Invalidate all account lists and the specific detail
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.lists() });
      void queryClient.invalidateQueries({ queryKey: accountingQueryKeys.accounts.detail(account.id) });
    },
    onError: (error: Error) => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });
}
