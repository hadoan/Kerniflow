import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{spec,test}.ts"],
    // Do not exclude *.int.test.ts so integration workspace can reuse this config
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./src/test/setup.ts"],
    env: {
      NODE_ENV: "test",
      APP_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@corely/kernel": path.resolve(__dirname, "../..", "packages/kernel/src"),
      "@corely/testkit": path.resolve(__dirname, "../..", "packages/testkit/src"),
      "@corely/data": path.resolve(__dirname, "../..", "packages/data/src"),
    },
  },
});
