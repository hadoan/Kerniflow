import type { TokenStorage } from "@kerniflow/auth-client";
import * as SecureStore from "expo-secure-store";

/**
 * Native Storage Adapter
 * React Native implementation using expo-secure-store
 */
export class NativeStorageAdapter implements TokenStorage {
  private readonly ACCESS_TOKEN_KEY = "accessToken";
  private readonly REFRESH_TOKEN_KEY = "refreshToken";
  private readonly WORKSPACE_ID_KEY = "activeWorkspaceId";

  async setAccessToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(this.ACCESS_TOKEN_KEY, token);
  }

  async getAccessToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.ACCESS_TOKEN_KEY);
  }

  async setRefreshToken(token: string): Promise<void> {
    await SecureStore.setItemAsync(this.REFRESH_TOKEN_KEY, token);
  }

  async getRefreshToken(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.REFRESH_TOKEN_KEY);
  }

  async setActiveWorkspaceId(workspaceId: string): Promise<void> {
    await SecureStore.setItemAsync(this.WORKSPACE_ID_KEY, workspaceId);
  }

  async getActiveWorkspaceId(): Promise<string | null> {
    return await SecureStore.getItemAsync(this.WORKSPACE_ID_KEY);
  }

  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(this.ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(this.WORKSPACE_ID_KEY);
  }
}
