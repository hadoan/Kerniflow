-- DropIndex
DROP INDEX IF EXISTS "accounting"."cash_assistant_workspaces_tenantId_locationId_registerId_bu_key";
DROP INDEX IF EXISTS "accounting"."cash_assistant_workspaces_tenantId_workspaceId_registerId_t_key";
DROP INDEX IF EXISTS "accounting"."cash_workspace_daily_idx";
DROP INDEX IF EXISTS "accounting"."cash_workspace_monthly_idx";
DROP INDEX "accounting"."cash_assistant_workspaces_tenantId_workspaceId_type_busines_idx";

-- AlterTable
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD COLUMN "archivedAt" TIMESTAMPTZ(6);
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD COLUMN "cashDayId" TEXT;
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD COLUMN "createdByUserId" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "accounting"."cash_assistant_workspaces" DROP COLUMN "businessDate";
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD COLUMN "businessDate" DATE;
ALTER TABLE "accounting"."cash_assistant_workspaces" DROP COLUMN "businessMonth";
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD COLUMN "businessMonth" DATE;

-- CreateIndex
CREATE INDEX "cash_assistant_workspaces_tenantId_workspaceId_type_busines_idx" ON "accounting"."cash_assistant_workspaces"("tenantId", "workspaceId", "type", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "cash_workspace_daily_idx" ON "accounting"."cash_assistant_workspaces"("tenantId", "locationId", "registerId", "businessDate", "type");

-- CreateIndex
CREATE UNIQUE INDEX "cash_workspace_monthly_idx" ON "accounting"."cash_assistant_workspaces"("tenantId", "locationId", "registerId", "businessMonth", "type");

-- Add Check Constraints
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD CONSTRAINT cash_assistant_workspaces_check_daily CHECK (
  "type" != 'DAILY_CASH_DAY' OR (
    "businessDate" IS NOT NULL AND
    "businessMonth" IS NULL AND
    "locationId" IS NOT NULL AND
    "registerId" IS NOT NULL
  )
);

ALTER TABLE "accounting"."cash_assistant_workspaces" ADD CONSTRAINT cash_assistant_workspaces_check_monthly CHECK (
  "type" != 'MONTHLY_REVIEW' OR (
    "businessDate" IS NULL AND
    "businessMonth" IS NOT NULL AND
    "locationId" IS NOT NULL AND
    "registerId" IS NOT NULL
  )
);

ALTER TABLE "accounting"."cash_assistant_workspaces" ADD CONSTRAINT cash_assistant_workspaces_check_general CHECK (
  "type" != 'GENERAL_HELP' OR (
    "businessDate" IS NULL AND
    "businessMonth" IS NULL AND
    "cashDayId" IS NULL
  )
);
