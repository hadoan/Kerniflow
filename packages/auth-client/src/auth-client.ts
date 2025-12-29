import { request, createIdempotencyKey, HttpError } from "@kerniflow/api-client";
import type { TokenStorage } from "./storage/storage.interface";

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

export interface AuthClientConfig {
  apiUrl: string;
  storage: TokenStorage;
}

export class AuthClient {
  private storage: TokenStorage;
  private apiUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(config: AuthClientConfig) {
    this.storage = config.storage;
    this.apiUrl = config.apiUrl;
  }

  /**
   * Initialize from stored tokens
   */
  async loadStoredTokens(): Promise<void> {
    this.accessToken = await this.storage.getAccessToken();
    this.refreshToken = await this.storage.getRefreshToken();
  }

  /**
   * Store tokens
   */
  private async storeTokens(accessToken: string, refreshToken: string): Promise<void> {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;

    await this.storage.setAccessToken(accessToken);
    await this.storage.setRefreshToken(refreshToken);
  }

  /**
   * Clear stored tokens
   */
  async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;
    await this.storage.clear();
  }

  /**
   * Get current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Get current refresh token
   */
  getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Sign up
   */
  async signup(data: SignUpData): Promise<AuthResponse> {
    const result = await request<AuthResponse>({
      url: `${this.apiUrl}/auth/signup`,
      method: "POST",
      body: data,
      idempotencyKey: createIdempotencyKey(),
    });
    await this.storeTokens(result.accessToken, result.refreshToken);
    const workspaceId = result.workspaceId ?? result.tenantId;
    if (workspaceId) {
      await this.storage.setActiveWorkspaceId(workspaceId);
    }

    return result;
  }

  /**
   * Sign in
   */
  async signin(data: SignInData): Promise<AuthResponse> {
    const result = await request<AuthResponse>({
      url: `${this.apiUrl}/auth/login`,
      method: "POST",
      body: data,
    });
    await this.storeTokens(result.accessToken, result.refreshToken);
    const workspaceId = result.workspaceId ?? result.tenantId ?? data.workspaceId ?? data.tenantId;
    if (workspaceId) {
      await this.storage.setActiveWorkspaceId(workspaceId);
    }

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
        url: `${this.apiUrl}/auth/me`,
        method: "GET",
        accessToken: this.accessToken,
      });
    } catch (error) {
      if (error instanceof HttpError && error.status === 401) {
        await this.refreshAccessToken();
        return this.getCurrentUser();
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
      url: `${this.apiUrl}/auth/refresh`,
      method: "POST",
      body: { refreshToken: this.refreshToken },
    });

    await this.storeTokens(result.accessToken, result.refreshToken);
  }

  /**
   * Sign out
   */
  async signout(): Promise<void> {
    if (this.accessToken) {
      try {
        await request({
          url: `${this.apiUrl}/auth/logout`,
          method: "POST",
          accessToken: this.accessToken,
          body: { refreshToken: this.refreshToken },
        });
      } catch (error) {
        // Ignore errors on logout
      }
    }

    await this.clearTokens();
  }

  /**
   * Switch tenant
   */
  async switchTenant(tenantId: string): Promise<AuthResponse> {
    if (!this.accessToken) {
      throw new Error("No access token");
    }

    const result = await request<AuthResponse>({
      url: `${this.apiUrl}/auth/switch-tenant`,
      method: "POST",
      accessToken: this.accessToken,
      body: { tenantId },
    });
    await this.storeTokens(result.accessToken, result.refreshToken);
    await this.storage.setActiveWorkspaceId(result.workspaceId ?? result.tenantId ?? tenantId);

    return result;
  }
}
