-- CreateTable
CREATE TABLE "accounting"."cash_workspace_handoffs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "locationId" TEXT,
    "registerId" TEXT NOT NULL,
    "sourceWorkspaceId" TEXT NOT NULL,
    "targetWorkspaceId" TEXT NOT NULL,
    "sourceConversationId" TEXT NOT NULL,
    "sourceMessageId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "evidenceRequirement" TEXT,
    "candidateHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "confirmationId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "viewedAt" TIMESTAMPTZ(6),
    "viewedByUserId" TEXT,
    "consumedAt" TIMESTAMPTZ(6),
    "cancelledAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_workspace_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounting"."cash_entry_confirmations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "conversationId" TEXT,
    "preparedByUserId" TEXT NOT NULL,
    "businessDate" TEXT NOT NULL,
    "candidatePayload" JSONB NOT NULL,
    "candidateHash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "confirmedAt" TIMESTAMPTZ(6),
    "consumedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cash_entry_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_workspace_handoffs_tenantId_targetWorkspaceId_idx" ON "accounting"."cash_workspace_handoffs"("tenantId", "targetWorkspaceId");

-- CreateIndex
CREATE INDEX "cash_workspace_handoffs_status_expiresAt_idx" ON "accounting"."cash_workspace_handoffs"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "cash_entry_confirmations_tenantId_workspaceId_registerId_idx" ON "accounting"."cash_entry_confirmations"("tenantId", "workspaceId", "registerId");

-- CreateIndex
CREATE INDEX "cash_entry_confirmations_status_expiresAt_idx" ON "accounting"."cash_entry_confirmations"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "accounting"."cash_workspace_handoffs" ADD CONSTRAINT "cash_workspace_handoffs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_workspace_handoffs" ADD CONSTRAINT "cash_workspace_handoffs_sourceWorkspaceId_fkey" FOREIGN KEY ("sourceWorkspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_workspace_handoffs" ADD CONSTRAINT "cash_workspace_handoffs_targetWorkspaceId_fkey" FOREIGN KEY ("targetWorkspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_workspace_handoffs" ADD CONSTRAINT "cash_workspace_handoffs_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_entry_confirmations" ADD CONSTRAINT "cash_entry_confirmations_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_entry_confirmations" ADD CONSTRAINT "cash_entry_confirmations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_entry_confirmations" ADD CONSTRAINT "cash_entry_confirmations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
