import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.test.tsx", "src/**/*.spec.tsx"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@kerniflow/testkit": path.resolve(__dirname, "../..", "packages/testkit/src"),
      "@kerniflow/kernel": path.resolve(__dirname, "../..", "packages/kernel/src"),
      "@kerniflow/data": path.resolve(__dirname, "../..", "packages/data/src"),
    },
  },
});
