import { describe, it, expect, beforeEach } from "vitest";
import { SignUpUseCase } from "../sign-up.usecase";
import { FakeUserRepository } from "../../../testkit/fakes/fake-user-repo";
import { FakeTenantRepository } from "../../../testkit/fakes/fake-tenant-repo";
import { FakeMembershipRepository } from "../../../testkit/fakes/fake-membership-repo";
import { FakeRoleRepository } from "../../../testkit/fakes/fake-role-repo";
import { FakeRefreshTokenRepository } from "../../../testkit/fakes/fake-refresh-token-repo";
import { MockPasswordHasher } from "../../../testkit/mocks/mock-password-hasher";
import { MockTokenService } from "../../../testkit/mocks/mock-token-service";
import { MockOutbox } from "../../../testkit/mocks/mock-outbox";
import { MockAudit } from "../../../testkit/mocks/mock-audit";
import { MockIdempotencyStoragePort } from "@shared/testkit/mocks/mock-idempotency-port";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { buildSignUpInput } from "../../../testkit/builders/build-signup-input";
import { ValidationError } from "@shared/errors/domain-errors";

let useCase: SignUpUseCase;
let userRepo: FakeUserRepository;
let tenantRepo: FakeTenantRepository;
let membershipRepo: FakeMembershipRepository;
let roleRepo: FakeRoleRepository;
let refreshTokenRepo: FakeRefreshTokenRepository;
let outbox: MockOutbox;
let audit: MockAudit;
let idempotency: MockIdempotencyStoragePort;

const setup = () => {
  userRepo = new FakeUserRepository();
  tenantRepo = new FakeTenantRepository();
  membershipRepo = new FakeMembershipRepository();
  roleRepo = new FakeRoleRepository();
  refreshTokenRepo = new FakeRefreshTokenRepository();
  outbox = new MockOutbox();
  audit = new MockAudit();
  idempotency = new MockIdempotencyStoragePort();

  useCase = new SignUpUseCase(
    userRepo,
    tenantRepo,
    membershipRepo,
    roleRepo,
    new MockPasswordHasher(),
    new MockTokenService(),
    refreshTokenRepo,
    outbox,
    audit,
    idempotency,
    new FakeIdGenerator("id"),
    new FakeClock(new Date("2023-01-01T00:00:00.000Z"))
  );
};

beforeEach(() => setup());

describe("SignUpUseCase", () => {
  it("creates tenant, user, membership and side effects", async () => {
    const result = await useCase.execute(buildSignUpInput());

    expect(result.userId).toBeDefined();
    expect(userRepo.users).toHaveLength(1);
    expect(tenantRepo.tenants).toHaveLength(1);
    expect(membershipRepo.memberships).toHaveLength(1);
    expect(refreshTokenRepo.tokens).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events.map((e) => e.eventType)).toContain("identity.user.created");
  });

  it("is idempotent for the same key", async () => {
    const input = buildSignUpInput({ idempotencyKey: "same-key" });
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second).toEqual(first);
    expect(userRepo.users).toHaveLength(1);
    expect(tenantRepo.tenants).toHaveLength(1);
    expect(membershipRepo.memberships).toHaveLength(1);
    expect(outbox.events.length).toBeGreaterThan(0);
  });

  it("rejects invalid email", async () => {
    await expect(
      useCase.execute(buildSignUpInput({ email: "bad", idempotencyKey: "v1" }))
    ).rejects.toBeInstanceOf(ValidationError);
    expect(userRepo.users).toHaveLength(0);
    expect(audit.entries).toHaveLength(0);
  });
});
