import { useQuery } from "@tanstack/react-query";
import { accountingApi } from "@/lib/accounting-api";
import { accountingQueryKeys } from "./accounting.queryKeys";

export function useSetupStatus() {
  return useQuery({
    queryKey: accountingQueryKeys.setupStatus(),
    queryFn: () => accountingApi.getSetupStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
