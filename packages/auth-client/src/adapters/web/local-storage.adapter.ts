import type { TokenStorage } from "../../storage/storage.interface";

/**
 * LocalStorage Adapter
 * Web platform implementation using browser localStorage
 */
export class LocalStorageAdapter implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";
  private readonly WORKSPACE_ID_KEY = "activeWorkspaceId";

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
    if (typeof window !== "undefined") {
      localStorage.setItem(this.WORKSPACE_ID_KEY, workspaceId);
    }
  }

  async getActiveWorkspaceId(): Promise<string | null> {
    if (typeof window !== "undefined") {
      return localStorage.getItem(this.WORKSPACE_ID_KEY);
    }
    return null;
  }

  async clear(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem(this.ACCESS_TOKEN_KEY);
      localStorage.removeItem(this.REFRESH_TOKEN_KEY);
      localStorage.removeItem(this.WORKSPACE_ID_KEY);
    }
  }
}
