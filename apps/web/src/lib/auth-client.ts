/**
 * Auth Client
 * Handles HTTP calls to API auth endpoints using the shared retrying request wrapper
 */

import { request, createIdempotencyKey, HttpError } from "@kerniflow/api-client";
import { setActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

// Vite exposes env via import.meta.env, so avoid process.env on the client
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export interface SignUpData {
  email: string;
  password: string;
  tenantName: string;
  userName?: string;
}

export interface SignInData {
  email: string;
  password: string;
  tenantId?: string;
  workspaceId?: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  userId: string;
  email: string;
  tenantId?: string;
  tenantName?: string;
  workspaceId?: string;
}

export interface CurrentUserResponse {
  userId: string;
  email: string;
  name: string | null;
  activeTenantId?: string;
  activeWorkspaceId?: string;
  memberships: Array<{
    tenantId?: string;
    tenantName?: string;
    workspaceId?: string;
    workspaceName?: string;
    roleId: string;
  }>;
}

class AuthClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  /**
   * Initialize from stored tokens
   */
  loadStoredTokens(): void {
    if (typeof window !== "undefined") {
      this.accessToken = localStorage.getItem("accessToken");
      this.refreshToken = localStorage.getItem("refreshToken");
    }
  }

  /**
   * Store tokens
   */
  private storeTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    if (typeof window !== "undefined") {
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
    }
  }

  /**
   * Clear stored tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;

    if (typeof window !== "undefined") {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    }
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Sign up
   */
  async signup(data: SignUpData): Promise<AuthResponse> {
    const result = await request<AuthResponse>({
      url: `${API_URL}/auth/signup`,
      method: "POST",
      body: data,
      idempotencyKey: createIdempotencyKey(),
    });
    this.storeTokens(result.accessToken, result.refreshToken);
    const workspaceId = result.workspaceId ?? result.tenantId;
    if (workspaceId) setActiveWorkspaceId(workspaceId);

    return result;
  }

  /**
   * Sign in
   */
  async signin(data: SignInData): Promise<AuthResponse> {
    const result = await request<AuthResponse>({
      url: `${API_URL}/auth/login`,
      method: "POST",
      body: data,
    });
    this.storeTokens(result.accessToken, result.refreshToken);
    const workspaceId = result.workspaceId ?? result.tenantId ?? data.workspaceId ?? data.tenantId;
    if (workspaceId) setActiveWorkspaceId(workspaceId);

    return result;
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<CurrentUserResponse> {
    if (!this.accessToken) {
      throw new Error("No access token");
    }

    try {
      return await request<CurrentUserResponse>({
        url: `${API_URL}/auth/me`,
        method: "GET",
        accessToken: this.accessToken,
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        await this.refreshAccessToken();
        return this.getCurrentUser(); // Retry once after refresh
      }
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error("No refresh token");
    }

    const result = await request<{ accessToken: string; refreshToken: string }>({
      url: `${API_URL}/auth/refresh`,
      method: "POST",
      body: { refreshToken: this.refreshToken },
    });

    this.storeTokens(result.accessToken, result.refreshToken);
  }

  /**
   * Sign out
   */
  async signout(): Promise<void> {
    if (this.accessToken) {
      try {
        await request({
          url: `${API_URL}/auth/logout`,
          method: "POST",
          accessToken: this.accessToken,
          body: { refreshToken: this.refreshToken },
        });
      } catch (error) {
        // Ignore errors on logout
      }
    }

    this.clearTokens();
    setActiveWorkspaceId(null);
  }

  /**
   * Switch tenant
   */
  async switchTenant(tenantId: string): Promise<AuthResponse> {
    if (!this.accessToken) {
      throw new Error("No access token");
    }

    const result = await request<AuthResponse>({
      url: `${API_URL}/auth/switch-tenant`,
      method: "POST",
      accessToken: this.accessToken,
      body: { tenantId },
    });
    this.storeTokens(result.accessToken, result.refreshToken);
    setActiveWorkspaceId(result.workspaceId ?? result.tenantId ?? tenantId);

    return result;
  }

  /**
   * Generate idempotency key
   */
  private generateIdempotencyKey(): string {
    return createIdempotencyKey();
  }
}

export const authClient = new AuthClient();
