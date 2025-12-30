import { Injectable, Inject } from "@nestjs/common";
import type { MembershipRepositoryPort } from "../ports/membership-repository.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../ports/membership-repository.port";
import type { TokenServicePort } from "../ports/token-service.port";
import { TOKEN_SERVICE_TOKEN } from "../ports/token-service.port";
import type { UserRepositoryPort } from "../ports/user-repository.port";
import { USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import type { RefreshTokenRepositoryPort } from "../ports/refresh-token-repository.port";
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from "../ports/refresh-token-repository.port";
import type { OutboxPort } from "@corely/kernel";
import { OUTBOX_PORT } from "@corely/kernel";
import type { AuditPort } from "../ports/audit.port";
import { AUDIT_PORT_TOKEN } from "../ports/audit.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import { CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import { TenantSwitchedEvent } from "../../domain/events/identity.events";
import { createHash, randomUUID } from "crypto";

export interface SwitchTenantInput {
  userId: string;
  fromTenantId: string;
  toTenantId: string;
}

export interface SwitchTenantOutput {
  accessToken: string;
  refreshToken: string;
  tenantId: string;
}

/**
 * Switch Tenant Use Case
 * Allows user to switch active tenant
 */
@Injectable()
export class SwitchTenantUseCase {
  constructor(
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort,
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(input: SwitchTenantInput): Promise<SwitchTenantOutput> {
    // 1. Verify user has membership in target tenant
    const membership = await this.membershipRepo.findByTenantAndUser(
      input.toTenantId,
      input.userId
    );

    if (!membership) {
      throw new Error("User is not a member of the target tenant");
    }

    // 2. Get user info
    const user = await this.userRepo.findById(input.userId);
    if (!user) {
      throw new Error("User not found");
    }

    // 3. Generate new tokens for new tenant
    const accessToken = this.tokenService.generateAccessToken({
      userId: input.userId,
      email: user.getEmail().getValue(),
      tenantId: input.toTenantId,
      roleIds: [membership.getRoleId()],
    });

    const refreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();

    // 4. Store new refresh token
    const refreshTokenId = randomUUID();
    const refreshTokenHash = await this.hashRefreshToken(refreshToken);

    await this.refreshTokenRepo.create({
      id: refreshTokenId,
      userId: input.userId,
      tenantId: input.toTenantId,
      tokenHash: refreshTokenHash,
      expiresAt: new Date(this.clock.now().getTime() + refreshTokenExpiresInMs),
    });

    // 5. Emit event
    const event = new TenantSwitchedEvent(input.userId, input.fromTenantId, input.toTenantId);
    await this.outbox.enqueue({
      tenantId: input.toTenantId,
      eventType: event.eventType,
      payload: event,
    });

    // 6. Audit log
    await this.audit.write({
      tenantId: input.toTenantId,
      actorUserId: input.userId,
      action: "user.tenant_switched",
      targetType: "Tenant",
      targetId: input.toTenantId,
      metadataJson: JSON.stringify({ fromTenantId: input.fromTenantId }),
    });

    return {
      accessToken,
      refreshToken,
      tenantId: input.toTenantId,
    };
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
