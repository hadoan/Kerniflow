-- Preserve closed-day corrections as append-only revisions. A day close itself is never reopened.
CREATE TABLE "accounting"."cash_day_close_revisions" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "registerId" TEXT NOT NULL,
  "dayCloseId" TEXT NOT NULL,
  "correctionEntryId" TEXT NOT NULL,
  "revisionNo" INTEGER NOT NULL,
  "correctionType" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "occurredAt" TIMESTAMPTZ(6) NOT NULL,
  "recordedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdByUserId" TEXT NOT NULL,
  "originalSnapshot" JSONB NOT NULL,
  "correctedSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cash_day_close_revisions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_day_close_revisions_correctionEntryId_key"
  ON "accounting"."cash_day_close_revisions"("correctionEntryId");
CREATE UNIQUE INDEX "cash_day_close_revisions_dayCloseId_revisionNo_key"
  ON "accounting"."cash_day_close_revisions"("dayCloseId", "revisionNo");
CREATE INDEX "cash_day_close_revisions_tenantId_workspaceId_registerId_dayCloseId_idx"
  ON "accounting"."cash_day_close_revisions"("tenantId", "workspaceId", "registerId", "dayCloseId");

CREATE TABLE "accounting"."cash_day_close_review_requirements" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "revisionId" TEXT NOT NULL,
  "affectedDayCloseId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'REVIEW_REQUIRED',
  "reviewedAt" TIMESTAMPTZ(6),
  "reviewedByUserId" TEXT,
  "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "cash_day_close_review_requirements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "cash_day_close_review_requirements_revisionId_affectedDayCloseId_key"
  ON "accounting"."cash_day_close_review_requirements"("revisionId", "affectedDayCloseId");
CREATE INDEX "cash_day_close_review_requirements_tenantId_workspaceId_affectedDayCloseId_status_idx"
  ON "accounting"."cash_day_close_review_requirements"("tenantId", "workspaceId", "affectedDayCloseId", "status");

ALTER TABLE "accounting"."cash_day_close_revisions"
  ADD CONSTRAINT "cash_day_close_revisions_dayCloseId_fkey"
  FOREIGN KEY ("dayCloseId") REFERENCES "accounting"."cash_day_closes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accounting"."cash_day_close_revisions"
  ADD CONSTRAINT "cash_day_close_revisions_correctionEntryId_fkey"
  FOREIGN KEY ("correctionEntryId") REFERENCES "accounting"."cash_entries"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accounting"."cash_day_close_review_requirements"
  ADD CONSTRAINT "cash_day_close_review_requirements_revisionId_fkey"
  FOREIGN KEY ("revisionId") REFERENCES "accounting"."cash_day_close_revisions"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "accounting"."cash_day_close_review_requirements"
  ADD CONSTRAINT "cash_day_close_review_requirements_affectedDayCloseId_fkey"
  FOREIGN KEY ("affectedDayCloseId") REFERENCES "accounting"."cash_day_closes"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "accounting"."cash_entry_confirmations"
  ADD COLUMN IF NOT EXISTS "consumedEntryId" TEXT;
