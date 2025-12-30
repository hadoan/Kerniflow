/*
  Warnings:

  - You are about to drop the `app_catalog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pack_catalog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `seeded_record_meta` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `template_catalog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_app_install` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_menu_override` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_pack_install` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `tenant_template_install` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "PackInstallStatus" AS ENUM ('PENDING', 'RUNNING', 'FAILED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "MenuScope" AS ENUM ('WEB', 'POS');

-- DropForeignKey
ALTER TABLE "seeded_record_meta" DROP CONSTRAINT "seeded_record_meta_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_app_install" DROP CONSTRAINT "tenant_app_install_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_menu_override" DROP CONSTRAINT "tenant_menu_override_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_pack_install" DROP CONSTRAINT "tenant_pack_install_tenant_id_fkey";

-- DropForeignKey
ALTER TABLE "tenant_template_install" DROP CONSTRAINT "tenant_template_install_tenant_id_fkey";

-- DropTable
DROP TABLE "app_catalog";

-- DropTable
DROP TABLE "pack_catalog";

-- DropTable
DROP TABLE "seeded_record_meta";

-- DropTable
DROP TABLE "template_catalog";

-- DropTable
DROP TABLE "tenant_app_install";

-- DropTable
DROP TABLE "tenant_menu_override";

-- DropTable
DROP TABLE "tenant_pack_install";

-- DropTable
DROP TABLE "tenant_template_install";

-- DropEnum
DROP TYPE "menu_scope";

-- DropEnum
DROP TYPE "pack_install_status";

-- CreateTable
CREATE TABLE "AppCatalog" (
    "appId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 0,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "depsJson" TEXT NOT NULL,
    "permissionsJson" TEXT NOT NULL,
    "capabilitiesJson" TEXT NOT NULL,
    "menuJson" TEXT NOT NULL,
    "settingsSchemaJson" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AppCatalog_pkey" PRIMARY KEY ("appId")
);

-- CreateTable
CREATE TABLE "TenantAppInstall" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "app_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "installed_version" TEXT NOT NULL,
    "config_json" TEXT,
    "enabled_at" TIMESTAMPTZ(6),
    "enabled_by_user_id" TEXT,
    "disabled_at" TIMESTAMPTZ(6),
    "disabled_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantAppInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TemplateCatalog" (
    "template_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "requires_apps_json" TEXT NOT NULL,
    "params_schema_json" TEXT NOT NULL,
    "upgrade_policy_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TemplateCatalog_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "TenantTemplateInstall" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "params_json" TEXT NOT NULL,
    "applied_by_user_id" TEXT,
    "applied_at" TIMESTAMPTZ(6) NOT NULL,
    "result_summary_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantTemplateInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackCatalog" (
    "pack_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "description" TEXT,
    "definition_json" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "PackCatalog_pkey" PRIMARY KEY ("pack_id")
);

-- CreateTable
CREATE TABLE "TenantPackInstall" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "pack_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "status" "PackInstallStatus" NOT NULL DEFAULT 'PENDING',
    "params_json" TEXT,
    "log_json" TEXT NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "installed_by_user_id" TEXT,
    "error_json" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantPackInstall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantMenuOverride" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "scope" "MenuScope" NOT NULL,
    "overrides_json" TEXT NOT NULL,
    "updated_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "TenantMenuOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeededRecordMeta" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "source_template_id" TEXT NOT NULL,
    "source_template_version" TEXT NOT NULL,
    "is_customized" BOOLEAN NOT NULL DEFAULT false,
    "customized_at" TIMESTAMPTZ(6),
    "customized_by_user_id" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "SeededRecordMeta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AppCatalog_tier_idx" ON "AppCatalog"("tier");

-- CreateIndex
CREATE INDEX "AppCatalog_updatedAt_idx" ON "AppCatalog"("updatedAt");

-- CreateIndex
CREATE INDEX "TenantAppInstall_tenant_id_enabled_idx" ON "TenantAppInstall"("tenant_id", "enabled");

-- CreateIndex
CREATE INDEX "TenantAppInstall_tenant_id_created_at_idx" ON "TenantAppInstall"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TenantAppInstall_tenant_id_app_id_key" ON "TenantAppInstall"("tenant_id", "app_id");

-- CreateIndex
CREATE INDEX "TemplateCatalog_category_idx" ON "TemplateCatalog"("category");

-- CreateIndex
CREATE INDEX "TemplateCatalog_updated_at_idx" ON "TemplateCatalog"("updated_at");

-- CreateIndex
CREATE INDEX "TenantTemplateInstall_tenant_id_created_at_idx" ON "TenantTemplateInstall"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TenantTemplateInstall_tenant_id_template_id_key" ON "TenantTemplateInstall"("tenant_id", "template_id");

-- CreateIndex
CREATE INDEX "PackCatalog_updated_at_idx" ON "PackCatalog"("updated_at");

-- CreateIndex
CREATE INDEX "TenantPackInstall_tenant_id_status_idx" ON "TenantPackInstall"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "TenantPackInstall_tenant_id_created_at_idx" ON "TenantPackInstall"("tenant_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "TenantPackInstall_tenant_id_pack_id_version_key" ON "TenantPackInstall"("tenant_id", "pack_id", "version");

-- CreateIndex
CREATE INDEX "TenantMenuOverride_tenant_id_idx" ON "TenantMenuOverride"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "TenantMenuOverride_tenant_id_scope_key" ON "TenantMenuOverride"("tenant_id", "scope");

-- CreateIndex
CREATE INDEX "SeededRecordMeta_tenant_id_source_template_id_idx" ON "SeededRecordMeta"("tenant_id", "source_template_id");

-- CreateIndex
CREATE INDEX "SeededRecordMeta_tenant_id_target_table_is_customized_idx" ON "SeededRecordMeta"("tenant_id", "target_table", "is_customized");

-- CreateIndex
CREATE UNIQUE INDEX "SeededRecordMeta_tenant_id_target_table_target_id_key" ON "SeededRecordMeta"("tenant_id", "target_table", "target_id");

-- AddForeignKey
ALTER TABLE "TenantAppInstall" ADD CONSTRAINT "TenantAppInstall_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantTemplateInstall" ADD CONSTRAINT "TenantTemplateInstall_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantPackInstall" ADD CONSTRAINT "TenantPackInstall_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantMenuOverride" ADD CONSTRAINT "TenantMenuOverride_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeededRecordMeta" ADD CONSTRAINT "SeededRecordMeta_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
