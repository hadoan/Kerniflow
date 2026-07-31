import React, { useContext, useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  authClient,
  type CurrentUserResponse,
  type SignUpData,
  type SignInData,
  type AuthResponse,
} from "./auth-client";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { setActiveWorkspaceId } from "@corely/web-shared/shared/workspaces/workspace-store";
import { setPublicWorkspaceSlug } from "@corely/web-shared/shared/public-workspace";
import { clearClientLocalData } from "./clear-local-data";

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider
 * Wraps app with authentication context
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<CurrentUserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        await authClient.loadStoredTokens();

        if (authClient.getAccessToken()) {
          const currentUser = await authClient.getCurrentUser();
          const workspaceId = currentUser.activeWorkspaceId ?? currentUser.activeTenantId ?? null;
          setActiveWorkspaceId(workspaceId);
          setUser(currentUser);
        }
      } catch (err) {
        await authClient.clearTokens();
        setError(err instanceof Error ? err.message : "Auth initialization failed");
      } finally {
        setIsLoading(false);
      }
    };

    void initAuth();
  }, []);

  const signup = async (data: SignUpData): Promise<AuthResponse> => {
    try {
      setError(null);
      const result = await authClient.signup(data);
      // Fetch user data after signup
      const currentUser = await authClient.getCurrentUser();
      const workspaceId = currentUser.activeWorkspaceId ?? currentUser.activeTenantId ?? null;
      setActiveWorkspaceId(workspaceId);
      setUser(currentUser);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      throw err;
    }
  };

  const signin = async (data: SignInData): Promise<AuthResponse> => {
    try {
      setError(null);
      const result = await authClient.signin(data);
      // Fetch user data after signin
      const currentUser = await authClient.getCurrentUser();
      const workspaceId =
        currentUser.activeWorkspaceId ??
        currentUser.activeTenantId ??
        data.workspaceId ??
        data.tenantId ??
        null;
      setActiveWorkspaceId(workspaceId);
      setUser(currentUser);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    let logoutError: unknown;
    try {
      setError(null);
      await authClient.signout();
    } catch (err) {
      logoutError = err;
    } finally {
      await authClient.clearTokens();
      setActiveWorkspaceId(null);
      setPublicWorkspaceSlug(null);
      queryClient.clear();
      await clearClientLocalData();
      setUser(null);
    }

    if (logoutError) {
      const message = logoutError instanceof Error ? logoutError.message : "Logout failed";
      setError(message);
      throw logoutError;
    }
  };

  const switchTenant = async (tenantId: string | null): Promise<AuthResponse> => {
    try {
      setError(null);
      const result = await authClient.switchTenant(tenantId);
      // Fetch updated user data
      const currentUser = await authClient.getCurrentUser();
      setActiveWorkspaceId(tenantId ?? null);
      setUser(currentUser);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Tenant switch failed";
      setError(message);
      throw err;
    }
  };

  const refresh = async (): Promise<void> => {
    try {
      await authClient.refreshAccessToken();
      if (authClient.getAccessToken()) {
        const currentUser = await authClient.getCurrentUser();
        const workspaceId = currentUser.activeWorkspaceId ?? currentUser.activeTenantId ?? null;
        setActiveWorkspaceId(workspaceId);
        setUser(currentUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    }
  };

  const value: AuthContextValue = {
    user,
    isLoading,
    isAuthenticated: !!user,
    signup,
    signin,
    logout,
    switchTenant,
    refresh,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * useAuth hook
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
