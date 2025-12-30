# @corely/vite-config

Shared Vite and Vitest configuration helpers for the Corely monorepo.

## Installation

```bash
pnpm add -D @corely/vite-config@workspace:* vite vitest
```

## Usage

### Basic Vite Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { createBaseViteConfig } from "@corely/vite-config";
import path from "path";

export default defineConfig(({ mode }) => {
  const baseConfig = createBaseViteConfig({
    port: 8080,
    plugins: [react()],
    aliases: {
      "@": path.resolve(__dirname, "./src"),
    },
    excludeFromOptimizeDeps: ["@corely/contracts", "@corely/domain"],
    watchWorkspacePackages: ["@corely/*"],
  });

  return {
    ...baseConfig,
    // Add app-specific overrides
  };
});
```

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import { createBaseVitestConfig } from "@corely/vite-config";

export default defineConfig({
  ...createBaseVitestConfig({
    setupFiles: ["./src/test/setup.ts"],
    coverage: true,
  }),
});
```

### Combined Vite + Vitest Config

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import {
  createBaseViteConfig,
  createBaseVitestConfig,
  mergeViteAndVitest,
} from "@corely/vite-config";

export default defineConfig(() => {
  const viteConfig = createBaseViteConfig({
    plugins: [react()],
  });

  const vitestConfig = createBaseVitestConfig({
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  });

  return mergeViteAndVitest(viteConfig, vitestConfig);
});
```

## API

### `createBaseViteConfig(options)`

Creates a base Vite configuration with sensible defaults.

**Options:**

- `port?: number` - Dev server port (default: 8080)
- `aliases?: Record<string, string>` - Path aliases
- `plugins?: any[]` - Vite plugins
- `excludeFromOptimizeDeps?: string[]` - Packages to exclude from optimization
- `watchWorkspacePackages?: string[]` - Workspace packages to watch for changes

### `createBaseVitestConfig(options)`

Creates a base Vitest configuration with sensible defaults.

**Options:**

- `include?: string[]` - Test file patterns to include
- `exclude?: string[]` - Patterns to exclude
- `setupFiles?: string[]` - Global setup files
- `coverage?: boolean` - Enable coverage reporting

### `mergeViteAndVitest(viteConfig, vitestConfig)`

Merges Vite and Vitest configurations.

## Notes

- Keep app-specific plugins, aliases, and env variables in local configs
- Base configs provide monorepo-friendly defaults (workspace package watching, etc.)
- All configs are extensible - spread them and add your overrides
