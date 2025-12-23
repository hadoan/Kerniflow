import { describe, it, expect, beforeEach } from "vitest";
import { CreateExpenseUseCase } from "../CreateExpenseUseCase";
import { FakeExpenseRepository } from "../../../testkit/fakes/fake-expense-repo";
import { MockAuditPort } from "@shared/testkit/mocks/mock-audit-port";
import { MockOutboxPort } from "@shared/testkit/mocks/mock-outbox-port";
import { MockIdempotencyPort } from "@shared/testkit/mocks/mock-idempotency-port";
import { FakeIdGenerator } from "@shared/testkit/fakes/fake-id-generator";
import { FakeClock } from "@shared/testkit/fakes/fake-clock";
import { buildCreateExpenseInput } from "../../../testkit/builders/build-create-expense-input";
import { CustomFieldDefinitionPort, CustomFieldIndexPort } from "@kerniflow/domain";

let useCase: CreateExpenseUseCase;
let repo: FakeExpenseRepository;
let audit: MockAuditPort;
let outbox: MockOutboxPort;
let idempotency: MockIdempotencyPort;
let customDefs: CustomFieldDefinitionPort;
let customIndexes: CustomFieldIndexPort;

beforeEach(() => {
  repo = new FakeExpenseRepository();
  audit = new MockAuditPort();
  outbox = new MockOutboxPort();
  idempotency = new MockIdempotencyPort();
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
  useCase = new CreateExpenseUseCase(
    repo,
    outbox,
    audit,
    idempotency,
    new FakeIdGenerator("exp"),
    new FakeClock(),
    customDefs,
    customIndexes
  );
});

describe("CreateExpenseUseCase", () => {
  it("creates an expense, audit and outbox entry", async () => {
    const expense = await useCase.execute(buildCreateExpenseInput());

    expect(repo.expenses).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
    expect(expense.totalCents).toBe(500);
  });

  it("is idempotent for same key", async () => {
    const input = buildCreateExpenseInput({ idempotencyKey: "same" });
    const first = await useCase.execute(input);
    const second = await useCase.execute(input);

    expect(second.id).toBe(first.id);
    expect(repo.expenses).toHaveLength(1);
    expect(audit.entries).toHaveLength(1);
    expect(outbox.events).toHaveLength(1);
  });
});
