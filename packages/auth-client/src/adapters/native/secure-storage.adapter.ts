import type { TokenStorage } from "../../storage/storage.interface";

/**
 * SecureStorage Adapter
 * React Native platform implementation using expo-secure-store
 */
export class SecureStorageAdapter implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";
  private readonly WORKSPACE_ID_KEY = "activeWorkspaceId";

  private SecureStore: any;

  constructor() {
    // Lazy load expo-secure-store to avoid import errors on web
    try {
      this.SecureStore = require("expo-secure-store");
    } catch {
      throw new Error(
        "expo-secure-store is required for SecureStorageAdapter. Install it with: npx expo install expo-secure-store"
      );
    }
  }

  async setAccessToken(token: string): Promise<void> {
    await this.SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, token);
  }

  async getAccessToken(): Promise<string | null> {
    return await this.SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
  }

  async setRefreshToken(token: string): Promise<void> {
    await this.SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return await this.SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
  }

  async setActiveWorkspaceId(workspaceId: string): Promise<void> {
    await this.SecureStore.setItemAsync(this.WORKSPACE_ID_KEY, workspaceId);
  }

  async getActiveWorkspaceId(): Promise<string | null> {
    return await this.SecureStore.getItemAsync(this.WORKSPACE_ID_KEY);
  }

  async clear(): Promise<void> {
    await this.SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY);
    await this.SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY);
    await this.SecureStore.deleteItemAsync(this.WORKSPACE_ID_KEY);
  }
}
