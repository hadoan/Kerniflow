import { Injectable, Inject } from "@nestjs/common";
import { createHash } from "crypto";
import { Email } from "../../domain/value-objects/email.vo";
import { UserLoggedInEvent } from "../../domain/events/identity.events";
import { type UserRepositoryPort, USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import {
  type MembershipRepositoryPort,
  MEMBERSHIP_REPOSITORY_TOKEN,
} from "../ports/membership-repository.port";
import { type PasswordHasherPort, PASSWORD_HASHER_TOKEN } from "../ports/password-hasher.port";
import { type TokenServicePort, TOKEN_SERVICE_TOKEN } from "../ports/token-service.port";
import {
  type RefreshTokenRepositoryPort,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from "../ports/refresh-token-repository.port";
import { type OutboxPort, OUTBOX_PORT } from "@corely/kernel";
import { type AuditPort, AUDIT_PORT_TOKEN } from "../ports/audit.port";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../../shared/ports/idempotency-storage.port";
import { type ClockPort, CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import {
  type IdGeneratorPort,
  ID_GENERATOR_TOKEN,
} from "../../../../shared/ports/id-generator.port";
import { type RequestContext } from "../../../../shared/context/request-context";
import { ForbiddenError, ValidationError } from "../../../../shared/errors/domain-errors";

export interface SignInInput {
  email: string;
  password: string;
  tenantId?: string;
  idempotencyKey?: string;
  context: RequestContext;
}

export interface SignInOutput {
  userId: string;
  email: string;
  tenantId: string;
  accessToken: string;
  refreshToken: string;
  memberships?: Array<{
    tenantId: string;
    tenantName: string;
    roleId: string;
  }>;
}

const SIGN_IN_ACTION = "identity.sign_in";

@Injectable()
export class SignInUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(PASSWORD_HASHER_TOKEN) private readonly passwordHasher: PasswordHasherPort,
    @Inject(TOKEN_SERVICE_TOKEN) private readonly tokenService: TokenServicePort,
    @Inject(REFRESH_TOKEN_REPOSITORY_TOKEN)
    private readonly refreshTokenRepo: RefreshTokenRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly idempotency: IdempotencyStoragePort,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGenerator: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort
  ) {}

  async execute(input: SignInInput): Promise<SignInOutput> {
    const key = input.idempotencyKey;
    if (key) {
      const cached = await this.idempotency.get(SIGN_IN_ACTION, input.tenantId ?? null, key);
      if (cached) {
        return cached.body as SignInOutput;
      }
    }

    this.validate(input);
    const email = Email.create(input.email);
    const user = await this.userRepo.findByEmail(email.getValue());
    if (!user) {
      throw new ForbiddenError("Invalid email or password");
    }

    const passwordValid = await this.passwordHasher.verify(input.password, user.getPasswordHash());
    if (!passwordValid) {
      throw new ForbiddenError("Invalid email or password");
    }

    const memberships = await this.membershipRepo.findByUserId(user.getId());
    if (memberships.length === 0) {
      throw new ForbiddenError("User has no memberships");
    }

    const selectedTenantId = input.tenantId ?? memberships[0].getTenantId();
    if (!memberships.some((m) => m.getTenantId() === selectedTenantId)) {
      throw new ForbiddenError("User is not a member of the specified tenant");
    }

    const selectedRoleIds = Array.from(
      new Set(
        memberships
          .filter((membership) => membership.getTenantId() === selectedTenantId)
          .map((membership) => membership.getRoleId())
      )
    );

    if (selectedRoleIds.length === 0) {
      throw new ForbiddenError("User has no roles for the selected tenant");
    }

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.getId(),
      email: email.getValue(),
      tenantId: selectedTenantId,
      roleIds: selectedRoleIds,
    });
    const refreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();

    await this.refreshTokenRepo.create({
      id: this.idGenerator.newId(),
      userId: user.getId(),
      tenantId: selectedTenantId,
      tokenHash: await this.hashRefreshToken(refreshToken),
      expiresAt: new Date(this.clock.now().getTime() + refreshTokenExpiresInMs),
    });

    const event = new UserLoggedInEvent(user.getId(), selectedTenantId, email.getValue());
    await this.outbox.enqueue({
      tenantId: selectedTenantId,
      eventType: event.eventType,
      payload: event,
    });

    await this.audit.write({
      tenantId: selectedTenantId,
      actorUserId: user.getId(),
      action: "identity.sign_in",
      targetType: "User",
      targetId: user.getId(),
      context: input.context,
    });

    const response: SignInOutput = {
      userId: user.getId(),
      email: email.getValue(),
      tenantId: selectedTenantId,
      accessToken,
      refreshToken,
    };

    if (key) {
      await this.idempotency.store(SIGN_IN_ACTION, input.tenantId ?? null, key, { body: response });
    }
    return response;
  }

  private validate(input: SignInInput) {
    if (!input.email || !input.email.includes("@")) {
      throw new ValidationError("Invalid email");
    }
    if (!input.password) {
      throw new ValidationError("Password is required");
    }
  }

  private async hashRefreshToken(token: string): Promise<string> {
    return createHash("sha256").update(token).digest("hex");
  }
}
