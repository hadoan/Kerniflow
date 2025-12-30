import { beforeEach, describe, expect, it } from "vitest";
import { LinkDocumentUseCase } from "./link-document.usecase";
import { InMemoryDocumentRepo } from "../../../testkit/fakes/in-memory-document-repo";
import { InMemoryDocumentLinkRepo } from "../../../testkit/fakes/in-memory-document-link-repo";
import { DocumentAggregate } from "../../../domain/document.aggregate";
import { NoopLogger, unwrap, isErr } from "@corely/kernel";

describe("LinkDocumentUseCase", () => {
  let documentRepo: InMemoryDocumentRepo;
  let linkRepo: InMemoryDocumentLinkRepo;
  let useCase: LinkDocumentUseCase;

  beforeEach(() => {
    documentRepo = new InMemoryDocumentRepo();
    linkRepo = new InMemoryDocumentLinkRepo(documentRepo);
    useCase = new LinkDocumentUseCase({
      logger: new NoopLogger(),
      documentRepo,
      linkRepo,
    });
  });

  it("links an existing document to an entity", async () => {
    const doc = DocumentAggregate.create({
      id: "doc-1",
      tenantId: "tenant-1",
      type: "UPLOAD",
      createdAt: new Date("2025-01-01T00:00:00.000Z"),
    });
    await documentRepo.create(doc);

    const result = unwrap(
      await useCase.execute(
        { documentId: doc.id, entityType: "EXPENSE", entityId: "exp-1" },
        { tenantId: "tenant-1" }
      )
    );

    expect(result.documentId).toBe(doc.id);
    const found = await linkRepo.findDocumentIds({
      tenantId: "tenant-1",
      entityType: "EXPENSE",
      entityId: "exp-1",
    });
    expect(found).toContain(doc.id);
  });

  it("fails when document is missing", async () => {
    const result = await useCase.execute(
      { documentId: "missing", entityType: "EXPENSE", entityId: "exp-1" },
      { tenantId: "tenant-1" }
    );

    expect(isErr(result)).toBe(true);
  });
});
