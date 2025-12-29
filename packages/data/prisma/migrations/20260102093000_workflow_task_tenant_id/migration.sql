ALTER TABLE "Task" ADD COLUMN "tenantId" TEXT;

UPDATE "Task" SET "tenantId" = "WorkflowInstance"."tenantId"
FROM "WorkflowInstance"
WHERE "Task"."instanceId" = "WorkflowInstance"."id";

ALTER TABLE "Task" ALTER COLUMN "tenantId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Task_tenantId_status_runAt_idx" ON "Task" ("tenantId", "status", "runAt");
CREATE INDEX IF NOT EXISTS "Task_instanceId_status_idx" ON "Task" ("instanceId", "status");
CREATE INDEX IF NOT EXISTS "Task_tenantId_idempotencyKey_idx" ON "Task" ("tenantId", "idempotencyKey");
CREATE INDEX IF NOT EXISTS "Task_status_lockedAt_idx" ON "Task" ("status", "lockedAt");
CREATE INDEX IF NOT EXISTS "Task_runAt_status_idx" ON "Task" ("runAt", "status");
