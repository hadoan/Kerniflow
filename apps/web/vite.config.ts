import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(), // tailwindcss() is handled by postcss.config.js
    mode === "development" && componentTagger(),
  ].filter(Boolean),
  server: {
    host: "::",
    port: 8080,
    watch: {
      // Watch workspace packages for changes
      ignored: ["!**/node_modules/@kerniflow/**"],
    },
  },
  optimizeDeps: {
    // Exclude workspace packages from pre-bundling so changes are picked up
    exclude: ["@kerniflow/contracts", "@kerniflow/domain"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@kerniflow/api-client": path.resolve(__dirname, "../packages/api-client/src"),
    },
  },
}));
