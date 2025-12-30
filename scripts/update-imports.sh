#!/bin/bash
# Import path updater for Corely naming refactor
# Uses sed for find-and-replace across all TypeScript files

set -e

BASE_DIR="d:/Working/Corely"
cd "$BASE_DIR"

echo "Starting import path updates..."
echo "=============================================="

# Function to replace imports across all TS files
replace_import() {
    local old_pattern="$1"
    local new_pattern="$2"
    local description="$3"

    echo "Replacing: $description"

    # Use git grep to find files, then sed to replace
    git grep -l "$old_pattern" -- '*.ts' '*.tsx' 2>/dev/null | while read -r file; do
        sed -i "s|$old_pattern|$new_pattern|g" "$file"
    done
}

# ==========================================
# EXPENSES MODULE
# ==========================================
echo ""
echo "1. Updating Expenses module imports..."
replace_import '/ArchiveExpenseUseCase' '/archive-expense.usecase' "ArchiveExpenseUseCase"
replace_import '/CreateExpenseUseCase' '/create-expense.usecase' "CreateExpenseUseCase"
replace_import '/UnarchiveExpenseUseCase' '/unarchive-expense.usecase' "UnarchiveExpenseUseCase"
replace_import '/ExpenseRepositoryPort' '/expense-repository.port' "ExpenseRepositoryPort"
replace_import '/persistence/PrismaExpenseRepository' '/adapters/prisma-expense-repository.adapter' "PrismaExpenseRepository"
replace_import '/entities/Expense' '/expense.entity' "Expense entity"
replace_import '/events/ExpenseCreated' '/events/expense-created.event' "ExpenseCreated event"

# ==========================================
# DOCUMENTS MODULE
# ==========================================
echo "2. Updating Documents module imports..."
replace_import '/CompleteUploadUseCase' '/complete-upload.usecase' "CompleteUploadUseCase"
replace_import '/CreateUploadIntentUseCase' '/create-upload-intent.usecase' "CreateUploadIntentUseCase"
replace_import '/GenerateInvoicePdfWorker' '/generate-invoice-pdf.worker' "GenerateInvoicePdfWorker"
replace_import '/GetDownloadUrlUseCase' '/get-download-url.usecase' "GetDownloadUrlUseCase"
replace_import '/LinkDocumentUseCase' '/link-document.usecase' "LinkDocumentUseCase"
replace_import '/RequestInvoicePdfUseCase' '/request-invoice-pdf.usecase' "RequestInvoicePdfUseCase"
replace_import '/document-repo\.port' '/document-repository.port' "document-repo.port"
replace_import '/file-repo\.port' '/file-repository.port' "file-repo.port"

# ==========================================
# INVOICES MODULE
# ==========================================
echo "3. Updating Invoices module imports..."
replace_import '/CancelInvoiceUseCase' '/cancel-invoice.usecase' "CancelInvoiceUseCase"
replace_import '/CreateInvoiceUseCase' '/create-invoice.usecase' "CreateInvoiceUseCase"
replace_import '/FinalizeInvoiceUseCase' '/finalize-invoice.usecase' "FinalizeInvoiceUseCase"
replace_import '/GetInvoiceByIdUseCase' '/get-invoice-by-id.usecase' "GetInvoiceByIdUseCase"
replace_import '/ListInvoicesUseCase' '/list-invoices.usecase' "ListInvoicesUseCase"
replace_import '/RecordPaymentUseCase' '/record-payment.usecase' "RecordPaymentUseCase"
replace_import '/SendInvoiceUseCase' '/send-invoice.usecase' "SendInvoiceUseCase"
replace_import '/UpdateInvoiceUseCase' '/update-invoice.usecase' "UpdateInvoiceUseCase"
replace_import '/invoice-repo\.port' '/invoice-repository.port' "invoice-repo.port"
replace_import '/invoice-email-delivery-repo\.port' '/invoice-email-delivery-repository.port' "invoice-email-delivery-repo.port"
replace_import '/prisma/prisma-invoice-repo\.adapter' '/adapters/prisma-invoice-repository.adapter' "prisma-invoice-repo.adapter"

# ==========================================
# PARTY-CRM MODULE
# ==========================================
echo "4. Updating Party-CRM module imports..."
replace_import '/ArchiveCustomerUseCase' '/archive-customer.usecase' "ArchiveCustomerUseCase"
replace_import '/CreateCustomerUseCase' '/create-customer.usecase' "CreateCustomerUseCase"
replace_import '/GetCustomerByIdUseCase' '/get-customer-by-id.usecase' "GetCustomerByIdUseCase"
replace_import '/ListCustomersUseCase' '/list-customers.usecase' "ListCustomersUseCase"
replace_import '/SearchCustomersUseCase' '/search-customers.usecase' "SearchCustomersUseCase"
replace_import '/UnarchiveCustomerUseCase' '/unarchive-customer.usecase' "UnarchiveCustomerUseCase"
replace_import '/UpdateCustomerUseCase' '/update-customer.usecase' "UpdateCustomerUseCase"
replace_import '/party-repo\.port' '/party-repository.port' "party-repo.port"

# ==========================================
# PRIVACY MODULE
# ==========================================
echo "5. Updating Privacy module imports..."
replace_import '/GetPrivacyRequestStatusUseCase' '/get-privacy-request-status.usecase' "GetPrivacyRequestStatusUseCase"
replace_import '/RequestAccountErasureUseCase' '/request-account-erasure.usecase' "RequestAccountErasureUseCase"
replace_import '/RequestPersonalDataExportUseCase' '/request-personal-data-export.usecase' "RequestPersonalDataExportUseCase"
replace_import '/privacy-request-repo\.port' '/privacy-request-repository.port' "privacy-request-repo.port"

# ==========================================
# IDENTITY MODULE
# ==========================================
echo "6. Updating Identity module imports..."
replace_import '/user\.repo\.port' '/user-repository.port' "user.repo.port"
replace_import '/membership\.repo\.port' '/membership-repository.port' "membership.repo.port"
replace_import '/refresh-token\.repo\.port' '/refresh-token-repository.port' "refresh-token.repo.port"
replace_import '/role\.repo\.port' '/role-repository.port' "role.repo.port"
replace_import '/tenant\.repo\.port' '/tenant-repository.port' "tenant.repo.port"
replace_import '/persistence/PrismaUserRepository' '/adapters/prisma-user-repository.adapter' "PrismaUserRepository"
replace_import '/persistence/prisma\.audit\.repo' '/adapters/prisma-audit-repository.adapter' "prisma.audit.repo"
replace_import '/persistence/prisma\.membership\.repo' '/adapters/prisma-membership-repository.adapter' "prisma.membership.repo"
replace_import '/persistence/prisma\.refresh-token\.repo' '/adapters/prisma-refresh-token-repository.adapter' "prisma.refresh-token.repo"
replace_import '/persistence/prisma\.role\.repo' '/adapters/prisma-role-repository.adapter' "prisma.role.repo"
replace_import '/persistence/prisma\.tenant\.repo' '/adapters/prisma-tenant-repository.adapter' "prisma.tenant.repo"

# ==========================================
# AI-COPILOT MODULE
# ==========================================
echo "7. Updating AI-Copilot module imports..."
replace_import '/agent-run\.repo\.port' '/agent-run-repository.port' "agent-run.repo.port"
replace_import '/message\.repo\.port' '/message-repository.port' "message.repo.port"
replace_import '/tool-execution\.repo\.port' '/tool-execution-repository.port' "tool-execution.repo.port"
replace_import '/persistence/prisma\.agent-run\.repo' '/adapters/prisma-agent-run-repository.adapter' "prisma.agent-run.repo"
replace_import '/persistence/prisma\.message\.repo' '/adapters/prisma-message-repository.adapter' "prisma.message.repo"
replace_import '/persistence/prisma\.tool-execution\.repo' '/adapters/prisma-tool-execution-repository.adapter' "prisma.tool-execution.repo"

# ==========================================
# TAX MODULE
# ==========================================
echo "8. Updating Tax module imports..."
replace_import '/tax-code-repo\.port' '/tax-code-repository.port' "tax-code-repo.port"
replace_import '/tax-profile-repo\.port' '/tax-profile-repository.port' "tax-profile-repo.port"
replace_import '/tax-rate-repo\.port' '/tax-rate-repository.port' "tax-rate-repo.port"
replace_import '/tax-snapshot-repo\.port' '/tax-snapshot-repository.port' "tax-snapshot-repo.port"
replace_import '/vat-report-repo\.port' '/vat-report-repository.port' "vat-report-repo.port"

# ==========================================
# WORKER SERVICE
# ==========================================
echo "9. Updating Worker service imports..."
replace_import '/OutboxPollerService' '/outbox-poller.service' "OutboxPollerService"
replace_import '/WorkflowRunnerService' '/workflow-runner.service' "WorkflowRunnerService"

# ==========================================
# SHARED PACKAGES
# ==========================================
echo "10. Updating Shared packages imports..."
replace_import '/CreateCustomFieldDefinition' '/create-custom-field-definition.usecase' "CreateCustomFieldDefinition"
replace_import '/ListCustomFieldDefinitions' '/list-custom-field-definitions.usecase' "ListCustomFieldDefinitions"
replace_import '/UpdateCustomFieldDefinition' '/update-custom-field-definition.usecase' "UpdateCustomFieldDefinition"
replace_import '/UpsertEntityLayout' '/upsert-entity-layout.usecase' "UpsertEntityLayout"
replace_import '/repositories/customFieldDefinition\.repo' '/adapters/prisma-custom-field-definition-repository.adapter' "customFieldDefinition.repo"
replace_import '/repositories/customFieldIndex\.repo' '/adapters/prisma-custom-field-index-repository.adapter' "customFieldIndex.repo"
replace_import '/repositories/entityLayout\.repo' '/adapters/prisma-entity-layout-repository.adapter' "entityLayout.repo"
replace_import '/outbox/outbox\.repo' '/adapters/prisma-outbox-repository.adapter' "outbox.repo"

echo ""
echo "=============================================="
echo "Import path updates complete!"
echo "=============================================="
echo ""
echo "Next: Run type-checking to find any remaining issues"
