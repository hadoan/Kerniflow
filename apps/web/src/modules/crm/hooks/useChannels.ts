import { useQuery } from "@tanstack/react-query";
import type { ChannelDefinition } from "@corely/contracts";
import { crmApi } from "@/lib/crm-api";

export const channelQueryKeys = {
  list: ["crm", "channels"] as const,
};

export const useCrmChannels = () => {
  return useQuery<ChannelDefinition[]>({
    queryKey: channelQueryKeys.list,
    queryFn: () => crmApi.listChannels(),
    staleTime: 5 * 60 * 1000,
  });
};
