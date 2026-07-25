-- CreateTable
CREATE TABLE "accounting"."cash_assistant_workspaces" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "registerId" TEXT,
    "locationId" TEXT,
    "type" TEXT NOT NULL,
    "businessDate" TEXT,
    "businessMonth" TEXT,
    "conversationId" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_assistant_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cash_assistant_workspaces_conversationId_key" ON "accounting"."cash_assistant_workspaces"("conversationId");

-- CreateIndex
CREATE INDEX "cash_assistant_workspaces_tenantId_workspaceId_conversation_idx" ON "accounting"."cash_assistant_workspaces"("tenantId", "workspaceId", "conversationId");

-- CreateIndex
CREATE INDEX "cash_assistant_workspaces_tenantId_workspaceId_type_busines_idx" ON "accounting"."cash_assistant_workspaces"("tenantId", "workspaceId", "type", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "cash_assistant_workspaces_tenantId_workspaceId_registerId_t_key" ON "accounting"."cash_assistant_workspaces"("tenantId", "workspaceId", "registerId", "type", "businessDate", "businessMonth");

-- AddForeignKey
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD CONSTRAINT "cash_assistant_workspaces_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD CONSTRAINT "cash_assistant_workspaces_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_assistant_workspaces" ADD CONSTRAINT "cash_assistant_workspaces_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
