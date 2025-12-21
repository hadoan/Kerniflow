# Timezone Strategy Review & Implementation Plan

**Date:** 2025-12-21
**Review Scope:** Entire monorepo (API, Web, Contracts, Kernel, Data packages)

---

## Executive Summary

The current codebase has **critical timezone handling gaps** that will cause bugs in production, especially for:

- Due date calculations (off-by-one errors around midnight)
- "Today" computations (varies by server timezone)
- Month boundary reporting (incorrect in different timezones)
- Overdue invoice detection (not yet implemented, will be buggy)

**Critical missing features:**

1. No `invoiceDate` or `dueDate` fields in the Invoice model
2. No tenant timezone storage
3. No distinction between instant (UTC timestamps) and date-only fields
4. Direct `new Date()` usage in domain layer bypassing `ClockPort`

---

## Current State Analysis

### ✅ What's Working Well

1. **ClockPort infrastructure exists** ([packages/kernel/src/ports/clock.port.ts:1](packages/kernel/src/ports/clock.port.ts#L1))
   - Simple interface: `now(): Date`
   - Used correctly in some places (e.g., [CreateExpenseUseCase.ts:78](services/api/src/modules/expenses/application/use-cases/CreateExpenseUseCase.ts#L78))

2. **Kernel package structure** is ready for extension
   - Already exports ports and base classes
   - Has testing utilities (FixedClock, NoopLogger)

3. **Contract/DTO layer uses ISO strings** ([invoice-dto.mapper.ts:13-16](services/api/src/modules/invoices/application/use-cases/shared/invoice-dto.mapper.ts#L13-L16))
   - Timestamps serialized via `.toISOString()`
   - Good foundation, but lacks LocalDate distinction

### ❌ Critical Issues

#### 1. Missing Invoice Date Fields

**Location:** [60_billing.prisma:1-54](packages/data/prisma/schema/60_billing.prisma#L1-L54)

The `Invoice` model has:

- ✅ `issuedAt: DateTime?` (instant when invoice finalized)
- ✅ `sentAt: DateTime?` (instant when sent to customer)
- ❌ **Missing `invoiceDate`** (business calendar date for the invoice)
- ❌ **Missing `dueDate`** (business calendar date for payment deadline)

**Impact:**

- Cannot calculate "overdue" status
- Cannot filter invoices by issue date or due date
- Frontend mock data ([mockDb.ts:293](apps/web/src/shared/mock/mockDb.ts#L293)) shows these fields as `string` but they don't exist in real schema
- UI form schema ([invoice-form.schema.ts:23-26](apps/web/src/modules/invoices/schemas/invoice-form.schema.ts#L23-L26)) expects these fields

#### 2. Direct `new Date()` Usage in Domain

**Location:** [invoice.aggregate.ts:175](services/api/src/modules/invoices/domain/invoice.aggregate.ts#L175)

```typescript
private touch() {
  this.updatedAt = new Date(); // ❌ Should use ClockPort
}
```

**Also found in:**

- [CreateInvoiceUseCase.ts:49](services/api/src/modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.ts#L49): `const createdAt = new Date();`
- [invoice-form.schema.ts:63](apps/web/src/modules/invoices/schemas/invoice-form.schema.ts#L63): `const now = new Date();` (acceptable in UI, but should use tenant timezone)

**Impact:**

- Makes unit testing difficult (can't freeze time)
- Violates dependency inversion principle
- Audit timestamps may be incorrect in edge cases

#### 3. No Tenant Timezone Storage

**Location:** [10_identity.prisma:3-17](packages/data/prisma/schema/10_identity.prisma#L3-L17)

```prisma
model Tenant {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  status    String   @default("ACTIVE")
  createdAt DateTime @default(now())
  // ❌ Missing: timeZone String @default("UTC")
}
```

**Impact:**

- Cannot compute tenant's "today" for date comparisons
- Cannot display correct local times in UI
- Will cause off-by-one errors for invoices created near midnight

#### 4. Ambiguous Date Types

**Expense `issuedAt`:** [Expense schema:8](packages/data/prisma/schema/65_expenses.prisma#L8)

```prisma
issuedAt DateTime
```

**Question:** Is this an instant or a date-only value?

- **If date-only:** Should be `@db.Date` or `String` (YYYY-MM-DD)
- **If instant:** Current `DateTime` is okay but needs `@db.Timestamptz` for clarity

**Frontend type confusion:** [index.ts:70](apps/web/src/shared/types/index.ts#L70)

```typescript
export interface Expense {
  date: string; // ❌ What format? ISO timestamp or YYYY-MM-DD?
}
```

#### 5. Missing DB Type Annotations

**All DateTime fields** lack explicit Postgres type:

```prisma
createdAt DateTime @default(now())  // ❌ Should be @db.Timestamptz(6)
```

**Impact:**

- Unclear if stored with timezone or without
- Risk of naive timestamp storage
- Potential migration issues when adding precision

#### 6. Frontend Date Boundary Issues

**Location:** [invoice-form.schema.ts:45-57](apps/web/src/modules/invoices/schemas/invoice-form.schema.ts#L45-L57)

```typescript
export function toCreateInvoiceInput(form: InvoiceFormData): CreateInvoiceInput {
  return {
    customerId: form.customerId,
    currency: form.currency,
    // ❌ Missing conversion for invoiceDate, dueDate!
    lineItems: form.lineItems.map(...)
  };
}
```

**Impact:**

- Form has `invoiceDate: z.date()` but doesn't send it to API
- API contract doesn't expect date fields
- Complete disconnect between UI and API

---

## Risk Assessment

### 🔴 High Risk - Immediate Attention Required

1. **Overdue calculation impossible** - No `dueDate` field
2. **Invoice dating broken** - No `invoiceDate` field
3. **Timezone bugs imminent** - No tenant timezone

### 🟡 Medium Risk - Required for Correctness

4. **Testing fragility** - Direct `new Date()` usage
5. **DST edge cases** - No timezone-aware date helpers
6. **Expense date ambiguity** - `issuedAt` type unclear

### 🟢 Low Risk - Technical Debt

7. **Missing DB type precision** - Add `@db.Timestamptz(6)`
8. **Contract validation gaps** - Add LocalDate schema validation

---

## Required Refactors

### Phase 1: Foundation (Unblocks Everything)

1. **Add tenant timezone field**
   - Migration: `ALTER TABLE "Tenant" ADD COLUMN "timeZone" TEXT DEFAULT 'UTC'`
   - Update Prisma schema
   - Create `TenantTimeZonePort` adapter

2. **Add invoice date fields**
   - Migration:
     ```sql
     ALTER TABLE "Invoice" ADD COLUMN "invoiceDate" DATE;
     ALTER TABLE "Invoice" ADD COLUMN "dueDate" DATE;
     ```
   - Update Prisma schema
   - Update aggregate, DTOs, contracts

3. **Create time primitives package**
   - `packages/kernel/src/time/local-date.ts` (branded string type)
   - `packages/kernel/src/time/time.service.ts` (timezone-aware helpers)
   - `packages/kernel/src/time/ports/tenant-timezone.port.ts`

### Phase 2: Domain Refactoring

4. **Fix ClockPort usage**
   - Inject `ClockPort` into `InvoiceAggregate` (or use functional approach)
   - Replace all `new Date()` in domain/use-cases

5. **Update invoice use cases**
   - Accept `invoiceDate` and `dueDate` in create/update inputs
   - Use `TimeService.todayInTenant()` for default dates
   - Implement overdue logic using LocalDate comparison

### Phase 3: Contracts & API

6. **Standardize contracts**
   - Add `localDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)`
   - Update `CreateInvoiceInputSchema` to include date fields
   - Separate instant vs LocalDate in all DTOs

7. **Update HTTP controllers & AI tools**
   - Validate date inputs with new schemas
   - Both pathways call same use cases (already correct)

### Phase 4: Frontend

8. **Fix form boundary**
   - Convert `Date` to `YYYY-MM-DD` in `toCreateInvoiceInput`
   - If tenant timezone available, use it for conversion
   - Display dates in user's timezone preference

---

## Migration Plan

### Step 0: Review ✅ (This Document)

### Step 1: Time Primitives (1-2 hours)

- [ ] Create `packages/kernel/src/time/` directory
- [ ] Implement `LocalDate` branded type + helpers
- [ ] Implement `TimeService` with `todayInTenant()`, etc.
- [ ] Add unit tests (including DST edge cases)
- [ ] Export from `packages/kernel/src/index.ts`

### Step 2: Database Schema (30 mins)

- [ ] Add `Tenant.timeZone` field (migration + Prisma)
- [ ] Add `Invoice.invoiceDate` and `Invoice.dueDate` (migration + Prisma)
- [ ] Add `@db.Timestamptz(6)` to all instant fields
- [ ] Decide on Expense.issuedAt (instant vs date)
- [ ] Run migrations on dev DB

### Step 3: Contracts (1 hour)

- [ ] Add `localDateSchema` to `packages/contracts/src/shared/`
- [ ] Update `CreateInvoiceInputSchema` with date fields
- [ ] Update `InvoiceDtoSchema` with date fields
- [ ] Update `ExpenseInputSchema` if date-only

### Step 4: Domain & Use Cases (2-3 hours)

- [ ] Add `invoiceDate`, `dueDate` to `InvoiceAggregate`
- [ ] Inject/use `ClockPort` in aggregate (refactor `touch()`)
- [ ] Update `CreateInvoiceUseCase` to accept dates
- [ ] Update `FinalizeInvoiceUseCase` (if exists)
- [ ] Implement overdue detection logic
- [ ] Update invoice repo mapper

### Step 5: Adapters (1 hour)

- [ ] Update HTTP controller validation
- [ ] Update AI tool validation
- [ ] Ensure both use same contracts

### Step 6: Frontend (1-2 hours)

- [ ] Fix `toCreateInvoiceInput` to convert dates
- [ ] Add timezone conversion helper
- [ ] Update invoice display components
- [ ] Update mock data format

### Step 7: Tenant Timezone Settings (1 hour)

- [ ] Implement `TenantTimeZonePort` adapter (DB lookup)
- [ ] Wire up in dependency injection
- [ ] Add API endpoint for updating timezone (optional)
- [ ] Seed default timezone for existing tenants

### Step 8: Testing (2-3 hours)

- [ ] Unit tests for `TimeService` (DST transitions)
- [ ] Unit tests for updated use cases
- [ ] Integration tests for invoice creation with dates
- [ ] E2E test for overdue calculation
- [ ] Test around Europe/Berlin DST boundaries (Mar 31, Oct 27)

---

## Testing Strategy

### DST Test Cases (Europe/Berlin)

1. **Spring Forward (2025-03-30 02:00 → 03:00)**
   - Invoice due on 2025-03-30
   - Create at 01:30 UTC (02:30 CET, becomes 03:30 CEST)
   - Verify `todayInTenant` returns correct date

2. **Fall Back (2025-10-26 03:00 → 02:00)**
   - Invoice due on 2025-10-26
   - Create at 00:30 UTC (02:30 CEST, becomes 02:30 CET after)
   - Verify date boundaries don't shift

3. **Midnight Boundary**
   - Tenant in Asia/Tokyo (+09:00)
   - Server at 15:30 UTC (00:30 next day in Tokyo)
   - Verify `todayInTenant` returns next day's date

### Use Case Tests

- CreateInvoice with no dates → should default to tenant's "today"
- CreateInvoice with explicit dates → should use provided dates
- Overdue detection:
  - Invoice due yesterday → overdue
  - Invoice due today → not overdue
  - Invoice due tomorrow → not overdue
- List invoices by date range (month filter)

---

## Breaking Changes

### API Changes

- `CreateInvoiceInput` gains optional fields:
  ```typescript
  {
    invoiceDate?: string; // YYYY-MM-DD
    dueDate?: string;     // YYYY-MM-DD
  }
  ```
- `InvoiceDto` gains fields:
  ```typescript
  {
    invoiceDate: string | null; // YYYY-MM-DD
    dueDate: string | null; // YYYY-MM-DD
  }
  ```

### Database Changes

- New columns (nullable for backward compat)
- Existing invoices will have `NULL` dates (can backfill if needed)

### Frontend Changes

- Form must convert `Date` objects to `YYYY-MM-DD` strings before submission

---

## Open Questions for Product/UX

1. **Default due date calculation?**
   - Option A: `invoiceDate + tenant.paymentTermsDays`
   - Option B: Require explicit user input
   - Recommendation: Auto-calculate with override

2. **Date display format?**
   - Use tenant locale setting?
   - Always show in user's browser timezone?
   - Recommendation: Use tenant timezone for business dates, user timezone for audit timestamps

3. **Backfill strategy for existing invoices?**
   - Set `invoiceDate = issuedAt` (convert instant → local date in tenant tz)
   - Set `dueDate = NULL` or calculate from payment terms?
   - Recommendation: Backfill from `issuedAt` if available

4. **Expense date: instant or date-only?**
   - Receipts typically have calendar dates, not timestamps
   - Recommendation: Treat as `LocalDate` (receipt date)

---

## Success Criteria

After implementation, verify:

- [ ] No `new Date()` in domain/use-cases (except via ClockPort)
- [ ] All instant fields use `@db.Timestamptz(6)`
- [ ] All date-only fields use `@db.Date` or `String` (YYYY-MM-DD)
- [ ] Contracts clearly distinguish instant (ISO with Z) vs LocalDate (YYYY-MM-DD)
- [ ] `TimeService` handles DST correctly (tests pass)
- [ ] Invoice overdue logic works in all timezones
- [ ] Frontend sends correct LocalDate format
- [ ] Both HTTP and AI tools validate with same schemas

---

## Files Requiring Changes

### Create New

- `packages/kernel/src/time/local-date.ts`
- `packages/kernel/src/time/time.service.ts`
- `packages/kernel/src/time/time-zone.ts`
- `packages/kernel/src/time/ports/clock.port.ts` (move from current location)
- `packages/kernel/src/time/ports/tenant-timezone.port.ts`
- `packages/kernel/src/time/__tests__/time.service.spec.ts`
- `packages/contracts/src/shared/local-date.schema.ts`
- DB migration: `add-tenant-timezone.sql`
- DB migration: `add-invoice-dates.sql`

### Modify Existing

- [packages/data/prisma/schema/10_identity.prisma](packages/data/prisma/schema/10_identity.prisma) - add timezone
- [packages/data/prisma/schema/60_billing.prisma](packages/data/prisma/schema/60_billing.prisma) - add date fields, @db types
- [packages/data/prisma/schema/65_expenses.prisma](packages/data/prisma/schema/65_expenses.prisma) - clarify date type
- [packages/kernel/src/index.ts](packages/kernel/src/index.ts) - export time primitives
- [packages/contracts/src/invoices/invoice.types.ts](packages/contracts/src/invoices/invoice.types.ts) - add date fields
- [packages/contracts/src/invoices/create-invoice.schema.ts](packages/contracts/src/invoices/create-invoice.schema.ts) - add date validation
- [services/api/src/modules/invoices/domain/invoice.aggregate.ts](services/api/src/modules/invoices/domain/invoice.aggregate.ts) - add dates, fix touch()
- [services/api/src/modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.ts](services/api/src/modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.ts) - use ClockPort, handle dates
- [services/api/src/modules/invoices/application/use-cases/shared/invoice-dto.mapper.ts](services/api/src/modules/invoices/application/use-cases/shared/invoice-dto.mapper.ts) - map date fields
- [apps/web/src/modules/invoices/schemas/invoice-form.schema.ts](apps/web/src/modules/invoices/schemas/invoice-form.schema.ts) - fix toCreateInvoiceInput
- [apps/web/src/shared/types/index.ts](apps/web/src/shared/types/index.ts) - clarify date types

---

## Next Steps

1. **Get approval** on this strategy
2. **Clarify open questions** (default dates, backfill, expense date type)
3. **Proceed with Step 1** (Time primitives) once approved
4. **Iterate** through implementation steps

---

## Notes

- Use **date-fns-tz** for timezone conversions (if not already in repo)
- Ensure all tests use `FixedClock` for deterministic time
- Document timezone assumptions in code comments
- Consider adding `@deprecated` warnings during migration period
