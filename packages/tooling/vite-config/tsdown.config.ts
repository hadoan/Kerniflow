import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  clean: process.argv.includes("--watch") ? false : true,
  external: ["vite", "vitest"],
});
