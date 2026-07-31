import { createContext } from "react";
import type { AuthResponse, CurrentUserResponse, SignInData, SignUpData } from "./auth-client";

export interface AuthContextValue {
  user: CurrentUserResponse | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signup: (data: SignUpData) => Promise<AuthResponse>;
  signin: (data: SignInData) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string | null) => Promise<AuthResponse>;
  refresh: () => Promise<void>;
  error: string | null;
}

// Keep the context in a non-refresh-boundary module so Vite Fast Refresh cannot
// leave consumers pointing at a different context instance than the provider.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
