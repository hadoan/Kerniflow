# @corely/tsconfig

Shared TypeScript configurations for the Corely monorepo.

## Available Profiles

### `base.json`

Base configuration with strict type checking, compiler options, and project standards. Should not be used directly - extend from one of the specific profiles below.

### `node.json`

For Node.js backend services (API, worker):

```json
{
  "extends": "@corely/tsconfig/node.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### `react.json`

For React/Vite frontend applications:

```json
{
  "extends": "@corely/tsconfig/react.json",
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"]
}
```

### `lib.json`

For shared internal libraries (packages):

```json
{
  "extends": "@corely/tsconfig/lib.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

### `test.json`

For test files with Vitest globals:

```json
{
  "extends": "@corely/tsconfig/test.json",
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  }
}
```

## Usage

1. Add as a devDependency:

```bash
pnpm add -D @corely/tsconfig@workspace:*
```

2. Extend from the appropriate profile in your `tsconfig.json`

3. Add project-specific settings:
   - `paths`: Path aliases specific to your project
   - `outDir`/`rootDir`: Build output directories
   - `include`/`exclude`: Files to include/exclude

## Notes

- Path aliases should be defined per-project, not in shared configs
- All profiles inherit strict type checking from `base.json`
- Profiles are optimized for the respective runtime environment
