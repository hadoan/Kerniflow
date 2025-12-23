import { IRefreshTokenRepository } from "../ports/refresh-token.repo.port";
import { IOutboxPort } from "../ports/outbox.port";
import { IAuditPort } from "../ports/audit.port";
import { UserLoggedOutEvent } from "../../domain/events/identity.events";

export interface SignOutInput {
  userId: string;
  tenantId: string;
  refreshTokenHash?: string; // Optional: revoke specific token
}

/**
 * Sign Out Use Case
 */
export class SignOutUseCase {
  constructor(
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly outbox: IOutboxPort,
    private readonly audit: IAuditPort
  ) {}

  async execute(input: SignOutInput): Promise<void> {
    // 1. Revoke tokens
    if (input.refreshTokenHash) {
      // Revoke specific token
      // (Note: in practice, we'd need a method to find by hash and revoke)
      // For now, we revoke all tokens in the tenant
      await this.refreshTokenRepo.revokeAllForUserInTenant(input.userId, input.tenantId);
    } else {
      // Revoke all sessions for user in tenant
      await this.refreshTokenRepo.revokeAllForUserInTenant(input.userId, input.tenantId);
    }

    // 2. Emit event
    const event = new UserLoggedOutEvent(input.userId, input.tenantId);
    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: event.eventType,
      payloadJson: JSON.stringify(event),
    });

    // 3. Audit log
    await this.audit.write({
      tenantId: input.tenantId,
      actorUserId: input.userId,
      action: "user.logout",
      targetType: "User",
      targetId: input.userId,
    });
  }
}
