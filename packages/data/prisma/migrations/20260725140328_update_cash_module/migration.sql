-- AlterTable
ALTER TABLE "commerce"."kitchen_stations" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."kitchen_tickets" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."pos_sale_records" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_approval_requests" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_dining_rooms" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_modifier_groups" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_modifier_options" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_order_item_modifiers" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_order_items" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_orders" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_table_sessions" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "commerce"."restaurant_tables" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "crm"."CoachingBookingHold" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateTable
CREATE TABLE "accounting"."cash_day_confirmations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "registerId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
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

    CONSTRAINT "cash_day_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_day_confirmations_tenantId_workspaceId_registerId_idx" ON "accounting"."cash_day_confirmations"("tenantId", "workspaceId", "registerId");

-- CreateIndex
CREATE INDEX "cash_day_confirmations_tenantId_workspaceId_conversationId_idx" ON "accounting"."cash_day_confirmations"("tenantId", "workspaceId", "conversationId");

-- CreateIndex
CREATE INDEX "cash_day_confirmations_status_expiresAt_idx" ON "accounting"."cash_day_confirmations"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "kitchen_ticket_items_tenantId_workspaceId_ticketId_idx" ON "commerce"."kitchen_ticket_items"("tenantId", "workspaceId", "ticketId");

-- CreateIndex
CREATE INDEX "kitchen_ticket_items_tenantId_workspaceId_orderItemId_idx" ON "commerce"."kitchen_ticket_items"("tenantId", "workspaceId", "orderItemId");

-- CreateIndex
CREATE INDEX "kitchen_tickets_tenantId_workspaceId_orderId_idx" ON "commerce"."kitchen_tickets"("tenantId", "workspaceId", "orderId");

-- CreateIndex
CREATE INDEX "restaurant_approval_requests_tenantId_workspaceId_workflowI_idx" ON "commerce"."restaurant_approval_requests"("tenantId", "workspaceId", "workflowInstanceId");

-- CreateIndex
CREATE INDEX "restaurant_menu_item_modifier_groups_tenantId_workspaceId_c_idx" ON "commerce"."restaurant_menu_item_modifier_groups"("tenantId", "workspaceId", "catalogItemId", "sortOrder");

-- CreateIndex
CREATE INDEX "restaurant_modifier_groups_tenantId_workspaceId_sortOrder_idx" ON "commerce"."restaurant_modifier_groups"("tenantId", "workspaceId", "sortOrder");

-- CreateIndex
CREATE INDEX "restaurant_modifier_options_tenantId_workspaceId_modifierGr_idx" ON "commerce"."restaurant_modifier_options"("tenantId", "workspaceId", "modifierGroupId", "sortOrder");

-- CreateIndex
CREATE INDEX "restaurant_order_item_modifiers_tenantId_workspaceId_orderI_idx" ON "commerce"."restaurant_order_item_modifiers"("tenantId", "workspaceId", "orderItemId");

-- CreateIndex
CREATE INDEX "restaurant_order_items_tenantId_workspaceId_catalogItemId_idx" ON "commerce"."restaurant_order_items"("tenantId", "workspaceId", "catalogItemId");

-- CreateIndex
CREATE INDEX "restaurant_orders_tenantId_workspaceId_tableSessionId_idx" ON "commerce"."restaurant_orders"("tenantId", "workspaceId", "tableSessionId");

-- CreateIndex
CREATE INDEX "restaurant_table_sessions_tenantId_workspaceId_status_opene_idx" ON "commerce"."restaurant_table_sessions"("tenantId", "workspaceId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "restaurant_tables_tenantId_workspaceId_availabilityStatus_idx" ON "commerce"."restaurant_tables"("tenantId", "workspaceId", "availabilityStatus");

-- RenameForeignKey
ALTER TABLE "commerce"."kitchen_ticket_items" RENAME CONSTRAINT "kitchen_ticket_items_order_item_fkey" TO "kitchen_ticket_items_orderItemId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."kitchen_ticket_items" RENAME CONSTRAINT "kitchen_ticket_items_ticket_fkey" TO "kitchen_ticket_items_ticketId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."kitchen_tickets" RENAME CONSTRAINT "kitchen_tickets_order_fkey" TO "kitchen_tickets_orderId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."kitchen_tickets" RENAME CONSTRAINT "kitchen_tickets_station_fkey" TO "kitchen_tickets_stationId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_approval_requests" RENAME CONSTRAINT "restaurant_approval_requests_order_fkey" TO "restaurant_approval_requests_orderId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_approval_requests" RENAME CONSTRAINT "restaurant_approval_requests_order_item_fkey" TO "restaurant_approval_requests_orderItemId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_menu_item_modifier_groups" RENAME CONSTRAINT "restaurant_menu_item_modifier_groups_group_fkey" TO "restaurant_menu_item_modifier_groups_modifierGroupId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_modifier_options" RENAME CONSTRAINT "restaurant_modifier_options_group_fkey" TO "restaurant_modifier_options_modifierGroupId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_order_item_modifiers" RENAME CONSTRAINT "restaurant_order_item_modifiers_item_fkey" TO "restaurant_order_item_modifiers_orderItemId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_order_items" RENAME CONSTRAINT "restaurant_order_items_order_fkey" TO "restaurant_order_items_orderId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_order_payments" RENAME CONSTRAINT "restaurant_order_payments_order_fkey" TO "restaurant_order_payments_orderId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_orders" RENAME CONSTRAINT "restaurant_orders_session_fkey" TO "restaurant_orders_tableSessionId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_table_sessions" RENAME CONSTRAINT "restaurant_table_sessions_table_fkey" TO "restaurant_table_sessions_tableId_fkey";

-- RenameForeignKey
ALTER TABLE "commerce"."restaurant_tables" RENAME CONSTRAINT "restaurant_tables_dining_room_fkey" TO "restaurant_tables_diningRoomId_fkey";

-- AddForeignKey
ALTER TABLE "accounting"."cash_day_confirmations" ADD CONSTRAINT "cash_day_confirmations_registerId_fkey" FOREIGN KEY ("registerId") REFERENCES "accounting"."cash_registers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_day_confirmations" ADD CONSTRAINT "cash_day_confirmations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "identity"."Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting"."cash_day_confirmations" ADD CONSTRAINT "cash_day_confirmations_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "platform"."Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "commerce"."kitchen_stations_tenant_workspace_code_key" RENAME TO "kitchen_stations_tenantId_workspaceId_code_key";

-- RenameIndex
ALTER INDEX "commerce"."kitchen_stations_tenant_workspace_name_key" RENAME TO "kitchen_stations_tenantId_workspaceId_name_key";

-- RenameIndex
ALTER INDEX "commerce"."kitchen_tickets_send_key_station_key" RENAME TO "kitchen_tickets_tenantId_workspaceId_sendKey_stationId_key";

-- RenameIndex
ALTER INDEX "commerce"."kitchen_tickets_status_idx" RENAME TO "kitchen_tickets_tenantId_workspaceId_status_sentAt_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_approval_requests_status_idx" RENAME TO "restaurant_approval_requests_tenantId_workspaceId_orderId_s_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_dining_rooms_sort_idx" RENAME TO "restaurant_dining_rooms_tenantId_workspaceId_sortOrder_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_dining_rooms_tenant_workspace_name_key" RENAME TO "restaurant_dining_rooms_tenantId_workspaceId_name_key";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_menu_item_modifier_groups_unique_key" RENAME TO "restaurant_menu_item_modifier_groups_tenantId_workspaceId_c_key";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_modifier_groups_tenant_workspace_name_key" RENAME TO "restaurant_modifier_groups_tenantId_workspaceId_name_key";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_modifier_options_group_name_key" RENAME TO "restaurant_modifier_options_tenantId_workspaceId_modifierGr_key";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_order_items_order_idx" RENAME TO "restaurant_order_items_tenantId_workspaceId_orderId_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_order_payments_order_idx" RENAME TO "restaurant_order_payments_tenantId_workspaceId_orderId_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_orders_table_status_idx" RENAME TO "restaurant_orders_tenantId_workspaceId_tableId_status_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_table_sessions_table_status_idx" RENAME TO "restaurant_table_sessions_tenantId_workspaceId_tableId_stat_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_tables_room_idx" RENAME TO "restaurant_tables_tenantId_workspaceId_diningRoomId_idx";

-- RenameIndex
ALTER INDEX "commerce"."restaurant_tables_tenant_workspace_room_name_key" RENAME TO "restaurant_tables_tenantId_workspaceId_diningRoomId_name_key";

-- RenameIndex
ALTER INDEX "crm"."CoachingPaymentProviderEvent_tenantId_engagementId_processedAt_" RENAME TO "CoachingPaymentProviderEvent_tenantId_engagementId_processe_idx";

-- RenameIndex
ALTER INDEX "crm"."CoachingPaymentProviderEvent_tenantId_provider_providerEventId_" RENAME TO "CoachingPaymentProviderEvent_tenantId_provider_providerEven_key";
