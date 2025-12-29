import type { TokenStorage } from "@kerniflow/auth-client";
import { getActiveWorkspaceId, setActiveWorkspaceId } from "@/shared/workspaces/workspace-store";

/**
 * Web Storage Adapter
 * Integrates @kerniflow/auth-client with workspace-store
 */
export class WebStorageAdapter implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";

  async setAccessToken(token: string): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.ACCESS_TOKEN_KEY, token);
    }
  }

  async getAccessToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.ACCESS_TOKEN_KEY);
    }
    return null;
  }

  async setRefreshToken(token: string): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.REFRESH_TOKEN_KEY, token);
    }
  }

  async getRefreshToken(): Promise<string | null> {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.REFRESH_TOKEN_KEY);
    }
    return null;
  }

  async setActiveWorkspaceId(workspaceId: string): Promise<void> {
    setActiveWorkspaceId(workspaceId);
  }

  async getActiveWorkspaceId(): Promise<string | null> {
    return getActiveWorkspaceId();
  }

  async clear(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    }
    setActiveWorkspaceId(null);
  }
}
