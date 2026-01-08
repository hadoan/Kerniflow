-- Enable default apps for existing workspace
-- Run this against your database to enable the core apps
-- Updated for kerniflow database and credentials
--
-- IMPORTANT: Use these credentials based on your actual database:
-- User: kerniflow
-- Database: kerniflow
-- Password: kerniflow (from docker-compose.local.yml)
--
-- Run with: docker exec -i corely_postgres psql -U kerniflow -d kerniflow < enable-default-apps.sql

-- First, find the tenantId from the workspace
-- SELECT "tenantId" FROM "Workspace" WHERE id = 'a5007e62-5f59-4fff-91d2-4a49527d55dc';

-- For a PERSONAL (freelancer) workspace, enable these apps:
INSERT INTO "TenantAppInstall" (id, tenant_id, app_id, enabled, installed_version, config_json, created_at, updated_at)
SELECT
  gen_random_uuid(),
  w."tenantId",
  app_id,
  true,
  '1.0.0',
  '{}',
  NOW(),
  NOW()
FROM "Workspace" w
CROSS JOIN (
  VALUES
    ('core'),
    ('invoices'),
    ('expenses'),
    ('parties'),
    ('crm'),
    ('ai-copilot'),
    ('workspaces'),
    ('platform')
) AS apps(app_id)
WHERE w.id = 'a5007e62-5f59-4fff-91d2-4a49527d55dc'
ON CONFLICT (tenant_id, app_id) DO UPDATE SET enabled = true;

-- Verify the installations
SELECT
  tai.app_id,
  tai.enabled,
  w.name as workspace_name,
  le.kind as workspace_kind
FROM "TenantAppInstall" tai
JOIN "Workspace" w ON w."tenantId" = tai.tenant_id
JOIN "LegalEntity" le ON le.id = w."legalEntityId"
WHERE w.id = 'a5007e62-5f59-4fff-91d2-4a49527d55dc'
ORDER BY tai.app_id;
