import { Injectable, Inject } from "@nestjs/common";
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
import { type UserRepositoryPort, USER_REPOSITORY_TOKEN } from "../ports/user-repository.port";
import {
  type TenantRepositoryPort,
  TENANT_REPOSITORY_TOKEN,
} from "../ports/tenant-repository.port";
import {
  type MembershipRepositoryPort,
  MEMBERSHIP_REPOSITORY_TOKEN,
} from "../ports/membership-repository.port";
import { type PasswordHasherPort, PASSWORD_HASHER_TOKEN } from "../ports/password-hasher.port";
import { type TokenServicePort, TOKEN_SERVICE_TOKEN } from "../ports/token-service.port";
import { type OutboxPort, OUTBOX_PORT } from "@corely/kernel";
import { type AuditPort, AUDIT_PORT_TOKEN } from "../ports/audit.port";
import { type RoleRepositoryPort, ROLE_REPOSITORY_TOKEN } from "../ports/role-repository.port";
import {
  type RolePermissionGrantRepositoryPort,
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
} from "../ports/role-permission-grant-repository.port";
import {
  type PermissionCatalogPort,
  PERMISSION_CATALOG_PORT,
} from "../ports/permission-catalog.port";
import { type ClockPort, CLOCK_PORT_TOKEN } from "../../../../shared/ports/clock.port";
import {
  type RefreshTokenRepositoryPort,
  REFRESH_TOKEN_REPOSITORY_TOKEN,
} from "../ports/refresh-token-repository.port";
import {
  type IdempotencyStoragePort,
  IDEMPOTENCY_STORAGE_PORT_TOKEN,
} from "../../../../shared/ports/idempotency-storage.port";
import {
  type IdGeneratorPort,
  ID_GENERATOR_TOKEN,
} from "../../../../shared/ports/id-generator.port";
import { type RequestContext } from "../../../../shared/context/request-context";
import { ConflictError, ValidationError } from "../../../../shared/errors/domain-errors";
import { buildDefaultRoleGrants, type DefaultRoleKey } from "../../permissions/default-role-grants";

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

@Injectable()
export class SignUpUseCase {
  constructor(
    @Inject(USER_REPOSITORY_TOKEN) private readonly userRepo: UserRepositoryPort,
    @Inject(TENANT_REPOSITORY_TOKEN) private readonly tenantRepo: TenantRepositoryPort,
    @Inject(MEMBERSHIP_REPOSITORY_TOKEN) private readonly membershipRepo: MembershipRepositoryPort,
    @Inject(ROLE_REPOSITORY_TOKEN) private readonly roleRepo: RoleRepositoryPort,
    @Inject(ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN)
    private readonly grantRepo: RolePermissionGrantRepositoryPort,
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort,
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

    const defaultRoles = await this.ensureDefaultRoles(tenantId);
    await this.seedDefaultRoleGrants(tenantId, userId, defaultRoles);
    const ownerRole = defaultRoles.OWNER;
    const membershipId = this.idGenerator.newId();
    const membership = Membership.create(membershipId, tenantId, userId, ownerRole);
    await this.membershipRepo.create(membership);

    const accessToken = this.tokenService.generateAccessToken({
      userId,
      email: email.getValue(),
      tenantId,
      roleIds: [ownerRole],
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

  private async ensureDefaultRoles(tenantId: string): Promise<Record<DefaultRoleKey, string>> {
    const roles = [
      { key: "OWNER" as const, name: "Owner" },
      { key: "ADMIN" as const, name: "Admin" },
      { key: "ACCOUNTANT" as const, name: "Accountant" },
      { key: "STAFF" as const, name: "Staff" },
      { key: "READ_ONLY" as const, name: "Read-only" },
    ];

    const results: Record<DefaultRoleKey, string> = {
      OWNER: "",
      ADMIN: "",
      ACCOUNTANT: "",
      STAFF: "",
      READ_ONLY: "",
    };

    for (const role of roles) {
      const existing = await this.roleRepo.findBySystemKey(tenantId, role.key);
      if (existing) {
        results[role.key] = existing.id;
        continue;
      }
      const id = this.idGenerator.newId();
      await this.roleRepo.create({
        id,
        tenantId,
        name: role.name,
        systemKey: role.key,
        isSystem: true,
      });
      results[role.key] = id;
    }

    return results;
  }

  private async seedDefaultRoleGrants(
    tenantId: string,
    actorUserId: string,
    roles: Record<DefaultRoleKey, string>
  ) {
    const catalog = this.catalogPort.getCatalog();
    const grants = buildDefaultRoleGrants(catalog);

    await this.grantRepo.replaceAll(tenantId, roles.OWNER, grants.OWNER, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.ADMIN, grants.ADMIN, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.ACCOUNTANT, grants.ACCOUNTANT, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.STAFF, grants.STAFF, actorUserId);
    await this.grantRepo.replaceAll(tenantId, roles.READ_ONLY, grants.READ_ONLY, actorUserId);
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
      payload: userCreatedEvent,
    });

    const tenantCreatedEvent = new TenantCreatedEvent(tenantId, tenantName, slug);
    await this.outbox.enqueue({
      tenantId,
      eventType: tenantCreatedEvent.eventType,
      payload: tenantCreatedEvent,
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
      payload: membershipCreatedEvent,
    });
  }

  private async hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
  }
}
