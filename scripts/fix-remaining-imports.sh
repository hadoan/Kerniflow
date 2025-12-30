#!/bin/bash
# Fix remaining import issues after initial rename

set -e

BASE_DIR="d:/Working/Corely"
cd "$BASE_DIR"

echo "Fixing remaining import path issues..."
echo "=============================================="

# Function to replace all occurrences in TypeScript files
fix_path() {
    local old_pattern="$1"
    local new_pattern="$2"
    local description="$3"

    echo "Fixing: $description"
    find services packages apps -name "*.ts" -type f -exec sed -i "s|$old_pattern|$new_pattern|g" {} + 2>/dev/null || true
}

# Fix Documents module - infra to infrastructure
fix_path "'./infra/" "'./infrastructure/" "Documents infra -> infrastructure paths"
fix_path '"\./infra/' '"\./infrastructure/' "Documents infra -> infrastructure paths (double quotes)"
fix_path "'../../infra/" "'../../infrastructure/" "Documents infra -> infrastructure (relative)"
fix_path '"\.\./\.\./infra/' '"\.\./\.\./infrastructure/' "Documents infra -> infrastructure (relative, double quotes)"

# Fix test imports that still reference old PascalCase names
fix_path "from './CompleteUploadUseCase'" "from './complete-upload.usecase'" "CompleteUploadUseCase test import"
fix_path "from './CreateUploadIntentUseCase'" "from './create-upload-intent.usecase'" "CreateUploadIntentUseCase test import"
fix_path "from './GenerateInvoicePdfWorker'" "from './generate-invoice-pdf.worker'" "GenerateInvoicePdfWorker test import"
fix_path "from './GetDownloadUrlUseCase'" "from './get-download-url.usecase'" "GetDownloadUrlUseCase test import"
fix_path "from './LinkDocumentUseCase'" "from './link-document.usecase'" "LinkDocumentUseCase test import"
fix_path "from './RequestInvoicePdfUseCase'" "from './request-invoice-pdf.usecase'" "RequestInvoicePdfUseCase test import"

# Fix cross-folder PascalCase imports
fix_path "from '../use-cases/CreateExpenseUseCase'" "from '../use-cases/create-expense.usecase'" "CreateExpenseUseCase cross-folder"
fix_path "from '../../application/use-cases/CreateExpenseUseCase'" "from '../../application/use-cases/create-expense.usecase'" "CreateExpenseUseCase from controller"
fix_path "from '../../application/use-cases/ArchiveExpenseUseCase'" "from '../../application/use-cases/archive-expense.usecase'" "ArchiveExpenseUseCase from controller"
fix_path "from '../../application/use-cases/UnarchiveExpenseUseCase'" "from '../../application/use-cases/unarchive-expense.usecase'" "UnarchiveExpenseUseCase from controller"

# Fix infrastructure/persistence -> infrastructure/adapters
fix_path "'../infrastructure/persistence/PrismaExpenseRepository'" "'../infrastructure/adapters/prisma-expense-repository.adapter'" "PrismaExpenseRepository from tests"
fix_path "'../../infrastructure/persistence/PrismaExpenseRepository'" "'../../infrastructure/adapters/prisma-expense-repository.adapter'" "PrismaExpenseRepository relative"
fix_path "'./infrastructure/persistence/PrismaExpenseRepository'" "'./infrastructure/adapters/prisma-expense-repository.adapter'" "PrismaExpenseRepository same level"

# Fix Documents application imports
fix_path "from './use-cases/complete-upload/CompleteUploadUseCase'" "from './use-cases/complete-upload/complete-upload.usecase'" "Documents CompleteUploadUseCase"
fix_path "from './use-cases/create-upload-intent/CreateUploadIntentUseCase'" "from './use-cases/create-upload-intent/create-upload-intent.usecase'" "Documents CreateUploadIntentUseCase"
fix_path "from './use-cases/get-download-url/GetDownloadUrlUseCase'" "from './use-cases/get-download-url/get-download-url.usecase'" "Documents GetDownloadUrlUseCase"
fix_path "from './use-cases/link-document/LinkDocumentUseCase'" "from './use-cases/link-document/link-document.usecase'" "Documents LinkDocumentUseCase"
fix_path "from './use-cases/request-invoice-pdf/RequestInvoicePdfUseCase'" "from './use-cases/request-invoice-pdf/request-invoice-pdf.usecase'" "Documents RequestInvoicePdfUseCase"
fix_path "from './use-cases/generate-invoice-pdf-worker/GenerateInvoicePdfWorker'" "from './use-cases/generate-invoice-pdf-worker/generate-invoice-pdf.worker'" "Documents GenerateInvoicePdfWorker"

# Fix cross-use-case imports in Documents
fix_path "from '../complete-upload/CompleteUploadUseCase'" "from '../complete-upload/complete-upload.usecase'" "CompleteUploadUseCase cross-usecase"

# Fix AI-Copilot imports (these files don't exist - need to check if they were renamed)
# These are still using old paths - fix to new paths
fix_path "from '../infrastructure/persistence/prisma.agent-run.repo'" "from '../infrastructure/adapters/prisma-agent-run-repository.adapter'" "AI-Copilot agent-run repo"
fix_path "from '../infrastructure/persistence/prisma.message.repo'" "from '../infrastructure/adapters/prisma-message-repository.adapter'" "AI-Copilot message repo"
fix_path "from '../infrastructure/persistence/prisma.tool-execution.repo'" "from '../infrastructure/adapters/prisma-tool-execution-repository.adapter'" "AI-Copilot tool-execution repo"

fix_path "from './infrastructure/persistence/prisma.agent-run.repo'" "from './infrastructure/adapters/prisma-agent-run-repository.adapter'" "AI-Copilot agent-run repo (module level)"
fix_path "from './infrastructure/persistence/prisma.message.repo'" "from './infrastructure/adapters/prisma-message-repository.adapter'" "AI-Copilot message repo (module level)"
fix_path "from './infrastructure/persistence/prisma.tool-execution.repo'" "from './infrastructure/adapters/prisma-tool-execution-repository.adapter'" "AI-Copilot tool-execution repo (module level)"

# Fix port imports
fix_path "from '../ports/agent-run.repo.port'" "from '../ports/agent-run-repository.port'" "agent-run port"
fix_path "from '../ports/message.repo.port'" "from '../ports/message-repository.port'" "message port"
fix_path "from '../ports/tool-execution.repo.port'" "from '../ports/tool-execution-repository.port'" "tool-execution port"

fix_path "from '../../application/ports/agent-run.repo.port'" "from '../../application/ports/agent-run-repository.port'" "agent-run port (adapter level)"
fix_path "from '../../application/ports/message.repo.port'" "from '../../application/ports/message-repository.port'" "message port (adapter level)"
fix_path "from '../../application/ports/tool-execution.repo.port'" "from '../../application/ports/tool-execution-repository.port'" "tool-execution port (adapter level)"

# Fix Documents ports
fix_path "from '../../ports/document-repo.port'" "from '../../ports/document-repository.port'" "document port"
fix_path "from '../../ports/file-repo.port'" "from '../../ports/file-repository.port'" "file port"
fix_path "from '../../application/ports/document-repo.port'" "from '../../application/ports/document-repository.port'" "document port (infra level)"
fix_path "from '../../application/ports/file-repo.port'" "from '../../application/ports/file-repository.port'" "file port (infra level)"

echo ""
echo "=============================================="
echo "Remaining import fixes complete!"
echo "=============================================="
