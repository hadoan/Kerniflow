import type { OutboxPort } from "@corely/kernel";
import type { AuditPort } from "../../../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../../../shared/ports/id-generator.port";
import type { ClockPort } from "../../../../shared/ports/clock.port";
import type { RequestContext } from "../../../../shared/context/request-context";
import {
  type CustomFieldDefinitionPort,
  type CustomFieldIndexPort,
  buildCustomFieldIndexes,
  validateAndNormalizeCustomValues,
} from "@corely/domain";
import { Expense } from "../../domain/expense.entity";
import type { ExpenseRepositoryPort } from "../ports/expense-repository.port";

export interface CreateExpenseInput {
  tenantId: string;
  merchant: string;
  totalCents: number;
  taxAmountCents?: number | null;
  currency: string;
  category?: string | null;
  issuedAt: Date;
  createdByUserId: string;
  custom?: Record<string, unknown>;
  idempotencyKey: string;
  context: RequestContext;
}

export class CreateExpenseUseCase {
  private readonly actionKey = "expenses.create";

  constructor(
    private readonly expenseRepo: ExpenseRepositoryPort,
    private readonly outbox: OutboxPort,
    private readonly audit: AuditPort,
    private readonly idempotency: IdempotencyStoragePort,
    private readonly idGenerator: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly customFieldDefinitions: CustomFieldDefinitionPort,
    private readonly customFieldIndexes: CustomFieldIndexPort
  ) {}

  async execute(input: CreateExpenseInput): Promise<Expense> {
    const cached = await this.idempotency.get(this.actionKey, input.tenantId, input.idempotencyKey);
    if (cached) {
      const body = cached.body as any;
      return new Expense(
        body.id,
        body.tenantId,
        body.merchant,
        body.totalCents,
        body.taxAmountCents ?? null,
        body.currency,
        body.category ?? null,
        new Date(body.issuedAt),
        body.createdByUserId,
        new Date(body.createdAt),
        body.archivedAt ? new Date(body.archivedAt) : null,
        body.archivedByUserId ?? null,
        (body.custom ?? null) as Record<string, unknown> | null
      );
    }

    const definitions = await this.customFieldDefinitions.listActiveByEntityType(
      input.tenantId,
      "expense"
    );
    const normalizedCustom = validateAndNormalizeCustomValues(definitions, input.custom);

    const expense = new Expense(
      this.idGenerator.newId(),
      input.tenantId,
      input.merchant,
      input.totalCents,
      input.taxAmountCents ?? null,
      input.currency,
      input.category ?? null,
      input.issuedAt,
      input.createdByUserId,
      this.clock.now(),
      null,
      null,
      Object.keys(normalizedCustom).length ? normalizedCustom : null
    );

    await this.expenseRepo.save(expense);
    await this.audit.log({
      tenantId: input.tenantId,
      userId: input.createdByUserId,
      action: "expense.created",
      entityType: "Expense",
      entityId: expense.id,
      metadata: { context: input.context },
    });

    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: "expense.created",
      payload: {
        expenseId: expense.id,
        tenantId: expense.tenantId,
        totalCents: expense.totalCents,
        currency: expense.currency,
      },
    });

    const indexRows = buildCustomFieldIndexes({
      tenantId: input.tenantId,
      entityType: "expense",
      entityId: expense.id,
      definitions,
      values: normalizedCustom,
    });
    if (indexRows.length) {
      await this.customFieldIndexes.upsertIndexesForEntity(
        input.tenantId,
        "expense",
        expense.id,
        indexRows
      );
    }

    await this.idempotency.store(this.actionKey, input.tenantId, input.idempotencyKey, {
      body: this.toJSON(expense),
    });

    return expense;
  }

  private toJSON(expense: Expense) {
    return {
      id: expense.id,
      tenantId: expense.tenantId,
      merchant: expense.merchant,
      totalCents: expense.totalCents,
      taxAmountCents: expense.taxAmountCents,
      currency: expense.currency,
      category: expense.category,
      issuedAt: expense.issuedAt.toISOString(),
      createdByUserId: expense.createdByUserId,
      archivedAt: expense.archivedAt?.toISOString(),
      archivedByUserId: expense.archivedByUserId,
      createdAt: expense.createdAt.toISOString(),
      custom: expense.custom,
    };
  }
}
