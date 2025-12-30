# Corely Naming Conventions

**Version:** 1.0
**Date:** 23 Dec 2025
**Scope:** Entire monorepo (frontend, backend services, shared packages)

---

## Purpose and Principles

This document defines the **single, authoritative naming taxonomy** for all code in the Corely monorepo. Consistent naming conventions enable:

- **Instant discoverability**: Developers can predict file locations and names
- **Reduced cognitive load**: No mental translation between file names and class names
- **Scalable team collaboration**: Clear patterns prevent merge conflicts and miscommunication
- **Tooling automation**: Linters, generators, and IDE features work reliably
- **Case-sensitive correctness**: Prevents issues on Linux CI/production environments

### Core Principles

1. **Deterministic naming**: Every file type has exactly one correct naming pattern
2. **Searchability over brevity**: Prefer explicit names (`repository` over `repo`)
3. **Layer clarity**: File suffixes must reveal architectural layer (port/adapter/usecase/controller)
4. **No PascalCase filenames**: All files use `kebab-case` only
5. **Consistency across surfaces**: Same patterns apply to API, worker, and packages

---

## Global Naming Rules

### File and Folder Naming

| Rule                 | Pattern                              | Valid Examples                                                                          | Invalid Examples                                                   |
| -------------------- | ------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| **All files**        | `kebab-case` only                    | `create-invoice.usecase.ts`<br>`expense-repository.port.ts`                             | `CreateInvoice.ts`<br>`ExpenseRepository.ts`<br>`createInvoice.ts` |
| **Folders**          | `kebab-case`, plural for collections | `use-cases/`<br>`adapters/`<br>`repositories/`                                          | `UseCases/`<br>`use_cases/`<br>`Adapters/`                         |
| **No abbreviations** | Use full words consistently          | `repository` not `repo`<br>`configuration` not `config`<br>`infrastructure` not `infra` | `*.repo.ts`<br>`config/`<br>`infra/`                               |

**Exception**: Common industry abbreviations are allowed when universally understood:

- `dto` (Data Transfer Object)
- `api` (Application Programming Interface)
- `http` (HyperText Transfer Protocol)
- `crm` (Customer Relationship Management)
- `pdf` (Portable Document Format)

### Class, Type, and Symbol Naming

| Element    | Casing                 | Example                                             |
| ---------- | ---------------------- | --------------------------------------------------- |
| Classes    | `PascalCase`           | `CreateInvoiceUseCase`<br>`PrismaExpenseRepository` |
| Interfaces | `PascalCase`           | `ExpenseRepositoryPort`<br>`LoggerPort`             |
| Types      | `PascalCase`           | `InvoiceStatus`<br>`CreateExpenseDto`               |
| Functions  | `camelCase`            | `calculateTax`<br>`formatCurrency`                  |
| Variables  | `camelCase`            | `invoiceDate`<br>`totalAmount`                      |
| Constants  | `SCREAMING_SNAKE_CASE` | `MAX_RETRIES`<br>`DEFAULT_CURRENCY`                 |
| DI Tokens  | `SCREAMING_SNAKE_CASE` | `EXPENSE_REPOSITORY_TOKEN`<br>`LOGGER_PORT`         |

### Export Naming Rules

- **Named exports only**: Avoid default exports (prevents inconsistent import names)
- **One primary export per file**: File name should match primary export in kebab-case form
  - File: `create-invoice.usecase.ts` → Export: `CreateInvoiceUseCase`
  - File: `expense-repository.port.ts` → Export: `ExpenseRepositoryPort`
- **Barrel exports**: Use `index.ts` sparingly, only at module boundaries to expose public API

---

## Layer Suffixes: Complete Taxonomy

This table defines the **canonical suffix** for every architectural layer. All files must use exactly these suffixes.

| Suffix            | Layer                         | Purpose                                  | File Example                           | Export Example                   |
| ----------------- | ----------------------------- | ---------------------------------------- | -------------------------------------- | -------------------------------- |
| `.port.ts`        | Application boundary          | Interface/contract for hexagonal ports   | `expense-repository.port.ts`           | `ExpenseRepositoryPort`          |
| `.adapter.ts`     | Infrastructure implementation | Concrete implementation of a port        | `prisma-expense-repository.adapter.ts` | `PrismaExpenseRepositoryAdapter` |
| `.usecase.ts`     | Application logic             | Command-style use case (write operation) | `create-invoice.usecase.ts`            | `CreateInvoiceUseCase`           |
| `.query.ts`       | Application logic             | Query-style handler (read operation)     | `list-expenses.query.ts`               | `ListExpensesQuery`              |
| `.service.ts`     | Application/Domain            | Orchestration service (reusable logic)   | `tax-engine.service.ts`                | `TaxEngineService`               |
| `.controller.ts`  | HTTP presentation             | NestJS REST controller                   | `invoices.controller.ts`               | `InvoicesController`             |
| `.module.ts`      | DI container                  | NestJS module definition                 | `expenses.module.ts`                   | `ExpensesModule`                 |
| `.dto.ts`         | Data transfer                 | HTTP request/response types              | `create-invoice.dto.ts`                | `CreateInvoiceDto`               |
| `.schema.ts`      | Validation                    | Zod/validation schemas                   | `create-invoice.schema.ts`             | `createInvoiceSchema`            |
| `.types.ts`       | Domain model                  | Domain types and enums                   | `invoice.types.ts`                     | `InvoiceStatus`                  |
| `.entity.ts`      | Domain model                  | Rich domain entity/aggregate             | `invoice.entity.ts`                    | `InvoiceEntity`                  |
| `.aggregate.ts`   | Domain model                  | DDD aggregate root                       | `invoice.aggregate.ts`                 | `InvoiceAggregate`               |
| `.event.ts`       | Domain events                 | Domain event types                       | `invoice-created.event.ts`             | `InvoiceCreatedEvent`            |
| `.policy.ts`      | Domain logic                  | Domain policy/business rule              | `rounding.policy.ts`                   | `RoundingPolicy`                 |
| `.mapper.ts`      | Infrastructure                | Data transformation logic                | `invoice-email-props.mapper.ts`        | `mapInvoiceToEmailProps`         |
| `.guard.ts`       | HTTP middleware               | NestJS route guard                       | `tenant-scope.guard.ts`                | `TenantScopeGuard`               |
| `.pipe.ts`        | HTTP middleware               | NestJS validation pipe                   | `zod-validation.pipe.ts`               | `ZodValidationPipe`              |
| `.interceptor.ts` | HTTP middleware               | NestJS interceptor                       | `logging.interceptor.ts`               | `LoggingInterceptor`             |
| `.filter.ts`      | HTTP middleware               | NestJS exception filter                  | `http-exception.filter.ts`             | `HttpExceptionFilter`            |
| `.decorator.ts`   | Metadata                      | Custom TypeScript decorators             | `current-user.decorator.ts`            | `CurrentUser`                    |
| `.tool.ts`        | AI Copilot                    | AI tool definition for LLM               | `invoice.tool.ts`                      | `createInvoiceTool`              |
| `.handler.ts`     | Event processing              | Domain event handler                     | `invoice-created.handler.ts`           | `InvoiceCreatedHandler`          |
| `.consumer.ts`    | Message queue                 | Queue consumer (worker)                  | `invoice-email.consumer.ts`            | `InvoiceEmailConsumer`           |
| `.job.ts`         | Background task               | Scheduled job definition                 | `cleanup-expired-tokens.job.ts`        | `CleanupExpiredTokensJob`        |

### Test File Suffixes

| Suffix              | Test Type        | Purpose                          | Example                          |
| ------------------- | ---------------- | -------------------------------- | -------------------------------- |
| `.test.ts`          | Unit test        | Fast, isolated tests (default)   | `create-invoice.usecase.test.ts` |
| `.int.test.ts`      | Integration test | Tests with DB/external services  | `expenses.int.test.ts`           |
| `.e2e.test.ts`      | End-to-end test  | Full HTTP request/response tests | `invoices.e2e.test.ts`           |
| `.contract.test.ts` | Contract test    | Shared schema validation tests   | `invoices.contract.test.ts`      |

**Rationale**: `.test.ts` is the default for unit tests (majority use case). Integration/e2e tests get explicit suffixes.

---

## Repository Pattern: Ports and Adapters

The repository pattern requires **strict separation** between contract (port) and implementation (adapter).

### Port Definition (Application/Domain Layer)

**Location**: `application/ports/` or `domain/ports/`

**Naming Convention**:

- File: `{entity}-repository.port.ts`
- Interface: `{Entity}RepositoryPort`
- DI Token: `{ENTITY}_REPOSITORY_TOKEN` (co-located in same file)

**Example**:

```typescript
// File: application/ports/expense-repository.port.ts
export const EXPENSE_REPOSITORY_TOKEN = Symbol("EXPENSE_REPOSITORY_TOKEN");

export interface ExpenseRepositoryPort {
  save(tenantId: string, expense: ExpenseAggregate): Promise<void>;
  findById(tenantId: string, id: string): Promise<ExpenseAggregate | null>;
  list(tenantId: string, filters: ListExpensesFilters): Promise<ExpenseAggregate[]>;
}
```

### Adapter Implementation (Infrastructure Layer)

**Location**: `infrastructure/adapters/` or `infrastructure/persistence/`

**Naming Convention**:

- File: `{technology}-{entity}-repository.adapter.ts`
- Class: `{Technology}{Entity}RepositoryAdapter`
- Technology prefix: `prisma`, `memory`, `http`, `redis`, `file`, etc.

**Example**:

```typescript
// File: infrastructure/adapters/prisma-expense-repository.adapter.ts
import { ExpenseRepositoryPort } from "../../application/ports/expense-repository.port";

@Injectable()
export class PrismaExpenseRepositoryAdapter implements ExpenseRepositoryPort {
  async save(tenantId: string, expense: ExpenseAggregate): Promise<void> {
    // Prisma implementation
  }
}
```

### Technology Prefixes for Adapters

| Prefix    | Technology            | Example                                |
| --------- | --------------------- | -------------------------------------- |
| `prisma-` | Prisma ORM (database) | `prisma-expense-repository.adapter.ts` |
| `memory-` | In-memory (testing)   | `memory-expense-repository.adapter.ts` |
| `http-`   | HTTP client           | `http-payment-gateway.adapter.ts`      |
| `redis-`  | Redis cache           | `redis-session-store.adapter.ts`       |
| `s3-`     | AWS S3 storage        | `s3-file-storage.adapter.ts`           |
| `resend-` | Resend email service  | `resend-email-sender.adapter.ts`       |
| `stripe-` | Stripe payment API    | `stripe-payment-processor.adapter.ts`  |

---

## Folder Structure Conventions

### Module-Level Structure (services/api/src/modules/{module}/)

```
{module}/
├── application/
│   ├── ports/                    # Interfaces (ports)
│   │   ├── {entity}-repository.port.ts
│   │   ├── {service}-port.ts
│   │   └── index.ts              # Barrel export (optional)
│   ├── use-cases/                # Command handlers
│   │   ├── {action}-{entity}/   # Subfolder for complex use cases
│   │   │   ├── {action}-{entity}.usecase.ts
│   │   │   ├── {action}-{entity}.usecase.test.ts
│   │   │   ├── {action}-{entity}.dto.ts
│   │   │   └── index.ts
│   │   └── {simple-action}.usecase.ts
│   └── queries/                  # Read-side handlers
│       └── {query-name}.query.ts
├── domain/
│   ├── {entity}.aggregate.ts     # Aggregate root
│   ├── {entity}.entity.ts        # Entity
│   ├── {entity}.types.ts         # Types/enums
│   ├── events/
│   │   └── {event-name}.event.ts
│   └── policies/
│       └── {policy-name}.policy.ts
├── infrastructure/
│   ├── adapters/                 # Port implementations
│   │   ├── {tech}-{entity}-repository.adapter.ts
│   │   ├── {tech}-{entity}-repository.adapter.test.ts
│   │   └── index.ts
│   └── persistence/              # Alternative to adapters/
│       └── {tech}-{entity}-repository.adapter.ts
├── http/
│   ├── {module}.controller.ts
│   ├── {module}.controller.test.ts
│   ├── dtos/
│   │   ├── {action}.dto.ts
│   │   └── index.ts
│   └── guards/
│       └── {guard-name}.guard.ts
├── tools/                        # AI Copilot tools
│   ├── {entity}.tool.ts
│   └── {entity}.tool.test.ts
├── di/                           # Dependency injection
│   ├── {module}.module.ts
│   └── {module}.providers.ts     # Provider array constant
├── testkit/                      # Test utilities
│   ├── {entity}.factory.ts
│   └── {entity}.fixtures.ts
└── index.ts                      # Public module API
```

### Folder Naming Rules

| Folder Type        | Naming               | Example                                   |
| ------------------ | -------------------- | ----------------------------------------- |
| **Layer folders**  | Plural, kebab-case   | `use-cases/`, `adapters/`, `controllers/` |
| **Domain folders** | Singular, kebab-case | `events/`, `policies/`                    |
| **Module folders** | Singular, kebab-case | `expenses/`, `invoices/`, `party-crm/`    |

### Infrastructure Folder Naming

**Standardize on**: `infrastructure/` (full word, not `infra/`)

**Subfolders**:

- `infrastructure/adapters/` - Port implementations (repositories, gateways, services)
- `infrastructure/persistence/` - Alternative name, use if preferred for clarity
- `infrastructure/http/` - HTTP clients (if not in adapters/)
- `infrastructure/messaging/` - Message queue adapters

---

## Backend Conventions (NestJS)

### Module Organization

**File**: `{module}.module.ts`
**Location**: `modules/{module}/di/` or root of `modules/{module}/`

```typescript
// File: di/expenses.module.ts
import { Module } from "@nestjs/common";
import { EXPENSE_REPOSITORY_TOKEN } from "../application/ports/expense-repository.port";
import { PrismaExpenseRepositoryAdapter } from "../infrastructure/adapters/prisma-expense-repository.adapter";
import { CreateExpenseUseCase } from "../application/use-cases/create-expense.usecase";
import { ExpensesController } from "../http/expenses.controller";

@Module({
  controllers: [ExpensesController],
  providers: [
    CreateExpenseUseCase,
    {
      provide: EXPENSE_REPOSITORY_TOKEN,
      useClass: PrismaExpenseRepositoryAdapter,
    },
  ],
  exports: [EXPENSE_REPOSITORY_TOKEN],
})
export class ExpensesModule {}
```

### Controller Naming

**File**: `{module}.controller.ts`
**Class**: `{Module}Controller`
**Location**: `http/` or root of module

```typescript
// File: http/invoices.controller.ts
@Controller("invoices")
export class InvoicesController {
  @Post()
  async create(@Body() dto: CreateInvoiceDto): Promise<InvoiceDto> {
    // ...
  }
}
```

### DI Token Conventions

**Token Naming**: `{ENTITY}_{TYPE}_TOKEN`

**Pattern**:

```typescript
// Co-located with port interface
export const EXPENSE_REPOSITORY_TOKEN = Symbol("EXPENSE_REPOSITORY_TOKEN");
export const LOGGER_PORT = Symbol("LOGGER_PORT");
export const EMAIL_SENDER_PORT = Symbol("EMAIL_SENDER_PORT");
```

**Provider Registration**:

```typescript
{
  provide: EXPENSE_REPOSITORY_TOKEN,
  useClass: PrismaExpenseRepositoryAdapter,
}
```

**Injection**:

```typescript
constructor(
  @Inject(EXPENSE_REPOSITORY_TOKEN)
  private readonly expenseRepository: ExpenseRepositoryPort,
) {}
```

---

## Domain and Data Conventions

### Domain Entities and Aggregates

**Entity File**: `{entity}.entity.ts`
**Aggregate File**: `{entity}.aggregate.ts`

```typescript
// File: domain/invoice.aggregate.ts
export class InvoiceAggregate {
  constructor(private readonly props: InvoiceProps) {}

  finalize(): Result<void, InvoiceError> {
    // Domain logic
  }
}
```

### Domain Events

**File**: `events/{entity}-{past-tense-action}.event.ts`
**Class**: `{Entity}{PastTenseAction}Event`

```typescript
// File: domain/events/invoice-created.event.ts
export class InvoiceCreatedEvent {
  constructor(
    public readonly invoiceId: string,
    public readonly tenantId: string,
    public readonly occurredAt: Date
  ) {}
}
```

### Repository Ports (Domain/Application)

**Location**: Domain or application layer (never in infrastructure)

```typescript
// File: application/ports/invoice-repository.port.ts
export const INVOICE_REPOSITORY_TOKEN = Symbol("INVOICE_REPOSITORY_TOKEN");

export interface InvoiceRepositoryPort {
  save(tenantId: string, invoice: InvoiceAggregate): Promise<void>;
  findById(tenantId: string, id: string): Promise<InvoiceAggregate | null>;
}
```

### Prisma Adapters (Infrastructure)

**File**: `infrastructure/adapters/prisma-{entity}-repository.adapter.ts`
**Class**: `Prisma{Entity}RepositoryAdapter`

```typescript
// File: infrastructure/adapters/prisma-invoice-repository.adapter.ts
@Injectable()
export class PrismaInvoiceRepositoryAdapter implements InvoiceRepositoryPort {
  async save(tenantId: string, invoice: InvoiceAggregate): Promise<void> {
    await prisma.invoice.upsert({
      where: { id: invoice.id },
      update: {
        /* ... */
      },
      create: {
        /* ... */
      },
    });
  }
}
```

---

## Frontend Conventions (apps/webs)

### Module Structure

```
modules/{module}/
├── components/
│   ├── {component-name}.tsx
│   └── index.ts
├── screens/
│   ├── {screen-name}.screen.tsx
│   └── index.ts
├── hooks/
│   ├── use-{hook-name}.ts
│   └── index.ts
├── routes.tsx
└── index.ts
```

### Component Naming

**File**: `{component-name}.tsx` (kebab-case)
**Export**: `{ComponentName}` (PascalCase)

```typescript
// File: components/invoice-list.tsx
export function InvoiceList({ invoices }: InvoiceListProps) {
  return <div>{/* ... */}</div>;
}
```

### Hook Naming

**File**: `use-{hook-name}.ts` (kebab-case, `use-` prefix)
**Export**: `use{HookName}` (camelCase, `use` prefix)

```typescript
// File: hooks/use-invoice-query.ts
export function useInvoiceQuery(id: string) {
  return useQuery({
    queryKey: ["invoice", id],
    queryFn: () => fetchInvoice(id),
  });
}
```

### Screen Naming

**File**: `{screen-name}.screen.tsx` (kebab-case, `.screen` suffix)
**Export**: `{ScreenName}Screen` (PascalCase, `Screen` suffix)

```typescript
// File: screens/invoice-detail.screen.tsx
export function InvoiceDetailScreen() {
  return <div>{/* ... */}</div>;
}
```

---

## Shared Package Conventions

### packages/contracts

**Purpose**: Shared schemas, types, enums between frontend and backend

**Structure**:

```
contracts/
└── src/
    ├── common/
    │   ├── pagination.types.ts
    │   └── result.types.ts
    ├── expenses/
    │   ├── create-expense.schema.ts
    │   ├── expense.types.ts
    │   └── index.ts
    └── invoices/
        ├── create-invoice.schema.ts
        ├── invoice.types.ts
        └── index.ts
```

**Naming**:

- Schemas: `{action}-{entity}.schema.ts` (Zod schemas)
- Types: `{entity}.types.ts` (TypeScript types/enums)

### packages/domain

**Purpose**: Pure domain logic (no framework dependencies)

**Structure**:

```
domain/
└── src/
    ├── money/
    │   ├── money.types.ts
    │   └── money.policy.ts
    ├── invoice-numbering/
    │   └── generate-invoice-number.policy.ts
    └── customization/
        ├── types.ts
        └── ports.ts
```

### packages/data

**Purpose**: Prisma client + repository implementations (backend-only)

**Structure**:

```
data/
├── prisma/
│   └── schema/
│       ├── schema.prisma
│       ├── 10_identity.prisma
│       └── 40_billing.prisma
└── src/
    ├── adapters/
    │   ├── prisma-audit.adapter.ts
    │   ├── prisma-idempotency.adapter.ts
    │   └── prisma-outbox.adapter.ts
    ├── uow/
    │   └── prisma-unit-of-work.adapter.ts
    └── prisma/
        └── prisma.service.ts
```

### packages/kernel

**Purpose**: Framework-agnostic application utilities (ports, base classes, testing)

**Structure**:

```
kernel/
└── src/
    ├── application/
    │   ├── base-usecase.ts
    │   ├── context.ts
    │   └── result.ts
    ├── ports/
    │   ├── logger.port.ts
    │   ├── clock.port.ts
    │   └── idempotency.port.ts
    └── testing/
        ├── noop-logger.ts
        └── fixed-clock.ts
```

---

## Complete Examples by Domain

### Example 1: Expense Module (Full Structure)

```
expenses/
├── application/
│   ├── ports/
│   │   ├── expense-repository.port.ts          # ExpenseRepositoryPort + EXPENSE_REPOSITORY_TOKEN
│   │   └── index.ts
│   ├── use-cases/
│   │   ├── create-expense.usecase.ts           # CreateExpenseUseCase
│   │   ├── create-expense.usecase.test.ts
│   │   ├── archive-expense.usecase.ts          # ArchiveExpenseUseCase
│   │   └── unarchive-expense.usecase.ts        # UnarchiveExpenseUseCase
│   └── queries/
│       ├── list-expenses.query.ts              # ListExpensesQuery
│       └── get-expense-by-id.query.ts          # GetExpenseByIdQuery
├── domain/
│   ├── expense.aggregate.ts                    # ExpenseAggregate
│   ├── expense.types.ts                        # ExpenseStatus, ExpenseLine
│   └── events/
│       ├── expense-created.event.ts            # ExpenseCreatedEvent
│       └── expense-archived.event.ts           # ExpenseArchivedEvent
├── infrastructure/
│   ├── adapters/
│   │   ├── prisma-expense-repository.adapter.ts        # PrismaExpenseRepositoryAdapter
│   │   ├── prisma-expense-repository.adapter.test.ts
│   │   ├── memory-expense-repository.adapter.ts        # For testing
│   │   └── index.ts
│   └── persistence/
│       └── expense.mapper.ts                   # DB mapping utilities
├── http/
│   ├── expenses.controller.ts                  # ExpensesController
│   ├── expenses.controller.test.ts
│   └── dtos/
│       ├── create-expense.dto.ts               # CreateExpenseDto
│       ├── update-expense.dto.ts               # UpdateExpenseDto
│       └── index.ts
├── tools/
│   ├── expense.tool.ts                         # AI Copilot tool definitions
│   └── expense.tool.test.ts
├── di/
│   ├── expenses.module.ts                      # ExpensesModule
│   └── expenses.providers.ts                   # Provider array
├── testkit/
│   ├── expense.factory.ts                      # Test data factory
│   └── expense.fixtures.ts                     # Sample test data
└── index.ts                                    # Public API
```

### Example 2: Invoice Module (Abbreviated)

```
invoices/
├── application/
│   ├── ports/
│   │   └── invoice-repository.port.ts          # InvoiceRepositoryPort + TOKEN
│   └── use-cases/
│       ├── create-invoice.usecase.ts           # CreateInvoiceUseCase
│       ├── finalize-invoice.usecase.ts         # FinalizeInvoiceUseCase
│       ├── send-invoice.usecase.ts             # SendInvoiceUseCase
│       └── record-payment.usecase.ts           # RecordPaymentUseCase
├── domain/
│   ├── invoice.aggregate.ts                    # InvoiceAggregate (rich domain model)
│   ├── invoice.types.ts                        # InvoiceStatus, InvoiceLine
│   ├── events/
│   │   ├── invoice-created.event.ts
│   │   ├── invoice-finalized.event.ts
│   │   └── invoice-sent.event.ts
│   └── policies/
│       └── invoice-numbering.policy.ts
├── infrastructure/
│   ├── adapters/
│   │   ├── prisma-invoice-repository.adapter.ts
│   │   └── resend-invoice-email-sender.adapter.ts   # Email sending adapter
│   └── http/
│       └── resend-webhook.controller.ts        # Webhook handler
├── http/
│   ├── invoices.controller.ts
│   └── dtos/
│       ├── create-invoice.dto.ts
│       └── update-invoice.dto.ts
├── tools/
│   └── invoice.tool.ts
└── di/
    └── invoices.module.ts
```

---

## Test Naming Conventions

### Test File Co-location

Tests should be **co-located** with the code they test:

```
use-cases/
├── create-invoice.usecase.ts
└── create-invoice.usecase.test.ts      # Unit test

infrastructure/adapters/
├── prisma-expense-repository.adapter.ts
└── prisma-expense-repository.adapter.test.ts

http/
├── invoices.controller.ts
└── invoices.controller.test.ts
```

### Integration and E2E Tests

Integration tests can live in module root or dedicated `__tests__/` folder:

```
expenses/
├── __tests__/
│   ├── expenses.int.test.ts           # Integration tests (DB)
│   ├── expenses.e2e.test.ts           # E2E tests (HTTP)
│   └── expenses.contract.test.ts      # Contract tests (schemas)
└── ... (other folders)
```

### Test Naming Examples

| Test Type   | File Name                                   | Tests                            |
| ----------- | ------------------------------------------- | -------------------------------- |
| Unit        | `create-invoice.usecase.test.ts`            | `CreateInvoiceUseCase`           |
| Unit        | `prisma-expense-repository.adapter.test.ts` | `PrismaExpenseRepositoryAdapter` |
| Integration | `expenses.int.test.ts`                      | Full expense flow with DB        |
| E2E         | `invoices.e2e.test.ts`                      | HTTP API endpoints               |
| Contract    | `invoices.contract.test.ts`                 | Zod schema validation            |

---

## Enforcement Recommendations

### Linting Rules

Add ESLint rules to enforce conventions:

```json
{
  "rules": {
    "filename-case": ["error", { "case": "kebabCase" }],
    "no-default-export": "error"
  }
}
```

### Pre-commit Hooks

Create a git pre-commit hook to validate file naming:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check for PascalCase files
if git diff --cached --name-only | grep -E '[A-Z][a-zA-Z]*\.ts$'; then
  echo "Error: PascalCase filenames detected. Use kebab-case."
  exit 1
fi

# Check for .repo. abbreviations
if git diff --cached --name-only | grep -E '\.repo\.(ts|port\.ts)$'; then
  echo "Error: Use full 'repository' instead of 'repo' abbreviation."
  exit 1
fi
```

### Code Review Checklist

- [ ] All new files use `kebab-case` naming
- [ ] Files have correct layer suffix (`.port.ts`, `.adapter.ts`, `.usecase.ts`, etc.)
- [ ] DI tokens follow `{ENTITY}_{TYPE}_TOKEN` pattern
- [ ] Adapters use technology prefix (`prisma-`, `memory-`, `http-`, etc.)
- [ ] Tests use `.test.ts` (unit), `.int.test.ts` (integration), or `.e2e.test.ts` (e2e)
- [ ] Folder names are `kebab-case` and plural where appropriate
- [ ] No default exports (use named exports only)

---

## Migration Strategy

### Phase 1: Document and Freeze (Completed)

- ✅ Document naming conventions (this file)
- ✅ Get team alignment and approval

### Phase 2: Automated Refactor (In Progress)

- Use `git mv` for all file renames to preserve history
- Update all imports via find-and-replace
- Update NestJS provider registrations
- Run `pnpm -r lint && pnpm -r typecheck && pnpm -r test` to validate

### Phase 3: Enforcement (Future)

- Add ESLint rules for filename validation
- Configure pre-commit hooks
- Update project generators/scaffolding tools
- Add naming convention checks to CI pipeline

---

## Rationale for Key Decisions

### Why `kebab-case` for files?

1. **Case-insensitive filesystems**: macOS is case-insensitive by default; `Invoice.ts` and `invoice.ts` are the same file
2. **URL-friendly**: Matches REST endpoint conventions (`/api/invoices/123`)
3. **Shell-friendly**: No need to escape spaces or special characters
4. **Industry standard**: Used by Angular, Next.js, Vue, and most modern frameworks

### Why no abbreviations?

1. **Searchability**: Searching for "repository" finds all repositories; "repo" might miss some
2. **Consistency**: Prevents bikeshedding about which abbreviations are acceptable
3. **Newcomer-friendly**: No need to learn project-specific abbreviations

**Exception**: Industry-standard abbreviations (dto, api, http, pdf) are universally understood.

### Why `.test.ts` over `.spec.ts`?

1. **Simplicity**: One fewer character, standard in Jest/Vitest ecosystems
2. **Majority pattern**: Most modern TypeScript projects use `.test.ts`
3. **Clear hierarchy**: `.test.ts` (unit), `.int.test.ts` (integration), `.e2e.test.ts` (e2e)

### Why technology prefix for adapters?

1. **Instant recognition**: `prisma-` immediately reveals the implementation technology
2. **Multiple implementations**: Easy to have `memory-expense-repository.adapter.ts` for tests
3. **Search convenience**: `git grep "prisma-"` finds all Prisma adapters

---

## Summary Checklist

Use this checklist when creating or refactoring files:

- [ ] File name is `kebab-case`
- [ ] File has correct layer suffix from taxonomy table
- [ ] Class/interface name is `PascalCase` and matches file name
- [ ] Adapter has technology prefix (`prisma-`, `memory-`, etc.)
- [ ] Repository port is in `application/ports/` or `domain/ports/`
- [ ] Repository adapter is in `infrastructure/adapters/`
- [ ] DI token is co-located with port and follows `{ENTITY}_{TYPE}_TOKEN`
- [ ] Test file is co-located and uses `.test.ts`, `.int.test.ts`, or `.e2e.test.ts`
- [ ] No default exports (named exports only)
- [ ] Folder name is `kebab-case` and plural if a collection

---

## References

- [Corely Overall Structure](../overall-structure.md)
- [Corely Architecture](../architect.md)
- [Hexagonal Architecture (Ports & Adapters)](https://alistair.cockburn.us/hexagonal-architecture/)
- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [NestJS Style Guide](https://docs.nestjs.com/)

---

**This document is the single source of truth for naming conventions in the Corely monorepo. All code must conform to these standards.**
