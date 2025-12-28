import { type TokenServicePort } from "../../application/ports/token-service.port";

export class MockTokenService implements TokenServicePort {
  generateAccessToken(data: { userId: string; email: string; tenantId: string }): string {
    return `access:${data.userId}:${data.tenantId}`;
  }

  generateRefreshToken(): string {
    return `refresh:${Math.random().toString(36).slice(2)}`;
  }

  async verifyAccessToken(
    token: string
  ): Promise<{ userId: string; email: string; tenantId: string; iat: number; exp: number } | null> {
    const parts = token.split(":");
    if (parts[0] !== "access") {
      return null;
    }
    return {
      userId: parts[1],
      email: "",
      tenantId: parts[2],
      iat: Date.now(),
      exp: Date.now() + 1000,
    };
  }

  getExpirationTimes(): { accessTokenExpiresIn: string; refreshTokenExpiresInMs: number } {
    return { accessTokenExpiresIn: "15m", refreshTokenExpiresInMs: 1000 * 60 * 60 * 24 * 7 };
  }
}
