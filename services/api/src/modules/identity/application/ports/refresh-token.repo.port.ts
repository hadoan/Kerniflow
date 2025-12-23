/**
 * Refresh Token Repository Port
 */
export interface IRefreshTokenRepository {
  /**
   * Create a refresh token
   */
  create(data: {
    id: string;
    userId: string;
    tenantId: string;
    tokenHash: string;
    expiresAt: Date;
  }): Promise<void>;

  /**
   * Find valid refresh token by hash
   */
  findValidByHash(hash: string): Promise<{
    id: string;
    userId: string;
    tenantId: string;
    expiresAt: Date;
    revokedAt: Date | null;
  } | null>;

  /**
   * Revoke a refresh token
   */
  revoke(id: string): Promise<void>;

  /**
   * Revoke all tokens for a user in a tenant
   */
  revokeAllForUserInTenant(userId: string, tenantId: string): Promise<void>;

  /**
   * Clean up expired tokens
   */
  deleteExpired(): Promise<number>;
}

export const REFRESH_TOKEN_REPOSITORY_TOKEN = Symbol("REFRESH_TOKEN_REPOSITORY");
