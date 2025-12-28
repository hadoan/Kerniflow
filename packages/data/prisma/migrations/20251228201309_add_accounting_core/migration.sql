-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('Asset', 'Liability', 'Equity', 'Income', 'Expense');

-- CreateEnum
CREATE TYPE "EntryStatus" AS ENUM ('Draft', 'Posted', 'Reversed');

-- CreateEnum
CREATE TYPE "LineDirection" AS ENUM ('Debit', 'Credit');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('Open', 'Closed');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('Manual', 'Invoice', 'Payment', 'Expense', 'Migration', 'Adjustment');

-- CreateEnum
CREATE TYPE "AiContextType" AS ENUM ('AccountingCopilotChat', 'SuggestAccounts', 'GenerateJournalDraft', 'ExplainJournalEntry', 'ExplainReport', 'AnomalyScan', 'CloseChecklist');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('High', 'Medium', 'Low');

-- CreateEnum
CREATE TYPE "AcceptedAction" AS ENUM ('none', 'savedDraft', 'appliedSuggestion', 'dismissed');

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

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalLine" ADD CONSTRAINT "JournalLine_ledgerAccountId_fkey" FOREIGN KEY ("ledgerAccountId") REFERENCES "LedgerAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
