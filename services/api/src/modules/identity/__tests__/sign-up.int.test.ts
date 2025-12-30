import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import type { PrismaService } from "@corely/data";
import { buildRequestContext } from "@shared/context/request-context";
import { SignUpUseCase } from "../application/use-cases/sign-up.usecase";
import { buildSignUpInput } from "../testkit/builders/build-signup-input";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Sign Up integration (Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let useCase: SignUpUseCase;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;

    const [
      { PrismaUserRepository },
      { PrismaTenantRepository },
      { PrismaMembershipRepository },
      { PrismaRoleRepository },
      { PrismaRolePermissionGrantRepository },
      { PrismaRefreshTokenRepository },
      { BcryptPasswordHasher },
      { JwtTokenService },
      { PrismaOutboxAdapter },
      { PrismaAuditRepository },
      { PermissionCatalogRegistry },
      { PrismaIdempotencyStorageAdapter },
      { SystemIdGenerator },
      { SystemClock },
    ] = await Promise.all([
      import("../infrastructure/adapters/prisma-user-repository.adapter"),
      import("../infrastructure/adapters/prisma-tenant-repository.adapter"),
      import("../infrastructure/adapters/prisma-membership-repository.adapter"),
      import("../infrastructure/adapters/prisma-role-repository.adapter"),
      import("../infrastructure/adapters/prisma-role-permission-grant-repository.adapter"),
      import("../infrastructure/adapters/prisma-refresh-token-repository.adapter"),
      import("../infrastructure/security/bcrypt.password-hasher"),
      import("../infrastructure/security/jwt.token-service"),
      import("@corely/data"),
      import("../infrastructure/adapters/prisma-audit-repository.adapter"),
      import("../permissions/permission-catalog"),
      import("../../../shared/infrastructure/persistence/prisma-idempotency-storage.adapter"),
      import("../../../shared/infrastructure/system-id-generator"),
      import("../../../shared/infrastructure/system-clock"),
    ]);

    useCase = new SignUpUseCase(
      new PrismaUserRepository(prisma),
      new PrismaTenantRepository(prisma),
      new PrismaMembershipRepository(prisma),
      new PrismaRoleRepository(prisma),
      new PrismaRolePermissionGrantRepository(prisma),
      new PermissionCatalogRegistry(),
      new BcryptPasswordHasher(),
      new JwtTokenService(),
      new PrismaRefreshTokenRepository(prisma),
      new PrismaOutboxAdapter(prisma),
      new PrismaAuditRepository(prisma),
      new PrismaIdempotencyStorageAdapter(prisma),
      new SystemIdGenerator(),
      new SystemClock()
    );
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("creates a new user and stores it in the database", async () => {
    const input = buildSignUpInput({
      email: "newuser@example.com",
      password: "password123",
      tenantName: "Test Company",
      idempotencyKey: "signup-test-1",
    });

    const result = await useCase.execute(input);

    // Verify the response
    expect(result.userId).toBeDefined();
    expect(result.email).toBe("newuser@example.com");
    expect(result.tenantId).toBeDefined();
    expect(result.tenantName).toBe("Test Company");
    expect(result.membershipId).toBeDefined();
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();

    // Verify user was created in the database
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });
    expect(user).not.toBeNull();
    expect(user?.email).toBe("newuser@example.com");
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toBe("password123"); // Should be hashed

    // Verify tenant was created
    const tenant = await prisma.tenant.findUnique({
      where: { id: result.tenantId },
    });
    expect(tenant).not.toBeNull();
    expect(tenant?.name).toBe("Test Company");
    expect(tenant?.slug).toBe("testcompany");

    // Verify membership was created
    const membership = await prisma.membership.findUnique({
      where: { id: result.membershipId },
    });
    expect(membership).not.toBeNull();
    expect(membership?.userId).toBe(result.userId);
    expect(membership?.tenantId).toBe(result.tenantId);

    // Verify role was created
    const role = await prisma.role.findUnique({
      where: { id: membership!.roleId },
    });
    expect(role).not.toBeNull();
    expect(role?.systemKey).toBe("OWNER");
    expect(role?.name).toBe("Owner");

    // Verify refresh token was created
    const refreshTokens = await prisma.refreshToken.findMany({
      where: { userId: result.userId },
    });
    expect(refreshTokens).toHaveLength(1);
    expect(refreshTokens[0].tenantId).toBe(result.tenantId);

    // Verify outbox events were created
    const outboxEvents = await prisma.outboxEvent.findMany({
      where: { tenantId: result.tenantId },
    });
    expect(outboxEvents.length).toBeGreaterThanOrEqual(3);
    const eventTypes = outboxEvents.map((e) => e.eventType);
    expect(eventTypes).toContain("identity.user.created");
    expect(eventTypes).toContain("identity.tenant.created");
    expect(eventTypes).toContain("identity.membership.created");

    // Verify audit log was created
    const auditLogs = await prisma.auditLog.findMany({
      where: { tenantId: result.tenantId },
    });
    expect(auditLogs).toHaveLength(1);
    expect(auditLogs[0].action).toBe("identity.sign_up");
    expect(auditLogs[0].entityId).toBe(result.userId);
  });

  it("is idempotent - returns same result for duplicate idempotency key", async () => {
    const input = buildSignUpInput({
      email: "idempotent@example.com",
      password: "password123",
      tenantName: "Idempotent Test",
      idempotencyKey: "same-key-123",
    });

    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    // Results should be identical
    expect(second.userId).toBe(first.userId);
    expect(second.tenantId).toBe(first.tenantId);
    expect(second.membershipId).toBe(first.membershipId);
    expect(second.email).toBe(first.email);

    // Should only have one user in the database
    const users = await prisma.user.findMany({
      where: { email: "idempotent@example.com" },
    });
    expect(users).toHaveLength(1);

    // Should only have one tenant
    const tenants = await prisma.tenant.findMany({
      where: { id: first.tenantId },
    });
    expect(tenants).toHaveLength(1);

    // Verify idempotency record was stored
    const idemRows = await prisma.idempotencyKey.findMany({
      where: { key: "same-key-123" },
    });
    expect(idemRows).toHaveLength(1);
  });

  it("rejects duplicate email addresses", async () => {
    const firstInput = buildSignUpInput({
      email: "duplicate@example.com",
      password: "password123",
      tenantName: "First Company",
      idempotencyKey: "first-signup",
    });

    await useCase.execute(firstInput);

    const secondInput = buildSignUpInput({
      email: "duplicate@example.com",
      password: "password456",
      tenantName: "Second Company",
      idempotencyKey: "second-signup",
    });

    await expect(useCase.execute(secondInput)).rejects.toThrow(
      "User with this email already exists"
    );

    // Should still only have one user
    const users = await prisma.user.findMany({
      where: { email: "duplicate@example.com" },
    });
    expect(users).toHaveLength(1);
  });

  it("stores user with optional name field", async () => {
    const input = buildSignUpInput({
      email: "withname@example.com",
      password: "password123",
      tenantName: "Name Test Company",
      userName: "John Doe",
      idempotencyKey: "name-test-1",
    });

    const result = await useCase.execute(input);

    const user = await prisma.user.findUnique({
      where: { id: result.userId },
    });
    expect(user?.name).toBe("John Doe");
  });
});
