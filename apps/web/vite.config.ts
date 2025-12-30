import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { createBaseViteConfig } from "@corely/vite-config";

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
      "@corely/api-client": path.resolve(__dirname, "../../packages/api-client/src"),
      "@corely/auth-client": path.resolve(__dirname, "../../packages/auth-client/src"),
      "@corely/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@corely/domain": path.resolve(__dirname, "../../packages/domain/src"),
      "@corely/offline-core": path.resolve(__dirname, "../../packages/offline-core/src"),
      "@corely/offline-web": path.resolve(__dirname, "../../packages/offline-web/src"),
    },
    excludeFromOptimizeDeps: ["@corely/contracts", "@corely/domain"],
    watchWorkspacePackages: ["@corely/*"],
  });

  return {
    ...baseConfig,
    build: {
      ...baseConfig.build,
      rollupOptions: {
        ...baseConfig.build?.rollupOptions,
        output: {
          ...baseConfig.build?.rollupOptions?.output,
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return;
            }

            if (id.includes("react") || id.includes("scheduler")) {
              return "react";
            }
            if (id.includes("@radix-ui")) {
              return "radix";
            }
            if (id.includes("@tanstack")) {
              return "tanstack";
            }
            if (id.includes("lucide-react")) {
              return "icons";
            }
            if (id.includes("date-fns")) {
              return "date-fns";
            }
            if (id.includes("zod")) {
              return "zod";
            }

            return "vendor";
          },
        },
      },
    },
  };
});
