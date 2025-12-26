import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./services/api/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./packages/domain/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./packages/kernel/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./services/worker/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./apps/web/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./packages/offline-core/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./packages/offline-web/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
  {
    extends: "./packages/api-client/vitest.config.ts",
    test: {
      exclude: ["**/node_modules/**", "**/dist/**", "**/*.int.test.ts"],
    },
  },
]);
