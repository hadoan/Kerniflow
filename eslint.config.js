import tseslint from "typescript-eslint";
import config from "@kerniflow/eslint-config";

export default tseslint.config(
  {
    ignores: [
      "node_modules/",
      "dist/",
      "build/",
      "coverage/",
      ".next/",
      "out/",
      ".git/",
      ".husky/",
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "pnpm-lock.yaml",
      "apps/e2e/playwright-report/",
      "apps/e2e/test-results/",
      "**/tsdown.config.ts",
    ],
  },
  config.base,
  config.typescript,
  config.node,
  config.test
);
