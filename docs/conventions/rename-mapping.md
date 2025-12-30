# Corely Naming Refactor: Complete Rename Mapping

**Generated:** 23 Dec 2025
**Purpose:** Complete mapping of file renames to enforce naming conventions

---

## Summary Statistics

- **Total files to rename:** 60+
- **PascalCase violations:** 32 files
- **Abbreviation fixes:** 20+ files (repo → repository)
- **Test suffix standardization:** 26 files (.test.ts alignment)
- **Infrastructure folder renames:** 3 modules (infra → infrastructure)

---

## 1. API Service Renames (services/api/src/modules/)

### 1.1 Expenses Module

#### UseCase Files (PascalCase → kebab-case)

```
OLD: modules/expenses/application/use-cases/ArchiveExpenseUseCase.ts
NEW: modules/expenses/application/use-cases/archive-expense.usecase.ts

OLD: modules/expenses/application/use-cases/CreateExpenseUseCase.ts
NEW: modules/expenses/application/use-cases/create-expense.usecase.ts

OLD: modules/expenses/application/use-cases/UnarchiveExpenseUseCase.ts
NEW: modules/expenses/application/use-cases/unarchive-expense.usecase.ts
```

#### Repository Port (PascalCase → kebab-case, full "repository")

```
OLD: modules/expenses/application/ports/ExpenseRepositoryPort.ts
NEW: modules/expenses/application/ports/expense-repository.port.ts
```

#### Repository Adapter (PascalCase → kebab-case, add technology prefix)

```
OLD: modules/expenses/infrastructure/persistence/PrismaExpenseRepository.ts
NEW: modules/expenses/infrastructure/adapters/prisma-expense-repository.adapter.ts
```

#### Domain Entity (PascalCase → kebab-case)

```
OLD: modules/expenses/domain/entities/Expense.ts
NEW: modules/expenses/domain/expense.entity.ts
```

#### Domain Event (PascalCase → kebab-case)

```
OLD: modules/expenses/domain/events/ExpenseCreated.ts
NEW: modules/expenses/domain/events/expense-created.event.ts
```

#### Test Suffix Alignment

```
OLD: modules/expenses/application/use-cases/archive-expense.usecase.spec.ts
NEW: modules/expenses/application/use-cases/archive-expense.usecase.test.ts

OLD: modules/expenses/application/use-cases/create-expense.usecase.spec.ts
NEW: modules/expenses/application/use-cases/create-expense.usecase.test.ts
```

### 1.2 Documents Module

#### UseCase Files (PascalCase → kebab-case)

```
OLD: modules/documents/application/use-cases/complete-upload/CompleteUploadUseCase.ts
NEW: modules/documents/application/use-cases/complete-upload/complete-upload.usecase.ts

OLD: modules/documents/application/use-cases/complete-upload/CompleteUploadUseCase.test.ts
NEW: modules/documents/application/use-cases/complete-upload/complete-upload.usecase.test.ts

OLD: modules/documents/application/use-cases/create-upload-intent/CreateUploadIntentUseCase.ts
NEW: modules/documents/application/use-cases/create-upload-intent/create-upload-intent.usecase.ts

OLD: modules/documents/application/use-cases/create-upload-intent/CreateUploadIntentUseCase.test.ts
NEW: modules/documents/application/use-cases/create-upload-intent/create-upload-intent.usecase.test.ts

OLD: modules/documents/application/use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker.ts
NEW: modules/documents/application/use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker.ts

OLD: modules/documents/application/use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker.test.ts
NEW: modules/documents/application/use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker.test.ts

OLD: modules/documents/application/use-cases/get-download-url/GetDownloadUrlUseCase.ts
NEW: modules/documents/application/use-cases/get-download-url/get-download-url.usecase.ts

OLD: modules/documents/application/use-cases/get-download-url/GetDownloadUrlUseCase.test.ts
NEW: modules/documents/application/use-cases/get-download-url/get-download-url.usecase.test.ts

OLD: modules/documents/application/use-cases/link-document/LinkDocumentUseCase.ts
NEW: modules/documents/application/use-cases/link-document/link-document.usecase.ts

OLD: modules/documents/application/use-cases/link-document/LinkDocumentUseCase.test.ts
NEW: modules/documents/application/use-cases/link-document/link-document.usecase.test.ts

OLD: modules/documents/application/use-cases/request-invoice-pdf/RequestInvoicePdfUseCase.ts
NEW: modules/documents/application/use-cases/request-invoice-pdf/request-invoice-pdf.usecase.ts

OLD: modules/documents/application/use-cases/request-invoice-pdf/RequestInvoicePdfUseCase.test.ts
NEW: modules/documents/application/use-cases/request-invoice-pdf/request-invoice-pdf.usecase.test.ts
```

#### Repository Ports (repo → repository)

```
OLD: modules/documents/application/ports/document-repo.port.ts
NEW: modules/documents/application/ports/document-repository.port.ts

OLD: modules/documents/application/ports/file-repo.port.ts
NEW: modules/documents/application/ports/file-repository.port.ts
```

#### Folder Rename (infra → infrastructure)

```
OLD: modules/documents/infra/
NEW: modules/documents/infrastructure/
```

### 1.3 Invoices Module

#### UseCase Files (PascalCase → kebab-case)

```
OLD: modules/invoices/application/use-cases/cancel-invoice/CancelInvoiceUseCase.ts
NEW: modules/invoices/application/use-cases/cancel-invoice/cancel-invoice.usecase.ts

OLD: modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.ts
NEW: modules/invoices/application/use-cases/create-invoice/create-invoice.usecase.ts

OLD: modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.test.ts
NEW: modules/invoices/application/use-cases/create-invoice/create-invoice.usecase.test.ts

OLD: modules/invoices/application/use-cases/finalize-invoice/FinalizeInvoiceUseCase.ts
NEW: modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.ts

OLD: modules/invoices/application/use-cases/finalize-invoice/FinalizeInvoiceUseCase.test.ts
NEW: modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.test.ts

OLD: modules/invoices/application/use-cases/get-invoice-by-id/GetInvoiceByIdUseCase.ts
NEW: modules/invoices/application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase.ts

OLD: modules/invoices/application/use-cases/get-invoice-by-id/GetInvoiceByIdUseCase.test.ts
NEW: modules/invoices/application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase.test.ts

OLD: modules/invoices/application/use-cases/list-invoices/ListInvoicesUseCase.ts
NEW: modules/invoices/application/use-cases/list-invoices/list-invoices.usecase.ts

OLD: modules/invoices/application/use-cases/list-invoices/ListInvoicesUseCase.test.ts
NEW: modules/invoices/application/use-cases/list-invoices/list-invoices.usecase.test.ts

OLD: modules/invoices/application/use-cases/record-payment/RecordPaymentUseCase.ts
NEW: modules/invoices/application/use-cases/record-payment/record-payment.usecase.ts

OLD: modules/invoices/application/use-cases/record-payment/RecordPaymentUseCase.test.ts
NEW: modules/invoices/application/use-cases/record-payment/record-payment.usecase.test.ts

OLD: modules/invoices/application/use-cases/send-invoice/SendInvoiceUseCase.ts
NEW: modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.ts

OLD: modules/invoices/application/use-cases/send-invoice/SendInvoiceUseCase.test.ts
NEW: modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.test.ts

OLD: modules/invoices/application/use-cases/update-invoice/UpdateInvoiceUseCase.ts
NEW: modules/invoices/application/use-cases/update-invoice/update-invoice.usecase.ts

OLD: modules/invoices/application/use-cases/update-invoice/UpdateInvoiceUseCase.test.ts
NEW: modules/invoices/application/use-cases/update-invoice/update-invoice.usecase.test.ts
```

#### Repository Ports (repo → repository)

```
OLD: modules/invoices/application/ports/invoice-repo.port.ts
NEW: modules/invoices/application/ports/invoice-repository.port.ts

OLD: modules/invoices/application/ports/invoice-email-delivery-repo.port.ts
NEW: modules/invoices/application/ports/invoice-email-delivery-repository.port.ts
```

#### Repository Adapter (repo → repository)

```
OLD: modules/invoices/infrastructure/prisma/prisma-invoice-repo.adapter.ts
NEW: modules/invoices/infrastructure/adapters/prisma-invoice-repository.adapter.ts

OLD: modules/invoices/infrastructure/prisma/prisma-invoice-email-delivery.adapter.ts
NEW: modules/invoices/infrastructure/adapters/prisma-invoice-email-delivery-repository.adapter.ts
```

#### Test Suffix Alignment

```
OLD: modules/invoices/http/invoices.controller.test.ts
NEW: (no change - already correct)

OLD: modules/invoices/tools/invoice.tools.test.ts
NEW: modules/invoices/tools/invoice.tool.test.ts

OLD: modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.spec.ts
NEW: modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.test.ts
```

#### Email Adapter Test Suffix

```
OLD: modules/invoices/infrastructure/email/resend-invoice-email-sender.adapter.spec.ts
NEW: modules/invoices/infrastructure/adapters/resend-invoice-email-sender.adapter.test.ts
```

### 1.4 Party-CRM Module

#### UseCase Files (PascalCase → kebab-case)

```
OLD: modules/party-crm/application/use-cases/archive-customer/ArchiveCustomerUseCase.ts
NEW: modules/party-crm/application/use-cases/archive-customer/archive-customer.usecase.ts

OLD: modules/party-crm/application/use-cases/create-customer/CreateCustomerUseCase.ts
NEW: modules/party-crm/application/use-cases/create-customer/create-customer.usecase.ts

OLD: modules/party-crm/application/use-cases/get-customer-by-id/GetCustomerByIdUseCase.ts
NEW: modules/party-crm/application/use-cases/get-customer-by-id/get-customer-by-id.usecase.ts

OLD: modules/party-crm/application/use-cases/list-customers/ListCustomersUseCase.ts
NEW: modules/party-crm/application/use-cases/list-customers/list-customers.usecase.ts

OLD: modules/party-crm/application/use-cases/search-customers/SearchCustomersUseCase.ts
NEW: modules/party-crm/application/use-cases/search-customers/search-customers.usecase.ts

OLD: modules/party-crm/application/use-cases/unarchive-customer/UnarchiveCustomerUseCase.ts
NEW: modules/party-crm/application/use-cases/unarchive-customer/unarchive-customer.usecase.ts

OLD: modules/party-crm/application/use-cases/update-customer/UpdateCustomerUseCase.ts
NEW: modules/party-crm/application/use-cases/update-customer/update-customer.usecase.ts
```

#### Repository Port (repo → repository)

```
OLD: modules/party-crm/application/ports/party-repo.port.ts
NEW: modules/party-crm/application/ports/party-repository.port.ts
```

#### Test Files

```
OLD: modules/party-crm/http/customers.controller.test.ts
NEW: (no change - already correct)

OLD: modules/party-crm/tools/customer.tools.test.ts
NEW: modules/party-crm/tools/customer.tool.test.ts

OLD: modules/party-crm/application/customer.usecases.test.ts
NEW: (no change - already correct)
```

#### Folder Rename (infra → infrastructure)

```
OLD: modules/party-crm/infra/
NEW: modules/party-crm/infrastructure/
```

### 1.5 Privacy Module

#### UseCase Files (PascalCase → kebab-case)

```
OLD: modules/privacy/application/use-cases/get-privacy-request-status/GetPrivacyRequestStatusUseCase.ts
NEW: modules/privacy/application/use-cases/get-privacy-request-status/get-privacy-request-status.usecase.ts

OLD: modules/privacy/application/use-cases/request-account-erasure/RequestAccountErasureUseCase.ts
NEW: modules/privacy/application/use-cases/request-account-erasure/request-account-erasure.usecase.ts

OLD: modules/privacy/application/use-cases/request-personal-data-export/RequestPersonalDataExportUseCase.ts
NEW: modules/privacy/application/use-cases/request-personal-data-export/request-personal-data-export.usecase.ts
```

#### Repository Port (repo → repository)

```
OLD: modules/privacy/application/ports/privacy-request-repo.port.ts
NEW: modules/privacy/application/ports/privacy-request-repository.port.ts
```

#### Test Suffix Alignment

```
OLD: modules/privacy/application/privacy.usecases.spec.ts
NEW: modules/privacy/application/privacy.usecases.test.ts

OLD: modules/privacy/workers/process-privacy-request.handler.spec.ts
NEW: modules/privacy/workers/process-privacy-request.handler.test.ts
```

#### Folder Rename (infra → infrastructure)

```
OLD: modules/privacy/infra/
NEW: modules/privacy/infrastructure/
```

### 1.6 Identity Module

#### Repository Ports (repo → repository)

```
OLD: modules/identity/application/ports/user.repo.port.ts
NEW: modules/identity/application/ports/user-repository.port.ts

OLD: modules/identity/application/ports/membership.repo.port.ts
NEW: modules/identity/application/ports/membership-repository.port.ts

OLD: modules/identity/application/ports/refresh-token.repo.port.ts
NEW: modules/identity/application/ports/refresh-token-repository.port.ts

OLD: modules/identity/application/ports/role.repo.port.ts
NEW: modules/identity/application/ports/role-repository.port.ts

OLD: modules/identity/application/ports/tenant.repo.port.ts
NEW: modules/identity/application/ports/tenant-repository.port.ts
```

#### Repository Adapters (repo → repository)

```
OLD: modules/identity/infrastructure/persistence/PrismaUserRepository.ts
NEW: modules/identity/infrastructure/adapters/prisma-user-repository.adapter.ts

OLD: modules/identity/infrastructure/persistence/prisma.audit.repo.ts
NEW: modules/identity/infrastructure/adapters/prisma-audit-repository.adapter.ts

OLD: modules/identity/infrastructure/persistence/prisma.membership.repo.ts
NEW: modules/identity/infrastructure/adapters/prisma-membership-repository.adapter.ts

OLD: modules/identity/infrastructure/persistence/prisma.refresh-token.repo.ts
NEW: modules/identity/infrastructure/adapters/prisma-refresh-token-repository.adapter.ts

OLD: modules/identity/infrastructure/persistence/prisma.role.repo.ts
NEW: modules/identity/infrastructure/adapters/prisma-role-repository.adapter.ts

OLD: modules/identity/infrastructure/persistence/prisma.tenant.repo.ts
NEW: modules/identity/infrastructure/adapters/prisma-tenant-repository.adapter.ts
```

#### Test Suffix Alignment

```
OLD: modules/identity/application/use-cases/refresh-token.usecase.spec.ts
NEW: modules/identity/application/use-cases/refresh-token.usecase.test.ts

OLD: modules/identity/application/use-cases/sign-in.usecase.spec.ts
NEW: modules/identity/application/use-cases/sign-in.usecase.test.ts

OLD: modules/identity/application/use-cases/sign-out.usecase.spec.ts
NEW: modules/identity/application/use-cases/sign-out.usecase.test.ts

OLD: modules/identity/application/use-cases/sign-up.usecase.spec.ts
NEW: modules/identity/application/use-cases/sign-up.usecase.test.ts
```

### 1.7 AI-Copilot Module

#### Repository Ports (repo → repository)

```
OLD: modules/ai-copilot/application/ports/agent-run.repo.port.ts
NEW: modules/ai-copilot/application/ports/agent-run-repository.port.ts

OLD: modules/ai-copilot/application/ports/message.repo.port.ts
NEW: modules/ai-copilot/application/ports/message-repository.port.ts

OLD: modules/ai-copilot/application/ports/tool-execution.repo.port.ts
NEW: modules/ai-copilot/application/ports/tool-execution-repository.port.ts
```

#### Repository Adapters (repo → repository)

```
OLD: modules/ai-copilot/infrastructure/persistence/prisma.agent-run.repo.ts
NEW: modules/ai-copilot/infrastructure/adapters/prisma-agent-run-repository.adapter.ts

OLD: modules/ai-copilot/infrastructure/persistence/prisma.message.repo.ts
NEW: modules/ai-copilot/infrastructure/adapters/prisma-message-repository.adapter.ts

OLD: modules/ai-copilot/infrastructure/persistence/prisma.tool-execution.repo.ts
NEW: modules/ai-copilot/infrastructure/adapters/prisma-tool-execution-repository.adapter.ts
```

#### Test Suffix Alignment

```
OLD: modules/ai-copilot/ai-copilot.module.spec.ts
NEW: modules/ai-copilot/ai-copilot.module.test.ts
```

### 1.8 Tax Module

#### Repository Ports (repo → repository)

```
OLD: modules/tax/application/ports/tax-code-repo.port.ts
NEW: modules/tax/application/ports/tax-code-repository.port.ts

OLD: modules/tax/application/ports/tax-profile-repo.port.ts
NEW: modules/tax/application/ports/tax-profile-repository.port.ts

OLD: modules/tax/application/ports/tax-rate-repo.port.ts
NEW: modules/tax/application/ports/tax-rate-repository.port.ts

OLD: modules/tax/application/ports/tax-snapshot-repo.port.ts
NEW: modules/tax/application/ports/tax-snapshot-repository.port.ts

OLD: modules/tax/application/ports/vat-report-repo.port.ts
NEW: modules/tax/application/ports/vat-report-repository.port.ts
```

---

## 2. Worker Service Renames (services/worker/src/modules/)

### 2.1 Outbox Module

#### Service Files (PascalCase → kebab-case)

```
OLD: modules/outbox/OutboxPollerService.ts
NEW: modules/outbox/outbox-poller.service.ts
```

### 2.2 Workflow Runner Module

#### Service Files (PascalCase → kebab-case)

```
OLD: modules/workflow-runner/WorkflowRunnerService.ts
NEW: modules/workflow-runner/workflow-runner.service.ts
```

### 2.3 Notifications Module

#### Test Suffix Alignment

```
OLD: modules/notifications/infra/resend/resend-email-sender.adapter.test.ts
NEW: (no change - already correct)

OLD: modules/notifications/infra/resend/resend.adapter.test.ts
NEW: (no change - already correct)
```

#### Folder Rename (infra → infrastructure)

```
OLD: modules/notifications/infra/
NEW: modules/notifications/infrastructure/
```

### 2.4 Invoices Module (Worker)

#### Test Suffix Alignment

```
OLD: modules/invoices/invoice-email-requested.handler.test.ts
NEW: (no change - already correct)
```

---

## 3. Shared Packages Renames (packages/)

### 3.1 packages/domain

#### UseCase Files (PascalCase → kebab-case)

```
OLD: src/customization/use-cases/CreateCustomFieldDefinition.ts
NEW: src/customization/use-cases/create-custom-field-definition.usecase.ts

OLD: src/customization/use-cases/ListCustomFieldDefinitions.ts
NEW: src/customization/use-cases/list-custom-field-definitions.usecase.ts

OLD: src/customization/use-cases/UpdateCustomFieldDefinition.ts
NEW: src/customization/use-cases/update-custom-field-definition.usecase.ts

OLD: src/customization/use-cases/UpsertEntityLayout.ts
NEW: src/customization/use-cases/upsert-entity-layout.usecase.ts
```

### 3.2 packages/data

#### Repository Files (camelCase → kebab-case, repo → repository)

```
OLD: src/repositories/customFieldDefinition.repo.ts
NEW: src/repositories/custom-field-definition-repository.adapter.ts

OLD: src/repositories/customFieldIndex.repo.ts
NEW: src/repositories/custom-field-index-repository.adapter.ts

OLD: src/repositories/entityLayout.repo.ts
NEW: src/repositories/entity-layout-repository.adapter.ts

OLD: src/outbox/outbox.repo.ts
NEW: src/adapters/prisma-outbox-repository.adapter.ts
```

#### Adapter Prefix Consistency (dot → hyphen)

```
OLD: src/adapters/prisma.audit.adapter.ts
NEW: src/adapters/prisma-audit.adapter.ts

OLD: src/adapters/prisma.outbox.adapter.ts
NEW: src/adapters/prisma-outbox.adapter.ts
```

---

## 4. Folder Renames

### infrastructure vs infra

```
OLD: services/api/src/modules/documents/infra/
NEW: services/api/src/modules/documents/infrastructure/

OLD: services/api/src/modules/party-crm/infra/
NEW: services/api/src/modules/party-crm/infrastructure/

OLD: services/api/src/modules/privacy/infra/
NEW: services/api/src/modules/privacy/infrastructure/

OLD: services/worker/src/modules/notifications/infra/
NEW: services/worker/src/modules/notifications/infrastructure/
```

### persistence vs adapters

Many modules use `infrastructure/persistence/` - should standardize to `infrastructure/adapters/`:

```
OLD: modules/*/infrastructure/persistence/
NEW: modules/*/infrastructure/adapters/
```

**Note**: This will be done as part of individual file moves to consolidate structure.

---

## 5. DI Token Renames (Code Changes Only)

These require code changes, not file moves:

```typescript
// In port files, standardize token naming:

OLD: export const USER_REPOSITORY = Symbol("USER_REPOSITORY");
NEW: export const USER_REPOSITORY_TOKEN = Symbol("USER_REPOSITORY_TOKEN");

OLD: export const EXPENSE_REPOSITORY = Symbol("EXPENSE_REPOSITORY");
NEW: export const EXPENSE_REPOSITORY_TOKEN = Symbol("EXPENSE_REPOSITORY_TOKEN");

// Apply pattern: {ENTITY}_{TYPE}_TOKEN
```

All tokens should follow: `{ENTITY}_{TYPE}_TOKEN` pattern.

---

## 6. Import Path Updates

After file renames, all imports must be updated. Pattern:

```typescript
// OLD IMPORTS
import { ExpenseRepositoryPort } from "../ports/ExpenseRepositoryPort";
import { PrismaExpenseRepository } from "../infrastructure/persistence/PrismaExpenseRepository";
import { CreateExpenseUseCase } from "./use-cases/CreateExpenseUseCase";

// NEW IMPORTS
import { ExpenseRepositoryPort } from "../ports/expense-repository.port";
import { PrismaExpenseRepositoryAdapter } from "../infrastructure/adapters/prisma-expense-repository.adapter";
import { CreateExpenseUseCase } from "./use-cases/create-expense.usecase";
```

---

## Summary by Category

| Category                                    | Count | Examples                                                              |
| ------------------------------------------- | ----- | --------------------------------------------------------------------- |
| **PascalCase UseCase fixes**                | 28    | `CreateInvoiceUseCase.ts` → `create-invoice.usecase.ts`               |
| **PascalCase Repository fixes**             | 2     | `PrismaExpenseRepository.ts` → `prisma-expense-repository.adapter.ts` |
| **PascalCase Service fixes**                | 2     | `OutboxPollerService.ts` → `outbox-poller.service.ts`                 |
| **PascalCase Entity fixes**                 | 2     | `Expense.ts` → `expense.entity.ts`                                    |
| **repo → repository (ports)**               | 20+   | `invoice-repo.port.ts` → `invoice-repository.port.ts`                 |
| **repo → repository (adapters)**            | 15+   | `prisma.audit.repo.ts` → `prisma-audit-repository.adapter.ts`         |
| **Test suffix (.spec → .test)**             | 12    | `sign-in.usecase.spec.ts` → `sign-in.usecase.test.ts`                 |
| **Folder renames (infra → infrastructure)** | 4     | `documents/infra/` → `documents/infrastructure/`                      |
| **Adapter prefix consistency**              | 5+    | `prisma.audit.adapter.ts` → `prisma-audit.adapter.ts`                 |

**Total estimated renames:** ~85 files + 4 folders

---

## Execution Order

1. **Folder renames first** (git mv for folders)
2. **File renames within each module** (git mv for each file)
3. **Update all imports** (find-and-replace, automated script)
4. **Update NestJS provider registrations** (manual review)
5. **Update barrel exports (index.ts files)** (manual review)
6. **Validate**: `pnpm -r typecheck && pnpm -r lint && pnpm -r test`

---

**Next Step:** Execute renames systematically using `git mv` to preserve file history.
