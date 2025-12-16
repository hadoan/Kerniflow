import { Injectable } from "@nestjs/common";
import * as jwt from "jsonwebtoken";
import { ITokenService } from "../../application/ports/token-service.port";

/**
 * JWT Token Service Implementation
 */
@Injectable()
export class JwtTokenService implements ITokenService {
  private readonly accessTokenSecret =
    process.env.JWT_ACCESS_SECRET || "your-access-secret-change-in-production";
  private readonly refreshTokenSecret =
    process.env.JWT_REFRESH_SECRET || "your-refresh-secret-change-in-production";
  private readonly accessTokenExpiresIn = process.env.JWT_ACCESS_EXPIRES_IN || "15m";
  private readonly refreshTokenExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

  generateAccessToken(data: { userId: string; email: string; tenantId: string }): string {
    return jwt.sign(
      {
        userId: data.userId,
        email: data.email,
        tenantId: data.tenantId,
      },
      this.accessTokenSecret as string,
      {
        expiresIn: this.accessTokenExpiresIn as string,
      } as jwt.SignOptions
    );
  }

  generateRefreshToken(): string {
    return jwt.sign(
      {
        // Minimal payload - the actual data is looked up from DB
        jti: Math.random().toString(36).substring(7),
      },
      this.refreshTokenSecret as string,
      {
        expiresIn: this.refreshTokenExpiresIn as string,
      } as jwt.SignOptions
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
