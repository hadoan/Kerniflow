# Tenant Custom Fields & Layouts (Backend)

## Overview

- Adds tenant-scoped custom field definitions, optional indexing, and entity layouts for expenses/invoices/clients.
- Core entities now include a `custom` JSON column to store values.
- Domain logic validates and normalizes custom values and can build index rows for filtered queries.
- New API module exposes admin endpoints to manage definitions and layouts.

## Data model

- New Prisma models in `packages/data/prisma/schema/15_customization.prisma`:
  - `CustomFieldDefinition` (unique per tenant + entityType + key, soft-deletable).
  - `CustomFieldIndex` (typed columns for indexed fields).
  - `EntityLayout` (per-tenant, per-entity layout JSON).
- Entities updated to include `custom Json?`:
  - `Expense` (`65_expenses.prisma`)
  - `Invoice` (`60_billing.prisma`)
  - `Client` (new `55_clients.prisma`)

## Contracts

- Shared schemas/types live at `packages/contracts/src/common/customization/custom-field.ts`.
- Expense/Invoice DTOs accept optional `custom` payloads.

## Domain

- Pure validation/coercion for custom values (`validateAndNormalizeCustomValues`) and index row building (`buildCustomFieldIndexes`).
- Ports for definitions, indexes, and layouts plus use-cases for create/update/list/upsert layout.
- Tests in `packages/domain/src/customization/__tests__/validate-and-normalize.spec.ts`.

## API

- New Nest module `services/api/src/modules/customization`:
  - `GET/POST/PUT/DELETE /customization/custom-fields`
  - `GET/PUT /customization/layouts/:entityType`
  - Uses audit + idempotency; guarded by auth.
- Expenses/Invoices write flows now:
  - Load active definitions, validate/normalize `custom`, persist JSON, and write index rows.

## Repositories

- Prisma adapters for definitions, indexes, and layouts in `packages/data/src/repositories/*`.

## Migration & build

- Prisma schema updated but migration not generated (local DB unavailable during setup). Run:
  - `pnpm --filter @corely/data exec prisma migrate dev --name customization`
- Rebuild contracts/domain after schema changes:
  - `pnpm --filter @corely/contracts build && pnpm --filter @corely/domain build`

## Remaining gaps / follow-ups

- Frontend wiring (API client, shared custom field renderers, settings UI, entity form integration) not yet implemented.
- Worker job for index rebuild and mock-server routes still pending.
- Ensure authZ refinement for admin-only management endpoints as needed.
