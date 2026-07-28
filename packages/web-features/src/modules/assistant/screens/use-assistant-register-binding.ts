import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { cashManagementApi } from "@corely/web-shared/lib/cash-management-api";
import { type RegisterBindingRequest } from "@corely/web-shared/lib/cash-management-api";
import { type CashAssistantWorkspace } from "@corely/contracts";
import { THREAD_LIST_QUERY_KEY } from "./assistant-utils";

export function useAssistantRegisterBinding(
  activeModule: string | undefined,
  threadId: string | undefined,
  t: any,
  toast: any,
  getErrorMessage: (e: unknown) => string | undefined
) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [registerBindingError, setRegisterBindingError] = useState<string | null>(null);
  const [lastBindingRequest, setLastBindingRequest] = useState<RegisterBindingRequest | null>(null);
  const lastAutoBindingKeyRef = useRef<string | null>(null);

  const resolveWorkspaceMutation = useMutation({
    mutationFn: (params: RegisterBindingRequest) =>
      cashManagementApi.resolveWorkspace({
        type: "GENERAL_HELP",
        registerId: params.registerId,
        conversationId: params.conversationId,
      }),
    onMutate: () => {
      setRegisterBindingError(null);
    },
    onSuccess: (ws) => {
      setRegisterBindingError(null);
      queryClient.setQueryData<{ items: CashAssistantWorkspace[] }>(
        ["cash-workspaces"],
        (current) => ({
          items: [
            ...(current?.items ?? []).filter(
              (workspace) => workspace.conversationId !== ws.conversationId
            ),
            ws,
          ],
        })
      );
      void queryClient.invalidateQueries({ queryKey: THREAD_LIST_QUERY_KEY });
      if (ws.conversationId && ws.conversationId !== threadId) {
        navigate(`/assistant/t/${ws.conversationId}`);
      }
    },
    onError: (error: unknown) => {
      const message = getErrorMessage(error);
      setRegisterBindingError(message ?? t("cashDashboard.registerSelector.error"));
      toast({
        title: t("cashDashboard.registerSelector.error", "Could not set the cash register."),
        description: message,
        variant: "destructive",
      });
    },
  });

  const bindRegister = useCallback(
    (request: RegisterBindingRequest) => {
      setLastBindingRequest(request);
      setRegisterBindingError(null);
      resolveWorkspaceMutation.mutate(request);
    },
    [resolveWorkspaceMutation.mutate]
  );

  return {
    registerBindingError,
    setRegisterBindingError,
    lastBindingRequest,
    setLastBindingRequest,
    lastAutoBindingKeyRef,
    resolveWorkspaceMutation,
    bindRegister,
  };
}
