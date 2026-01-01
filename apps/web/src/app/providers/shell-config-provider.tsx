import React, { createContext, useContext, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ShellConfig } from "@corely/contracts";
import { apiClient } from "@/lib/api-client";
import { useWorkspace } from "@/shared/workspaces/workspace-provider";

interface ShellConfigContextValue {
  config: ShellConfig | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

const ShellConfigContext = createContext<ShellConfigContextValue | undefined>(undefined);

interface ShellConfigProviderProps {
  children: ReactNode;
  scope?: "web" | "pos";
}

/**
 * Shell Config Provider
 *
 * Fetches and provides server-driven UI configuration for the current workspace.
 * This is the single source of truth for:
 * - Navigation structure
 * - Feature capabilities
 * - UI terminology
 * - Home/dashboard widgets
 * - Enabled modules
 *
 * The config is computed server-side based on:
 * - Workspace kind (PERSONAL/COMPANY)
 * - Enabled apps/modules
 * - User permissions (RBAC)
 * - Tenant customizations
 */
export function ShellConfigProvider({ children, scope = "web" }: ShellConfigProviderProps) {
  const { activeWorkspace } = useWorkspace();

  const {
    data: config,
    isLoading,
    error,
    refetch,
  } = useQuery<ShellConfig, Error>({
    queryKey: ["shell-config", activeWorkspace?.id, scope],
    queryFn: async () => {
      if (!activeWorkspace?.id) {
        throw new Error("No active workspace");
      }

      const response = await apiClient.request<ShellConfig>(
        `/shell-config?scope=${scope}&workspaceId=${activeWorkspace.id}`
      );

      return response;
    },
    enabled: !!activeWorkspace?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: 2,
  });

  return (
    <ShellConfigContext.Provider
      value={{
        config,
        isLoading,
        error: error || null,
        refetch,
      }}
    >
      {children}
    </ShellConfigContext.Provider>
  );
}

/**
 * Hook to access shell configuration
 *
 * @throws Error if used outside ShellConfigProvider
 */
export function useShellConfig(): ShellConfigContextValue {
  const context = useContext(ShellConfigContext);
  if (!context) {
    throw new Error("useShellConfig must be used within ShellConfigProvider");
  }
  return context;
}

/**
 * Hook to access capabilities from shell config
 *
 * Convenience hook for checking feature capabilities.
 * Returns empty capabilities object if config not loaded yet.
 */
export function useCapabilities() {
  const { config } = useShellConfig();
  return config?.capabilities ?? getDefaultCapabilities();
}

/**
 * Hook to access terminology from shell config
 *
 * Convenience hook for getting UI labels.
 * Returns default terminology if config not loaded yet.
 */
export function useTerminology() {
  const { config } = useShellConfig();
  return config?.terminology ?? getDefaultTerminology();
}

/**
 * Hook to check if a module is enabled
 */
export function useIsModuleEnabled(moduleId: string): boolean {
  const { config } = useShellConfig();
  return config?.enabledModules.includes(moduleId) ?? false;
}

/**
 * Default capabilities (used as fallback before config loads)
 */
function getDefaultCapabilities() {
  return {
    multiUser: false,
    rbac: false,
    approvals: false,
    advancedInvoicing: false,
    quotes: false,
    projects: false,
    timeTracking: false,
    purchaseOrders: false,
    supplierPortal: false,
    inventory: false,
    warehouses: false,
    serialTracking: false,
    costCenters: false,
    budgeting: false,
    multiCurrency: false,
    vatReporting: false,
    taxProfiles: false,
    advancedCrm: false,
    marketing: false,
    pos: false,
    posMultiRegister: false,
    aiCopilot: false,
    apiAccess: false,
    webhooks: false,
    customFields: false,
  };
}

/**
 * Default terminology (used as fallback before config loads)
 */
function getDefaultTerminology() {
  return {
    partyLabel: "Client",
    partyLabelPlural: "Clients",
    invoiceLabel: "Invoice",
    invoiceLabelPlural: "Invoices",
    quoteLabel: "Quote",
    quoteLabelPlural: "Quotes",
    projectLabel: "Project",
    projectLabelPlural: "Projects",
    expenseLabel: "Expense",
    expenseLabelPlural: "Expenses",
  };
}
