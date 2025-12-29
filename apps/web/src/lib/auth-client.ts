/**
 * Auth Client
 * Web platform wrapper around @kerniflow/auth-client
 */

import { AuthClient } from "@kerniflow/auth-client";
import { setActiveWorkspaceId } from "@/shared/workspaces/workspace-store";
import { WebStorageAdapter } from "./storage-adapter";

// Re-export types from shared package
export type {
  SignUpData,
  SignInData,
  AuthResponse,
  CurrentUserResponse,
} from "@kerniflow/auth-client";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const storage = new WebStorageAdapter();

// Create auth client with web storage adapter
const sharedAuthClient = new AuthClient({
  apiUrl: API_URL,
  storage,
});

// Wrapper class to maintain compatibility and integrate with workspace store
class WebAuthClient {
  public readonly client: AuthClient;

  constructor(client: AuthClient) {
    this.client = client;
  }

  async loadStoredTokens(): Promise<void> {
    await this.client.loadStoredTokens();
  }

  async clearTokens(): Promise<void> {
    await this.client.clearTokens();
    setActiveWorkspaceId(null);
  }

  getAccessToken(): string | null {
    return this.client.getAccessToken();
  }

  async signup(data: Parameters<AuthClient["signup"]>[0]) {
    const result = await this.client.signup(data);
    const workspaceId = result.workspaceId ?? result.tenantId;
    if (workspaceId) setActiveWorkspaceId(workspaceId);
    return result;
  }

  async signin(data: Parameters<AuthClient["signin"]>[0]) {
    const result = await this.client.signin(data);
    const workspaceId = result.workspaceId ?? result.tenantId ?? data.workspaceId ?? data.tenantId;
    if (workspaceId) setActiveWorkspaceId(workspaceId);
    return result;
  }

  async getCurrentUser() {
    return this.client.getCurrentUser();
  }

  async refreshAccessToken(): Promise<void> {
    return this.client.refreshAccessToken();
  }

  async signout(): Promise<void> {
    await this.client.signout();
    setActiveWorkspaceId(null);
  }

  async switchTenant(tenantId: string) {
    const result = await this.client.switchTenant(tenantId);
    setActiveWorkspaceId(result.workspaceId ?? result.tenantId ?? tenantId);
    return result;
  }
}

export const authClient = new WebAuthClient(sharedAuthClient);
