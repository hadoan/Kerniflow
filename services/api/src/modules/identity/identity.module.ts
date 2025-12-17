import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";

// Controllers
import { AuthController } from "./presentation/http/auth.controller";

// Repositories
import { PrismaUserRepository } from "./infrastructure/persistence/prisma.user.repo";
import { PrismaTenantRepository } from "./infrastructure/persistence/prisma.tenant.repo";
import { PrismaMembershipRepository } from "./infrastructure/persistence/prisma.membership.repo";
import { PrismaRefreshTokenRepository } from "./infrastructure/persistence/prisma.refresh-token.repo";
import { PrismaRoleRepository } from "./infrastructure/persistence/prisma.role.repo";
import { PrismaAuditRepository } from "./infrastructure/persistence/prisma.audit.repo";
import { PrismaOutboxAdapter } from "./infrastructure/persistence/prisma.outbox.adapter";
import { PrismaIdempotencyAdapter } from "../../shared/infrastructure/persistence/prisma-idempotency.adapter";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { IdGeneratorPort, ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { IdempotencyPort, IDEMPOTENCY_PORT_TOKEN } from "../../shared/ports/idempotency.port";
import { OUTBOX_PORT_TOKEN } from "../../shared/ports/outbox.port";
import { AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";
import { CLOCK_PORT_TOKEN, ClockPort } from "../../shared/ports/clock.port";
import { SignUpUseCase } from "./application/use-cases/sign-up.usecase";
import { SignInUseCase } from "./application/use-cases/sign-in.usecase";
import { RefreshTokenUseCase } from "./application/use-cases/refresh-token.usecase";
import { SignOutUseCase } from "./application/use-cases/sign-out.usecase";
import { SwitchTenantUseCase } from "./application/use-cases/switch-tenant.usecase";

// Security
import { BcryptPasswordHasher } from "./infrastructure/security/bcrypt.password-hasher";
import { JwtTokenService } from "./infrastructure/security/jwt.token-service";

// Ports / Tokens
import { USER_REPOSITORY_TOKEN } from "./application/ports/user.repo.port";
import { TENANT_REPOSITORY_TOKEN } from "./application/ports/tenant.repo.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "./application/ports/membership.repo.port";
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from "./application/ports/refresh-token.repo.port";
import { ROLE_REPOSITORY_TOKEN } from "./application/ports/role.repo.port";
import { PASSWORD_HASHER_TOKEN } from "./application/ports/password-hasher.port";
import { TOKEN_SERVICE_TOKEN } from "./application/ports/token-service.port";
import { OUTBOX_PORT_TOKEN } from "./application/ports/outbox.port";
import { AUDIT_PORT_TOKEN } from "./application/ports/audit.port";
import { CLOCK_TOKEN } from "./application/ports/clock.port";

@Module({
  controllers: [AuthController],
  providers: [
    // Repositories
    PrismaUserRepository,
    PrismaTenantRepository,
    PrismaMembershipRepository,
    PrismaRefreshTokenRepository,
    PrismaRoleRepository,
    PrismaAuditRepository,
    PrismaOutboxAdapter,
    PrismaIdempotencyAdapter,

    // Security
    BcryptPasswordHasher,
    JwtTokenService,

    // System
    SystemClock,
    SystemIdGenerator,
    Reflector,

    // Token bindings for DI
    {
      provide: USER_REPOSITORY_TOKEN,
      useClass: PrismaUserRepository,
    },
    {
      provide: TENANT_REPOSITORY_TOKEN,
      useClass: PrismaTenantRepository,
    },
    {
      provide: MEMBERSHIP_REPOSITORY_TOKEN,
      useClass: PrismaMembershipRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
      useClass: PrismaRefreshTokenRepository,
    },
    {
      provide: ROLE_REPOSITORY_TOKEN,
      useClass: PrismaRoleRepository,
    },
    {
      provide: PASSWORD_HASHER_TOKEN,
      useClass: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE_TOKEN,
      useClass: JwtTokenService,
    },
    {
      provide: OUTBOX_PORT_TOKEN,
      useClass: PrismaOutboxAdapter,
    },
    {
      provide: AUDIT_PORT_TOKEN,
      useClass: PrismaAuditRepository,
    },
    {
      provide: CLOCK_TOKEN,
      useClass: SystemClock,
    },
    {
      provide: ID_GENERATOR_TOKEN,
      useExisting: SystemIdGenerator,
    },
    {
      provide: IDEMPOTENCY_PORT_TOKEN,
      useClass: PrismaIdempotencyAdapter,
    },
    { provide: OUTBOX_PORT_TOKEN, useClass: PrismaOutboxAdapter },
    { provide: AUDIT_PORT_TOKEN, useClass: PrismaAuditRepository },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    {
      provide: SignUpUseCase,
      useFactory: (
        userRepo: any,
        tenantRepo: any,
        membershipRepo: any,
        roleRepo: any,
        passwordHasher: any,
        tokenService: any,
        refreshTokenRepo: any,
        outbox: any,
        audit: any,
        idempotency: IdempotencyPort,
        idGen: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new SignUpUseCase(
          userRepo,
          tenantRepo,
          membershipRepo,
          roleRepo,
          passwordHasher,
          tokenService,
          refreshTokenRepo,
          outbox,
          audit,
          idempotency,
          idGen,
          clock
        ),
      inject: [
        USER_REPOSITORY_TOKEN,
        TENANT_REPOSITORY_TOKEN,
        MEMBERSHIP_REPOSITORY_TOKEN,
        ROLE_REPOSITORY_TOKEN,
        PASSWORD_HASHER_TOKEN,
        TOKEN_SERVICE_TOKEN,
        REFRESH_TOKEN_REPOSITORY_TOKEN,
        OUTBOX_PORT_TOKEN,
        AUDIT_PORT_TOKEN,
        IDEMPOTENCY_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
      ],
    },
    {
      provide: SignInUseCase,
      useFactory: (
        userRepo: any,
        membershipRepo: any,
        passwordHasher: any,
        tokenService: any,
        refreshTokenRepo: any,
        outbox: OutboxPort,
        audit: AuditPort,
        idempotency: IdempotencyPort,
        idGen: IdGeneratorPort,
        clock: ClockPort
      ) =>
        new SignInUseCase(
          userRepo,
          membershipRepo,
          passwordHasher,
          tokenService,
          refreshTokenRepo,
          outbox,
          audit,
          idempotency,
          idGen,
          clock
        ),
      inject: [
        USER_REPOSITORY_TOKEN,
        MEMBERSHIP_REPOSITORY_TOKEN,
        PASSWORD_HASHER_TOKEN,
        TOKEN_SERVICE_TOKEN,
        REFRESH_TOKEN_REPOSITORY_TOKEN,
        OUTBOX_PORT_TOKEN,
        AUDIT_PORT_TOKEN,
        IDEMPOTENCY_PORT_TOKEN,
        ID_GENERATOR_TOKEN,
        CLOCK_TOKEN,
      ],
    },
    {
      provide: RefreshTokenUseCase,
      useFactory: (
        refreshRepo: any,
        tokenService: any,
        userRepo: any,
        audit: any,
        clock: ClockPort
      ) => new RefreshTokenUseCase(refreshRepo, tokenService, userRepo, audit, clock),
      inject: [
        REFRESH_TOKEN_REPOSITORY_TOKEN,
        TOKEN_SERVICE_TOKEN,
        USER_REPOSITORY_TOKEN,
        AUDIT_PORT_TOKEN,
        CLOCK_TOKEN,
      ],
    },
    {
      provide: SignOutUseCase,
      useFactory: (refreshRepo: any, outbox: OutboxPort, audit: AuditPort) =>
        new SignOutUseCase(refreshRepo, outbox, audit),
      inject: [REFRESH_TOKEN_REPOSITORY_TOKEN, OUTBOX_PORT_TOKEN, AUDIT_PORT_TOKEN],
    },
    {
      provide: SwitchTenantUseCase,
      useFactory: (
        membershipRepo: any,
        tokenService: any,
        userRepo: any,
        refreshTokenRepo: any,
        outbox: OutboxPort,
        audit: AuditPort,
        clock: ClockPort
      ) =>
        new SwitchTenantUseCase(
          membershipRepo,
          tokenService,
          userRepo,
          refreshTokenRepo,
          outbox,
          audit,
          clock
        ),
      inject: [
        MEMBERSHIP_REPOSITORY_TOKEN,
        TOKEN_SERVICE_TOKEN,
        USER_REPOSITORY_TOKEN,
        REFRESH_TOKEN_REPOSITORY_TOKEN,
        OUTBOX_PORT_TOKEN,
        AUDIT_PORT_TOKEN,
        CLOCK_TOKEN,
      ],
    },
  ],
  exports: [
    Reflector,
    USER_REPOSITORY_TOKEN,
    TENANT_REPOSITORY_TOKEN,
    MEMBERSHIP_REPOSITORY_TOKEN,
    REFRESH_TOKEN_REPOSITORY_TOKEN,
    ROLE_REPOSITORY_TOKEN,
    PASSWORD_HASHER_TOKEN,
    TOKEN_SERVICE_TOKEN,
    OUTBOX_PORT_TOKEN,
    AUDIT_PORT_TOKEN,
    CLOCK_TOKEN,
    SignUpUseCase,
    SignInUseCase,
    RefreshTokenUseCase,
    SignOutUseCase,
    SwitchTenantUseCase,
    ID_GENERATOR_TOKEN,
    IDEMPOTENCY_PORT_TOKEN,
  ],
})
export class IdentityModule {}
