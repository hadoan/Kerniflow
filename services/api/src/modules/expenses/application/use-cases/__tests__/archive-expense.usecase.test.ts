import { describe, it, expect, beforeEach } from "vitest";
import { FakeExpenseRepository } from "../../../testkit/fakes/fake-expense-repo";
import { ArchiveExpenseUseCase } from "../archive-expense.usecase";
import { UnarchiveExpenseUseCase } from "../unarchive-expense.usecase";
import { Expense } from "../../../domain/expense.entity";
import { FixedClock } from "@corely/kernel";

describe("ArchiveExpenseUseCase", () => {
  const tenantId = "t1";
  const userId = "user-1";
  let repo: FakeExpenseRepository;
  let archive: ArchiveExpenseUseCase;
  let unarchive: UnarchiveExpenseUseCase;

  beforeEach(() => {
    repo = new FakeExpenseRepository();
    archive = new ArchiveExpenseUseCase(repo, new FixedClock(new Date("2024-01-01T00:00:00Z")));
    unarchive = new UnarchiveExpenseUseCase(repo);
  });

  const buildExpense = () =>
    new Expense(
      "exp-1",
      tenantId,
      "Vendor",
      1000,
      "EUR",
      null,
      new Date("2024-01-01"),
      userId,
      new Date("2024-01-01")
    );

  it("archives an active expense", async () => {
    const expense = buildExpense();
    await repo.save(expense);

    await archive.execute({ tenantId, expenseId: expense.id, userId });

    const stored = await repo.findByIdIncludingArchived(tenantId, expense.id);
    expect(stored?.archivedAt).toBeInstanceOf(Date);
    expect(stored?.archivedByUserId).toBe(userId);
  });

  it("unarchives an archived expense", async () => {
    const expense = buildExpense();
    expense.archive(new Date("2024-01-02T00:00:00Z"), userId);
    await repo.save(expense);

    await unarchive.execute({ tenantId, expenseId: expense.id });

    const stored = await repo.findById(tenantId, expense.id);
    expect(stored?.archivedAt).toBeNull();
  });

  it("excludes archived from default list", async () => {
    const active = buildExpense();
    const archived = new Expense(
      "exp-2",
      tenantId,
      "Vendor2",
      2000,
      "EUR",
      null,
      new Date("2024-01-02"),
      userId,
      new Date("2024-01-02")
    );
    archived.archive(new Date("2024-01-02T00:00:00Z"), userId);
    await repo.save(active);
    await repo.save(archived);

    const visible = await repo.list(tenantId);
    expect(visible.map((e) => e.id)).toEqual([active.id]);
  });

  it("includes archived when requested", async () => {
    const archived = buildExpense();
    archived.archive(new Date("2024-01-02T00:00:00Z"), userId);
    await repo.save(archived);

    const visible = await repo.list(tenantId, { includeArchived: true });
    expect(visible.map((e) => e.id)).toContain(archived.id);
  });
});
