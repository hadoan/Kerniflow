import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["./src/index.ts"],
  clean: process.argv.includes("--watch") ? false : true,
  format: ["cjs", "esm"],
  dts: true,
  external: [
    // Don't bundle the API service - it will be imported at runtime
    /services\/api\//,
    // Don't bundle NestJS - it's a devDependency for testing
    /^@nestjs\//,
    // Don't bundle common peer dependencies
    "class-transformer",
    "class-validator",
  ],
});
