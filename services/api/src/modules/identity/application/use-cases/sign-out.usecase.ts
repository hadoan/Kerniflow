import { Injectable, Inject } from "@nestjs/common";
import {
  type RefreshTokenRepositoryPort,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from "../ports/refresh-token-repository.port";
import { type OutboxPort, OUTBOX_PORT } from "@corely/kernel";
import { type AuditPort, AUDIT_PORT_TOKEN } from "../ports/audit.port";
import { UserLoggedOutEvent } from "../../domain/events/identity.events";

export interface SignOutInput {
  userId: string;
  tenantId: string;
  refreshTokenHash?: string; // Optional: revoke specific token
}

/**
 * Sign Out Use Case
 */
@Injectable()
export class SignOutUseCase {
  constructor(
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort
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
      payload: event,
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
