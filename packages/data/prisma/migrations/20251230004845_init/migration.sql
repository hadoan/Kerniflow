-- CreateEnum
CREATE TYPE "pack_install_status" AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "menu_scope" AS ENUM ('WEB', 'POS');

-- CreateEnum
CREATE TYPE "PermissionEffect" AS ENUM ('ALLOW', 'DENY');

-- CreateEnum
CREATE TYPE "CustomFieldType" AS ENUM ('TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT', 'MULTI_SELECT', 'MONEY');

-- CreateEnum
CREATE TYPE "WorkspaceMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'ACCOUNTANT', 'VIEWER');

-- CreateEnum
CREATE TYPE "WorkspaceMembershipStatus" AS ENUM ('ACTIVE', 'INVITED', 'DISABLED');

-- CreateEnum
CREATE TYPE "WorkspaceInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "WorkspaceOnboardingStatus" AS ENUM ('NEW', 'PROFILE', 'TAX', 'BANK', 'DONE');

-- CreateEnum
CREATE TYPE "PartyRoleType" AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'CONTACT');

-- CreateEnum
CREATE TYPE "ContactPointType" AS ENUM ('EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "AddressType" AS ENUM ('BILLING');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'WON', 'LOST');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('NOTE', 'TASK', 'CALL', 'MEETING', 'EMAIL_DRAFT');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Income', 'Expense');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('Draft', 'Posted', 'Reversed');

-- CreateEnum
CREATE TYPE "LineDirection" AS ENUM ('Debit', 'Credit');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('Open', 'Closed');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('Manual', 'Invoice', 'Payment', 'Expense', 'VendorBill', 'BillPayment', 'Migration', 'Adjustment');

-- CreateEnum
CREATE TYPE "AiContextType" AS ENUM ('AccountingCopilotChat', 'SuggestAccounts', 'GenerateJournalDraft', 'ExplainJournalEntry', 'ExplainReport', 'AnomalyScan', 'CloseChecklist');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "AcceptedAction" AS ENUM ('none', 'savedDraft', 'appliedSuggestion', 'dismissed');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'SENT', 'PAID', 'CANCELED');

-- CreateEnum
CREATE TYPE "DeliveryStatus" AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'BOUNCED', 'FAILED', 'DELAYED');

-- CreateEnum
CREATE TYPE "PdfStatus" AS ENUM ('NONE', 'GENERATING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "TaxRegime" AS ENUM ('SMALL_BUSINESS', 'STANDARD_VAT');

-- CreateEnum
CREATE TYPE "VatFilingFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "TaxCodeKind" AS ENUM ('STANDARD', 'REDUCED', 'REVERSE_CHARGE', 'EXEMPT', 'ZERO');

-- CreateEnum
CREATE TYPE "TaxSourceType" AS ENUM ('INVOICE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "TaxRoundingMode" AS ENUM ('PER_LINE', 'PER_DOCUMENT');

-- CreateEnum
CREATE TYPE "VatPeriodStatus" AS ENUM ('OPEN', 'FINALIZED');

-- CreateEnum
CREATE TYPE "ExpenseStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');

-- CreateEnum
CREATE TYPE "SalesQuoteStatus" AS ENUM ('DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SalesOrderStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'FULFILLED', 'INVOICED', 'CANCELED');

-- CreateEnum
CREATE TYPE "SalesInvoiceStatus" AS ENUM ('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "SalesPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELED');

-- CreateEnum
CREATE TYPE "VendorBillStatus" AS ENUM ('DRAFT', 'APPROVED', 'POSTED', 'PARTIALLY_PAID', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "BillPaymentMethod" AS ENUM ('BANK_TRANSFER', 'CASH', 'CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('UPLOAD', 'RECEIPT', 'CONTRACT', 'INVOICE_PDF', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'READY', 'FAILED', 'QUARANTINED');

-- CreateEnum
CREATE TYPE "FileKind" AS ENUM ('ORIGINAL', 'DERIVED', 'GENERATED');

-- CreateEnum
CREATE TYPE "StorageProvider" AS ENUM ('gcs', 's3', 'azure');

-- CreateEnum
CREATE TYPE "DocumentLinkEntityType" AS ENUM ('INVOICE', 'EXPENSE', 'AGENT_RUN', 'MESSAGE', 'OTHER');

-- CreateEnum
CREATE TYPE "ProductType" AS ENUM ('STOCKABLE', 'CONSUMABLE', 'SERVICE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('INTERNAL', 'RECEIVING', 'SHIPPING', 'VIRTUAL');

-- CreateEnum
CREATE TYPE "InventoryDocumentType" AS ENUM ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "InventoryDocumentStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'POSTED', 'CANCELED');

-- CreateEnum
CREATE TYPE "StockMoveReason" AS ENUM ('RECEIPT', 'SHIPMENT', 'TRANSFER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('ACTIVE', 'RELEASED', 'FULFILLED');

-- CreateEnum
CREATE TYPE "NegativeStockPolicy" AS ENUM ('DISALLOW', 'ALLOW');

-- CreateEnum
CREATE TYPE "ReservationPolicy" AS ENUM ('FULL_ONLY');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CheckInByType" AS ENUM ('SELF_SERVICE', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "LoyaltyAccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "LoyaltyEntryType" AS ENUM ('EARN', 'REDEEM', 'ADJUST', 'EXPIRE');

-- CreateEnum
CREATE TYPE "LoyaltyReasonCode" AS ENUM ('VISIT_CHECKIN', 'MANUAL_ADJUSTMENT', 'REWARD_REDEMPTION', 'EXPIRATION');

-- CreateEnum
CREATE TYPE "PrivacyRequestType" AS ENUM ('EXPORT', 'ERASE');

-- CreateEnum
CREATE TYPE "PrivacyRequestStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "WorkflowDefinitionStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "WorkflowDefinitionType" AS ENUM ('GENERAL', 'APPROVAL');

-- CreateEnum
CREATE TYPE "WorkflowInstanceStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('HUMAN', 'TIMER', 'HTTP', 'EMAIL', 'AI', 'SYSTEM');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateTable
CREATE TABLE "app_catalog" (
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "depsJson" TEXT NOT NULL,
    "permissionsJson" TEXT NOT NULL,
    "capabilitiesJson" TEXT NOT NULL,
    "menuJson" TEXT NOT NULL,
    "settingsSchemaJson" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "app_catalog_pkey" PRIMARY KEY ("appId")
);

-- CreateTable
CREATE TABLE "tenant_app_install" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "installed_version" TEXT NOT NULL,
    "config_json" TEXT,
    "enabled_at" TIMESTAMPTZ(6),
    "enabled_by_user_id" TEXT,
    "disabled_at" TIMESTAMPTZ(6),
    "disabled_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_app_install_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_catalog" (
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "requires_apps_json" TEXT NOT NULL,
    "params_schema_json" TEXT NOT NULL,
    "upgrade_policy_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "template_catalog_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "tenant_template_install" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "params_json" TEXT NOT NULL,
    "applied_by_user_id" TEXT,
    "applied_at" TIMESTAMPTZ(6) NOT NULL,
    "result_summary_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_template_install_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pack_catalog" (
    "pack_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "definition_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "pack_catalog_pkey" PRIMARY KEY ("pack_id")
);

-- CreateTable
CREATE TABLE "tenant_pack_install" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "pack_install_status" NOT NULL DEFAULT 'PENDING',
    "params_json" TEXT,
    "log_json" TEXT NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "installed_by_user_id" TEXT,
    "error_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_pack_install_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_menu_override" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" "menu_scope" NOT NULL,
    "overrides_json" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "tenant_menu_override_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seeded_record_meta" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "source_template_id" TEXT NOT NULL,
    "source_template_version" TEXT NOT NULL,
    "is_customized" BOOLEAN NOT NULL DEFAULT false,
    "customized_at" TIMESTAMPTZ(6),
    "customized_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "seeded_record_meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "timeZone" TEXT NOT NULL DEFAULT 'UTC',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemKey" TEXT,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RolePermissionGrant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionKey" TEXT NOT NULL,
    "effect" "PermissionEffect" NOT NULL DEFAULT 'ALLOW',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,

    CONSTRAINT "RolePermissionGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "lastUsedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "type" "CustomFieldType" NOT NULL,
    "required" BOOLEAN NOT NULL,
    "defaultValue" JSONB,
    "options" JSONB,
    "validation" JSONB,
    "isIndexed" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomFieldIndex" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "valueDate" TIMESTAMP(3),
    "valueBool" BOOLEAN,
    "valueJson" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomFieldIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntityLayout" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "layout" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntityLayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LegalEntity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "countryCode" CHAR(2) NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "taxId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "address" JSONB,
    "bankAccount" JSONB,

    CONSTRAINT "LegalEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalEntityId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "onboardingStatus" "WorkspaceOnboardingStatus" NOT NULL DEFAULT 'NEW',
    "onboardingCompletedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "invoiceSettings" JSONB,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceMembership" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "WorkspaceMembershipRole" NOT NULL,
    "status" "WorkspaceMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkspaceInvite" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "WorkspaceMembershipRole" NOT NULL,
    "status" "WorkspaceInviteStatus" NOT NULL DEFAULT 'PENDING',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkspaceInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Party" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "vatId" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "archivedAt" TIMESTAMPTZ(6),
    "archivedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Party_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartyRole" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "role" "PartyRoleType" NOT NULL,

    CONSTRAINT "PartyRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "ContactPointType" NOT NULL,
    "value" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ContactPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "type" "AddressType" NOT NULL,
    "line1" TEXT NOT NULL,
    "line2" TEXT,
    "city" TEXT,
    "postalCode" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "partyId" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "amountCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "expectedCloseDate" DATE,
    "probability" INTEGER,
    "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
    "ownerUserId" TEXT,
    "notes" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wonAt" TIMESTAMPTZ(6),
    "lostAt" TIMESTAMPTZ(6),
    "lostReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Deal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT,
    "partyId" TEXT,
    "dealId" TEXT,
    "dueAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "status" "ActivityStatus" NOT NULL DEFAULT 'OPEN',
    "assignedToUserId" TEXT,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DealStageTransition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "dealId" TEXT NOT NULL,
    "fromStageId" TEXT,
    "toStageId" TEXT NOT NULL,
    "transitionedByUserId" TEXT,
    "transitionedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DealStageTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PipelineConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "stagesJson" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PipelineConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "company" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "baseCurrency" TEXT NOT NULL,
    "fiscalYearStartMonthDay" TEXT NOT NULL,
    "periodLockingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "entryNumberPrefix" TEXT NOT NULL DEFAULT 'JE',
    "nextEntryNumber" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AccountingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingPeriod" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fiscalYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'Open',
    "closedAt" TIMESTAMPTZ(6),
    "closedBy" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AccountingPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "systemAccountKey" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LedgerAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entryNumber" TEXT,
    "status" "EntryStatus" NOT NULL DEFAULT 'Draft',
    "postingDate" DATE NOT NULL,
    "memo" TEXT NOT NULL,
    "sourceType" "SourceType",
    "sourceId" TEXT,
    "sourceRef" TEXT,
    "reversesEntryId" TEXT,
    "reversedByEntryId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedBy" TEXT,
    "postedAt" TIMESTAMPTZ(6),
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journalEntryId" TEXT NOT NULL,
    "ledgerAccountId" TEXT NOT NULL,
    "direction" "LineDirection" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "lineMemo" TEXT,
    "reference" TEXT,
    "tags" TEXT,

    CONSTRAINT "JournalLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiInteraction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "contextType" "AiContextType" NOT NULL,
    "inputSummary" TEXT NOT NULL,
    "outputSummary" TEXT NOT NULL,
    "confidence" "ConfidenceLevel",
    "confidenceScore" DOUBLE PRECISION,
    "referencedData" TEXT,
    "acceptedAction" "AcceptedAction" NOT NULL DEFAULT 'none',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "billToName" TEXT,
    "billToEmail" TEXT,
    "billToVatId" TEXT,
    "billToAddressLine1" TEXT,
    "billToAddressLine2" TEXT,
    "billToCity" TEXT,
    "billToPostalCode" TEXT,
    "billToCountry" TEXT,
    "number" TEXT,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "terms" TEXT,
    "invoiceDate" DATE,
    "dueDate" DATE,
    "issuedAt" TIMESTAMPTZ(6),
    "sentAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "pdfStorageKey" TEXT,
    "pdfGeneratedAt" TIMESTAMPTZ(6),
    "pdfSourceVersion" TEXT,
    "pdfStatus" "PdfStatus" NOT NULL DEFAULT 'NONE',
    "pdfFailureReason" TEXT,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoicePayment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "paidAt" TIMESTAMPTZ(6) NOT NULL,
    "note" TEXT,

    CONSTRAINT "InvoicePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceEmailDelivery" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "status" "DeliveryStatus" NOT NULL DEFAULT 'QUEUED',
    "provider" TEXT NOT NULL DEFAULT 'resend',
    "providerMessageId" TEXT,
    "idempotencyKey" TEXT NOT NULL,
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InvoiceEmailDelivery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "vatId" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "filingFrequency" "VatFilingFrequency" NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxCode" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "TaxCodeKind" NOT NULL,
    "label" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxRate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taxCodeId" TEXT NOT NULL,
    "rateBps" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "effectiveTo" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceType" "TaxSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "regime" "TaxRegime" NOT NULL,
    "roundingMode" "TaxRoundingMode" NOT NULL,
    "currency" TEXT NOT NULL,
    "calculatedAt" TIMESTAMPTZ(6) NOT NULL,
    "subtotalAmountCents" INTEGER NOT NULL,
    "taxTotalAmountCents" INTEGER NOT NULL,
    "totalAmountCents" INTEGER NOT NULL,
    "breakdownJson" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TaxSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VatPeriodSummary" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "periodStart" TIMESTAMPTZ(6) NOT NULL,
    "periodEnd" TIMESTAMPTZ(6) NOT NULL,
    "currency" TEXT NOT NULL,
    "totalsByKindJson" TEXT NOT NULL,
    "generatedAt" TIMESTAMPTZ(6) NOT NULL,
    "status" "VatPeriodStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VatPeriodSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "status" "ExpenseStatus" NOT NULL DEFAULT 'DRAFT',
    "expenseDate" DATE NOT NULL,
    "merchantName" TEXT,
    "supplierPartyId" TEXT,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "category" TEXT,
    "totalAmountCents" INTEGER NOT NULL,
    "taxAmountCents" INTEGER,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedByUserId" TEXT,
    "custom" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExpenseLine" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "taxRate" DOUBLE PRECISION,
    "category" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT,
    "status" "SalesQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "customerPartyId" TEXT NOT NULL,
    "customerContactPartyId" TEXT,
    "issueDate" DATE,
    "validUntilDate" DATE,
    "currency" TEXT NOT NULL,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "sentAt" TIMESTAMPTZ(6),
    "acceptedAt" TIMESTAMPTZ(6),
    "rejectedAt" TIMESTAMPTZ(6),
    "convertedToSalesOrderId" TEXT,
    "convertedToInvoiceId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesQuoteLine" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER,
    "taxCode" TEXT,
    "revenueCategory" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "SalesQuoteLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT,
    "status" "SalesOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "customerPartyId" TEXT NOT NULL,
    "customerContactPartyId" TEXT,
    "orderDate" DATE,
    "deliveryDate" DATE,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "confirmedAt" TIMESTAMPTZ(6),
    "fulfilledAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "sourceQuoteId" TEXT,
    "sourceInvoiceId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesOrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER,
    "taxCode" TEXT,
    "revenueCategory" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "SalesOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT,
    "status" "SalesInvoiceStatus" NOT NULL DEFAULT 'DRAFT',
    "customerPartyId" TEXT NOT NULL,
    "customerContactPartyId" TEXT,
    "issueDate" DATE,
    "dueDate" DATE,
    "currency" TEXT NOT NULL,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paidCents" INTEGER NOT NULL,
    "dueCents" INTEGER NOT NULL,
    "issuedAt" TIMESTAMPTZ(6),
    "voidedAt" TIMESTAMPTZ(6),
    "voidReason" TEXT,
    "sourceSalesOrderId" TEXT,
    "sourceQuoteId" TEXT,
    "issuedJournalEntryId" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPriceCents" INTEGER NOT NULL,
    "discountCents" INTEGER,
    "taxCode" TEXT,
    "revenueCategory" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "SalesInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" "SalesPaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "SalesPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultPaymentTerms" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "quoteNumberPrefix" TEXT NOT NULL DEFAULT 'Q-',
    "quoteNextNumber" INTEGER NOT NULL DEFAULT 1,
    "orderNumberPrefix" TEXT NOT NULL DEFAULT 'SO-',
    "orderNextNumber" INTEGER NOT NULL DEFAULT 1,
    "invoiceNumberPrefix" TEXT NOT NULL DEFAULT 'INV-',
    "invoiceNextNumber" INTEGER NOT NULL DEFAULT 1,
    "defaultRevenueAccountId" TEXT,
    "defaultAccountsReceivableAccountId" TEXT,
    "defaultBankAccountId" TEXT,
    "autoPostOnIssue" BOOLEAN NOT NULL DEFAULT true,
    "autoPostOnPayment" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SalesSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poNumber" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierPartyId" TEXT NOT NULL,
    "supplierContactPartyId" TEXT,
    "orderDate" DATE,
    "expectedDeliveryDate" DATE,
    "currency" TEXT NOT NULL,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "approvedAt" TIMESTAMPTZ(6),
    "sentAt" TIMESTAMPTZ(6),
    "receivedAt" TIMESTAMPTZ(6),
    "closedAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrderLine" (
    "id" TEXT NOT NULL,
    "purchaseOrderId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "taxCode" TEXT,
    "category" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "PurchaseOrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBill" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "billNumber" TEXT,
    "internalBillRef" TEXT,
    "status" "VendorBillStatus" NOT NULL DEFAULT 'DRAFT',
    "supplierPartyId" TEXT NOT NULL,
    "supplierContactPartyId" TEXT,
    "billDate" DATE NOT NULL,
    "dueDate" DATE NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentTerms" TEXT,
    "notes" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "taxCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "paidCents" INTEGER NOT NULL,
    "dueCents" INTEGER NOT NULL,
    "approvedAt" TIMESTAMPTZ(6),
    "postedAt" TIMESTAMPTZ(6),
    "voidedAt" TIMESTAMPTZ(6),
    "purchaseOrderId" TEXT,
    "postedJournalEntryId" TEXT,
    "possibleDuplicateOfBillId" TEXT,
    "duplicateScore" DOUBLE PRECISION,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "VendorBill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBillLine" (
    "id" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER NOT NULL,
    "category" TEXT,
    "glAccountId" TEXT,
    "taxCode" TEXT,
    "sortOrder" INTEGER,

    CONSTRAINT "VendorBillLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "vendorBillId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "paymentDate" DATE NOT NULL,
    "method" "BillPaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedByUserId" TEXT,
    "journalEntryId" TEXT,

    CONSTRAINT "BillPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasingSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultPaymentTerms" TEXT,
    "defaultCurrency" TEXT NOT NULL DEFAULT 'EUR',
    "poNumberingPrefix" TEXT NOT NULL DEFAULT 'PO-',
    "poNextNumber" INTEGER NOT NULL DEFAULT 1,
    "billInternalRefPrefix" TEXT DEFAULT 'BILL-',
    "billNextNumber" INTEGER DEFAULT 1,
    "defaultAccountsPayableAccountId" TEXT,
    "defaultExpenseAccountId" TEXT,
    "defaultBankAccountId" TEXT,
    "autoPostOnBillPost" BOOLEAN NOT NULL DEFAULT true,
    "autoPostOnPaymentRecord" BOOLEAN NOT NULL DEFAULT true,
    "billDuplicateDetectionEnabled" BOOLEAN NOT NULL DEFAULT true,
    "approvalRequiredForBills" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchasingSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasingAccountMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "supplierPartyId" TEXT NOT NULL,
    "categoryKey" TEXT NOT NULL,
    "glAccountId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PurchasingAccountMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL,
    "title" TEXT,
    "errorMessage" TEXT,
    "metadataJson" JSONB,
    "archivedAt" TIMESTAMPTZ(6),
    "archivedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "File" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "kind" "FileKind" NOT NULL,
    "storageProvider" "StorageProvider" NOT NULL,
    "bucket" TEXT NOT NULL,
    "objectKey" TEXT NOT NULL,
    "contentType" TEXT,
    "sizeBytes" INTEGER,
    "sha256" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "File_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentLink" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "entityType" "DocumentLinkEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryProduct" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "productType" "ProductType" NOT NULL,
    "unitOfMeasure" TEXT NOT NULL,
    "barcode" TEXT,
    "defaultSalesPriceCents" INTEGER,
    "defaultPurchaseCostCents" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryWarehouse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "address" TEXT,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryWarehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "locationType" "LocationType" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentType" "InventoryDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "status" "InventoryDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "reference" TEXT,
    "scheduledDate" DATE,
    "postingDate" DATE,
    "notes" TEXT,
    "partyId" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "confirmedAt" TIMESTAMPTZ(6),
    "postedAt" TIMESTAMPTZ(6),
    "canceledAt" TIMESTAMPTZ(6),
    "createdByUserId" TEXT,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventoryDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryDocumentLine" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCostCents" INTEGER,
    "fromLocationId" TEXT,
    "toLocationId" TEXT,
    "notes" TEXT,
    "reservedQuantity" INTEGER,

    CONSTRAINT "InventoryDocumentLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMove" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "postingDate" DATE NOT NULL,
    "productId" TEXT NOT NULL,
    "quantityDelta" INTEGER NOT NULL,
    "locationId" TEXT NOT NULL,
    "documentType" "InventoryDocumentType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "lineId" TEXT NOT NULL,
    "reasonCode" "StockMoveReason" NOT NULL,
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMove_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reservedQty" INTEGER NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "releasedAt" TIMESTAMPTZ(6),
    "fulfilledAt" TIMESTAMPTZ(6),

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReorderPolicy" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "minQty" INTEGER NOT NULL,
    "maxQty" INTEGER,
    "reorderPoint" INTEGER,
    "preferredSupplierPartyId" TEXT,
    "leadTimeDays" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ReorderPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventorySettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "receiptPrefix" TEXT NOT NULL DEFAULT 'RCPT-',
    "receiptNextNumber" INTEGER NOT NULL DEFAULT 1,
    "deliveryPrefix" TEXT NOT NULL DEFAULT 'DLV-',
    "deliveryNextNumber" INTEGER NOT NULL DEFAULT 1,
    "transferPrefix" TEXT NOT NULL DEFAULT 'TRF-',
    "transferNextNumber" INTEGER NOT NULL DEFAULT 1,
    "adjustmentPrefix" TEXT NOT NULL DEFAULT 'ADJ-',
    "adjustmentNextNumber" INTEGER NOT NULL DEFAULT 1,
    "negativeStockPolicy" "NegativeStockPolicy" NOT NULL DEFAULT 'DISALLOW',
    "reservationPolicy" "ReservationPolicy" NOT NULL DEFAULT 'FULL_ONLY',
    "defaultWarehouseId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "InventorySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registers" (
    "id" UUID NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "default_warehouse_id" UUID,
    "default_bank_account_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "registers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_sessions" (
    "id" UUID NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "register_id" UUID NOT NULL,
    "opened_by_employee_party_id" UUID NOT NULL,
    "opened_at" TIMESTAMPTZ NOT NULL,
    "starting_cash_cents" INTEGER,
    "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    "closed_at" TIMESTAMPTZ,
    "closed_by_employee_party_id" UUID,
    "closing_cash_cents" INTEGER,
    "total_sales_cents" INTEGER NOT NULL DEFAULT 0,
    "total_cash_received_cents" INTEGER NOT NULL DEFAULT 0,
    "variance_cents" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "shift_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pos_sale_idempotency" (
    "idempotencyKey" VARCHAR(255) NOT NULL,
    "workspace_id" TEXT NOT NULL,
    "pos_sale_id" UUID NOT NULL,
    "server_invoice_id" UUID NOT NULL,
    "server_payment_id" UUID,
    "receipt_number" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pos_sale_idempotency_pkey" PRIMARY KEY ("idempotencyKey")
);

-- CreateTable
CREATE TABLE "CheckInEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "kioskDeviceId" TEXT,
    "checkedInAt" TIMESTAMPTZ(6) NOT NULL,
    "checkedInByType" "CheckInByType" NOT NULL,
    "checkedInByEmployeePartyId" TEXT,
    "status" "CheckInStatus" NOT NULL DEFAULT 'ACTIVE',
    "visitReason" TEXT,
    "assignedEmployeePartyId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "posSaleId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "CheckInEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "status" "LoyaltyAccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentPointsBalance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "LoyaltyAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoyaltyLedgerEntry" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "customerPartyId" TEXT NOT NULL,
    "entryType" "LoyaltyEntryType" NOT NULL,
    "pointsDelta" INTEGER NOT NULL,
    "reasonCode" "LoyaltyReasonCode" NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdByEmployeePartyId" TEXT,

    CONSTRAINT "LoyaltyLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EngagementSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "checkInModeEnabled" BOOLEAN NOT NULL DEFAULT true,
    "checkInDuplicateWindowMinutes" INTEGER NOT NULL DEFAULT 10,
    "loyaltyEnabled" BOOLEAN NOT NULL DEFAULT true,
    "pointsPerVisit" INTEGER NOT NULL DEFAULT 1,
    "rewardRulesJson" TEXT,
    "aiEnabled" BOOLEAN NOT NULL DEFAULT true,
    "kioskBrandingJson" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "EngagementSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "partsJson" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "toolCallId" TEXT NOT NULL,
    "toolName" TEXT NOT NULL,
    "inputJson" TEXT NOT NULL,
    "outputJson" TEXT,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "errorJson" TEXT,

    CONSTRAINT "ToolExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivacyRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subjectUserId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "PrivacyRequestType" NOT NULL,
    "status" "PrivacyRequestStatus" NOT NULL,
    "resultDocumentId" TEXT,
    "resultReportDocumentId" TEXT,
    "errorMessage" TEXT,
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PrivacyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "WorkflowDefinitionType" NOT NULL DEFAULT 'GENERAL',
    "status" "WorkflowDefinitionStatus" NOT NULL DEFAULT 'ACTIVE',
    "spec" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "definitionId" TEXT NOT NULL,
    "businessKey" TEXT,
    "status" "WorkflowInstanceStatus" NOT NULL DEFAULT 'PENDING',
    "currentState" TEXT,
    "context" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TaskType" NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "runAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "lockedAt" TIMESTAMP(3),
    "lockedBy" TEXT,
    "assigneeUserId" TEXT,
    "assigneeRoleId" TEXT,
    "assigneePermissionKey" TEXT,
    "idempotencyKey" TEXT,
    "input" TEXT,
    "output" TEXT,
    "error" TEXT,
    "traceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DomainEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DomainEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorUserId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "actionKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT,
    "requestHash" TEXT,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "responseJson" TEXT,
    "responseStatus" INTEGER,
    "statusCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_catalog_tier_idx" ON "app_catalog"("tier");

-- CreateIndex
CREATE INDEX "app_catalog_updatedAt_idx" ON "app_catalog"("updatedAt");

-- CreateIndex
CREATE INDEX "tenant_app_install_tenant_id_enabled_idx" ON "tenant_app_install"("tenant_id", "enabled");

-- CreateIndex
CREATE INDEX "tenant_app_install_tenant_id_created_at_idx" ON "tenant_app_install"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_app_install_tenant_id_app_id_key" ON "tenant_app_install"("tenant_id", "app_id");

-- CreateIndex
CREATE INDEX "template_catalog_category_idx" ON "template_catalog"("category");

-- CreateIndex
CREATE INDEX "template_catalog_updated_at_idx" ON "template_catalog"("updated_at");

-- CreateIndex
CREATE INDEX "tenant_template_install_tenant_id_created_at_idx" ON "tenant_template_install"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_template_install_tenant_id_template_id_key" ON "tenant_template_install"("tenant_id", "template_id");

-- CreateIndex
CREATE INDEX "pack_catalog_updated_at_idx" ON "pack_catalog"("updated_at");

-- CreateIndex
CREATE INDEX "tenant_pack_install_tenant_id_status_idx" ON "tenant_pack_install"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "tenant_pack_install_tenant_id_created_at_idx" ON "tenant_pack_install"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_pack_install_tenant_id_pack_id_version_key" ON "tenant_pack_install"("tenant_id", "pack_id", "version");

-- CreateIndex
CREATE INDEX "tenant_menu_override_tenant_id_idx" ON "tenant_menu_override"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_menu_override_tenant_id_scope_key" ON "tenant_menu_override"("tenant_id", "scope");

-- CreateIndex
CREATE INDEX "seeded_record_meta_tenant_id_source_template_id_idx" ON "seeded_record_meta"("tenant_id", "source_template_id");

-- CreateIndex
CREATE INDEX "seeded_record_meta_tenant_id_target_table_is_customized_idx" ON "seeded_record_meta"("tenant_id", "target_table", "is_customized");

-- CreateIndex
CREATE UNIQUE INDEX "seeded_record_meta_tenant_id_target_table_target_id_key" ON "seeded_record_meta"("tenant_id", "target_table", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_createdAt_idx" ON "Tenant"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE INDEX "Membership_tenantId_idx" ON "Membership"("tenantId");

-- CreateIndex
CREATE INDEX "Membership_userId_idx" ON "Membership"("userId");

-- CreateIndex
CREATE INDEX "Membership_roleId_idx" ON "Membership"("roleId");

-- CreateIndex
CREATE INDEX "Membership_tenantId_createdAt_idx" ON "Membership"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_tenantId_userId_key" ON "Membership"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Role_tenantId_idx" ON "Role"("tenantId");

-- CreateIndex
CREATE INDEX "Role_tenantId_systemKey_idx" ON "Role"("tenantId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_systemKey_key" ON "Role"("tenantId", "systemKey");

-- CreateIndex
CREATE UNIQUE INDEX "Role_tenantId_name_key" ON "Role"("tenantId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "Permission_key_idx" ON "Permission"("key");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "RolePermission"("roleId", "permissionId");

-- CreateIndex
CREATE INDEX "RolePermissionGrant_tenantId_roleId_idx" ON "RolePermissionGrant"("tenantId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermissionGrant_permissionKey_idx" ON "RolePermissionGrant"("permissionKey");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermissionGrant_tenantId_roleId_permissionKey_key" ON "RolePermissionGrant"("tenantId", "roleId", "permissionKey");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tenantId_idx" ON "RefreshToken"("tenantId");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_expiresAt_idx" ON "RefreshToken"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenHash_idx" ON "RefreshToken"("tokenHash");

-- CreateIndex
CREATE INDEX "ApiKey_tenantId_idx" ON "ApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "ApiKey_keyHash_idx" ON "ApiKey"("keyHash");

-- CreateIndex
CREATE UNIQUE INDEX "ApiKey_tenantId_name_key" ON "ApiKey"("tenantId", "name");

-- CreateIndex
CREATE INDEX "CustomFieldDefinition_tenantId_entityType_idx" ON "CustomFieldDefinition"("tenantId", "entityType");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldDefinition_tenantId_entityType_key_key" ON "CustomFieldDefinition"("tenantId", "entityType", "key");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_fieldId_idx" ON "CustomFieldIndex"("tenantId", "entityType", "fieldId");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_fieldKey_idx" ON "CustomFieldIndex"("tenantId", "entityType", "fieldKey");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueText_idx" ON "CustomFieldIndex"("tenantId", "entityType", "valueText");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueNumber_idx" ON "CustomFieldIndex"("tenantId", "entityType", "valueNumber");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueDate_idx" ON "CustomFieldIndex"("tenantId", "entityType", "valueDate");

-- CreateIndex
CREATE INDEX "CustomFieldIndex_tenantId_entityType_valueBool_idx" ON "CustomFieldIndex"("tenantId", "entityType", "valueBool");

-- CreateIndex
CREATE UNIQUE INDEX "CustomFieldIndex_tenantId_entityType_entityId_fieldId_key" ON "CustomFieldIndex"("tenantId", "entityType", "entityId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "EntityLayout_tenantId_entityType_key" ON "EntityLayout"("tenantId", "entityType");

-- CreateIndex
CREATE INDEX "LegalEntity_tenantId_idx" ON "LegalEntity"("tenantId");

-- CreateIndex
CREATE INDEX "LegalEntity_tenantId_kind_idx" ON "LegalEntity"("tenantId", "kind");

-- CreateIndex
CREATE INDEX "LegalEntity_tenantId_createdAt_idx" ON "LegalEntity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_idx" ON "Workspace"("tenantId");

-- CreateIndex
CREATE INDEX "Workspace_legalEntityId_idx" ON "Workspace"("legalEntityId");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_createdAt_idx" ON "Workspace"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Workspace_tenantId_onboardingStatus_idx" ON "Workspace"("tenantId", "onboardingStatus");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_tenantId_name_key" ON "Workspace"("tenantId", "name");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_idx" ON "WorkspaceMembership"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_idx" ON "WorkspaceMembership"("userId");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_workspaceId_status_idx" ON "WorkspaceMembership"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "WorkspaceMembership_userId_status_idx" ON "WorkspaceMembership"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMembership_workspaceId_userId_key" ON "WorkspaceMembership"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceInvite_token_key" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_idx" ON "WorkspaceInvite"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_email_idx" ON "WorkspaceInvite"("email");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_token_idx" ON "WorkspaceInvite"("token");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_status_expiresAt_idx" ON "WorkspaceInvite"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "WorkspaceInvite_workspaceId_status_idx" ON "WorkspaceInvite"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "Party_tenantId_displayName_idx" ON "Party"("tenantId", "displayName");

-- CreateIndex
CREATE INDEX "Party_tenantId_archivedAt_idx" ON "Party"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "Party_tenantId_idx" ON "Party"("tenantId");

-- CreateIndex
CREATE INDEX "PartyRole_tenantId_role_idx" ON "PartyRole"("tenantId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "PartyRole_tenantId_partyId_role_key" ON "PartyRole"("tenantId", "partyId", "role");

-- CreateIndex
CREATE INDEX "ContactPoint_tenantId_partyId_type_idx" ON "ContactPoint"("tenantId", "partyId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ContactPoint_tenantId_partyId_type_key" ON "ContactPoint"("tenantId", "partyId", "type");

-- CreateIndex
CREATE INDEX "Address_tenantId_type_idx" ON "Address"("tenantId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Address_tenantId_partyId_type_key" ON "Address"("tenantId", "partyId", "type");

-- CreateIndex
CREATE INDEX "Deal_tenantId_status_idx" ON "Deal"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Deal_tenantId_partyId_idx" ON "Deal"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_ownerUserId_idx" ON "Deal"("tenantId", "ownerUserId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_stageId_idx" ON "Deal"("tenantId", "stageId");

-- CreateIndex
CREATE INDEX "Deal_tenantId_createdAt_idx" ON "Deal"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_tenantId_partyId_createdAt_idx" ON "Activity"("tenantId", "partyId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_tenantId_dealId_createdAt_idx" ON "Activity"("tenantId", "dealId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_tenantId_assignedToUserId_status_idx" ON "Activity"("tenantId", "assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "Activity_tenantId_createdAt_idx" ON "Activity"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "DealStageTransition_tenantId_dealId_transitionedAt_idx" ON "DealStageTransition"("tenantId", "dealId", "transitionedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PipelineConfig_tenantId_key" ON "PipelineConfig"("tenantId");

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "Client"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Client_tenantId_email_key" ON "Client"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingSettings_tenantId_key" ON "AccountingSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingSettings_tenantId_idx" ON "AccountingSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_status_idx" ON "AccountingPeriod"("tenantId", "status");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_fiscalYearId_idx" ON "AccountingPeriod"("tenantId", "fiscalYearId");

-- CreateIndex
CREATE INDEX "AccountingPeriod_tenantId_startDate_idx" ON "AccountingPeriod"("tenantId", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingPeriod_tenantId_fiscalYearId_name_key" ON "AccountingPeriod"("tenantId", "fiscalYearId", "name");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_type_idx" ON "LedgerAccount"("tenantId", "type");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_isActive_idx" ON "LedgerAccount"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "LedgerAccount_tenantId_systemAccountKey_idx" ON "LedgerAccount"("tenantId", "systemAccountKey");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerAccount_tenantId_code_key" ON "LedgerAccount"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_entryNumber_key" ON "JournalEntry"("entryNumber");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_status_idx" ON "JournalEntry"("tenantId", "status");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_postingDate_idx" ON "JournalEntry"("tenantId", "postingDate");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_createdBy_idx" ON "JournalEntry"("tenantId", "createdBy");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_reversesEntryId_idx" ON "JournalEntry"("tenantId", "reversesEntryId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_reversedByEntryId_idx" ON "JournalEntry"("tenantId", "reversedByEntryId");

-- CreateIndex
CREATE INDEX "JournalEntry_tenantId_sourceType_sourceId_idx" ON "JournalEntry"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "JournalLine_journalEntryId_idx" ON "JournalLine"("journalEntryId");

-- CreateIndex
CREATE INDEX "JournalLine_ledgerAccountId_idx" ON "JournalLine"("ledgerAccountId");

-- CreateIndex
CREATE INDEX "JournalLine_tenantId_ledgerAccountId_idx" ON "JournalLine"("tenantId", "ledgerAccountId");

-- CreateIndex
CREATE INDEX "AiInteraction_tenantId_contextType_idx" ON "AiInteraction"("tenantId", "contextType");

-- CreateIndex
CREATE INDEX "AiInteraction_tenantId_actorUserId_idx" ON "AiInteraction"("tenantId", "actorUserId");

-- CreateIndex
CREATE INDEX "AiInteraction_tenantId_createdAt_idx" ON "AiInteraction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_status_idx" ON "Invoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_customerPartyId_idx" ON "Invoice"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "Invoice_tenantId_createdAt_idx" ON "Invoice"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_tenantId_number_key" ON "Invoice"("tenantId", "number");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoicePayment_invoiceId_idx" ON "InvoicePayment"("invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEmailDelivery_tenantId_invoiceId_idx" ON "InvoiceEmailDelivery"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "InvoiceEmailDelivery_providerMessageId_idx" ON "InvoiceEmailDelivery"("providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "InvoiceEmailDelivery_tenantId_idempotencyKey_key" ON "InvoiceEmailDelivery"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TaxProfile_tenantId_country_idx" ON "TaxProfile"("tenantId", "country");

-- CreateIndex
CREATE UNIQUE INDEX "TaxProfile_tenantId_effectiveFrom_key" ON "TaxProfile"("tenantId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxCode_tenantId_isActive_idx" ON "TaxCode"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TaxCode_tenantId_code_key" ON "TaxCode"("tenantId", "code");

-- CreateIndex
CREATE INDEX "TaxRate_tenantId_taxCodeId_idx" ON "TaxRate"("tenantId", "taxCodeId");

-- CreateIndex
CREATE INDEX "TaxRate_effectiveFrom_idx" ON "TaxRate"("effectiveFrom");

-- CreateIndex
CREATE INDEX "TaxSnapshot_tenantId_sourceType_idx" ON "TaxSnapshot"("tenantId", "sourceType");

-- CreateIndex
CREATE INDEX "TaxSnapshot_calculatedAt_idx" ON "TaxSnapshot"("calculatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TaxSnapshot_tenantId_sourceType_sourceId_key" ON "TaxSnapshot"("tenantId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "VatPeriodSummary_tenantId_status_idx" ON "VatPeriodSummary"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VatPeriodSummary_periodStart_idx" ON "VatPeriodSummary"("periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "VatPeriodSummary_tenantId_periodStart_periodEnd_key" ON "VatPeriodSummary"("tenantId", "periodStart", "periodEnd");

-- CreateIndex
CREATE INDEX "Expense_tenantId_idx" ON "Expense"("tenantId");

-- CreateIndex
CREATE INDEX "Expense_tenantId_expenseDate_idx" ON "Expense"("tenantId", "expenseDate");

-- CreateIndex
CREATE INDEX "Expense_tenantId_status_idx" ON "Expense"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Expense_tenantId_archivedAt_idx" ON "Expense"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "ExpenseLine_tenantId_idx" ON "ExpenseLine"("tenantId");

-- CreateIndex
CREATE INDEX "ExpenseLine_expenseId_idx" ON "ExpenseLine"("expenseId");

-- CreateIndex
CREATE INDEX "SalesQuote_tenantId_status_idx" ON "SalesQuote"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesQuote_tenantId_customerPartyId_idx" ON "SalesQuote"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "SalesQuote_tenantId_createdAt_idx" ON "SalesQuote"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesQuote_tenantId_number_key" ON "SalesQuote"("tenantId", "number");

-- CreateIndex
CREATE INDEX "SalesQuoteLine_quoteId_idx" ON "SalesQuoteLine"("quoteId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_status_idx" ON "SalesOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_customerPartyId_idx" ON "SalesOrder"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "SalesOrder_tenantId_createdAt_idx" ON "SalesOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesOrder_tenantId_number_key" ON "SalesOrder"("tenantId", "number");

-- CreateIndex
CREATE INDEX "SalesOrderLine_orderId_idx" ON "SalesOrderLine"("orderId");

-- CreateIndex
CREATE INDEX "SalesInvoice_tenantId_status_idx" ON "SalesInvoice"("tenantId", "status");

-- CreateIndex
CREATE INDEX "SalesInvoice_tenantId_customerPartyId_idx" ON "SalesInvoice"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "SalesInvoice_tenantId_createdAt_idx" ON "SalesInvoice"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesInvoice_tenantId_number_key" ON "SalesInvoice"("tenantId", "number");

-- CreateIndex
CREATE INDEX "SalesInvoiceLine_invoiceId_idx" ON "SalesInvoiceLine"("invoiceId");

-- CreateIndex
CREATE INDEX "SalesPayment_tenantId_invoiceId_idx" ON "SalesPayment"("tenantId", "invoiceId");

-- CreateIndex
CREATE INDEX "SalesPayment_invoiceId_idx" ON "SalesPayment"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "SalesSettings_tenantId_key" ON "SalesSettings"("tenantId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_status_idx" ON "PurchaseOrder"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_supplierPartyId_idx" ON "PurchaseOrder"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_tenantId_createdAt_idx" ON "PurchaseOrder"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_tenantId_poNumber_key" ON "PurchaseOrder"("tenantId", "poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrderLine_purchaseOrderId_idx" ON "PurchaseOrderLine"("purchaseOrderId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_status_idx" ON "VendorBill"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_supplierPartyId_idx" ON "VendorBill"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE INDEX "VendorBill_tenantId_createdAt_idx" ON "VendorBill"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBill_tenantId_supplierPartyId_billNumber_key" ON "VendorBill"("tenantId", "supplierPartyId", "billNumber");

-- CreateIndex
CREATE INDEX "VendorBillLine_vendorBillId_idx" ON "VendorBillLine"("vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_tenantId_vendorBillId_idx" ON "BillPayment"("tenantId", "vendorBillId");

-- CreateIndex
CREATE INDEX "BillPayment_vendorBillId_idx" ON "BillPayment"("vendorBillId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasingSettings_tenantId_key" ON "PurchasingSettings"("tenantId");

-- CreateIndex
CREATE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_idx" ON "PurchasingAccountMapping"("tenantId", "supplierPartyId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasingAccountMapping_tenantId_supplierPartyId_categoryK_key" ON "PurchasingAccountMapping"("tenantId", "supplierPartyId", "categoryKey");

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "Document"("tenantId");

-- CreateIndex
CREATE INDEX "Document_tenantId_type_idx" ON "Document"("tenantId", "type");

-- CreateIndex
CREATE INDEX "Document_tenantId_archivedAt_idx" ON "Document"("tenantId", "archivedAt");

-- CreateIndex
CREATE INDEX "File_tenantId_idx" ON "File"("tenantId");

-- CreateIndex
CREATE INDEX "File_tenantId_documentId_idx" ON "File"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "File_objectKey_idx" ON "File"("objectKey");

-- CreateIndex
CREATE INDEX "DocumentLink_tenantId_idx" ON "DocumentLink"("tenantId");

-- CreateIndex
CREATE INDEX "DocumentLink_tenantId_entityType_entityId_idx" ON "DocumentLink"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "InventoryProduct_tenantId_productType_idx" ON "InventoryProduct"("tenantId", "productType");

-- CreateIndex
CREATE INDEX "InventoryProduct_tenantId_isActive_idx" ON "InventoryProduct"("tenantId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryProduct_tenantId_sku_key" ON "InventoryProduct"("tenantId", "sku");

-- CreateIndex
CREATE INDEX "InventoryWarehouse_tenantId_isDefault_idx" ON "InventoryWarehouse"("tenantId", "isDefault");

-- CreateIndex
CREATE INDEX "InventoryLocation_tenantId_warehouseId_idx" ON "InventoryLocation"("tenantId", "warehouseId");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_status_idx" ON "InventoryDocument"("tenantId", "status");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_documentType_idx" ON "InventoryDocument"("tenantId", "documentType");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_partyId_idx" ON "InventoryDocument"("tenantId", "partyId");

-- CreateIndex
CREATE INDEX "InventoryDocument_tenantId_createdAt_idx" ON "InventoryDocument"("tenantId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryDocument_tenantId_documentNumber_key" ON "InventoryDocument"("tenantId", "documentNumber");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_documentId_idx" ON "InventoryDocumentLine"("documentId");

-- CreateIndex
CREATE INDEX "InventoryDocumentLine_productId_idx" ON "InventoryDocumentLine"("productId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_productId_idx" ON "StockMove"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_locationId_idx" ON "StockMove"("tenantId", "locationId");

-- CreateIndex
CREATE INDEX "StockMove_tenantId_postingDate_idx" ON "StockMove"("tenantId", "postingDate");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_documentId_idx" ON "StockReservation"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "StockReservation_tenantId_productId_idx" ON "StockReservation"("tenantId", "productId");

-- CreateIndex
CREATE INDEX "ReorderPolicy_tenantId_warehouseId_idx" ON "ReorderPolicy"("tenantId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "ReorderPolicy_tenantId_productId_warehouseId_key" ON "ReorderPolicy"("tenantId", "productId", "warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "InventorySettings_tenantId_key" ON "InventorySettings"("tenantId");

-- CreateIndex
CREATE INDEX "registers_workspace_id_status_idx" ON "registers"("workspace_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "registers_workspace_id_name_key" ON "registers"("workspace_id", "name");

-- CreateIndex
CREATE INDEX "shift_sessions_workspace_id_register_id_status_idx" ON "shift_sessions"("workspace_id", "register_id", "status");

-- CreateIndex
CREATE INDEX "shift_sessions_workspace_id_status_closed_at_idx" ON "shift_sessions"("workspace_id", "status", "closed_at");

-- CreateIndex
CREATE INDEX "pos_sale_idempotency_workspace_id_idx" ON "pos_sale_idempotency"("workspace_id");

-- CreateIndex
CREATE INDEX "pos_sale_idempotency_pos_sale_id_idx" ON "pos_sale_idempotency"("pos_sale_id");

-- CreateIndex
CREATE INDEX "CheckInEvent_tenantId_customerPartyId_checkedInAt_idx" ON "CheckInEvent"("tenantId", "customerPartyId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_tenantId_registerId_checkedInAt_idx" ON "CheckInEvent"("tenantId", "registerId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckInEvent_tenantId_status_idx" ON "CheckInEvent"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LoyaltyAccount_tenantId_status_idx" ON "LoyaltyAccount"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyAccount_tenantId_customerPartyId_key" ON "LoyaltyAccount"("tenantId", "customerPartyId");

-- CreateIndex
CREATE INDEX "LoyaltyLedgerEntry_tenantId_customerPartyId_createdAt_idx" ON "LoyaltyLedgerEntry"("tenantId", "customerPartyId", "createdAt");

-- CreateIndex
CREATE INDEX "LoyaltyLedgerEntry_tenantId_entryType_idx" ON "LoyaltyLedgerEntry"("tenantId", "entryType");

-- CreateIndex
CREATE UNIQUE INDEX "LoyaltyLedgerEntry_tenantId_sourceType_sourceId_reasonCode_key" ON "LoyaltyLedgerEntry"("tenantId", "sourceType", "sourceId", "reasonCode");

-- CreateIndex
CREATE UNIQUE INDEX "EngagementSettings_tenantId_key" ON "EngagementSettings"("tenantId");

-- CreateIndex
CREATE INDEX "AgentRun_tenantId_createdAt_idx" ON "AgentRun"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "Message_tenantId_runId_createdAt_idx" ON "Message"("tenantId", "runId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ToolExecution_tenantId_runId_toolCallId_key" ON "ToolExecution"("tenantId", "runId", "toolCallId");

-- CreateIndex
CREATE INDEX "PrivacyRequest_tenantId_subjectUserId_createdAt_idx" ON "PrivacyRequest"("tenantId", "subjectUserId", "createdAt");

-- CreateIndex
CREATE INDEX "PrivacyRequest_tenantId_status_createdAt_idx" ON "PrivacyRequest"("tenantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_tenantId_status_idx" ON "WorkflowDefinition"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowDefinition_tenantId_key_idx" ON "WorkflowDefinition"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowDefinition_tenantId_key_version_key" ON "WorkflowDefinition"("tenantId", "key", "version");

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_status_idx" ON "WorkflowInstance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "WorkflowInstance_tenantId_businessKey_idx" ON "WorkflowInstance"("tenantId", "businessKey");

-- CreateIndex
CREATE INDEX "WorkflowInstance_status_updatedAt_idx" ON "WorkflowInstance"("status", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkflowInstance_tenantId_definitionId_businessKey_key" ON "WorkflowInstance"("tenantId", "definitionId", "businessKey");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_runAt_idx" ON "Task"("tenantId", "status", "runAt");

-- CreateIndex
CREATE INDEX "Task_instanceId_status_idx" ON "Task"("instanceId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_idempotencyKey_idx" ON "Task"("tenantId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "Task_status_lockedAt_idx" ON "Task"("status", "lockedAt");

-- CreateIndex
CREATE INDEX "Task_runAt_status_idx" ON "Task"("runAt", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneeUserId_status_idx" ON "Task"("tenantId", "assigneeUserId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneeRoleId_status_idx" ON "Task"("tenantId", "assigneeRoleId", "status");

-- CreateIndex
CREATE INDEX "Task_tenantId_assigneePermissionKey_status_idx" ON "Task"("tenantId", "assigneePermissionKey", "status");

-- CreateIndex
CREATE INDEX "WorkflowEvent_tenantId_instanceId_createdAt_idx" ON "WorkflowEvent"("tenantId", "instanceId", "createdAt");

-- CreateIndex
CREATE INDEX "WorkflowEvent_instanceId_type_idx" ON "WorkflowEvent"("instanceId", "type");

-- CreateIndex
CREATE INDEX "WorkflowEvent_tenantId_type_createdAt_idx" ON "WorkflowEvent"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "OutboxEvent_tenantId_status_availableAt_idx" ON "OutboxEvent"("tenantId", "status", "availableAt");

-- CreateIndex
CREATE INDEX "DomainEvent_tenantId_eventType_idx" ON "DomainEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entity_entityId_idx" ON "AuditLog"("tenantId", "entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_idx" ON "AuditLog"("tenantId", "action");

-- CreateIndex
CREATE INDEX "IdempotencyKey_tenantId_actionKey_idx" ON "IdempotencyKey"("tenantId", "actionKey");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_tenantId_actionKey_key_key" ON "IdempotencyKey"("tenantId", "actionKey", "key");

-- AddForeignKey
ALTER TABLE "tenant_app_install" ADD CONSTRAINT "tenant_app_install_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_template_install" ADD CONSTRAINT "tenant_template_install_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_pack_install" ADD CONSTRAINT "tenant_pack_install_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_menu_override" ADD CONSTRAINT "tenant_menu_override_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seeded_record_meta" ADD CONSTRAINT "seeded_record_meta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Role" ADD CONSTRAINT "Role_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissionGrant" ADD CONSTRAINT "RolePermissionGrant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissionGrant" ADD CONSTRAINT "RolePermissionGrant_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermissionGrant" ADD CONSTRAINT "RolePermissionGrant_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LegalEntity" ADD CONSTRAINT "LegalEntity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_legalEntityId_fkey" FOREIGN KEY ("legalEntityId") REFERENCES "LegalEntity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMembership" ADD CONSTRAINT "WorkspaceMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceInvite" ADD CONSTRAINT "WorkspaceInvite_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartyRole" ADD CONSTRAINT "PartyRole_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactPoint" ADD CONSTRAINT "ContactPoint_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deal" ADD CONSTRAINT "Deal_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_partyId_fkey" FOREIGN KEY ("partyId") REFERENCES "Party"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DealStageTransition" ADD CONSTRAINT "DealStageTransition_dealId_fkey" FOREIGN KEY ("dealId") REFERENCES "Deal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxRate" ADD CONSTRAINT "TaxRate_taxCodeId_fkey" FOREIGN KEY ("taxCodeId") REFERENCES "TaxCode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExpenseLine" ADD CONSTRAINT "ExpenseLine_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "Expense"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesQuoteLine" ADD CONSTRAINT "SalesQuoteLine_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "SalesQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesOrderLine" ADD CONSTRAINT "SalesOrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "SalesOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesInvoiceLine" ADD CONSTRAINT "SalesInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesPayment" ADD CONSTRAINT "SalesPayment_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SalesInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrderLine" ADD CONSTRAINT "PurchaseOrderLine_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBillLine" ADD CONSTRAINT "VendorBillLine_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillPayment" ADD CONSTRAINT "BillPayment_vendorBillId_fkey" FOREIGN KEY ("vendorBillId") REFERENCES "VendorBill"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentLink" ADD CONSTRAINT "DocumentLink_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLocation" ADD CONSTRAINT "InventoryLocation_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "InventoryWarehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryDocumentLine" ADD CONSTRAINT "InventoryDocumentLine_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "InventoryDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registers" ADD CONSTRAINT "registers_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_sessions" ADD CONSTRAINT "shift_sessions_register_id_fkey" FOREIGN KEY ("register_id") REFERENCES "registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pos_sale_idempotency" ADD CONSTRAINT "pos_sale_idempotency_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoyaltyLedgerEntry" ADD CONSTRAINT "LoyaltyLedgerEntry_tenantId_customerPartyId_fkey" FOREIGN KEY ("tenantId", "customerPartyId") REFERENCES "LoyaltyAccount"("tenantId", "customerPartyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolExecution" ADD CONSTRAINT "ToolExecution_runId_fkey" FOREIGN KEY ("runId") REFERENCES "AgentRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowInstance" ADD CONSTRAINT "WorkflowInstance_definitionId_fkey" FOREIGN KEY ("definitionId") REFERENCES "WorkflowDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowEvent" ADD CONSTRAINT "WorkflowEvent_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "WorkflowInstance"("id") ON DELETE CASCADE ON UPDATE CASCADE;
