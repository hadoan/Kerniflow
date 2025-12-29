import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  authClient,
  type CurrentUserResponse,
  type SignUpData,
  type SignInData,
  type AuthResponse,
} from "./auth-client";
import { setActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

interface AuthContextType {
  user: CurrentUserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignUpData) => Promise<AuthResponse>;
  signin: (data: SignInData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<AuthResponse>;
  refresh: () => Promise<void>;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider
 * Wraps app with authentication context
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
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
      const workspaceId = currentUser.activeWorkspaceId ?? currentUser.activeTenantId;
      if (workspaceId) {
        setActiveWorkspaceId(workspaceId);
      }
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
        data.tenantId;
      if (workspaceId) {
        setActiveWorkspaceId(workspaceId);
      }
      setUser(currentUser);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Sign in failed";
      setError(message);
      throw err;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      setError(null);
      await authClient.signout();
      setActiveWorkspaceId(null);
      setUser(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Logout failed";
      setError(message);
      throw err;
    }
  };

  const switchTenant = async (tenantId: string): Promise<AuthResponse> => {
    try {
      setError(null);
      const result = await authClient.switchTenant(tenantId);
      // Fetch updated user data
      const currentUser = await authClient.getCurrentUser();
      setActiveWorkspaceId(tenantId);
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
        const workspaceId = currentUser.activeWorkspaceId ?? currentUser.activeTenantId;
        if (workspaceId) {
          setActiveWorkspaceId(workspaceId);
        }
        setUser(currentUser);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed");
    }
  };

  const value: AuthContextType = {
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
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
