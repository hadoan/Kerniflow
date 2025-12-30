import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Test, TestingModule } from "@nestjs/testing";
import { type PostgresTestDb, createTestDb, stopSharedContainer } from "@corely/testkit";
import { PrismaService } from "@corely/data";
import { SignUpUseCase } from "../application/use-cases/sign-up.usecase";
import { buildSignUpInput } from "../testkit/builders/build-signup-input";
import { IdentityModule } from "../identity.module";
import { USER_REPOSITORY_TOKEN } from "../application/ports/user-repository.port";
import { TENANT_REPOSITORY_TOKEN } from "../application/ports/tenant-repository.port";
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../application/ports/membership-repository.port";
import { ROLE_REPOSITORY_TOKEN } from "../application/ports/role-repository.port";
import { REFRESH_TOKEN_REPOSITORY_TOKEN } from "../application/ports/refresh-token-repository.port";
import { PASSWORD_HASHER_TOKEN } from "../application/ports/password-hasher.port";
import { TOKEN_SERVICE_TOKEN } from "../application/ports/token-service.port";
import { OUTBOX_PORT } from "../application/ports/outbox.port";
import { AUDIT_PORT_TOKEN } from "../application/ports/audit.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../../shared/ports/idempotency-storage.port";
import { ID_GENERATOR_TOKEN } from "../../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../../shared/ports/clock.port";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

/**
 * This test simulates EXACTLY how signup works in the real NestJS application.
 * It uses the actual IdentityModule with real DI container to reproduce
 * any DI-related issues that might occur in production.
 */
describe("Sign Up with Real NestJS DI (Production-like)", () => {
  let db: PostgresTestDb;
  let testPrisma: PrismaService;
  let app: TestingModule;
  let signUpUseCase: SignUpUseCase;
  let prisma: PrismaService; // From DI container

  beforeAll(async () => {
    db = await createTestDb();
    testPrisma = db.client;

    // Create a test module using the ACTUAL IdentityModule
    // This is exactly how NestJS wires up dependencies in the real app
    app = await Test.createTestingModule({
      imports: [IdentityModule],
    })
      // Override PrismaService to use our test database
      .overrideProvider(PrismaService)
      .useValue(testPrisma)
      .compile();

    // Get the SignUpUseCase from the DI container
    // This is exactly how it would be injected in a controller
    signUpUseCase = app.get<SignUpUseCase>(SignUpUseCase);

    // Get PrismaService from DI (same instance as testPrisma)
    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  describe("Real NestJS DI Behavior", () => {
    it("resolves SignUpUseCase from IdentityModule", () => {
      expect(signUpUseCase).toBeDefined();
      expect(signUpUseCase).toBeInstanceOf(SignUpUseCase);
    });

    it("executes signup with full DI chain - creates user in database", async () => {
      const input = buildSignUpInput({
        email: "realapp@example.com",
        password: "password123",
        tenantName: "Real App Test",
        idempotencyKey: "real-app-1",
      });

      // Execute signup exactly as it would run in the real app
      const result = await signUpUseCase.execute(input);

      // Verify result
      expect(result.userId).toBeDefined();
      expect(result.email).toBe("realapp@example.com");
      expect(result.tenantId).toBeDefined();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // Verify data persisted to database
      const user = await prisma.user.findUnique({
        where: { id: result.userId },
      });
      expect(user).not.toBeNull();
      expect(user?.email).toBe("realapp@example.com");
      expect(user?.passwordHash).toBeDefined();

      const tenant = await prisma.tenant.findUnique({
        where: { id: result.tenantId },
      });
      expect(tenant).not.toBeNull();
      expect(tenant?.name).toBe("Real App Test");

      const membership = await prisma.membership.findUnique({
        where: { id: result.membershipId },
      });
      expect(membership).not.toBeNull();
      expect(membership?.userId).toBe(result.userId);

      // Verify all side effects
      const outboxEvents = await prisma.outboxEvent.findMany({
        where: { tenantId: result.tenantId },
      });
      expect(outboxEvents.length).toBeGreaterThanOrEqual(3);

      const auditLogs = await prisma.auditLog.findMany({
        where: { tenantId: result.tenantId },
      });
      expect(auditLogs).toHaveLength(1);
    });

    it("handles idempotency correctly with real DI", async () => {
      const input = buildSignUpInput({
        email: "idempotent-real@example.com",
        password: "password123",
        tenantName: "Idempotent Real",
        idempotencyKey: "real-idem-key",
      });

      const first = await signUpUseCase.execute(input);
      const second = await signUpUseCase.execute(input);

      // Should return same result
      expect(second.userId).toBe(first.userId);
      expect(second.tenantId).toBe(first.tenantId);

      // Should only have one user
      const users = await prisma.user.findMany({
        where: { email: "idempotent-real@example.com" },
      });
      expect(users).toHaveLength(1);
    });

    it("password is hashed by injected BcryptPasswordHasher", async () => {
      const input = buildSignUpInput({
        email: "hash-test@example.com",
        password: "mySecretPassword123",
        tenantName: "Hash Test",
        idempotencyKey: "hash-test-1",
      });

      const result = await signUpUseCase.execute(input);

      const user = await prisma.user.findUnique({
        where: { id: result.userId },
      });

      // Password should be hashed, not plain text
      expect(user?.passwordHash).toBeDefined();
      expect(user?.passwordHash).not.toBe("mySecretPassword123");
      // Bcrypt hashes start with $2b$ or $2a$
      expect(user?.passwordHash).toMatch(/^\$2[ab]\$/);
    });

    it("generates JWT tokens via injected JwtTokenService", async () => {
      const input = buildSignUpInput({
        email: "jwt-test@example.com",
        password: "password123",
        tenantName: "JWT Test",
        idempotencyKey: "jwt-test-1",
      });

      const result = await signUpUseCase.execute(input);

      // Should have valid JWT tokens
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      // JWTs have 3 parts separated by dots
      expect(result.accessToken.split(".")).toHaveLength(3);
      expect(result.refreshToken.split(".")).toHaveLength(3);
    });

    it("generates unique IDs via injected SystemIdGenerator", async () => {
      const input1 = buildSignUpInput({
        email: "id1@example.com",
        tenantName: "ID Test Company 1",
        idempotencyKey: "id-test-1",
      });
      const input2 = buildSignUpInput({
        email: "id2@example.com",
        tenantName: "ID Test Company 2",
        idempotencyKey: "id-test-2",
      });

      const result1 = await signUpUseCase.execute(input1);
      const result2 = await signUpUseCase.execute(input2);

      // IDs should be unique
      expect(result1.userId).not.toBe(result2.userId);
      expect(result1.tenantId).not.toBe(result2.tenantId);
      expect(result1.membershipId).not.toBe(result2.membershipId);

      // Should be UUIDs
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(result1.userId).toMatch(uuidRegex);
      expect(result1.tenantId).toMatch(uuidRegex);
    });

    it("verifies all dependencies are properly injected", () => {
      // All these should be resolvable from the DI container
      const userRepo = app.get(USER_REPOSITORY_TOKEN);
      const tenantRepo = app.get(TENANT_REPOSITORY_TOKEN);
      const membershipRepo = app.get(MEMBERSHIP_REPOSITORY_TOKEN);
      const roleRepo = app.get(ROLE_REPOSITORY_TOKEN);
      const refreshTokenRepo = app.get(REFRESH_TOKEN_REPOSITORY_TOKEN);
      const passwordHasher = app.get(PASSWORD_HASHER_TOKEN);
      const tokenService = app.get(TOKEN_SERVICE_TOKEN);
      const outbox = app.get(OUTBOX_PORT);
      const audit = app.get(AUDIT_PORT_TOKEN);
      const idempotency = app.get(IDEMPOTENCY_STORAGE_PORT_TOKEN);
      const idGenerator = app.get(ID_GENERATOR_TOKEN);
      const clock = app.get(CLOCK_PORT_TOKEN);

      expect(userRepo).toBeDefined();
      expect(tenantRepo).toBeDefined();
      expect(membershipRepo).toBeDefined();
      expect(roleRepo).toBeDefined();
      expect(refreshTokenRepo).toBeDefined();
      expect(passwordHasher).toBeDefined();
      expect(tokenService).toBeDefined();
      expect(outbox).toBeDefined();
      expect(audit).toBeDefined();
      expect(idempotency).toBeDefined();
      expect(idGenerator).toBeDefined();
      expect(clock).toBeDefined();
    });
  });

  describe("DI Edge Cases & Error Scenarios", () => {
    it("handles duplicate email with proper error from DI chain", async () => {
      const input1 = buildSignUpInput({
        email: "duplicate@example.com",
        idempotencyKey: "dup-1",
      });
      const input2 = buildSignUpInput({
        email: "duplicate@example.com",
        idempotencyKey: "dup-2",
      });

      await signUpUseCase.execute(input1);

      // Second signup should fail
      await expect(signUpUseCase.execute(input2)).rejects.toThrow(
        "User with this email already exists"
      );
    });

    it("validates input before calling injected dependencies", async () => {
      const invalidInput = buildSignUpInput({
        email: "not-an-email",
        password: "short",
        idempotencyKey: "val-1",
      });

      await expect(signUpUseCase.execute(invalidInput)).rejects.toThrow();
    });
  });
});
