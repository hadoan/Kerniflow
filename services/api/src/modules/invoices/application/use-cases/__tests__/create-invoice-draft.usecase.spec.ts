import { beforeEach, describe, expect, it } from "vitest";
import { CustomFieldDefinitionPort, CustomFieldIndexPort } from "@kerniflow/domain";
import { InMemoryIdempotency, NoopLogger, unwrap } from "@kerniflow/kernel";

import { CreateInvoiceDraftUseCase } from "../create-invoice-draft/CreateInvoiceDraftUseCase";
import { FakeInvoiceRepository } from "../../../testkit/fakes/fake-invoice-repo";
import { buildCreateDraftInput } from "../../../testkit/builders/build-create-draft-input";
import { MockAuditPort } from "@shared/testkit/mocks/mock-audit-port";
import { MockOutboxPort } from "@shared/testkit/mocks/mock-outbox-port";
import { FakeIdGenerator } from "@kerniflow/kernel";

let useCase: CreateInvoiceDraftUseCase;
let repo: FakeInvoiceRepository;
let outbox: MockOutboxPort;
let audit: MockAuditPort;
let idempotency: InMemoryIdempotency;
let customDefs: CustomFieldDefinitionPort;
let customIndexes: CustomFieldIndexPort;

beforeEach(() => {
  repo = new FakeInvoiceRepository();
  outbox = new MockOutboxPort();
  audit = new MockAuditPort();
  idempotency = new InMemoryIdempotency();
  customDefs = {
    listActiveByEntityType: async () => [],
    getById: async () => null,
    upsert: async (def: any) => def,
    softDelete: async () => {},
  };
  customIndexes = {
    upsertIndexesForEntity: async () => {},
    deleteIndexesForEntity: async () => {},
  };
  useCase = new CreateInvoiceDraftUseCase({
    logger: new NoopLogger(),
    idempotency,
    invoiceRepo: repo,
    outbox,
    audit,
    idGenerator: new FakeIdGenerator(["inv-1", "line-1", "line-2", "line-3"]),
    customFieldDefinitions: customDefs,
    customFieldIndexes: customIndexes,
  });
});

describe("CreateInvoiceDraftUseCase", () => {
  it("creates a draft invoice with lines and audit", async () => {
    const { cmd, ctx } = buildCreateDraftInput();
    const result = await useCase.execute(cmd, ctx);
    const invoice = unwrap(result);

    expect(invoice.status).toBe("DRAFT");
    expect(invoice.lines).toHaveLength(1);
    expect(repo.invoices).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
  });

  it("is idempotent on repeated key", async () => {
    const { cmd, ctx } = buildCreateDraftInput({ idempotencyKey: "idem-1" });
    const first = unwrap(await useCase.execute(cmd, ctx));
    const second = unwrap(await useCase.execute(cmd, ctx));

    expect(second.id).toBe(first.id);
    expect(repo.invoices).toHaveLength(1);
  });
});
