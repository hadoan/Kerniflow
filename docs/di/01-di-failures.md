# Phase 0: DI Failure Analysis

## Executive Summary

The Corely NestJS backend has a **critical DI architecture flaw**: massive provider duplication across modules. 12 out of 20+ feature modules independently declare and instantiate cross-cutting infrastructure providers (ID generator, clock, audit, idempotency storage) instead of importing them from a central `KernelModule`.

This violates NestJS module encapsulation principles and causes:

- Multiple singleton instances across the application
- Potential token identity mismatches at runtime
- Broken dependency injection for cross-module use cases
- Impossible-to-test and impossible-to-mock infrastructure
- UnknownDependenciesException errors when modules are used together

## Root Cause: Provider Duplication

### The Problem

**11 feature modules duplicate the same providers:**

| Module              | Duplicates ID_GENERATOR | Duplicates CLOCK | Duplicates IDEMPOTENCY_STORAGE | Duplicates AUDIT |
| ------------------- | ----------------------- | ---------------- | ------------------------------ | ---------------- |
| AccountingModule    | ✅                      | ✅               | ❌                             | ❌               |
| CustomizationModule | ✅                      | ✅               | ❌                             | ❌               |
| IdentityModule      | ✅                      | ✅               | ✅                             | ❌               |
| InventoryModule     | ✅                      | ✅               | ❌                             | ✅               |
| InvoicesModule      | ✅                      | ✅               | ❌                             | ❌               |
| PartyModule         | ✅                      | ✅               | ❌                             | ❌               |
| **PlatformModule**  | ✅                      | ❌               | ❌                             | ✅               |
| PosModule           | ✅                      | ❌               | ❌                             | ❌               |
| PrivacyModule       | ✅                      | ✅               | ❌                             | ❌               |
| PurchasingModule    | ✅                      | ✅               | ❌                             | ✅               |
| SalesModule         | ✅                      | ✅               | ✅                             | ✅               |

**Only 4 modules do it correctly** (import KernelModule):

- ✅ ExpensesModule
- ✅ CrmModule
- ✅ WorkspacesModule
- ✅ DocumentsModule

### Code Example: The Anti-Pattern

**PlatformModule** (services/api/src/modules/platform/platform.module.ts:96-100):

```typescript
providers: [
  // ... other providers
  SystemIdGenerator,
  {
    provide: ID_GENERATOR_TOKEN,
    useExisting: SystemIdGenerator,
  },
  // ...
];
```

**AccountingModule**, **InvoicesModule**, **SalesModule**, and 8 others have **identical duplication**.

### What SHOULD Happen

**KernelModule** already correctly provides and exports these:

```typescript
@Module({
  imports: [DataModule],
  providers: [
    SystemIdGenerator,
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    SystemClock,
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    PrismaIdempotencyStorageAdapter,
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
  ],
  exports: [
    ID_GENERATOR_TOKEN,
    CLOCK_PORT_TOKEN,
    IDEMPOTENCY_STORAGE_PORT_TOKEN,
    SystemIdGenerator,
    SystemClock,
    PrismaIdempotencyStorageAdapter,
  ],
})
export class KernelModule {}
```

Feature modules should **import KernelModule** instead of declaring providers.

## Specific Failure: EnableAppUseCase

### Dependency Chain

**EnableAppUseCase** (services/api/src/modules/platform/application/use-cases/enable-app.usecase.ts:24-35):

```typescript
constructor(
  @Inject(APP_REGISTRY_TOKEN)
  private readonly appRegistry: AppRegistryPort,
  @Inject(TENANT_APP_INSTALL_REPOSITORY_TOKEN)
  private readonly appInstallRepo: TenantAppInstallRepositoryPort,
  private readonly dependencyResolver: DependencyResolverService,
  @Inject(AUDIT_PORT)
  private readonly audit: AuditPort,
  @Inject(ID_GENERATOR_TOKEN)
  private readonly idGenerator: IdGeneratorPort
) {}
```

### Why It Fails

1. **EnableAppUseCase** is declared in **PlatformModule**
2. **PlatformModule** imports: `[DataModule]` only
3. **PlatformModule** declares its OWN `ID_GENERATOR_TOKEN` provider
4. **PlatformModule** declares its OWN `AUDIT_PORT` provider
5. Token imports come from different paths:
   - `AUDIT_PORT` from `@corely/kernel` (line 2)
   - `ID_GENERATOR_TOKEN` from `../../../../shared/ports/id-generator.port` (line 10)

6. Shared ports re-export from `@corely/kernel`:

   ```typescript
   // shared/ports/id-generator.port.ts
   export { ID_GENERATOR_TOKEN } from "@corely/kernel";
   ```

7. All tokens resolve to the same string values, but the **provider instances** are isolated to PlatformModule

### The Real Issue

When **PlatformModule** is used standalone, it works because it has local providers.

When **PlatformModule** is imported by **AppModule** alongside other modules that ALSO provide the same tokens, **NestJS creates multiple provider instances** - one per module scope.

If a module tries to inject `ID_GENERATOR_TOKEN` but doesn't have it in its own providers OR imports, it gets `UnknownDependenciesException`.

## Token Source Analysis

### Current Token Flow

```
EnableAppUseCase constructor
  ↓
@Inject(ID_GENERATOR_TOKEN)
  ↓
import from ../../../../shared/ports/id-generator.port
  ↓
export { ID_GENERATOR_TOKEN } from "@corely/kernel"
  ↓
packages/kernel/src/tokens.ts:
  export const ID_GENERATOR_TOKEN = "kernel/id-generator"
```

**Token identity**: ✅ Correct - all imports resolve to same string
**Provider location**: ❌ Wrong - 11 different modules each create their own instance

### Provider Registration Analysis

| Token                          | Canonical Source | Should Be Provided By | Actually Provided By              |
| ------------------------------ | ---------------- | --------------------- | --------------------------------- |
| ID_GENERATOR_TOKEN             | @corely/kernel   | KernelModule          | KernelModule + 11 feature modules |
| CLOCK_PORT_TOKEN               | @corely/kernel   | KernelModule          | KernelModule + 10 feature modules |
| AUDIT_PORT                     | @corely/kernel   | DataModule            | DataModule + 4 feature modules    |
| IDEMPOTENCY_STORAGE_PORT_TOKEN | @corely/kernel   | KernelModule          | KernelModule + 3 feature modules  |

## Impact Assessment

### Modules Affected

**Critical (must fix immediately)**:

- PlatformModule (used by EnableAppUseCase, DisableAppUseCase, etc.)
- IdentityModule (foundational for all authenticated operations)
- SalesModule (high business value)
- InvoicesModule (high business value)
- AccountingModule (high business value)
- PurchasingModule (high business value)

**High Priority**:

- InventoryModule
- PartyModule
- PosModule
- PrivacyModule
- CustomizationModule

### Use Cases Potentially Broken

Any use case that:

1. Depends on cross-module providers
2. Is used across multiple module boundaries
3. Relies on singleton semantics for ID generation, time, or audit

Examples:

- EnableAppUseCase
- DisableAppUseCase
- SignUpUseCase
- CreateWorkspaceUseCase
- CreateExpenseUseCase (works - imports KernelModule correctly)

## Failure Mode Classification

| Failure Type                        | Count  | Example                                   |
| ----------------------------------- | ------ | ----------------------------------------- |
| Missing provider registration       | 0      | N/A (all providers exist somewhere)       |
| Missing export                      | 0      | KernelModule correctly exports            |
| Missing import                      | 11     | Feature modules don't import KernelModule |
| Token mismatch                      | 0      | All tokens resolve to same strings        |
| **Duplicate provider declarations** | **11** | **Root cause**                            |

## Next Steps (Phase 1 & 2)

1. **Phase 1**: Create canonical token catalog documentation
2. **Phase 2**:
   - Remove duplicate provider declarations from all 11 feature modules
   - Add `KernelModule` to imports array
   - Ensure DataModule is imported for AUDIT_PORT, OUTBOX_PORT
   - Verify no module declares kernel-level providers locally
3. **Phase 3**: Test EnableAppUseCase and other critical paths
4. **Phase 4**: Add guardrails to prevent regression

---

**Analysis Date**: 2025-12-30
**Analyzed By**: Senior NestJS Architect
**Severity**: Critical
**Estimated Fix Time**: 2-4 hours for code changes, 1-2 hours for testing
