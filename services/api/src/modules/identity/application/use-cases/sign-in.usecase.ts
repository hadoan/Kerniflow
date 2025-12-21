import { createHash } from "crypto";
import { Email } from "../../domain/value-objects/email.vo";
import { UserLoggedInEvent } from "../../domain/events/identity.events";
import { IUserRepository } from "../ports/user.repo.port";
import { IMembershipRepository } from "../ports/membership.repo.port";
import { IPasswordHasher } from "../ports/password-hasher.port";
import { ITokenService } from "../ports/token-service.port";
import { IRefreshTokenRepository } from "../ports/refresh-token.repo.port";
import { IOutboxPort } from "../ports/outbox.port";
import { IAuditPort } from "../ports/audit.port";
import { IdempotencyPort } from "../../../../shared/ports/idempotency.port";
import { ClockPort } from "../../../../shared/ports/clock.port";
import { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { RequestContext } from "../../../../shared/context/request-context";
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

export class SignInUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly membershipRepo: IMembershipRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly outbox: IOutboxPort,
    private readonly audit: IAuditPort,
    private readonly idempotency: IdempotencyPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: SignInInput): Promise<SignInOutput> {
    const key = input.idempotencyKey;
    if (key) {
      const cached = await this.idempotency.get(SIGN_IN_ACTION, input.tenantId ?? null, key);
      if (cached) return cached.body as SignInOutput;
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

    const accessToken = this.tokenService.generateAccessToken({
      userId: user.getId(),
      email: email.getValue(),
      tenantId: selectedTenantId,
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
      payloadJson: JSON.stringify(event),
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
