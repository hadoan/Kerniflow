# @corely/eslint-config

Shared ESLint configuration for the Corely monorepo using ESLint flat config format.

## Installation

```bash
pnpm add -D @corely/eslint-config@workspace:* eslint typescript-eslint @eslint/js globals
```

## Usage

### Full Config (recommended for most projects)

```javascript
// eslint.config.js
import tseslint from "typescript-eslint";
import config from "@corely/eslint-config";

export default tseslint.config(
  {
    ignores: ["dist/", "build/", "node_modules/"],
  },
  config.base,
  config.typescript,
  config.node, // or config.react for frontend
  config.test,
  {
    // Project-specific overrides
    rules: {
      // Your custom rules
    },
  }
);
```

### Composable Configs

Pick only what you need:

```javascript
// For a Node.js backend service
import tseslint from "typescript-eslint";
import { base, typescript, node, test } from "@corely/eslint-config";

export default tseslint.config({ ignores: ["dist/"] }, base, typescript, node, test);
```

```javascript
// For a React frontend app
import tseslint from "typescript-eslint";
import { base, typescript, react, test } from "@corely/eslint-config";

export default tseslint.config({ ignores: ["dist/"] }, base, typescript, react, test);
```

## Available Configs

### `base`

Core JavaScript rules (ESLint recommended + best practices)

### `typescript`

TypeScript-specific rules with type-aware linting

### `node`

Node.js environment and best practices

### `react`

React/JSX support and browser globals

### `test`

Relaxed rules for test files (Vitest/Jest)

## Notes

- Uses ESLint flat config format (eslint.config.js)
- TypeScript rules require `tsconfig.json` in your project
- All configs are composable - mix and match as needed
- Minimal styling rules - formatting is handled by Prettier

## Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix"
  }
}
```
