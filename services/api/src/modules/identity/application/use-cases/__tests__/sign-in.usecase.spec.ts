import { describe, it, expect, beforeEach } from "vitest";
import { SignInUseCase } from "../sign-in.usecase";
import { FakeUserRepository } from "../../../testkit/fakes/fake-user-repo";
import { FakeMembershipRepository } from "../../../testkit/fakes/fake-membership-repo";
import { FakeRefreshTokenRepository } from "../../../testkit/fakes/fake-refresh-token-repo";
import { MockPasswordHasher } from "../../../testkit/mocks/mock-password-hasher";
import { MockTokenService } from "../../../testkit/mocks/mock-token-service";
import { MockOutbox } from "../../../testkit/mocks/mock-outbox";
import { MockAudit } from "../../../testkit/mocks/mock-audit";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { MockIdempotencyStoragePort } from "@shared/testkit/mocks/mock-idempotency-port";
import { buildSignInInput } from "../../../testkit/builders/build-signin-input";
import { User } from "../../../domain/entities/user.entity";
import { Email } from "../../../domain/value-objects/email.vo";
import { Membership } from "../../../domain/entities/membership.entity";
import { ForbiddenError } from "@shared/errors/domain-errors";

let useCase: SignInUseCase;
let userRepo: FakeUserRepository;
let membershipRepo: FakeMembershipRepository;
let refreshTokenRepo: FakeRefreshTokenRepository;
let outbox: MockOutbox;
let audit: MockAudit;
let passwordHasher: MockPasswordHasher;

const seedUser = async () => {
  const email = Email.create("user@example.com");
  const passwordHash = await passwordHasher.hash("password123");
  await userRepo.create(User.create("user-1", email, passwordHash, null));
  await membershipRepo.create(Membership.create("mem-1", "tenant-1", "user-1", "role-1"));
};

beforeEach(async () => {
  userRepo = new FakeUserRepository();
  membershipRepo = new FakeMembershipRepository();
  refreshTokenRepo = new FakeRefreshTokenRepository();
  outbox = new MockOutbox();
  audit = new MockAudit();
  passwordHasher = new MockPasswordHasher();

  await seedUser();

  useCase = new SignInUseCase(
    userRepo,
    membershipRepo,
    passwordHasher,
    new MockTokenService(),
    refreshTokenRepo,
    outbox,
    audit,
    new MockIdempotencyStoragePort(),
    new FakeIdGenerator("id"),
    new FakeClock(new Date("2023-01-01T00:00:00.000Z"))
  );
});

describe("SignInUseCase", () => {
  it("issues tokens and records side effects", async () => {
    const result = await useCase.execute(buildSignInInput({ tenantId: "tenant-1" }));

    expect(result.accessToken).toContain("access:");
    expect(refreshTokenRepo.tokens).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });

  it("fails on wrong password", async () => {
    await expect(useCase.execute(buildSignInInput({ password: "wrong" }))).rejects.toBeInstanceOf(
      ForbiddenError
    );
    expect(refreshTokenRepo.tokens).toHaveLength(0);
  });
});
