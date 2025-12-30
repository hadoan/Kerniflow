import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.spec.ts", "src/**/*.test.tsx", "src/**/*.spec.tsx"],
    // Allow *.int.test.ts so integration workspace can reuse this config
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@corely/testkit": path.resolve(__dirname, "../..", "packages/testkit/src"),
      "@corely/kernel": path.resolve(__dirname, "../..", "packages/kernel/src"),
      "@corely/data": path.resolve(__dirname, "../..", "packages/data/src"),
    },
  },
});
