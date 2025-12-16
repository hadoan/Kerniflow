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
