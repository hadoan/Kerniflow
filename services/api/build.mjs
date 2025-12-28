#!/usr/bin/env node
import { build } from "esbuild";
import esbuildPluginTsc from "esbuild-plugin-tsc";

console.log("🔨 Building with esbuild + tsc (preserves decorators)...");

await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist",
  sourcemap: true,
  packages: "external",
  tsconfig: "tsconfig.json",
  logLevel: "info",
  plugins: [
    esbuildPluginTsc({
      force: true, // Force use of tsc for decorator metadata
    }),
  ],
})
  .then(() => {
    console.log("✅ Build completed successfully");
  })
  .catch(() => {
    console.error("❌ Build failed");
    process.exit(1);
  });
