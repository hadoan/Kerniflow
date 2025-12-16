# Kerniflow (minimal scaffold)

Monorepo via `pnpm-workspace.yaml` (apps + services + packages).

- apps/web: Vite + React + Tailwind + i18n mock UI
- services/api: NestJS HTTP API (tsx runtime)
- services/worker: NestJS application context worker
- packages/contracts + packages/domain: shared TS packages built with tsdown

## Quick start

```bash
pnpm install
pnpm -r build
pnpm dev
```

## Code Quality

This repo uses **Husky** + **lint-staged** for automated code quality checks and **GitHub Actions** for CI.

### Setup

Hooks are automatically installed when you run `pnpm install` (via the `prepare` script).

### Manual Commands

```bash
# Format all code
pnpm format

# Run ESLint
pnpm lint

# Fix ESLint issues
pnpm lint:fix

# Typecheck all packages
pnpm typecheck

# Run all checks (lint + typecheck)
pnpm check
```

### Hooks

- **Pre-commit**: Runs Prettier and ESLint on staged files only (fast ✨)
- **Pre-push**: Runs typecheck across the monorepo
- **CI**: Full validation on every PR/push (eslint, prettier, typecheck, build)

### Skip Hooks

If needed, bypass hooks with:

```bash
HUSKY=0 git commit
HUSKY=0 git push
```

⚠️ Use sparingly—hooks exist to keep code quality high.

### Monorepo Note

- ESLint runs from repo root but respects package-specific configs
- Prettier formats all supported files in the monorepo
- Typecheck runs on all packages that define a `typecheck` script in their `package.json`

For package-specific linting configs, see [apps/web/eslint.config.js](apps/web/eslint.config.js).
