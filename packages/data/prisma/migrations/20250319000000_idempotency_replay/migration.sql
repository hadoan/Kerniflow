-- Extend idempotency records to support replay semantics
ALTER TABLE "IdempotencyKey"
  ADD COLUMN "userId" TEXT,
  ADD COLUMN "requestHash" TEXT,
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
  ADD COLUMN "responseStatus" INTEGER,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "expiresAt" TIMESTAMP(3);

-- Populate status for existing completed rows
UPDATE "IdempotencyKey"
SET "status" = 'COMPLETED'
WHERE "responseJson" IS NOT NULL;
