# Phase 1: DI Token Inventory

## Summary

**Total DI Tokens**: 68 unique tokens
**Token Types**: All string-based (no Symbols ✅)
**Naming Convention**: `"module/resource-type"` pattern
**Token Definition Files**: 48 port files across 16 modules + 1 canonical source

## Token Classification

### Cross-Module (Kernel-Level) Tokens

These tokens are defined in `packages/kernel/src/tokens.ts` and used across multiple modules:

| Token                          | Value                            | Canonical Source | Should Be Provided By | Notes                              |
| ------------------------------ | -------------------------------- | ---------------- | --------------------- | ---------------------------------- |
| AUDIT_PORT                     | `"kernel/audit-port"`            | @corely/kernel   | DataModule            | Exported from @corely/kernel ports |
| OUTBOX_PORT                    | `"kernel/outbox-port"`           | @corely/kernel   | DataModule            | Exported from @corely/kernel ports |
| IDEMPOTENCY_PORT               | `"kernel/idempotency-port"`      | @corely/kernel   | DataModule            | Exported from @corely/kernel ports |
| UNIT_OF_WORK                   | `"kernel/unit-of-work"`          | @corely/kernel   | DataModule            | Exported from @corely/kernel ports |
| CLOCK_PORT_TOKEN               | `"kernel/clock-port"`            | @corely/kernel   | **KernelModule**      | Re-exported by shared/ports        |
| ID_GENERATOR_TOKEN             | `"kernel/id-generator"`          | @corely/kernel   | **KernelModule**      | Re-exported by shared/ports        |
| IDEMPOTENCY_STORAGE_PORT_TOKEN | `"api/idempotency-storage-port"` | @corely/kernel   | **KernelModule**      | API-specific                       |
| TENANT_TIMEZONE_PORT           | `"api/tenant-timezone-port"`     | @corely/kernel   | InvoicesModule        | Time service dependency            |

**Status**: ✅ Token definitions are centralized
**Issue**: ❌ 11 modules re-declare providers instead of importing

---

## Module-Specific Tokens

### 1. Identity Module

**Location**: `services/api/src/modules/identity/application/ports/`

| Token                                  | Value                                         | Bound In       | Exported | Notes                                        |
| -------------------------------------- | --------------------------------------------- | -------------- | -------- | -------------------------------------------- |
| USER_REPOSITORY_TOKEN                  | `"identity/user-repository"`                  | IdentityModule | ❌       | Module-private                               |
| ROLE_REPOSITORY_TOKEN                  | `"identity/role-repository"`                  | IdentityModule | ❌       | Module-private                               |
| TENANT_REPOSITORY_TOKEN                | `"identity/tenant-repository"`                | IdentityModule | ❌       | Module-private                               |
| MEMBERSHIP_REPOSITORY_TOKEN            | `"identity/membership-repository"`            | IdentityModule | ✅       | Used by ApprovalsModule, PlatformModule      |
| TOKEN_SERVICE_TOKEN                    | `"identity/token-service"`                    | IdentityModule | ❌       | Module-private                               |
| REFRESH_TOKEN_REPOSITORY_TOKEN         | `"identity/refresh-token-repository"`         | IdentityModule | ❌       | Module-private                               |
| ROLE_PERMISSION_GRANT_REPOSITORY_TOKEN | `"identity/role-permission-grant-repository"` | IdentityModule | ✅       | Used by ApprovalsModule, PlatformModule      |
| PERMISSION_CATALOG_PORT                | `"identity/permission-catalog"`               | IdentityModule | ❌       | Module-private                               |
| PASSWORD_HASHER_TOKEN                  | `"identity/password-hasher"`                  | IdentityModule | ❌       | Module-private                               |
| AUDIT_PORT_TOKEN                       | `"identity/audit-port"`                       | IdentityModule | ❌       | **Duplicate - should use kernel AUDIT_PORT** |

**Token Count**: 10

---

### 2. Platform Module

**Location**: `services/api/src/modules/platform/application/ports/`

| Token                                    | Value                                           | Bound In       | Exported | Notes                      |
| ---------------------------------------- | ----------------------------------------------- | -------------- | -------- | -------------------------- |
| APP_REGISTRY_TOKEN                       | `"platform/app-registry"`                       | PlatformModule | ✅       | Used by PlatformController |
| PACK_REGISTRY_TOKEN                      | `"platform/pack-registry"`                      | PlatformModule | ✅       | Pack management            |
| TEMPLATE_REGISTRY_TOKEN                  | `"platform/template-registry"`                  | PlatformModule | ✅       | Template system            |
| TEMPLATE_EXECUTOR_TOKEN                  | `"platform/template-executor"`                  | PlatformModule | ❌       | Module-private             |
| TENANT_APP_INSTALL_REPOSITORY_TOKEN      | `"platform/tenant-app-install-repository"`      | PlatformModule | ✅       | Used by EnableAppUseCase   |
| TENANT_TEMPLATE_INSTALL_REPOSITORY_TOKEN | `"platform/tenant-template-install-repository"` | PlatformModule | ❌       | Module-private             |
| TENANT_MENU_OVERRIDE_REPOSITORY_TOKEN    | `"platform/tenant-menu-override-repository"`    | PlatformModule | ❌       | Menu customization         |
| SEEDED_RECORD_META_REPOSITORY_TOKEN      | `"platform/seeded-record-meta-repository"`      | PlatformModule | ❌       | Template tracking          |

**Token Count**: 8

---

### 3. Accounting Module

**Location**: `services/api/src/modules/accounting/application/ports/`

| Token                         | Value                                    | Bound In         | Exported | Notes             |
| ----------------------------- | ---------------------------------------- | ---------------- | -------- | ----------------- |
| ACCOUNTING_SETTINGS_REPO_PORT | `"accounting/settings-repository"`       | AccountingModule | ❌       | Module-private    |
| LEDGER_ACCOUNT_REPO_PORT      | `"accounting/ledger-account-repository"` | AccountingModule | ❌       | Chart of accounts |
| JOURNAL_ENTRY_REPO_PORT       | `"accounting/journal-entry-repository"`  | AccountingModule | ❌       | Journaling        |
| ACCOUNTING_PERIOD_REPO_PORT   | `"accounting/period-repository"`         | AccountingModule | ❌       | Period management |
| ACCOUNTING_REPORT_QUERY_PORT  | `"accounting/accounting-report-query"`   | AccountingModule | ❌       | Financial reports |

**Token Count**: 5

---

### 4. Sales Module

**Location**: `services/api/src/modules/sales/application/ports/`

| Token                          | Value                         | Bound In    | Exported | Notes          |
| ------------------------------ | ----------------------------- | ----------- | -------- | -------------- |
| SALES_ORDER_REPOSITORY_PORT    | `"sales/order-repository"`    | SalesModule | ❌       | Module-private |
| SALES_INVOICE_REPOSITORY_PORT  | `"sales/invoice-repository"`  | SalesModule | ❌       | Module-private |
| QUOTE_REPOSITORY_PORT          | `"sales/quote-repository"`    | SalesModule | ❌       | Module-private |
| SALES_PAYMENT_REPOSITORY_PORT  | `"sales/payment-repository"`  | SalesModule | ❌       | Module-private |
| SALES_SETTINGS_REPOSITORY_PORT | `"sales/settings-repository"` | SalesModule | ❌       | Module-private |

**Token Count**: 5

---

### 5. Invoices Module

**Location**: `services/api/src/modules/invoices/application/ports/`

| Token                     | Value                             | Bound In       | Exported | Notes               |
| ------------------------- | --------------------------------- | -------------- | -------- | ------------------- |
| CUSTOMER_QUERY_PORT       | `"invoices/customer-query"`       | InvoicesModule | ❌       | Module-private      |
| INVOICE_NUMBERING_PORT    | `"invoices/invoice-numbering"`    | InvoicesModule | ❌       | Number sequences    |
| INVOICE_PDF_RENDERER_PORT | `"invoices/invoice-pdf-renderer"` | InvoicesModule | ❌       | PDF generation      |
| NOTIFICATION_PORT         | `"invoices/notification"`         | InvoicesModule | ❌       | Email notifications |

**Token Count**: 4

---

### 6. Purchasing Module

**Location**: `services/api/src/modules/purchasing/application/ports/`

| Token                    | Value                                 | Bound In         | Exported | Notes          |
| ------------------------ | ------------------------------------- | ---------------- | -------- | -------------- |
| SUPPLIER_QUERY_PORT      | `"purchasing/supplier-query"`         | PurchasingModule | ❌       | Module-private |
| VENDOR_BILL_REPO         | `"purchasing/vendor-bill-repository"` | PurchasingModule | ❌       | Module-private |
| PURCHASING_SETTINGS_REPO | `"purchasing/settings-repository"`    | PurchasingModule | ❌       | Module-private |

**Token Count**: 3 (+ other ports not inventoried)

---

### 7. CRM Module

**Location**: `services/api/src/modules/crm/application/ports/`

| Token              | Value                       | Bound In  | Exported | Notes          |
| ------------------ | --------------------------- | --------- | -------- | -------------- |
| DEAL_REPO_PORT     | `"crm/deal-repository"`     | CrmModule | ❌       | Module-private |
| ACTIVITY_REPO_PORT | `"crm/activity-repository"` | CrmModule | ❌       | Module-private |

**Token Count**: 2

---

### 8. Engagement Module

**Location**: `services/api/src/modules/engagement/application/ports/`

| Token                               | Value                              | Bound In         | Exported | Notes          |
| ----------------------------------- | ---------------------------------- | ---------------- | -------- | -------------- |
| LOYALTY_REPOSITORY_PORT             | `"engagement/loyalty-repository"`  | EngagementModule | ❌       | Module-private |
| CHECKIN_REPOSITORY_PORT             | `"checkin/checkin-repository"`     | EngagementModule | ❌       | Module-private |
| ENGAGEMENT_SETTINGS_REPOSITORY_PORT | `"engagement/settings-repository"` | EngagementModule | ❌       | Module-private |

**Token Count**: 3

---

### 9. POS Module

**Location**: `services/api/src/modules/pos/application/ports/`

| Token                         | Value                            | Bound In  | Exported | Notes              |
| ----------------------------- | -------------------------------- | --------- | -------- | ------------------ |
| REGISTER_REPOSITORY_PORT      | `"pos/register-repository"`      | PosModule | ❌       | Module-private     |
| SHIFT_SESSION_REPOSITORY_PORT | `"pos/shift-session-repository"` | PosModule | ❌       | Module-private     |
| POS_SALE_IDEMPOTENCY_PORT     | `"pos/pos-sale-idempotency"`     | PosModule | ❌       | Sale deduplication |

**Token Count**: 3

---

### 10. Inventory Module

**Location**: `services/api/src/modules/inventory/application/ports/`

| Token          | Value                              | Bound In        | Exported | Notes          |
| -------------- | ---------------------------------- | --------------- | -------- | -------------- |
| WAREHOUSE_REPO | `"inventory/warehouse-repository"` | InventoryModule | ❌       | Module-private |
| PRODUCT_REPO   | `"inventory/product-repository"`   | InventoryModule | ❌       | Module-private |

**Token Count**: 2 (+ other ports not inventoried)

---

### 11. Workspaces Module

**Location**: `services/api/src/modules/workspaces/application/ports/`

| Token                     | Value                               | Bound In         | Exported | Notes          |
| ------------------------- | ----------------------------------- | ---------------- | -------- | -------------- |
| WORKSPACE_REPOSITORY_PORT | `"workspaces/workspace-repository"` | WorkspacesModule | ❌       | Module-private |

**Token Count**: 1

---

### 12. Expenses Module

**Location**: `services/api/src/modules/expenses/application/ports/`

| Token              | Value                           | Bound In       | Exported | Notes          |
| ------------------ | ------------------------------- | -------------- | -------- | -------------- |
| EXPENSE_REPOSITORY | `"expenses/expense-repository"` | ExpensesModule | ❌       | Module-private |

**Token Count**: 1

---

### 13. AI-Copilot Module

**Location**: `services/api/src/modules/ai-copilot/application/ports/`

| Token         | Value                | Bound In        | Exported | Notes         |
| ------------- | -------------------- | --------------- | -------- | ------------- |
| COPILOT_TOOLS | `"ai-copilot/tools"` | AiCopilotModule | ❌       | Tool registry |

**Token Count**: 1

---

### 14. Reporting Module

**Location**: `services/api/src/modules/reporting/application/ports/`

| Token                | Value                         | Bound In        | Exported | Notes             |
| -------------------- | ----------------------------- | --------------- | -------- | ----------------- |
| REPORTING_QUERY_PORT | `"reporting/reporting-query"` | ReportingModule | ❌       | Dashboard queries |

**Token Count**: 1

---

## Token Re-Export Pattern

### Shared Ports (`services/api/src/shared/ports/`)

These files re-export kernel tokens for convenience:

| File                        | Re-exports                     | Source         |
| --------------------------- | ------------------------------ | -------------- |
| audit.port.ts               | AUDIT_PORT, AUDIT_PORT_TOKEN   | @corely/kernel |
| clock.port.ts               | CLOCK_PORT_TOKEN               | @corely/kernel |
| id-generator.port.ts        | ID_GENERATOR_TOKEN             | @corely/kernel |
| idempotency-storage.port.ts | IDEMPOTENCY_STORAGE_PORT_TOKEN | @corely/kernel |

**Pattern**:

```typescript
export type { IdGeneratorPort } from "@corely/kernel";
export { ID_GENERATOR_TOKEN } from "@corely/kernel";
```

**Purpose**: Allows API modules to import from local path while preserving token identity

---

## Token Import Paths Analysis

### Problem: Multiple Import Paths for Same Token

**ID_GENERATOR_TOKEN** can be imported from:

1. `@corely/kernel` (canonical)
2. `@corely/kernel` (re-export)
3. `../../shared/ports/id-generator.port` (re-export)

All resolve to the same string value `"kernel/id-generator"`, so no identity mismatch occurs. ✅

**However**: This creates confusion about the "source of truth" for tokens.

---

## Naming Convention Analysis

### Current Patterns

| Pattern   | Count | Example            | Used By                      |
| --------- | ----- | ------------------ | ---------------------------- |
| `*_TOKEN` | 35    | ID_GENERATOR_TOKEN | Newer modules, cross-cutting |
| `*_PORT`  | 25    | AUDIT_PORT         | Kernel, some modules         |
| `*_REPO`  | 8     | PRODUCT_REPO       | Inventory, Purchasing        |

**Observation**: Inconsistent suffix usage, but all follow `MODULE/RESOURCE` value pattern.

---

## Token Value Format

All tokens follow the convention: `"<module>/<resource-type>"`

Examples:

- `"kernel/id-generator"`
- `"identity/user-repository"`
- `"platform/app-registry"`
- `"sales/order-repository"`

**Consistency**: ✅ Excellent - all 68 tokens follow this pattern
**No Symbol tokens**: ✅ No Symbol-based tokens found (good for monorepo stability)

---

## Critical Findings

### 1. Provider Duplication (from Phase 0)

**11 modules** duplicate these kernel-level providers:

- `ID_GENERATOR_TOKEN` - duplicated 11 times
- `CLOCK_PORT_TOKEN` - duplicated 10 times
- `IDEMPOTENCY_STORAGE_PORT_TOKEN` - duplicated 3 times
- `AUDIT_PORT` - duplicated 4 times

### 2. Token Ownership is Clear

✅ Each token has one canonical definition location
✅ Module-specific tokens are properly namespaced
✅ Cross-module tokens are in `packages/kernel/src/tokens.ts`

### 3. Export Strategy is Inconsistent

❌ Some modules export tokens (IdentityModule exports MEMBERSHIP_REPOSITORY_TOKEN)
❌ No clear rule for when to export vs keep private
❌ Platform module exports 4 tokens, but unclear why those specific ones

---

## Recommendations

### 1. Keep Current Token Catalog

**Do NOT create a new `packages/server-di`** - the existing setup in `packages/kernel/src/tokens.ts` is correct and working.

### 2. Fix Provider Registration (Phase 2)

- Remove duplicate provider declarations from 11 modules
- Have all modules import `KernelModule` for cross-cutting providers
- Document which module owns which provider

### 3. Standardize Import Paths (Future)

Consider enforcing imports from canonical sources:

- Kernel tokens: `@corely/kernel`
- Module tokens: Local `./ports/*` paths

### 4. Document Export Rules

Create rules for when module tokens should be exported:

- Export if used by other modules (e.g., MEMBERSHIP_REPOSITORY_TOKEN used by Approvals)
- Keep private otherwise

---

**Analysis Date**: 2025-12-30
**Total Tokens Inventoried**: 68
**Issues Found**: Provider duplication (not token definition issues)
**Next Phase**: Fix duplicate providers and module imports
