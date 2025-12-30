import { describe, it, expect, beforeEach } from "vitest";
import { RequestPersonalDataExportUseCase } from "../request-personal-data-export/request-personal-data-export.usecase";
import { RequestAccountErasureUseCase } from "../request-account-erasure/request-account-erasure.usecase";
import { FakePrivacyRequestRepo } from "../../../testkit/fakes/fake-privacy-request-repo";
import { FakeOutbox } from "../../../testkit/fakes/fake-outbox";
import { FakeIdGenerator } from "../../../testkit/fakes/fake-id-generator";
import { FixedClock } from "@corely/kernel";
import { IdentityPort } from "../../ports/identity-port";

class NoopIdentity implements IdentityPort {}

describe("Privacy use cases", () => {
  const tenantId = "t1";
  const userId = "user-1";
  let repo: FakePrivacyRequestRepo;
  let outbox: FakeOutbox;
  let idGen: FakeIdGenerator;
  let clock: FixedClock;
  let exportUseCase: RequestPersonalDataExportUseCase;
  let eraseUseCase: RequestAccountErasureUseCase;

  beforeEach(() => {
    repo = new FakePrivacyRequestRepo();
    outbox = new FakeOutbox();
    idGen = new FakeIdGenerator();
    clock = new FixedClock(new Date("2024-01-01T00:00:00Z"));
    exportUseCase = new RequestPersonalDataExportUseCase(repo, outbox, idGen, clock);
    eraseUseCase = new RequestAccountErasureUseCase(repo, outbox, idGen, clock, new NoopIdentity());
  });

  it("creates export request and enqueues event", async () => {
    const { requestId } = await exportUseCase.execute({
      tenantId,
      subjectUserId: userId,
      requestedByUserId: userId,
    });

    expect(requestId).toBeDefined();
    const saved = await repo.findById(tenantId, requestId);
    expect(saved?.type).toBe("EXPORT");
    expect(outbox.events[0]?.eventType).toBe("privacy.requested");
  });

  it("creates erase request and enqueues event", async () => {
    const { requestId } = await eraseUseCase.execute({
      tenantId,
      subjectUserId: userId,
      requestedByUserId: userId,
    });

    const saved = await repo.findById(tenantId, requestId);
    expect(saved?.type).toBe("ERASE");
    expect(outbox.events[0]?.payload.requestId).toBe(requestId);
  });
});
