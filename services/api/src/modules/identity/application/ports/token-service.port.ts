/**
 * Token Service Port (Interface)
 * Abstracts JWT token generation and verification
 */
export interface ITokenService {
  /**
   * Generate access token (short-lived)
   */
  generateAccessToken(data: { userId: string; email: string; tenantId: string }): string;

  /**
   * Generate refresh token (long-lived)
   */
  generateRefreshToken(): string;

  /**
   * Verify and decode access token
   */
  verifyAccessToken(token: string): Promise<{
    userId: string;
    email: string;
    tenantId: string;
    iat: number;
    exp: number;
  } | null>;

  /**
   * Get token expiration times
   */
  getExpirationTimes(): {
    accessTokenExpiresIn: string;
    refreshTokenExpiresInMs: number;
  };
}

export const TOKEN_SERVICE_TOKEN = Symbol("TOKEN_SERVICE");
