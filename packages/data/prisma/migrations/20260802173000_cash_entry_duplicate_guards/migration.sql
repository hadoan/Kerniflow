-- A client retry must never create a second cash entry. The unique key is scoped
-- to the workspace, because idempotency keys are client-generated per action.
ALTER TABLE "accounting"."cash_entries"
  ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "cash_entries_tenantId_workspaceId_idempotencyKey_key"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "idempotencyKey");

-- A Z-Bon is a daily aggregate, not an individual retail sale. Its business
-- identity is register + day. Reversed entries leave this partial index, so a
-- corrected replacement can be posted.
CREATE UNIQUE INDEX "cash_entries_one_active_daily_z_report_per_day"
  ON "accounting"."cash_entries"("tenantId", "workspaceId", "registerId", "dayKey")
  WHERE "entryType" = 'SALE_CASH'
    AND "sourceDocumentKind" = 'DAILY_Z_REPORT'
    AND "reversedByEntryId" IS NULL;

ALTER TABLE "accounting"."cash_entry_confirmations"
  ADD COLUMN IF NOT EXISTS "consumedEntryId" TEXT;
