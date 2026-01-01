import React, { useMemo } from "react";
import { Toaster } from "@/shared/ui/toaster";
import { Toaster as Sonner } from "@/shared/ui/sonner";
import { TooltipProvider } from "@/shared/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { computeBackoffDelayMs, defaultRetryPolicy } from "@corely/api-client";
import { AuthProvider } from "@/lib/auth-provider";
import { WorkspaceProvider } from "@/shared/workspaces/workspace-provider";
import { OfflineProvider } from "@/offline/offline-provider";
import { ShellConfigProvider } from "./shell-config-provider";

export const Providers = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useMemo(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 2,
            retryDelay: (attempt) => computeBackoffDelayMs(attempt, defaultRetryPolicy),
          },
        },
      }),
    []
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <WorkspaceProvider>
          <ShellConfigProvider>
            <OfflineProvider queryClient={queryClient}>
              <TooltipProvider>
                {children}
                <Toaster />
                <Sonner />
              </TooltipProvider>
            </OfflineProvider>
          </ShellConfigProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};
