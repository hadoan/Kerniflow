#!/bin/bash
# Automated file renaming script for Corely naming conventions refactor
# This script uses git mv to preserve file history

set -e  # Exit on error

BASE_DIR="d:/Working/Corely"
cd "$BASE_DIR"

echo "Starting Corely naming conventions refactor..."
echo "=============================================="

# Function to safely git mv (only if source exists)
safe_git_mv() {
    local src="$1"
    local dest="$2"

    if [ -f "$src" ]; then
        # Create destination directory if needed
        mkdir -p "$(dirname "$dest")"
        git mv "$src" "$dest"
        echo "✓ Renamed: $src -> $dest"
    else
        echo "⊘ Skipped (not found): $src"
    fi
}

# ============================================
# 1. EXPENSES MODULE
# ============================================
echo ""
echo "1. Refactoring Expenses Module..."
echo "-----------------------------------"

# UseCases already renamed above, continuing with others

# Domain files already renamed above

# Test files already renamed above

# ============================================
# 2. DOCUMENTS MODULE
# ============================================
echo ""
echo "2. Refactoring Documents Module..."
echo "-----------------------------------"

# UseCase files
safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/complete-upload/CompleteUploadUseCase.ts" \
    "services/api/src/modules/documents/application/use-cases/complete-upload/complete-upload.usecase.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/complete-upload/CompleteUploadUseCase.test.ts" \
    "services/api/src/modules/documents/application/use-cases/complete-upload/complete-upload.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/create-upload-intent/CreateUploadIntentUseCase.ts" \
    "services/api/src/modules/documents/application/use-cases/create-upload-intent/create-upload-intent.usecase.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/create-upload-intent/CreateUploadIntentUseCase.test.ts" \
    "services/api/src/modules/documents/application/use-cases/create-upload-intent/create-upload-intent.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker.ts" \
    "services/api/src/modules/documents/application/use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker.test.ts" \
    "services/api/src/modules/documents/application/use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker.test.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/get-download-url/GetDownloadUrlUseCase.ts" \
    "services/api/src/modules/documents/application/use-cases/get-download-url/get-download-url.usecase.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/get-download-url/GetDownloadUrlUseCase.test.ts" \
    "services/api/src/modules/documents/application/use-cases/get-download-url/get-download-url.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/link-document/LinkDocumentUseCase.ts" \
    "services/api/src/modules/documents/application/use-cases/link-document/link-document.usecase.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/link-document/LinkDocumentUseCase.test.ts" \
    "services/api/src/modules/documents/application/use-cases/link-document/link-document.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/request-invoice-pdf/RequestInvoicePdfUseCase.ts" \
    "services/api/src/modules/documents/application/use-cases/request-invoice-pdf/request-invoice-pdf.usecase.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/use-cases/request-invoice-pdf/RequestInvoicePdfUseCase.test.ts" \
    "services/api/src/modules/documents/application/use-cases/request-invoice-pdf/request-invoice-pdf.usecase.test.ts"

# Repository ports
safe_git_mv \
    "services/api/src/modules/documents/application/ports/document-repo.port.ts" \
    "services/api/src/modules/documents/application/ports/document-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/documents/application/ports/file-repo.port.ts" \
    "services/api/src/modules/documents/application/ports/file-repository.port.ts"

# Rename infra -> infrastructure folder
if [ -d "services/api/src/modules/documents/infra" ]; then
    git mv "services/api/src/modules/documents/infra" "services/api/src/modules/documents/infrastructure"
    echo "✓ Renamed folder: documents/infra -> documents/infrastructure"
fi

# ============================================
# 3. INVOICES MODULE
# ============================================
echo ""
echo "3. Refactoring Invoices Module..."
echo "-----------------------------------"

# UseCase files
safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/cancel-invoice/CancelInvoiceUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/cancel-invoice/cancel-invoice.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/create-invoice/create-invoice.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/create-invoice/CreateInvoiceUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/create-invoice/create-invoice.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/finalize-invoice/FinalizeInvoiceUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/finalize-invoice/FinalizeInvoiceUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/finalize-invoice/finalize-invoice.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/get-invoice-by-id/GetInvoiceByIdUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/get-invoice-by-id/GetInvoiceByIdUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/get-invoice-by-id/get-invoice-by-id.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/list-invoices/ListInvoicesUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/list-invoices/list-invoices.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/list-invoices/ListInvoicesUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/list-invoices/list-invoices.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/record-payment/RecordPaymentUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/record-payment/record-payment.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/record-payment/RecordPaymentUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/record-payment/record-payment.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/send-invoice/SendInvoiceUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/send-invoice/SendInvoiceUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/update-invoice/UpdateInvoiceUseCase.ts" \
    "services/api/src/modules/invoices/application/use-cases/update-invoice/update-invoice.usecase.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/update-invoice/UpdateInvoiceUseCase.test.ts" \
    "services/api/src/modules/invoices/application/use-cases/update-invoice/update-invoice.usecase.test.ts"

# Repository ports
safe_git_mv \
    "services/api/src/modules/invoices/application/ports/invoice-repo.port.ts" \
    "services/api/src/modules/invoices/application/ports/invoice-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/ports/invoice-email-delivery-repo.port.ts" \
    "services/api/src/modules/invoices/application/ports/invoice-email-delivery-repository.port.ts"

# Repository adapters - need to create adapters folder and move from prisma/
if [ -d "services/api/src/modules/invoices/infrastructure/prisma" ]; then
    mkdir -p "services/api/src/modules/invoices/infrastructure/adapters"

    safe_git_mv \
        "services/api/src/modules/invoices/infrastructure/prisma/prisma-invoice-repo.adapter.ts" \
        "services/api/src/modules/invoices/infrastructure/adapters/prisma-invoice-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/invoices/infrastructure/prisma/prisma-invoice-email-delivery.adapter.ts" \
        "services/api/src/modules/invoices/infrastructure/adapters/prisma-invoice-email-delivery-repository.adapter.ts"
fi

# Test file renames
safe_git_mv \
    "services/api/src/modules/invoices/tools/invoice.tools.test.ts" \
    "services/api/src/modules/invoices/tools/invoice.tool.test.ts"

safe_git_mv \
    "services/api/src/modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.spec.ts" \
    "services/api/src/modules/invoices/application/use-cases/send-invoice/send-invoice.usecase.test.ts"

# Email adapter
if [ -d "services/api/src/modules/invoices/infrastructure/email" ]; then
    mkdir -p "services/api/src/modules/invoices/infrastructure/adapters"

    safe_git_mv \
        "services/api/src/modules/invoices/infrastructure/email/resend-invoice-email-sender.adapter.spec.ts" \
        "services/api/src/modules/invoices/infrastructure/adapters/resend-invoice-email-sender.adapter.test.ts"

    safe_git_mv \
        "services/api/src/modules/invoices/infrastructure/email/resend-invoice-email-sender.adapter.ts" \
        "services/api/src/modules/invoices/infrastructure/adapters/resend-invoice-email-sender.adapter.ts"
fi

# ============================================
# 4. PARTY-CRM MODULE
# ============================================
echo ""
echo "4. Refactoring Party-CRM Module..."
echo "-----------------------------------"

# UseCase files
safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/archive-customer/ArchiveCustomerUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/archive-customer/archive-customer.usecase.ts"

safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/create-customer/CreateCustomerUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/create-customer/create-customer.usecase.ts"

safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/get-customer-by-id/GetCustomerByIdUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/get-customer-by-id/get-customer-by-id.usecase.ts"

safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/list-customers/ListCustomersUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/list-customers/list-customers.usecase.ts"

safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/search-customers/SearchCustomersUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/search-customers/search-customers.usecase.ts"

safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/unarchive-customer/UnarchiveCustomerUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/unarchive-customer/unarchive-customer.usecase.ts"

safe_git_mv \
    "services/api/src/modules/party-crm/application/use-cases/update-customer/UpdateCustomerUseCase.ts" \
    "services/api/src/modules/party-crm/application/use-cases/update-customer/update-customer.usecase.ts"

# Repository port
safe_git_mv \
    "services/api/src/modules/party-crm/application/ports/party-repo.port.ts" \
    "services/api/src/modules/party-crm/application/ports/party-repository.port.ts"

# Test files
safe_git_mv \
    "services/api/src/modules/party-crm/tools/customer.tools.test.ts" \
    "services/api/src/modules/party-crm/tools/customer.tool.test.ts"

# Rename infra -> infrastructure folder
if [ -d "services/api/src/modules/party-crm/infra" ]; then
    git mv "services/api/src/modules/party-crm/infra" "services/api/src/modules/party-crm/infrastructure"
    echo "✓ Renamed folder: party-crm/infra -> party-crm/infrastructure"
fi

# ============================================
# 5. PRIVACY MODULE
# ============================================
echo ""
echo "5. Refactoring Privacy Module..."
echo "-----------------------------------"

# UseCase files
safe_git_mv \
    "services/api/src/modules/privacy/application/use-cases/get-privacy-request-status/GetPrivacyRequestStatusUseCase.ts" \
    "services/api/src/modules/privacy/application/use-cases/get-privacy-request-status/get-privacy-request-status.usecase.ts"

safe_git_mv \
    "services/api/src/modules/privacy/application/use-cases/request-account-erasure/RequestAccountErasureUseCase.ts" \
    "services/api/src/modules/privacy/application/use-cases/request-account-erasure/request-account-erasure.usecase.ts"

safe_git_mv \
    "services/api/src/modules/privacy/application/use-cases/request-personal-data-export/RequestPersonalDataExportUseCase.ts" \
    "services/api/src/modules/privacy/application/use-cases/request-personal-data-export/request-personal-data-export.usecase.ts"

# Repository port
safe_git_mv \
    "services/api/src/modules/privacy/application/ports/privacy-request-repo.port.ts" \
    "services/api/src/modules/privacy/application/ports/privacy-request-repository.port.ts"

# Test files
safe_git_mv \
    "services/api/src/modules/privacy/application/privacy.usecases.spec.ts" \
    "services/api/src/modules/privacy/application/privacy.usecases.test.ts"

safe_git_mv \
    "services/api/src/modules/privacy/workers/process-privacy-request.handler.spec.ts" \
    "services/api/src/modules/privacy/workers/process-privacy-request.handler.test.ts"

# Rename infra -> infrastructure folder
if [ -d "services/api/src/modules/privacy/infra" ]; then
    git mv "services/api/src/modules/privacy/infra" "services/api/src/modules/privacy/infrastructure"
    echo "✓ Renamed folder: privacy/infra -> privacy/infrastructure"
fi

# ============================================
# 6. IDENTITY MODULE
# ============================================
echo ""
echo "6. Refactoring Identity Module..."
echo "-----------------------------------"

# Repository ports
safe_git_mv \
    "services/api/src/modules/identity/application/ports/user.repo.port.ts" \
    "services/api/src/modules/identity/application/ports/user-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/ports/membership.repo.port.ts" \
    "services/api/src/modules/identity/application/ports/membership-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/ports/refresh-token.repo.port.ts" \
    "services/api/src/modules/identity/application/ports/refresh-token-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/ports/role.repo.port.ts" \
    "services/api/src/modules/identity/application/ports/role-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/ports/tenant.repo.port.ts" \
    "services/api/src/modules/identity/application/ports/tenant-repository.port.ts"

# Repository adapters - create adapters folder
if [ -d "services/api/src/modules/identity/infrastructure/persistence" ]; then
    mkdir -p "services/api/src/modules/identity/infrastructure/adapters"

    safe_git_mv \
        "services/api/src/modules/identity/infrastructure/persistence/PrismaUserRepository.ts" \
        "services/api/src/modules/identity/infrastructure/adapters/prisma-user-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/identity/infrastructure/persistence/prisma.audit.repo.ts" \
        "services/api/src/modules/identity/infrastructure/adapters/prisma-audit-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/identity/infrastructure/persistence/prisma.membership.repo.ts" \
        "services/api/src/modules/identity/infrastructure/adapters/prisma-membership-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/identity/infrastructure/persistence/prisma.refresh-token.repo.ts" \
        "services/api/src/modules/identity/infrastructure/adapters/prisma-refresh-token-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/identity/infrastructure/persistence/prisma.role.repo.ts" \
        "services/api/src/modules/identity/infrastructure/adapters/prisma-role-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/identity/infrastructure/persistence/prisma.tenant.repo.ts" \
        "services/api/src/modules/identity/infrastructure/adapters/prisma-tenant-repository.adapter.ts"
fi

# Test files
safe_git_mv \
    "services/api/src/modules/identity/application/use-cases/refresh-token.usecase.spec.ts" \
    "services/api/src/modules/identity/application/use-cases/refresh-token.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/use-cases/sign-in.usecase.spec.ts" \
    "services/api/src/modules/identity/application/use-cases/sign-in.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/use-cases/sign-out.usecase.spec.ts" \
    "services/api/src/modules/identity/application/use-cases/sign-out.usecase.test.ts"

safe_git_mv \
    "services/api/src/modules/identity/application/use-cases/sign-up.usecase.spec.ts" \
    "services/api/src/modules/identity/application/use-cases/sign-up.usecase.test.ts"

# ============================================
# 7. AI-COPILOT MODULE
# ============================================
echo ""
echo "7. Refactoring AI-Copilot Module..."
echo "-----------------------------------"

# Repository ports
safe_git_mv \
    "services/api/src/modules/ai-copilot/application/ports/agent-run.repo.port.ts" \
    "services/api/src/modules/ai-copilot/application/ports/agent-run-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/ai-copilot/application/ports/message.repo.port.ts" \
    "services/api/src/modules/ai-copilot/application/ports/message-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/ai-copilot/application/ports/tool-execution.repo.port.ts" \
    "services/api/src/modules/ai-copilot/application/ports/tool-execution-repository.port.ts"

# Repository adapters
if [ -d "services/api/src/modules/ai-copilot/infrastructure/persistence" ]; then
    mkdir -p "services/api/src/modules/ai-copilot/infrastructure/adapters"

    safe_git_mv \
        "services/api/src/modules/ai-copilot/infrastructure/persistence/prisma.agent-run.repo.ts" \
        "services/api/src/modules/ai-copilot/infrastructure/adapters/prisma-agent-run-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/ai-copilot/infrastructure/persistence/prisma.message.repo.ts" \
        "services/api/src/modules/ai-copilot/infrastructure/adapters/prisma-message-repository.adapter.ts"

    safe_git_mv \
        "services/api/src/modules/ai-copilot/infrastructure/persistence/prisma.tool-execution.repo.ts" \
        "services/api/src/modules/ai-copilot/infrastructure/adapters/prisma-tool-execution-repository.adapter.ts"
fi

# Test files
safe_git_mv \
    "services/api/src/modules/ai-copilot/ai-copilot.module.spec.ts" \
    "services/api/src/modules/ai-copilot/ai-copilot.module.test.ts"

# ============================================
# 8. TAX MODULE
# ============================================
echo ""
echo "8. Refactoring Tax Module..."
echo "-----------------------------------"

# Repository ports
safe_git_mv \
    "services/api/src/modules/tax/application/ports/tax-code-repo.port.ts" \
    "services/api/src/modules/tax/application/ports/tax-code-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/tax/application/ports/tax-profile-repo.port.ts" \
    "services/api/src/modules/tax/application/ports/tax-profile-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/tax/application/ports/tax-rate-repo.port.ts" \
    "services/api/src/modules/tax/application/ports/tax-rate-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/tax/application/ports/tax-snapshot-repo.port.ts" \
    "services/api/src/modules/tax/application/ports/tax-snapshot-repository.port.ts"

safe_git_mv \
    "services/api/src/modules/tax/application/ports/vat-report-repo.port.ts" \
    "services/api/src/modules/tax/application/ports/vat-report-repository.port.ts"

# ============================================
# 9. WORKER SERVICE
# ============================================
echo ""
echo "9. Refactoring Worker Service..."
echo "-----------------------------------"

# Service files
safe_git_mv \
    "services/worker/src/modules/outbox/OutboxPollerService.ts" \
    "services/worker/src/modules/outbox/outbox-poller.service.ts"

safe_git_mv \
    "services/worker/src/modules/workflow-runner/WorkflowRunnerService.ts" \
    "services/worker/src/modules/workflow-runner/workflow-runner.service.ts"

# Rename infra -> infrastructure folder
if [ -d "services/worker/src/modules/notifications/infra" ]; then
    git mv "services/worker/src/modules/notifications/infra" "services/worker/src/modules/notifications/infrastructure"
    echo "✓ Renamed folder: worker notifications/infra -> notifications/infrastructure"
fi

# ============================================
# 10. SHARED PACKAGES
# ============================================
echo ""
echo "10. Refactoring Shared Packages..."
echo "-----------------------------------"

# packages/domain - UseCase files
safe_git_mv \
    "packages/domain/src/customization/use-cases/CreateCustomFieldDefinition.ts" \
    "packages/domain/src/customization/use-cases/create-custom-field-definition.usecase.ts"

safe_git_mv \
    "packages/domain/src/customization/use-cases/ListCustomFieldDefinitions.ts" \
    "packages/domain/src/customization/use-cases/list-custom-field-definitions.usecase.ts"

safe_git_mv \
    "packages/domain/src/customization/use-cases/UpdateCustomFieldDefinition.ts" \
    "packages/domain/src/customization/use-cases/update-custom-field-definition.usecase.ts"

safe_git_mv \
    "packages/domain/src/customization/use-cases/UpsertEntityLayout.ts" \
    "packages/domain/src/customization/use-cases/upsert-entity-layout.usecase.ts"

# packages/data - Repository files
safe_git_mv \
    "packages/data/src/repositories/customFieldDefinition.repo.ts" \
    "packages/data/src/adapters/prisma-custom-field-definition-repository.adapter.ts"

safe_git_mv \
    "packages/data/src/repositories/customFieldIndex.repo.ts" \
    "packages/data/src/adapters/prisma-custom-field-index-repository.adapter.ts"

safe_git_mv \
    "packages/data/src/repositories/entityLayout.repo.ts" \
    "packages/data/src/adapters/prisma-entity-layout-repository.adapter.ts"

safe_git_mv \
    "packages/data/src/outbox/outbox.repo.ts" \
    "packages/data/src/adapters/prisma-outbox-repository.adapter.ts"

# Adapter naming consistency (dot -> hyphen)
safe_git_mv \
    "packages/data/src/adapters/prisma.audit.adapter.ts" \
    "packages/data/src/adapters/prisma-audit.adapter.ts"

safe_git_mv \
    "packages/data/src/adapters/prisma.outbox.adapter.ts" \
    "packages/data/src/adapters/prisma-outbox.adapter.ts"

echo ""
echo "============================================"
echo "File rename phase complete!"
echo "============================================"
echo ""
echo "Next steps:"
echo "1. Update all imports (will be done in next phase)"
echo "2. Update NestJS module providers"
echo "3. Run type-checking and tests"
echo ""
