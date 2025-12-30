# @corely/prettier-config

Shared Prettier configuration for the Corely monorepo.

## Installation

```bash
pnpm add -D @corely/prettier-config@workspace:* prettier
```

## Usage

### Option 1: package.json (recommended)

```json
{
  "prettier": "@corely/prettier-config"
}
```

### Option 2: prettier.config.js

```javascript
export { default } from "@corely/prettier-config";
```

### Option 3: Extend and customize

```javascript
import baseConfig from "@corely/prettier-config";

export default {
  ...baseConfig,
  printWidth: 120, // Override specific options
};
```

## Configuration

This config includes:

- 100 character print width
- 2 space indentation
- Semicolons required
- Double quotes (for consistency with JSON)
- ES5 trailing commas
- LF line endings

## Scripts

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  }
}
```

## IDE Integration

Install the Prettier extension for VS Code and add to `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true
}
```
