import { useQuery } from "@tanstack/react-query";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";
import type {
  GetTrialBalanceInput,
  GetGeneralLedgerInput,
  GetProfitLossInput,
  GetBalanceSheetInput,
} from "@kerniflow/contracts";

// Query: Trial Balance
export function useTrialBalance(params: GetTrialBalanceInput) {
  return useQuery({
    queryKey: accountingQueryKeys.reports.trialBalance(params),
    queryFn: () => accountingApi.getTrialBalance(params),
    staleTime: 60 * 1000, // 1 minute - reports can be expensive to compute
    enabled: !!(params.fromDate && params.toDate),
  });
}

// Query: General Ledger
export function useGeneralLedger(params: GetGeneralLedgerInput) {
  return useQuery({
    queryKey: accountingQueryKeys.reports.generalLedger(params),
    queryFn: () => accountingApi.getGeneralLedger(params),
    staleTime: 60 * 1000,
    enabled: !!(params.accountId && params.fromDate && params.toDate),
  });
}

// Query: Profit & Loss
export function useProfitLoss(params: GetProfitLossInput) {
  return useQuery({
    queryKey: accountingQueryKeys.reports.profitLoss(params),
    queryFn: () => accountingApi.getProfitLoss(params),
    staleTime: 60 * 1000,
    enabled: !!(params.fromDate && params.toDate),
  });
}

// Query: Balance Sheet
export function useBalanceSheet(params: GetBalanceSheetInput) {
  return useQuery({
    queryKey: accountingQueryKeys.reports.balanceSheet(params),
    queryFn: () => accountingApi.getBalanceSheet(params),
    staleTime: 60 * 1000,
    enabled: !!params.asOfDate,
  });
}
