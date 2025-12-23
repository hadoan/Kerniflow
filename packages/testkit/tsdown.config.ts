import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  cleanDist: true,
  format: ["cjs", "esm", "dts"],
  dts: true,
  splitting: true,
});
