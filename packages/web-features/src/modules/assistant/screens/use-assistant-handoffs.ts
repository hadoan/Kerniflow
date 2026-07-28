import { useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";

export function useAssistantHandoffs(
  threadId: string | undefined,
  handoffId: string | null,
  searchParams: URLSearchParams,
  setSearchParams: (params: URLSearchParams, opts: any) => void
) {
  const handoffQuery = useQuery({
    queryKey: ["cash-management", "handoff", handoffId],
    queryFn: () => cashManagementApi.getHandoff(handoffId!),
    enabled: Boolean(handoffId),
  });

  const idempotencyKeyRef = useRef<string | null>(null);

  const confirmHandoffMutation = useMutation({
    mutationFn: async () => {
      if (!handoffQuery.data || !threadId) {
        return;
      }
      if (!idempotencyKeyRef.current) {
        idempotencyKeyRef.current = crypto.randomUUID();
      }
      return cashManagementApi.confirmHandoff(
        threadId,
        handoffQuery.data.id,
        idempotencyKeyRef.current
      );
    },
    onSuccess: () => {
      idempotencyKeyRef.current = null;
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("handoffId");
      setSearchParams(nextParams, { replace: true });
      void handoffQuery.refetch();
    },
    onError: (error) => {
      console.error("Failed to confirm handoff", error);
    },
  });

  const cancelHandoffMutation = useMutation({
    mutationFn: async () => {
      if (!handoffQuery.data || !threadId) {
        return;
      }
      return cashManagementApi.cancelHandoff(threadId, handoffQuery.data.id);
    },
    onSuccess: () => {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("handoffId");
      setSearchParams(nextParams, { replace: true });
      void handoffQuery.refetch();
    },
  });

  const markedViewedRef = useRef<string | null>(null);

  useEffect(() => {
    const handoff = handoffQuery.data;
    if (
      handoff &&
      threadId &&
      handoff.status === "PENDING" &&
      !handoff.viewedAt &&
      markedViewedRef.current !== handoff.id
    ) {
      markedViewedRef.current = handoff.id;
      void cashManagementApi.markHandoffViewed(threadId, handoff.id).catch(() => {
        markedViewedRef.current = null;
      });
    }
  }, [handoffQuery.data, threadId]);

  return {
    handoffQuery,
    confirmHandoffMutation,
    cancelHandoffMutation,
  };
}
