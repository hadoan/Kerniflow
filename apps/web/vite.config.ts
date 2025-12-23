import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createBaseViteConfig } from "@kerniflow/vite-config";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const baseConfig = createBaseViteConfig({
    port: 8080,
    plugins: [
      react(), // tailwindcss() is handled by postcss.config.js
      mode === "development" && componentTagger(),
    ].filter(Boolean),
    aliases: {
      "@": path.resolve(__dirname, "./src"),
      "@kerniflow/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
    },
    excludeFromOptimizeDeps: ["@kerniflow/contracts", "@kerniflow/domain"],
    watchWorkspacePackages: ["@kerniflow/*"],
  });

  return baseConfig;
});
