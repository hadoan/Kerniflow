import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  "./services/api/vitest.config.ts",
  "./packages/domain/vitest.config.ts",
  "./packages/kernel/vitest.config.ts",
  "./services/worker/vitest.config.ts",
  "./apps/web/vitest.config.ts",
  "./packages/offline-core/vitest.config.ts",
  "./packages/offline-web/vitest.config.ts",
  "./packages/api-client/vitest.config.ts",
]);
