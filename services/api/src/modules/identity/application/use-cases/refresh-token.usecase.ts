import { Injectable, Inject } from "@nestjs/common";
import type { RefreshTokenRepositoryPort } from "../ports/refresh-token-repository.port";
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from "../ports/refresh-token-repository.port";
import type { TokenServicePort } from "../ports/token-service.port";
import { TOKEN_SERVICE_TOKEN } from "../ports/token-service.port";
import type { UserRepositoryPort } from "../ports/user-repository.port";
import { USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import type { MembershipRepositoryPort } from "../ports/membership-repository.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../ports/membership-repository.port";
import type { AuditPort } from "../ports/audit.port";
import { AUDIT_PORT_TOKEN } from "../ports/audit.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import { createHash, randomUUID } from "crypto";

export interface RefreshTokenInput {
  refreshToken: string;
}

export interface RefreshTokenOutput {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh Token Use Case
 * Rotates the refresh token for security
 */
@Injectable()
export class RefreshTokenUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    @Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort,
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN)
    private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(input: RefreshTokenInput): Promise<RefreshTokenOutput> {
    // 1. Hash the provided refresh token
    const tokenHash = await this.hashRefreshToken(input.refreshToken);

    // 2. Find and validate refresh token
    const storedToken = await this.refreshTokenRepo.findValidByHash(tokenHash);

    if (!storedToken || storedToken.revokedAt) {
      throw new Error("Invalid or revoked refresh token");
    }

    // 3. Check expiration
    if (storedToken.expiresAt < this.clock.now()) {
      throw new Error("Refresh token has expired");
    }

    // 4. Get user info
    const user = await this.userRepo.findById(storedToken.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 5. Generate new tokens
    const membership = await this.membershipRepo.findByTenantAndUser(
      storedToken.tenantId,
      storedToken.userId
    );

    if (!membership) {
      throw new Error("Membership not found for tenant while refreshing tokens");
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId: storedToken.userId,
      email: user.getEmail().getValue(),
      tenantId: storedToken.tenantId,
      roleIds: [membership.getRoleId()],
    });

    const newRefreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();

    // 6. Revoke old token and create new one
    await this.refreshTokenRepo.revoke(storedToken.id);

    const newTokenId = randomUUID();
    const newTokenHash = await this.hashRefreshToken(newRefreshToken);

    await this.refreshTokenRepo.create({
      id: newTokenId,
      userId: storedToken.userId,
      tenantId: storedToken.tenantId,
      tokenHash: newTokenHash,
      expiresAt: new Date(this.clock.now().getTime() + refreshTokenExpiresInMs),
    });

    // 7. Audit log
    await this.audit.write({
      tenantId: storedToken.tenantId,
      actorUserId: storedToken.userId,
      action: "user.token_refreshed",
      targetType: "RefreshToken",
      targetId: newTokenId,
    });

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
