# Phase 4: DI Module Wiring Rules

## Purpose

This document defines the **standard patterns and rules** for NestJS dependency injection in the Corely backend. Following these rules prevents the DI issues that plagued the codebase before the refactoring.

---

## Core Principles

### 1. Single Source of Truth

**Each provider has exactly one registration location.**

- Cross-cutting infrastructure → `KernelModule` or `DataModule`
- Module-specific logic → The owning feature module
- Never duplicate provider registrations across modules

### 2. Import Don't Duplicate

**Feature modules import centralized services instead of declaring their own.**

- Need ID generation? → `imports: [KernelModule]`
- Need audit logging? → Automatically available via `DataModule` (@Global)
- Need custom repository? → Declare in your own module

### 3. Export Intentionally

**Only export what other modules actually consume.**

- Private tokens → Don't export
- Cross-module tokens → Export explicitly
- Document why a token is exported (add comment)

---

## Token Management

### Token Definition Rules

#### Public Tokens (Cross-Module)

**Kernel-level tokens** are defined in `packages/kernel/src/tokens.ts`:

```typescript
// packages/kernel/src/tokens.ts
export const AUDIT_PORT = "kernel/audit-port";
export const OUTBOX_PORT = "kernel/outbox-port";
export const ID_GENERATOR_TOKEN = "kernel/id-generator";
export const CLOCK_PORT_TOKEN = "kernel/clock-port";
// etc...
```

**Rules**:

- ✅ Define once in `packages/kernel/src/tokens.ts`
- ✅ Use string values, never `Symbol()` (monorepo compatibility)
- ✅ Follow naming pattern: `"<module>/<resource-type>"`
- ❌ Never define kernel tokens in feature modules
- ❌ Never use inline string literals for DI tokens

#### Private Tokens (Module-Only)

**Module-specific tokens** are defined in the module's port files:

```typescript
// services/api/src/modules/identity/application/ports/user-repository.port.ts
export const USER_REPOSITORY_TOKEN = "identity/user-repository";

export interface UserRepositoryPort {
  // ...
}
```

**Rules**:

- ✅ Define in `<module>/application/ports/<resource>.port.ts`
- ✅ Keep private unless explicitly needed by other modules
- ✅ Use same naming pattern: `"<module>/<resource-type>"`
- ❌ Don't export unless documented why

### Token Import Rules

**Import kernel tokens from `@corely/kernel`:**

```typescript
import { AUDIT_PORT, ID_GENERATOR_TOKEN } from "@corely/kernel";
```

**Import module tokens from local paths:**

```typescript
import { USER_REPOSITORY_TOKEN } from "./application/ports/user-repository.port";
```

**Import cross-module tokens from owning module:**

```typescript
import { MEMBERSHIP_REPOSITORY_TOKEN } from "../identity/application/ports/membership-repository.port";
```

**Convenience re-exports** are available in `shared/ports/` but not required:

```typescript
// Both work - prefer direct import from kernel for clarity
import { ID_GENERATOR_TOKEN } from "@corely/kernel";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
```

---

## Module Structure

### Standard Feature Module Template

```typescript
import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { KernelModule } from "../../shared/kernel/kernel.module";

// Infrastructure adapters
import { PrismaUserRepository } from "./infrastructure/adapters/prisma-user-repository.adapter";

// Use cases
import { CreateUserUseCase } from "./application/use-cases/create-user.usecase";

// Ports/tokens
import { USER_REPOSITORY_TOKEN } from "./application/ports/user-repository.port";

// Controllers
import { UserController } from "./adapters/http/user.controller";

@Module({
  imports: [
    DataModule, // Provides: AUDIT_PORT, OUTBOX_PORT, UNIT_OF_WORK (global)
    KernelModule, // Provides: ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN
    // Other feature modules if needed
  ],
  controllers: [UserController],
  providers: [
    // Infrastructure
    PrismaUserRepository,
    { provide: USER_REPOSITORY_TOKEN, useExisting: PrismaUserRepository },

    // Use cases
    CreateUserUseCase,
  ],
  exports: [
    // Only export if used by other modules - document why
    // USER_REPOSITORY_TOKEN, // Exported for X module
  ],
})
export class UsersModule {}
```

### Imports Section Rules

**Required imports for all modules:**

1. **DataModule** - Provides global infrastructure (audit, outbox, UoW, Prisma)
2. **KernelModule** - Provides cross-cutting services (ID gen, clock, idempotency storage)

**Optional imports:**

3. Other feature modules - Only if you need their exported services

**Examples:**

```typescript
// Module that only needs basic infrastructure
@Module({
  imports: [DataModule, KernelModule],
  // ...
})

// Module that also needs identity services
@Module({
  imports: [DataModule, KernelModule, IdentityModule],
  // ...
})

// Module with complex cross-module dependencies
@Module({
  imports: [
    DataModule,
    KernelModule,
    PartyModule,        // For CUSTOMER_QUERY_PORT
    AccountingModule,   // For AccountingApplication
  ],
  // ...
})
```

### Providers Section Rules

**What to include:**

- ✅ Module-specific infrastructure (repositories, adapters)
- ✅ Module-specific use cases
- ✅ Module-specific application services
- ✅ Token bindings for module-specific ports

**What NOT to include:**

- ❌ `SystemIdGenerator` (provided by KernelModule)
- ❌ `SystemClock` (provided by KernelModule)
- ❌ `PrismaIdempotencyStorageAdapter` (provided by KernelModule)
- ❌ `PrismaAuditAdapter` (provided by DataModule)
- ❌ `PrismaOutboxAdapter` (provided by DataModule)
- ❌ Token bindings for kernel services

**Example:**

```typescript
providers: [
  // ✅ CORRECT - Module-specific
  PrismaUserRepository,
  { provide: USER_REPOSITORY_TOKEN, useExisting: PrismaUserRepository },
  CreateUserUseCase,
  UpdateUserUseCase,

  // ❌ WRONG - These come from KernelModule
  // SystemIdGenerator,
  // { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
],
```

### Exports Section Rules

**Default: Don't export anything**

Most modules should have minimal or empty exports:

```typescript
exports: [],  // Module is completely private
```

**Export only when:**

1. Another module needs to inject one of your services
2. You've documented which module consumes it
3. It's a deliberate architectural decision

**Example of intentional exports:**

```typescript
exports: [
  // Exported for ApprovalsModule and PlatformModule to check permissions
  ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN,

  // Exported for ApprovalsModule to validate memberships
  MEMBERSHIP_REPOSITORY_TOKEN,

  // Exported for use in guards and decorators
  AuthGuard,
  RbacGuard,
],
```

---

## Provider Registration Patterns

### Pattern 1: Repository Port Binding

```typescript
providers: [
  // Concrete implementation
  PrismaUserRepository,

  // Token binding
  {
    provide: USER_REPOSITORY_TOKEN,
    useExisting: PrismaUserRepository,
  },
],
```

**Why `useExisting` instead of `useClass`?**

- Allows DI by both token and class
- Ensures singleton semantics
- Enables testing with mocks

### Pattern 2: Use Case with Factory

When use cases need injected dependencies:

```typescript
providers: [
  {
    provide: CreateUserUseCase,
    useFactory: (
      repo: UserRepositoryPort,
      idGen: IdGeneratorPort,
      clock: ClockPort,
      audit: AuditPort
    ) =>
      new CreateUserUseCase({
        logger: new NestLoggerAdapter(),
        userRepo: repo,
        idGenerator: idGen,
        clock,
        audit,
      }),
    inject: [
      USER_REPOSITORY_TOKEN,
      ID_GENERATOR_TOKEN,
      CLOCK_PORT_TOKEN,
      AUDIT_PORT,
    ],
  },
],
```

**Note**: Use `any` type for kernel services if their concrete types aren't imported:

```typescript
useFactory: (
  repo: UserRepositoryPort,
  idGen: any, // From KernelModule - concrete type not imported
  clock: any, // From KernelModule - concrete type not imported
  audit: any // From DataModule - concrete type not imported
) => {
  /* ... */
};
```

### Pattern 3: Simple Service (No Factory)

For services with no constructor dependencies or simple DI:

```typescript
providers: [
  AppRegistry,  // NestJS auto-resolves constructor dependencies
],
```

---

## Centralized Modules

### KernelModule

**Location**: `services/api/src/shared/kernel/kernel.module.ts`

**Provides**:

- `ID_GENERATOR_TOKEN` → `SystemIdGenerator`
- `CLOCK_PORT_TOKEN` → `SystemClock`
- `IDEMPOTENCY_STORAGE_PORT_TOKEN` → `PrismaIdempotencyStorageAdapter`

**Exports**: All of the above (tokens and concrete classes)

**Usage**: Import in every feature module that needs ID generation, time, or idempotency storage

### DataModule (@Global)

**Location**: `packages/data/src/data.module.ts`

**Provides**:

- `PrismaService` - Database client
- `AUDIT_PORT` → `PrismaAuditAdapter`
- `OUTBOX_PORT` → `PrismaOutboxAdapter`
- `UNIT_OF_WORK` → `PrismaUnitOfWork`
- `IDEMPOTENCY_PORT` → `PrismaIdempotencyAdapter`
- Various shared repositories (CustomFieldDefinitionRepository, etc.)

**Exports**: All of the above

**Special**: Marked `@Global()` so audit/outbox/UoW are available everywhere without explicit import

**Usage**: Import in AppModule; automatically available to all feature modules

---

## Anti-Patterns to Avoid

### ❌ Anti-Pattern 1: Duplicate Providers

```typescript
// WRONG - AccountingModule
@Module({
  providers: [
    SystemIdGenerator,  // ❌ Already in KernelModule
    SystemClock,        // ❌ Already in KernelModule
  ],
})
```

**Fix**: Import KernelModule instead.

### ❌ Anti-Pattern 2: Missing Module Import

```typescript
// WRONG - Using ID_GENERATOR_TOKEN without importing KernelModule
@Module({
  imports: [DataModule],  // ❌ Missing KernelModule
  providers: [
    {
      provide: CreateUserUseCase,
      inject: [ID_GENERATOR_TOKEN],  // ❌ Token not available
    },
  ],
})
```

**Fix**: Add `KernelModule` to imports.

### ❌ Anti-Pattern 3: Symbol-Based Tokens

```typescript
// WRONG - Symbols cause identity issues in monorepos
export const USER_REPOSITORY_TOKEN = Symbol("user-repository");
```

**Fix**: Use string values:

```typescript
// CORRECT
export const USER_REPOSITORY_TOKEN = "identity/user-repository";
```

### ❌ Anti-Pattern 4: Inline String Tokens

```typescript
// WRONG - Magic string instead of constant
providers: [
  { provide: "user-repository", useExisting: PrismaUserRepository },
],
```

**Fix**: Define and use a named constant:

```typescript
export const USER_REPOSITORY_TOKEN = "identity/user-repository";

providers: [
  { provide: USER_REPOSITORY_TOKEN, useExisting: PrismaUserRepository },
],
```

### ❌ Anti-Pattern 5: Circular Dependencies

```typescript
// WRONG - ModuleA imports ModuleB, ModuleB imports ModuleA
@Module({
  imports: [ModuleBModule],
})
export class ModuleAModule {}

@Module({
  imports: [ModuleAModule], // ❌ Circular
})
export class ModuleBModule {}
```

**Fix**: Extract shared logic to a third module, or use forwardRef (only as last resort).

---

## Testing Patterns

### Mocking Kernel Services

In unit tests, provide mock implementations:

```typescript
const module = await Test.createTestingModule({
  providers: [
    CreateUserUseCase,
    { provide: USER_REPOSITORY_TOKEN, useValue: mockUserRepo },
    { provide: ID_GENERATOR_TOKEN, useValue: mockIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useValue: mockClock },
    { provide: AUDIT_PORT, useValue: mockAudit },
  ],
}).compile();
```

### Integration Tests

Import real modules for integration tests:

```typescript
const module = await Test.createTestingModule({
  imports: [DataModule, KernelModule, UsersModule],
}).compile();
```

---

## Checklist for New Modules

When creating a new feature module:

- [ ] Import `DataModule` and `KernelModule`
- [ ] Define module-specific tokens in `application/ports/*.port.ts`
- [ ] Use string values for tokens (never Symbol)
- [ ] Follow naming pattern: `"<module>/<resource-type>"`
- [ ] Register providers once only
- [ ] Don't duplicate kernel services
- [ ] Only export what other modules consume
- [ ] Document exported tokens with comments
- [ ] Test that DI works (unit + integration tests)

---

## Enforcement

### Manual Review

During code review, check:

1. No duplicate provider registrations
2. KernelModule imported if ID_GENERATOR_TOKEN or CLOCK_PORT_TOKEN used
3. No Symbol() tokens
4. Proper token naming convention

### Automated (Future)

Add ESLint rules to prevent:

- Symbol-based DI tokens
- Duplicate provider registrations (harder to detect statically)
- Missing KernelModule import when kernel tokens are used

---

## Summary

| Rule                       | Description                                           |
| -------------------------- | ----------------------------------------------------- |
| **Single Source**          | Each provider registered exactly once                 |
| **Import Don't Duplicate** | Import KernelModule/DataModule instead of redeclaring |
| **Export Intentionally**   | Only export cross-module services with documentation  |
| **String Tokens**          | Always use strings, never Symbol()                    |
| **Naming Convention**      | `"<module>/<resource-type>"` format                   |
| **Standard Structure**     | Follow feature module template                        |
| **No Circular Deps**       | Avoid circular module imports                         |

**Key Insight**: Treat DI tokens like an API contract. Breaking changes affect all consumers.

---

**Last Updated**: 2025-12-30
**Status**: Enforced via manual code review
**Next**: Add ESLint rules for automatic enforcement
