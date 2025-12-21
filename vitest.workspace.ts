import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./services/api/vitest.config.ts",
  "./packages/domain/vitest.config.ts",
  "./packages/kernel/vitest.config.ts",
  "./services/worker/vitest.config.ts",
]);
