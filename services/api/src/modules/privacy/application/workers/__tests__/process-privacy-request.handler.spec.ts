import { describe, it, expect, beforeEach } from "vitest";
import { ProcessPrivacyRequestHandler } from "../process-privacy-request.handler";
import { FakePrivacyRequestRepo } from "../../../testkit/fakes/fake-privacy-request-repo";
import { FixedClock } from "@corely/kernel";
import { FakeDocumentsPort } from "../../../testkit/fakes/fake-documents-port";
import { PersonalDataCollectorPort } from "../../ports/personal-data-collector.port";
import { PersonalDataEraserPort } from "../../ports/personal-data-eraser.port";
import { PrivacyRequest } from "../../../domain/privacy-request.entity";

describe("ProcessPrivacyRequestHandler", () => {
  const tenantId = "t1";
  const subjectUserId = "user-1";
  let repo: FakePrivacyRequestRepo;
  let handler: ProcessPrivacyRequestHandler;
  let docs: FakeDocumentsPort;

  beforeEach(() => {
    repo = new FakePrivacyRequestRepo();
    docs = new FakeDocumentsPort();
  });

  it("processes export and stores document", async () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const req = PrivacyRequest.create({
      id: "req-1",
      tenantId,
      subjectUserId,
      requestedByUserId: subjectUserId,
      type: "EXPORT",
      now,
    });
    await repo.create(req);

    const collectors: PersonalDataCollectorPort[] = [
      {
        moduleName: () => "identity",
        collectPersonalData: async () => [
          { module: "identity", resource: "user", recordId: "user-1", data: { email: "a@b.com" } },
        ],
      },
    ];
    handler = new ProcessPrivacyRequestHandler(repo, new FixedClock(now), docs, collectors, []);

    await handler.handle({ requestId: req.id, tenantId });

    const saved = await repo.findById(tenantId, req.id);
    expect(saved?.status).toBe("READY");
    expect(saved?.resultDocumentId).toBeDefined();
    expect(docs.exports.length).toBe(1);
  });

  it("processes erasure and stores report", async () => {
    const now = new Date("2024-01-01T00:00:00Z");
    const req = PrivacyRequest.create({
      id: "req-2",
      tenantId,
      subjectUserId,
      requestedByUserId: subjectUserId,
      type: "ERASE",
      now,
    });
    await repo.create(req);

    const erasers: PersonalDataEraserPort[] = [
      {
        moduleName: () => "identity",
        erasePersonalData: async () => ({
          module: "identity",
          outcome: "SKIPPED",
          reason: "LEGAL_RETENTION",
        }),
      },
    ];
    handler = new ProcessPrivacyRequestHandler(repo, new FixedClock(now), docs, [], erasers);

    await handler.handle({ requestId: req.id, tenantId });

    const saved = await repo.findById(tenantId, req.id);
    expect(saved?.status).toBe("COMPLETED");
    expect(saved?.resultReportDocumentId).toBeDefined();
    expect(docs.reports.length).toBe(1);
  });
});
