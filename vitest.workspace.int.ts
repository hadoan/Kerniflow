import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    extends: "./services/api/vitest.config.ts",
    root: "./services/api",
    test: {
      include: ["services/api/src/**/*.int.test.ts"],
      exclude: [],
    },
  },
  {
    extends: "./services/worker/vitest.config.ts",
    root: "./services/worker",
    test: {
      include: ["services/worker/src/**/*.int.test.ts"],
      exclude: [],
    },
  },
]);
