[dotenv@17.2.3] injecting env (59) from ../../.env -- tip: 📡 add observability to secrets: https://dotenvx.com/ops
[dotenv@17.2.3] injecting env (0) from ../../.env.dev -- tip: ⚙️  override existing env vars with { override: true }
-- AlterTable
ALTER TABLE "accounting"."cash_day_closes" ADD COLUMN     "verificationStatus" TEXT NOT NULL DEFAULT 'NOT_COUNTED',
ALTER COLUMN "countedBalanceCents" DROP NOT NULL,
ALTER COLUMN "differenceCents" DROP NOT NULL;

-- CreateTable
CREATE TABLE "accounting"."cash_location_transfers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "cashFundId" TEXT NOT NULL,
    "fromLocationId" TEXT NOT NULL,
    "toLocationId" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "businessDate" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_location_transfers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_location_transfers_tenantId_workspaceId_cashFundId_bus_idx" ON "accounting"."cash_location_transfers"("tenantId", "workspaceId", "cashFundId", "businessDate");

-- AddForeignKey
ALTER TABLE "accounting"."cash_location_transfers" ADD CONSTRAINT "cash_location_transfers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_location_transfers" ADD CONSTRAINT "cash_location_transfers_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

