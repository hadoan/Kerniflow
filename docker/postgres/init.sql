-- ============================================================================
-- Corely PostgreSQL Initialization Script
-- ============================================================================
-- This script runs automatically when the postgres container first starts.
-- It ensures the database and required extensions are set up.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Note: The database and user are already created by the POSTGRES_DB,
-- POSTGRES_USER, and POSTGRES_PASSWORD environment variables in docker-compose.yml
-- This file is mainly for schema setup or additional initialization if needed.

-- You can add your custom initialization here (e.g., creating schemas, initial data, etc.)
