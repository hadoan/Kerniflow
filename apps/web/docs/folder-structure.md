# Corely Frontend — Folder Structure (apps/webs)

This document explains how the frontend code is organized inside `apps/webs/src` and the rules for keeping it scalable as we add more modules (freelancer → full ERP).

---

## Overview

The frontend is organized as:

- **app/**: application shell and composition (routing, providers, layout)
- **modules/**: feature modules (assistant, expenses, invoices, etc.)
- **shared/**: reusable building blocks used across multiple modules
- **assets/**: static assets used by the app
- **main.tsx / index.css**: app entry + global styles

---

## Folder Map

```

apps/webs/src/
app/
AppShell.tsx
router/
index.ts
providers/
index.ts

modules/
assistant/
components/
screens/
hooks/
routes.tsx
index.ts
expenses/
components/
screens/
hooks/
routes.tsx
index.ts
invoices/
components/
screens/
hooks/
routes.tsx
index.ts
clients/
components/
screens/
hooks/
routes.tsx
index.ts
settings/
components/
screens/
hooks/
routes.tsx
index.ts

shared/
api/
index.ts
components/
index.ts
ui/
index.ts
lib/
index.ts
i18n/
index.ts
locales/
en.json
de.json
theme/
index.ts

assets/
main.tsx
index.css

```

> Note: some folders may start empty if the feature doesn’t exist yet. Don’t invent abstractions—add files only when needed.

---

## What goes where

### `app/` — App composition (thin)

**Purpose:** wire the app together, but avoid business logic.

Typical contents:

- `AppShell.tsx`: global layout (sidebar/topbar), consistent page chrome
- `router/`: route composition (often built from module routes)
- `providers/`: global providers (i18n, theme, query client, auth wrapper)

Rules:

- **No business rules** here (no “create expense” logic, no invoice calculations)
- Only import feature screens from `modules/*`

---

### `modules/` — Feature modules (primary growth axis)

**Purpose:** each module contains everything needed for that feature.

Inside each module:

- `screens/`: full pages or major views
- `components/`: feature-specific components
- `hooks/`: feature-specific hooks (state, data fetching)
- `routes.tsx`: route definitions owned by the module (if applicable)
- `index.ts`: barrel export for public module API (optional, keep minimal)

Rules:

- If a component/hook is **used only in one module**, keep it inside that module.
- A module can own its own “sub-domain” UI (tables, drawers, wizards) if it’s not reused elsewhere.
- Keep module boundaries clean: module A shouldn’t reach into module B internals.

---

### `shared/` — Cross-module reusable code

**Purpose:** shared infrastructure and UI building blocks used by multiple modules.

Subfolders:

- `shared/api/`: HTTP client, endpoint helpers, request wrappers, error normalization
- `shared/components/`: reusable business-agnostic UI (Drawer, DataTable, EmptyState, Skeleton)
- `shared/ui/`: design system primitives (buttons, inputs, cards) or shadcn-like components
- `shared/lib/`: pure utilities (format money/date, idempotency keys, small helpers)
- `shared/i18n/`: i18n init + locale JSONs
- `shared/theme/`: theme tokens, theme provider/toggle

Rules:

- Only put something in `shared/` if it is **clearly reused**.
- Keep shared code **generic** and avoid embedding module-specific assumptions.
- `shared/api` must be the single place for API calls helpers (don’t scatter fetch logic everywhere).

---

### `assets/`

Static images, icons, logos, etc.

---

## Import rules (to avoid spaghetti)

### Allowed

- `modules/*` can import from `shared/*`
- `app/*` can import from `modules/*` and `shared/*`
- `shared/*` should not import from `modules/*`

### Avoid

- Module-to-module deep imports like:
  - ❌ `modules/invoices/components/...` from `modules/expenses`
- Prefer exposing module “public” exports via `modules/<name>/index.ts` if needed.

---

## Naming conventions

- Module folder names: `assistant`, `expenses`, `invoices`, `clients`, `settings`
- Screen component names: `SomethingScreen.tsx` (e.g., `AssistantScreen.tsx`)
- Feature components: descriptive (e.g., `ReceiptUploadCard.tsx`)
- Hooks: `useXxx.ts` (e.g., `useInvoices.ts`)

---

## How to add a new feature module (future ERP)

Example: adding `inventory`

1. Create:

```

modules/inventory/
screens/
components/
hooks/
routes.tsx
index.ts

```

2. Add route(s) in `modules/inventory/routes.tsx`
3. Register routes/nav in the app router composition (`app/router/index.ts`), preferably by importing module routes.

---

## “No logic change” refactors (important)

When reorganizing folders:

- Only move files and update import paths
- Do not change behavior
- Do not rewrite functions
- Do not change state flow or API logic

---

## Quick guideline: module vs shared

Put it in a **module** if:

- it’s feature-specific
- it’s only used in one feature

Put it in **shared** if:

- it’s used in 2+ modules
- it’s generic UI or infrastructure

When in doubt: **keep it in the module first**. Promote to shared later when reuse is proven.
