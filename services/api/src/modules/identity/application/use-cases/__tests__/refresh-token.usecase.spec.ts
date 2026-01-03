import { describe, it, expect, beforeEach } from "vitest";
import { RefreshTokenUseCase } from "../refresh-token.usecase";
import { FakeRefreshTokenRepository } from "../../../testkit/fakes/fake-refresh-token-repo";
import { FakeUserRepository } from "../../../testkit/fakes/fake-user-repo";
import { FakeMembershipRepository } from "../../../testkit/fakes/fake-membership-repo";
import { MockTokenService } from "../../../testkit/mocks/mock-token-service";
import { MockAudit } from "../../../testkit/mocks/mock-audit";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { User } from "../../../domain/entities/user.entity";
import { Email } from "../../../domain/value-objects/email.vo";
import { Membership } from "../../../domain/entities/membership.entity";
import { createHash } from "crypto";

let useCase: RefreshTokenUseCase;
let refreshRepo: FakeRefreshTokenRepository;
let userRepo: FakeUserRepository;
let membershipRepo: FakeMembershipRepository;
let clock: FakeClock;

const seed = async () => {
  const user = User.create("user-1", Email.create("user@example.com"), "hashed:password", null);
  await userRepo.create(user);
  await membershipRepo.create(
    Membership.create("member-1", "tenant-1", "user-1", "role-1", clock.now())
  );
  const refreshToken = "refresh-abc";
  const hash = createHash("sha256").update(refreshToken).digest("hex");
  await refreshRepo.create({
    id: "rt-1",
    userId: "user-1",
    tenantId: "tenant-1",
    tokenHash: hash,
    expiresAt: new Date(clock.now().getTime() + 10_000),
  });
  return refreshToken;
};

beforeEach(async () => {
  refreshRepo = new FakeRefreshTokenRepository();
  userRepo = new FakeUserRepository();
  membershipRepo = new FakeMembershipRepository();
  clock = new FakeClock(new Date("2023-01-01T00:00:00.000Z"));
  useCase = new RefreshTokenUseCase(
    refreshRepo,
    new MockTokenService(),
    userRepo,
    membershipRepo,
    new MockAudit(),
    clock
  );
});

describe("RefreshTokenUseCase", () => {
  it("rotates refresh token and issues new access token", async () => {
    const token = await seed();
    const result = await useCase.execute({ refreshToken: token });

    expect(result.refreshToken).toBeDefined();
    expect(refreshRepo.tokens[0].revokedAt).not.toBeNull();
    expect(refreshRepo.tokens).toHaveLength(2);
  });

  it("fails for expired token", async () => {
    const token = await seed();
    // advance beyond expiry
    clock.advance(20_000);
    await expect(useCase.execute({ refreshToken: token })).rejects.toThrow();
  });
});
