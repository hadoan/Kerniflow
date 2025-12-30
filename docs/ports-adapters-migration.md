# Ports & Adapters Architecture Migration Guide

This document describes the refactored architecture implementing clean Ports & Adapters (Hexagonal Architecture) with centralized data access via `DataModule`.

## Overview

The codebase now follows these principles:

1. **Application/Domain layer depends only on ports (interfaces)**
   - Use-cases inject repository ports via dependency injection tokens
   - No direct Prisma imports in application code

2. **Infrastructure implements adapters**
   - Prisma-based repositories live in `packages/data` or module-specific `infrastructure/` folders
   - All adapters implement port interfaces

3. **PrismaClient is a singleton managed by PrismaService**
   - Centralized lifecycle management (`$connect`, `$disconnect`)
   - Single source of truth for database connections

4. **DataModule exports all shared infrastructure providers**
   - Imports `DataModule` in feature modules to access repositories
   - Reduces duplication across modules

5. **Transactions via UnitOfWork port**
   - Use `prisma.$transaction()` under the hood
   - Transaction context passed to repositories

## Architecture

```
┌──────────────────────────────────────────────┐
│         Application / Domain Layer           │
│  (Use Cases, Domain Entities, Port Interfaces)│
│                                              │
│  depends on:                                 │
│    - ExpenseRepositoryPort (interface)       │
│    - OutboxPort (interface)                  │
│    - UnitOfWorkPort (interface)              │
└──────────────────┬───────────────────────────┘
                   │ implements
                   ▼
┌──────────────────────────────────────────────┐
│         Infrastructure Layer                 │
│  (Prisma Adapters, DataModule)               │
│                                              │
│  - PrismaService (singleton)                 │
│  - PrismaExpenseRepository                   │
│  - PrismaOutboxAdapter                       │
│  - PrismaUnitOfWork                          │
└──────────────────────────────────────────────┘
```

## Core Components

### 1. PrismaService (`packages/data/src/prisma/prisma.service.ts`)

Singleton NestJS service managing PrismaClient lifecycle:

```typescript
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

**Benefits:**

- Single database connection pool
- Automatic connection lifecycle
- Nest-managed dependency injection

### 2. Port Interfaces (`packages/kernel/src/ports/`)

Shared infrastructure ports:

- **`UnitOfWorkPort`** - Transaction boundary control
- **`OutboxPort`** - Transactional outbox pattern
- **`AuditPort`** - Audit logging
- **`IdempotencyPort`** - Idempotency key management

Each port has a corresponding symbol token for DI:

```typescript
export const UNIT_OF_WORK = Symbol("UNIT_OF_WORK");
export const OUTBOX_PORT = Symbol("OUTBOX_PORT");
export const AUDIT_PORT = Symbol("AUDIT_PORT");
```

### 3. Transaction Context

Opaque handle passed to repositories during transactions:

```typescript
export interface TransactionContext {
  readonly __brand: unique symbol;
}

export interface UnitOfWorkPort {
  withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T>;
}
```

Repositories accept optional `tx?: TransactionContext` parameter:

```typescript
export interface ExpenseRepositoryPort {
  save(expense: Expense, tx?: TransactionContext): Promise<void>;
  findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Expense | null>;
}
```

### 4. PrismaUnitOfWork (`packages/data/src/uow/prisma-unit-of-work.adapter.ts`)

Implements transaction control:

```typescript
@Injectable()
export class PrismaUnitOfWork implements UnitOfWorkPort {
  constructor(private readonly prisma: PrismaService) {}

  async withinTransaction<T>(fn: (tx: TransactionContext) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (prismaTransaction) => {
      return fn(prismaTransaction as unknown as TransactionContext);
    });
  }
}
```

Helper function for repositories:

```typescript
export function getPrismaClient(
  prisma: PrismaService,
  tx?: TransactionContext
): PrismaService | PrismaTransactionClient {
  if (tx) {
    return tx as unknown as PrismaTransactionClient;
  }
  return prisma;
}
```

### 5. DataModule (`packages/data/src/data.module.ts`)

Global module exporting all shared data infrastructure:

```typescript
@Global()
@Module({
  providers: [
    PrismaService,
    PrismaUnitOfWork,
    { provide: UNIT_OF_WORK, useExisting: PrismaUnitOfWork },

    PrismaOutboxAdapter,
    { provide: OUTBOX_PORT, useExisting: PrismaOutboxAdapter },

    PrismaAuditAdapter,
    { provide: AUDIT_PORT, useExisting: PrismaAuditAdapter },

    // ... other repositories
  ],
  exports: [
    UNIT_OF_WORK,
    OUTBOX_PORT,
    AUDIT_PORT,
    PrismaService,
    OutboxRepository,
    CustomFieldDefinitionRepository,
    // ...
  ],
})
export class DataModule {}
```

## Migration Patterns

### Pattern 1: Repository Implementation

**Before:**

```typescript
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  async save(expense: Expense): Promise<void> {
    const prisma = getPrisma();
    await prisma.expense.create({ data: {...} });
  }
}
```

**After:**

```typescript
@Injectable()
export class PrismaExpenseRepository implements ExpenseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(expense: Expense, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    await client.expense.create({ data: {...} });
  }
}
```

**Key changes:**

1. Inject `PrismaService` via constructor
2. Add optional `tx?: TransactionContext` parameter
3. Use `getPrismaClient()` helper to select client or transaction
4. Add `@Injectable()` decorator

### Pattern 2: Module Wiring

**Before:**

```typescript
@Module({
  providers: [
    PrismaExpenseRepository,
    PrismaOutboxAdapter,
    PrismaAuditAdapter,
    // ... duplicated in every module
  ],
})
export class ExpensesModule {}
```

**After:**

```typescript
@Module({
  imports: [DataModule],  // Import shared infrastructure
  providers: [
    // Repository
    PrismaExpenseRepository,
    { provide: EXPENSE_REPOSITORY, useExisting: PrismaExpenseRepository },

    // Use Cases inject via tokens
    {
      provide: CreateExpenseUseCase,
      useFactory: (repo, outbox, audit, ...) => new CreateExpenseUseCase(...),
      inject: [
        EXPENSE_REPOSITORY,
        OUTBOX_PORT,
        AUDIT_PORT,
        // ...
      ],
    },
  ],
})
export class ExpensesModule {}
```

**Key changes:**

1. Import `DataModule` to access shared infrastructure
2. Bind repository to a token symbol
3. Inject dependencies via tokens (not concrete classes)

### Pattern 3: Using Transactions

**Before:**

```typescript
async execute(input: CreateExpenseInput): Promise<void> {
  const expense = new Expense(...);
  await this.repo.save(expense);
  await this.outbox.enqueue({...});
}
```

**After:**

```typescript
@Injectable()
export class CreateExpenseUseCase {
  constructor(
    @Inject(EXPENSE_REPOSITORY) private repo: ExpenseRepositoryPort,
    @Inject(OUTBOX_PORT) private outbox: OutboxPort,
    @Inject(UNIT_OF_WORK) private uow: UnitOfWorkPort,
  ) {}

  async execute(input: CreateExpenseInput): Promise<void> {
    await this.uow.withinTransaction(async (tx) => {
      const expense = new Expense(...);
      await this.repo.save(expense, tx);
      await this.outbox.enqueue({...}, tx);
    });
  }
}
```

**Key changes:**

1. Inject `UnitOfWorkPort` via `UNIT_OF_WORK` token
2. Wrap transactional operations in `uow.withinTransaction()`
3. Pass `tx` context to repository methods

## Adding a New Repository

Follow these steps to add a new repository following the ports/adapters pattern:

### Step 1: Define the Port Interface

Create port in the application layer:

```typescript
// services/api/src/modules/foo/application/ports/foo-repository.port.ts
import { TransactionContext } from "@corely/kernel";
import { Foo } from "../../domain/entities/Foo";

export interface FooRepositoryPort {
  save(foo: Foo, tx?: TransactionContext): Promise<void>;
  findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Foo | null>;
  list(tenantId: string, tx?: TransactionContext): Promise<Foo[]>;
}

export const FOO_REPOSITORY = Symbol("FOO_REPOSITORY");
```

**Important:**

- All methods accept optional `tx?: TransactionContext`
- Business query methods only (no generic CRUD)
- Always enforce `tenantId` for multi-tenancy

### Step 2: Implement Prisma Adapter

```typescript
// services/api/src/modules/foo/infrastructure/persistence/PrismaFooRepository.ts
import { Injectable } from "@nestjs/common";
import { PrismaService, getPrismaClient } from "@corely/data";
import { TransactionContext } from "@corely/kernel";
import { Foo } from "../../domain/entities/Foo";
import { FooRepositoryPort } from "../../application/ports/foo-repository.port";

@Injectable()
export class PrismaFooRepository implements FooRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(foo: Foo, tx?: TransactionContext): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);
    await client.foo.create({
      data: {
        id: foo.id,
        tenantId: foo.tenantId,
        name: foo.name,
        // ... map domain entity to Prisma model
      },
    });
  }

  async findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Foo | null> {
    const client = getPrismaClient(this.prisma, tx);
    const data = await client.foo.findFirst({
      where: { id, tenantId }, // Always scope by tenantId!
    });
    return data ? this.mapToDomain(data) : null;
  }

  async list(tenantId: string, tx?: TransactionContext): Promise<Foo[]> {
    const client = getPrismaClient(this.prisma, tx);
    const data = await client.foo.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
    });
    return data.map((row) => this.mapToDomain(row));
  }

  private mapToDomain(data: any): Foo {
    return new Foo(
      data.id,
      data.tenantId,
      data.name
      // ... map Prisma model to domain entity
    );
  }
}
```

### Step 3: Wire Up in Module

```typescript
// services/api/src/modules/foo/foo.module.ts
import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { OUTBOX_PORT, AUDIT_PORT, UNIT_OF_WORK } from "@corely/kernel";
import { PrismaFooRepository } from "./infrastructure/persistence/PrismaFooRepository";
import { FOO_REPOSITORY } from "./application/ports/foo-repository.port";
import { CreateFooUseCase } from "./application/use-cases/CreateFooUseCase";

@Module({
  imports: [DataModule],
  providers: [
    // Repository
    PrismaFooRepository,
    { provide: FOO_REPOSITORY, useExisting: PrismaFooRepository },

    // Use Case
    {
      provide: CreateFooUseCase,
      useFactory: (repo, outbox, uow) => new CreateFooUseCase(repo, outbox, uow),
      inject: [FOO_REPOSITORY, OUTBOX_PORT, UNIT_OF_WORK],
    },
  ],
})
export class FooModule {}
```

### Step 4: Use in Application Layer

```typescript
// services/api/src/modules/foo/application/use-cases/CreateFooUseCase.ts
import { Inject, Injectable } from "@nestjs/common";
import { UnitOfWorkPort, UNIT_OF_WORK, OutboxPort, OUTBOX_PORT } from "@corely/kernel";
import { FooRepositoryPort, FOO_REPOSITORY } from "../ports/foo-repository.port";

@Injectable()
export class CreateFooUseCase {
  constructor(
    @Inject(FOO_REPOSITORY) private readonly repo: FooRepositoryPort,
    @Inject(OUTBOX_PORT) private readonly outbox: OutboxPort,
    @Inject(UNIT_OF_WORK) private readonly uow: UnitOfWorkPort,
  ) {}

  async execute(input: CreateFooInput): Promise<{ id: string }> {
    const foo = new Foo(...);

    await this.uow.withinTransaction(async (tx) => {
      await this.repo.save(foo, tx);
      await this.outbox.enqueue({
        eventType: "FooCreated",
        payload: { id: foo.id },
        tenantId: foo.tenantId,
      }, tx);
    });

    return { id: foo.id };
  }
}
```

## Testing

### Unit Testing Repositories

Mock `PrismaService` in tests:

```typescript
describe("PrismaFooRepository", () => {
  let repo: PrismaFooRepository;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      foo: {
        create: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
    } as any;

    repo = new PrismaFooRepository(prisma);
  });

  it("should save a foo", async () => {
    const foo = new Foo("id1", "tenant1", "Test");
    await repo.save(foo);

    expect(prisma.foo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        id: "id1",
        tenantId: "tenant1",
        name: "Test",
      }),
    });
  });
});
```

### Integration Testing with Real Database

Use `PostgresTestDb` from `@corely/testkit`:

```typescript
import { Test } from "@nestjs/testing";
import { DataModule, PrismaService } from "@corely/data";
import { PostgresTestDb, createTestDb } from "@corely/testkit";

describe("FooRepository Integration", () => {
  let testDb: PostgresTestDb;
  let prisma: PrismaService;
  let repo: PrismaFooRepository;

  beforeAll(async () => {
    testDb = await createTestDb();
  });

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [DataModule],
      providers: [PrismaFooRepository],
    }).compile();

    prisma = module.get(PrismaService);
    repo = module.get(PrismaFooRepository);
  });

  afterEach(async () => {
    await testDb.truncate();
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("should save and retrieve a foo", async () => {
    const foo = new Foo("id1", "tenant1", "Test");
    await repo.save(foo);

    const retrieved = await repo.findById("tenant1", "id1");
    expect(retrieved).toEqual(foo);
  });
});
```

## Common Patterns

### Multi-Tenancy Enforcement

Always include `tenantId` in `where` clauses:

```typescript
async findById(tenantId: string, id: string, tx?: TransactionContext): Promise<Foo | null> {
  const client = getPrismaClient(this.prisma, tx);

  // ✅ Correct: scoped by tenantId
  const data = await client.foo.findFirst({
    where: { id, tenantId },
  });

  // ❌ Wrong: missing tenantId allows cross-tenant access!
  // const data = await client.foo.findFirst({ where: { id } });

  return data ? this.mapToDomain(data) : null;
}
```

### Soft Deletes

Use `archivedAt` pattern:

```typescript
async list(tenantId: string, includeArchived = false, tx?: TransactionContext): Promise<Foo[]> {
  const client = getPrismaClient(this.prisma, tx);

  const data = await client.foo.findMany({
    where: {
      tenantId,
      archivedAt: includeArchived ? undefined : null,
    },
    orderBy: { createdAt: "desc" },
  });

  return data.map(row => this.mapToDomain(row));
}

async archive(tenantId: string, id: string, tx?: TransactionContext): Promise<void> {
  const client = getPrismaClient(this.prisma, tx);

  await client.foo.updateMany({
    where: { id, tenantId },
    data: { archivedAt: new Date() },
  });
}
```

### Pagination

Cursor-based pagination pattern:

```typescript
export interface PaginatedResult<T> {
  items: T[];
  nextCursor?: string;
}

async list(
  tenantId: string,
  params: { limit?: number; cursor?: string },
  tx?: TransactionContext
): Promise<PaginatedResult<Foo>> {
  const client = getPrismaClient(this.prisma, tx);
  const limit = params.limit ?? 20;

  const items = await client.foo.findMany({
    where: { tenantId, archivedAt: null },
    orderBy: { createdAt: "desc" },
    take: limit + 1,
    ...(params.cursor && {
      cursor: { id: params.cursor },
      skip: 1,
    }),
  });

  const hasMore = items.length > limit;
  const results = hasMore ? items.slice(0, limit) : items;

  return {
    items: results.map(row => this.mapToDomain(row)),
    nextCursor: hasMore ? results[results.length - 1].id : undefined,
  };
}
```

## Migration Checklist

For each existing module:

- [ ] Port interface defined with transaction support (`tx?: TransactionContext`)
- [ ] Port has a DI token symbol (e.g., `FOO_REPOSITORY`)
- [ ] Repository adapter injects `PrismaService` via constructor
- [ ] Repository uses `getPrismaClient(this.prisma, tx)` pattern
- [ ] Module imports `DataModule`
- [ ] Repository bound to token via `useExisting`
- [ ] Use-cases inject via tokens (not concrete classes)
- [ ] Transactional flows use `UnitOfWorkPort`
- [ ] No direct Prisma imports in use-cases/controllers
- [ ] Tests updated to use DI or mocks
- [ ] All queries enforce `tenantId`

## FAQ

### Q: Should I put repositories in `packages/data` or module-specific folders?

**A:** It depends:

- **Shared repositories** (used by multiple modules) → `packages/data`
- **Module-specific repositories** → `services/api/src/modules/<module>/infrastructure/persistence/`

Examples:

- `CustomFieldDefinitionRepository` → `packages/data` (used by many modules)
- `ExpenseRepository` → `services/api/src/modules/expenses/infrastructure/` (single module)

### Q: When should I use transactions?

**A:** Use `UnitOfWorkPort` when you need:

1. **Atomicity across multiple writes**

   ```typescript
   await uow.withinTransaction(async (tx) => {
     await repo.save(expense, tx);
     await outbox.enqueue(event, tx);
     await audit.log(entry, tx);
   });
   ```

2. **Transactional outbox pattern**
   - Ensures events are enqueued atomically with domain changes
   - Worker polls outbox table for guaranteed delivery

3. **Complex aggregates**
   - When saving multiple related entities that must succeed/fail together

### Q: Can repositories call other repositories?

**A:** Generally no. Repositories should be independent. If you need to coordinate multiple repositories, do it in the use-case:

```typescript
// ✅ Correct: use-case coordinates
async execute(input) {
  await this.uow.withinTransaction(async (tx) => {
    await this.fooRepo.save(foo, tx);
    await this.barRepo.save(bar, tx);
  });
}

// ❌ Wrong: repository calls another repository
class FooRepository {
  async save(foo, tx) {
    await this.client.foo.create({...});
    await this.barRepo.save(bar, tx);  // Don't do this!
  }
}
```

### Q: How do I handle Prisma-specific features (transactions, includes, etc.)?

**A:** Keep them in the adapter layer:

```typescript
// ✅ Correct: Prisma details stay in adapter
async findWithRelations(tenantId: string, id: string, tx?: TransactionContext): Promise<FooWithBar | null> {
  const client = getPrismaClient(this.prisma, tx);

  const data = await client.foo.findFirst({
    where: { id, tenantId },
    include: { bar: true },  // Prisma-specific
  });

  return data ? this.mapToDomainWithRelations(data) : null;
}

// Return domain objects, not Prisma types
private mapToDomainWithRelations(data: any): FooWithBar {
  return {
    foo: new Foo(...),
    bar: new Bar(...),
  };
}
```

### Q: What about worker services that poll the database?

**A:** Workers import `DataModule` and inject repositories normally:

```typescript
// services/worker/src/modules/outbox/OutboxPollerService.ts
@Injectable()
export class OutboxPollerService implements OnModuleInit {
  constructor(
    private readonly outboxRepo: OutboxRepository // Injected from DataModule
  ) {}

  async pollEvents() {
    const events = await this.outboxRepo.fetchPending(10);
    // Process events...
  }
}
```

Worker module:

```typescript
import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";

@Module({
  imports: [DataModule],
  providers: [OutboxPollerService],
})
export class OutboxModule {}
```

## Backward Compatibility

During migration, legacy code can still use:

- `getPrisma()` - Returns cached PrismaClient (deprecated)
- `prisma` named export - Singleton PrismaClient (deprecated)
- `resetPrisma()` - For test cleanup (deprecated)

These will be removed once all modules are migrated.

## Next Steps

1. **Migrate remaining modules** one at a time
2. **Remove legacy Prisma wiring** after all modules use `DataModule`
3. **Add IDEMPOTENCY_PORT to DataModule** to reduce duplication
4. **Create shared `SystemModule`** for `Clock`, `IdGenerator` ports
5. **Add `@deprecated` markers** to guide future development

## References

- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Ports and Adapters](https://herbertograca.com/2017/09/14/ports-adapters-architecture/)
- [NestJS Dependency Injection](https://docs.nestjs.com/fundamentals/custom-providers)
- [Prisma Interactive Transactions](https://www.prisma.io/docs/orm/prisma-client/queries/transactions#interactive-transactions)
