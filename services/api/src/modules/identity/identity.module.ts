/* eslint @typescript-eslint/no-explicit-any: "error" */
import { Module } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { DataModule, PrismaOutboxAdapter } from "@corely/data";
import { OUTBOX_PORT } from "@corely/kernel";
import { KernelModule } from "../../shared/kernel/kernel.module";

// Controllers
import { AuthController } from "./adapters/http/auth.controller";
import { RolesController } from "./adapters/http/roles.controller";
import { PermissionsController } from "./adapters/http/permissions.controller";

// Infrastructure adapters
import { SignUpUseCase } from "./application/use-cases/sign-up.usecase";
import { SignInUseCase } from "./application/use-cases/sign-in.usecase";
import { RefreshTokenUseCase } from "./application/use-cases/refresh-token.usecase";
import { SignOutUseCase } from "./application/use-cases/sign-out.usecase";
import { SwitchTenantUseCase } from "./application/use-cases/switch-tenant.usecase";
import { AuthGuard } from "./adapters/http/auth.guard";
import { RbacGuard } from "./adapters/http/rbac.guard";

// Security
import { BcryptPasswordHasher } from "./infrastructure/security/bcrypt.password-hasher";
import { JwtTokenService } from "./infrastructure/security/jwt.token-service";

// Ports / Tokens
import { PASSWORD_HASHER_TOKEN } from "./application/ports/password-hasher.port";
import { TOKEN_SERVICE_TOKEN } from "./application/ports/token-service.port";
import { AUDIT_PORT_TOKEN } from "./application/ports/audit.port";
import { PrismaAuditRepository } from "./infrastructure/adapters/prisma-audit-repository.adapter";
import { PrismaMembershipRepository } from "./infrastructure/adapters/prisma-membership-repository.adapter";
import { PrismaRefreshTokenRepository } from "./infrastructure/adapters/prisma-refresh-token-repository.adapter";
import { PrismaRoleRepository } from "./infrastructure/adapters/prisma-role-repository.adapter";
import { PrismaRolePermissionGrantRepository } from "./infrastructure/adapters/prisma-role-permission-grant-repository.adapter";
import { PrismaTenantRepository } from "./infrastructure/adapters/prisma-tenant-repository.adapter";
import { PrismaUserRepository } from "./infrastructure/adapters/prisma-user-repository.adapter";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "./application/ports/membership-repository.port";
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from "./application/ports/refresh-token-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "./application/ports/role-repository.port";
import { ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN } from "./application/ports/role-permission-grant-repository.port";
import { TENANT_REPOSITORY_TOKEN } from "./application/ports/tenant-repository.port";
import { USER_REPOSITORY_TOKEN } from "./application/ports/user-repository.port";
import { PERMISSION_CATALOG_PORT } from "./application/ports/permission-catalog.port";
import { PermissionCatalogRegistry } from "./permissions/permission-catalog";
import { ListRolesUseCase } from "./application/use-cases/list-roles.usecase";
import { CreateRoleUseCase } from "./application/use-cases/create-role.usecase";
import { UpdateRoleUseCase } from "./application/use-cases/update-role.usecase";
import { DeleteRoleUseCase } from "./application/use-cases/delete-role.usecase";
import { GetPermissionCatalogUseCase } from "./application/use-cases/get-permission-catalog.usecase";
import { GetRolePermissionsUseCase } from "./application/use-cases/get-role-permissions.usecase";
import { UpdateRolePermissionsUseCase } from "./application/use-cases/update-role-permissions.usecase";

@Module({
  imports: [DataModule, KernelModule],
  controllers: [AuthController, RolesController, PermissionsController],
  providers: [
    // Repositories - NestJS will auto-inject Prisma adapters based on @Injectable()
    PrismaUserRepository,
    PrismaTenantRepository,
    PrismaMembershipRepository,
    PrismaRefreshTokenRepository,
    PrismaRoleRepository,
    PrismaRolePermissionGrantRepository,
    PrismaAuditRepository,
    PrismaOutboxAdapter,
    AuthGuard,
    RbacGuard,

    // Security
    BcryptPasswordHasher,
    JwtTokenService,

    // Reflector
    Reflector,

    // Token bindings for DI
    {
      provide: USER_REPOSITORY_TOKEN,
      useExisting: PrismaUserRepository,
    },
    {
      provide: TENANT_REPOSITORY_TOKEN,
      useExisting: PrismaTenantRepository,
    },
    {
      provide: MEMBERSHIP_REPOSITORY_TOKEN,
      useExisting: PrismaMembershipRepository,
    },
    {
      provide: REFRESH_TOKEN_REPOSITORY_TOKEN,
      useExisting: PrismaRefreshTokenRepository,
    },
    {
      provide: ROLE_REPOSITORY_TOKEN,
      useExisting: PrismaRoleRepository,
    },
    {
      provide: ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
      useExisting: PrismaRolePermissionGrantRepository,
    },
    {
      provide: PASSWORD_HASHER_TOKEN,
      useExisting: BcryptPasswordHasher,
    },
    {
      provide: TOKEN_SERVICE_TOKEN,
      useExisting: JwtTokenService,
    },
    {
      provide: AUDIT_PORT_TOKEN,
      useExisting: PrismaAuditRepository,
    },
    {
      provide: OUTBOX_PORT,
      useExisting: PrismaOutboxAdapter,
    },
    {
      provide: PERMISSION_CATALOG_PORT,
      useExisting: PermissionCatalogRegistry,
    },

    // Use Cases
    SignUpUseCase,
    SignInUseCase,
    RefreshTokenUseCase,
    SignOutUseCase,
    SwitchTenantUseCase,
    ListRolesUseCase,
    CreateRoleUseCase,
    UpdateRoleUseCase,
    DeleteRoleUseCase,
    GetPermissionCatalogUseCase,
    GetRolePermissionsUseCase,
    UpdateRolePermissionsUseCase,

    // Permission catalog
    PermissionCatalogRegistry,
  ],
  exports: [
    Reflector,
    USER_REPOSITORY_TOKEN,
    TENANT_REPOSITORY_TOKEN,
    MEMBERSHIP_REPOSITORY_TOKEN,
    REFRESH_TOKEN_REPOSITORY_TOKEN,
    ROLE_REPOSITORY_TOKEN,
    ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,
    PASSWORD_HASHER_TOKEN,
    TOKEN_SERVICE_TOKEN,
    AUDIT_PORT_TOKEN,
    PERMISSION_CATALOG_PORT,
    SignUpUseCase,
    SignInUseCase,
    RefreshTokenUseCase,
    SignOutUseCase,
    SwitchTenantUseCase,
    AuthGuard,
    RbacGuard,
  ],
})
export class IdentityModule {}
