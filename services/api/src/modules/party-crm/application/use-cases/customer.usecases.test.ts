import { beforeEach, describe, expect, it } from "vitest";
import {
  ConflictError,
  FakeIdGenerator,
  FixedClock,
  NoopLogger,
  unwrap,
  isErr,
} from "@kerniflow/kernel";
import { InMemoryPartyRepo } from "../../testkit/in-memory-party-repo";
import { ArchiveCustomerUseCase } from "./archive-customer/archive-customer.usecase";
import { CreateCustomerUseCase } from "./create-customer/create-customer.usecase";
import { GetCustomerByIdUseCase } from "./get-customer-by-id/get-customer-by-id.usecase";
import { ListCustomersUseCase } from "./list-customers/list-customers.usecase";
import { SearchCustomersUseCase } from "./search-customers/search-customers.usecase";
import { UnarchiveCustomerUseCase } from "./unarchive-customer/unarchive-customer.usecase";
import { UpdateCustomerUseCase } from "./update-customer/update-customer.usecase";

describe("Party & CRM - Customers", () => {
  const ctx = { tenantId: "tenant-1" };
  let repo: InMemoryPartyRepo;
  let clock: FixedClock;
  let idGenerator: FakeIdGenerator;
  let createCustomer: CreateCustomerUseCase;
  let updateCustomer: UpdateCustomerUseCase;
  let archiveCustomer: ArchiveCustomerUseCase;
  let unarchiveCustomer: UnarchiveCustomerUseCase;
  let getCustomer: GetCustomerByIdUseCase;
  let listCustomers: ListCustomersUseCase;
  let searchCustomers: SearchCustomersUseCase;

  beforeEach(() => {
    repo = new InMemoryPartyRepo();
    clock = new FixedClock(new Date("2025-01-01T00:00:00.000Z"));
    idGenerator = new FakeIdGenerator([
      "party-1",
      "email-1",
      "phone-1",
      "addr-1",
      "party-2",
      "email-2",
      "phone-2",
      "addr-2",
      "party-3",
      "email-3",
      "phone-3",
      "addr-3",
      "extra-1",
      "extra-2",
    ]);

    createCustomer = new CreateCustomerUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      idGenerator,
      clock,
    });
    updateCustomer = new UpdateCustomerUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      idGenerator,
      clock,
    });
    archiveCustomer = new ArchiveCustomerUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      clock,
    });
    unarchiveCustomer = new UnarchiveCustomerUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
      clock,
    });
    getCustomer = new GetCustomerByIdUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
    });
    listCustomers = new ListCustomersUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
    });
    searchCustomers = new SearchCustomersUseCase({
      logger: new NoopLogger(),
      partyRepo: repo,
    });
  });

  it("creates a customer", async () => {
    const result = await createCustomer.execute(
      {
        displayName: "Acme Corp",
        email: "billing@acme.com",
        phone: "+123",
        billingAddress: { line1: "123 Main", city: "NYC", country: "US" },
        vatId: "VAT123",
        tags: ["vip"],
      },
      ctx
    );

    const dto = unwrap(result).customer;
    expect(dto.id).toBe("party-1");
    expect(dto.displayName).toBe("Acme Corp");
    expect(repo.customers).toHaveLength(1);
    expect(repo.customers[0].contactPoints.find((c) => c.type === "EMAIL")?.value).toBe(
      "billing@acme.com"
    );
  });

  it("updates a customer", async () => {
    await createCustomer.execute({ displayName: "Acme" }, ctx);
    const result = await updateCustomer.execute(
      {
        id: "party-1",
        patch: {
          displayName: "Acme Updated",
          email: "new@acme.com",
          notes: "Updated notes",
        },
      },
      ctx
    );

    const dto = unwrap(result).customer;
    expect(dto.displayName).toBe("Acme Updated");
    expect(dto.email).toBe("new@acme.com");
    expect(dto.notes).toBe("Updated notes");
  });

  it("archives and blocks updates until unarchived", async () => {
    await createCustomer.execute({ displayName: "To Archive" }, ctx);
    await archiveCustomer.execute({ id: "party-1" }, ctx);

    const updateResult = await updateCustomer.execute(
      { id: "party-1", patch: { displayName: "Blocked" } },
      ctx
    );
    expect(isErr(updateResult)).toBe(true);
    if (isErr(updateResult)) {
      expect(updateResult.error).toBeInstanceOf(ConflictError);
    }

    await unarchiveCustomer.execute({ id: "party-1" }, ctx);
    const unarchived = await getCustomer.execute({ id: "party-1" }, ctx);
    expect(unwrap(unarchived).customer.archivedAt).toBeNull();
  });

  it("lists and searches per tenant", async () => {
    await createCustomer.execute({ displayName: "Tenant One" }, ctx);
    await createCustomer.execute({ displayName: "Other Tenant" }, { tenantId: "tenant-2" });

    const list = unwrap(await listCustomers.execute({ pageSize: 10 }, ctx));
    expect(list.items).toHaveLength(1);
    expect(list.items[0].displayName).toBe("Tenant One");

    const search = unwrap(await searchCustomers.execute({ q: "tenant" }, ctx));
    expect(search.items).toHaveLength(1);
  });

  it("keeps a single primary email when replaced", async () => {
    await createCustomer.execute({ displayName: "Email Swap", email: "first@example.com" }, ctx);
    await updateCustomer.execute({ id: "party-1", patch: { email: "second@example.com" } }, ctx);

    const customer = repo.customers[0];
    const emails = customer.contactPoints.filter((c) => c.type === "EMAIL");
    expect(emails).toHaveLength(1);
    expect(emails[0].value).toBe("second@example.com");
  });
});
