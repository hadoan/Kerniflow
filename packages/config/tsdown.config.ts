import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  clean: process.argv.includes("--watch") ? false : true,
  dts: true,
});
