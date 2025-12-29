/**
 * TokenStorage Interface
 * Platform-agnostic abstraction for secure token storage
 */
export interface TokenStorage {
  /**
   * Store access token
   */
  setAccessToken(token: string): Promise<void>;

  /**
   * Retrieve access token
   */
  getAccessToken(): Promise<string | null>;

  /**
   * Store refresh token
   */
  setRefreshToken(token: string): Promise<void>;

  /**
   * Retrieve refresh token
   */
  getRefreshToken(): Promise<string | null>;

  /**
   * Store active workspace ID
   */
  setActiveWorkspaceId(workspaceId: string): Promise<void>;

  /**
   * Retrieve active workspace ID
   */
  getActiveWorkspaceId(): Promise<string | null>;

  /**
   * Clear all stored tokens and workspace data
   */
  clear(): Promise<void>;
}
