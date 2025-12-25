import { Injectable } from "@nestjs/common";
import jwt, { type Secret } from "jsonwebtoken";
import type { StringValue } from "ms";
import { TokenServicePort } from "../../application/ports/token-service.port";

/**
 * JWT Token Service Implementation
 */
@Injectable()
export class JwtTokenService implements TokenServicePort {
  private readonly accessTokenSecret: Secret =
    process.env.JWT_ACCESS_SECRET || "your-access-secret-change-in-production";
  private readonly refreshTokenSecret: Secret =
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-change-in-production";
  private readonly accessTokenExpiresIn: StringValue =
    (process.env.JWT_ACCESS_EXPIRES_IN as StringValue | undefined) || "15m";
  private readonly refreshTokenExpiresIn: StringValue =
    (process.env.JWT_REFRESH_EXPIRES_IN as StringValue | undefined) || "30d";

  generateAccessToken(data: { userId: string; email: string; tenantId: string }): string {
    return jwt.sign(
      {
        userId: data.userId,
        email: data.email,
        tenantId: data.tenantId,
      },
      this.accessTokenSecret,
      {
        expiresIn: this.accessTokenExpiresIn,
      }
    );
  }

  generateRefreshToken(): string {
    return jwt.sign(
      {
        // Minimal payload - the actual data is looked up from DB
        jti: Math.random().toString(36).substring(7),
      },
      this.refreshTokenSecret,
      {
        expiresIn: this.refreshTokenExpiresIn,
      }
    );
  }

  async verifyAccessToken(token: string): Promise<{
    userId: string;
    email: string;
    tenantId: string;
    iat: number;
    exp: number;
  } | null> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as {
        userId: string;
        email: string;
        tenantId: string;
        iat: number;
        exp: number;
      };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  getExpirationTimes(): {
    accessTokenExpiresIn: string;
    refreshTokenExpiresInMs: number;
  } {
    // Parse refresh token expiration to milliseconds
    const refreshMs = this.parseExpireTime(this.refreshTokenExpiresIn);

    return {
      accessTokenExpiresIn: this.accessTokenExpiresIn,
      refreshTokenExpiresInMs: refreshMs,
    };
  }

  private parseExpireTime(expireString: string): number {
    const timeUnits: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    const match = expireString.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid expire time format: ${expireString}`);
    }

    const [, value, unit] = match;
    return parseInt(value, 10) * (timeUnits[unit] || 0);
  }
}
