import path from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@kerniflow/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@kerniflow/auth-client": path.resolve(__dirname, "../../packages/auth-client/src"),
    },
  },
  test: {
    name: "web",
    environment: "node",
    include: ["src/**/*.spec.ts", "src/**/*.spec.tsx"],
    coverage: {
      reporter: ["text", "json", "html"],
    },
  },
});
