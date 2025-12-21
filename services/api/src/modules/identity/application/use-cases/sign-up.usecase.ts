import { createHash } from "crypto";
import { Email } from "../../domain/value-objects/email.vo";
import { Password } from "../../domain/value-objects/password.vo";
import { User } from "../../domain/entities/user.entity";
import { Tenant } from "../../domain/entities/tenant.entity";
import { Membership } from "../../domain/entities/membership.entity";
import {
  UserCreatedEvent,
  TenantCreatedEvent,
  MembershipCreatedEvent,
} from "../../domain/events/identity.events";
import { IUserRepository } from "../ports/user.repo.port";
import { ITenantRepository } from "../ports/tenant.repo.port";
import { IMembershipRepository } from "../ports/membership.repo.port";
import { IPasswordHasher } from "../ports/password-hasher.port";
import { ITokenService } from "../ports/token-service.port";
import { IOutboxPort } from "../ports/outbox.port";
import { IAuditPort } from "../ports/audit.port";
import { IRoleRepository } from "../ports/role.repo.port";
import { ClockPort } from "../../../../shared/ports/clock.port";
import { IRefreshTokenRepository } from "../ports/refresh-token.repo.port";
import { IdempotencyPort } from "../../../../shared/ports/idempotency.port";
import { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import { RequestContext } from "../../../../shared/context/request-context";
import { ConflictError, ValidationError } from "../../../../shared/errors/domain-errors";

export interface SignUpInput {
  email: string;
  password: string;
  tenantName: string;
  idempotencyKey: string;
  context: RequestContext;
  userName?: string;
}

export interface SignUpOutput {
  userId: string;
  email: string;
  tenantId: string;
  tenantName: string;
  membershipId: string;
  accessToken: string;
  refreshToken: string;
}

const SIGN_UP_ACTION = "identity.sign_up";

export class SignUpUseCase {
  constructor(
    private readonly userRepo: IUserRepository,
    private readonly tenantRepo: ITenantRepository,
    private readonly membershipRepo: IMembershipRepository,
    private readonly roleRepo: IRoleRepository,
    private readonly passwordHasher: IPasswordHasher,
    private readonly tokenService: ITokenService,
    private readonly refreshTokenRepo: IRefreshTokenRepository,
    private readonly outbox: IOutboxPort,
    private readonly audit: IAuditPort,
    private readonly idempotency: IdempotencyPort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort
  ) {}

  async execute(input: SignUpInput): Promise<SignUpOutput> {
    const cached = await this.idempotency.get(SIGN_UP_ACTION, null, input.idempotencyKey);
    if (cached) {
      return cached.body as SignUpOutput;
    }

    this.validate(input);

    const email = Email.create(input.email);
    const password = Password.create(input.password);

    const existingUser = await this.userRepo.findByEmail(email.getValue());
    if (existingUser) {
      throw new ConflictError("User with this email already exists");
    }

    const tenantId = this.idGenerator.newId();
    const slug = this.generateSlug(input.tenantName);
    const existingTenant = await this.tenantRepo.findBySlug(slug);
    if (existingTenant) {
      throw new ConflictError("Tenant with this slug already exists");
    }

    const tenant = Tenant.create(tenantId, input.tenantName, slug);
    await this.tenantRepo.create(tenant);

    const userId = this.idGenerator.newId();
    const passwordHash = await this.passwordHasher.hash(password.getValue());
    const user = User.create(userId, email, passwordHash, input.userName || null);
    await this.userRepo.create(user);

    const ownerRole = await this.ensureOwnerRole(tenantId);
    const membershipId = this.idGenerator.newId();
    const membership = Membership.create(membershipId, tenantId, userId, ownerRole);
    await this.membershipRepo.create(membership);

    const accessToken = this.tokenService.generateAccessToken({
      userId,
      email: email.getValue(),
      tenantId,
    });
    const refreshToken = this.tokenService.generateRefreshToken();
    const { refreshTokenExpiresInMs } = this.tokenService.getExpirationTimes();
    await this.refreshTokenRepo.create({
      id: this.idGenerator.newId(),
      userId,
      tenantId,
      tokenHash: await this.hashToken(refreshToken),
      expiresAt: new Date(this.clock.now().getTime() + refreshTokenExpiresInMs),
    });

    await this.emitOutboxEvents(
      tenantId,
      input.tenantName,
      userId,
      membershipId,
      ownerRole,
      email.getValue(),
      input.userName || null,
      slug
    );

    await this.audit.write({
      tenantId,
      actorUserId: userId,
      action: "identity.sign_up",
      targetType: "User",
      targetId: userId,
      context: input.context,
    });

    const response: SignUpOutput = {
      userId,
      email: email.getValue(),
      tenantId,
      tenantName: input.tenantName,
      membershipId,
      accessToken,
      refreshToken,
    };

    await this.idempotency.store(SIGN_UP_ACTION, null, input.idempotencyKey, { body: response });
    return response;
  }

  private validate(input: SignUpInput) {
    if (!input.email || !input.email.includes("@")) {
      throw new ValidationError("Invalid email");
    }
    if (!input.password || input.password.length < 8) {
      throw new ValidationError("Password must be at least 8 characters");
    }
    if (!input.tenantName) {
      throw new ValidationError("Tenant name is required");
    }
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\\s-]/g, "")
      .replace(/\\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 50);
  }

  private async ensureOwnerRole(tenantId: string): Promise<string> {
    const existing = await this.roleRepo.findBySystemKey(tenantId, "OWNER");
    if (existing) return existing.id;
    const id = this.idGenerator.newId();
    await this.roleRepo.create({ id, tenantId, name: "Owner", systemKey: "OWNER" });
    return id;
  }

  private async emitOutboxEvents(
    tenantId: string,
    tenantName: string,
    userId: string,
    membershipId: string,
    roleId: string,
    email: string,
    name: string | null,
    slug: string
  ) {
    const userCreatedEvent = new UserCreatedEvent(userId, email, name, null);
    await this.outbox.enqueue({
      tenantId,
      eventType: userCreatedEvent.eventType,
      payloadJson: JSON.stringify(userCreatedEvent),
    });

    const tenantCreatedEvent = new TenantCreatedEvent(tenantId, tenantName, slug);
    await this.outbox.enqueue({
      tenantId,
      eventType: tenantCreatedEvent.eventType,
      payloadJson: JSON.stringify(tenantCreatedEvent),
    });

    const membershipCreatedEvent = new MembershipCreatedEvent(
      membershipId,
      tenantId,
      userId,
      roleId
    );
    await this.outbox.enqueue({
      tenantId,
      eventType: membershipCreatedEvent.eventType,
      payloadJson: JSON.stringify(membershipCreatedEvent),
    });
  }

  private async hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
