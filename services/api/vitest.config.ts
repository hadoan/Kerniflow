import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{spec,test}.ts"],
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@shared": path.resolve(__dirname, "src/shared"),
      "@kerniflow/kernel": path.resolve(__dirname, "../..", "packages/kernel/src"),
    },
  },
});
