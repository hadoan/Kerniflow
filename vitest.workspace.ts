import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./services/api/vitest.config.ts",
    root: "./services/api",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./packages/domain/vitest.config.ts",
    root: "./packages/domain",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./packages/kernel/vitest.config.ts",
    root: "./packages/kernel",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./packages/core/vitest.config.ts",
    root: "./packages/core",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./services/worker/vitest.config.ts",
    root: "./services/worker",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./apps/web/vitest.config.ts",
    root: "./apps/web",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./packages/offline-core/vitest.config.ts",
    root: "./packages/offline-core",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./packages/offline-web/vitest.config.ts",
    root: "./packages/offline-web",
    test: {
      environment: "jsdom",
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
  {
    extends: "./packages/api-client/vitest.config.ts",
    root: "./packages/api-client",
    test: {
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.int.test.ts",
        "**/e2e/**",
        "**/apps/e2e/**",
      ],
    },
  },
]);
