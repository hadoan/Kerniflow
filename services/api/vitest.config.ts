import { defineConfig } from "vitest/config";
import path from "path";
import { transform } from "@swc/core";

export default defineConfig({
  plugins: [
    {
      name: "swc-decorator-metadata",
      enforce: "pre",
      async transform(code, id) {
        if (!id.endsWith(".ts") && !id.endsWith(".tsx")) {
          return null;
        }
        if (id.includes("node_modules")) {
          return null;
        }
        const result = await transform(code, {
          filename: id,
          jsc: {
            parser: {
              syntax: "typescript",
              decorators: true,
              dynamicImport: true,
            },
            transform: {
              decoratorMetadata: true,
              legacyDecorator: true,
            },
            target: "es2022",
            keepClassNames: true,
          },
          module: {
            type: "es6",
          },
          sourceMaps: true,
        });
        return {
          code: result.code,
          map: result.map,
        };
      },
    },
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{spec,test}.ts", "src/**/*.e2e-spec.ts"],
    // Do not exclude *.int.test.ts so integration workspace can reuse this config
    exclude: ["**/node_modules/**", "**/dist/**"],
    setupFiles: ["./src/test/setup.ts"],
    env: {
      NODE_ENV: "test",
      APP_ENV: "test",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "@shared": path.resolve(__dirname, "src/shared"),
      "@corely/config": path.resolve(__dirname, "../..", "packages/config/src"),
      "@corely/contracts": path.resolve(__dirname, "../..", "packages/contracts/src"),
      "@corely/core": path.resolve(__dirname, "../..", "packages/core/src"),
      "@corely/domain": path.resolve(__dirname, "../..", "packages/domain/src"),
      "@corely/kernel": path.resolve(__dirname, "../..", "packages/kernel/src"),
      "@corely/email": path.resolve(__dirname, "../..", "packages/email/src"),
      "@corely/integrations-core": path.resolve(
        __dirname,
        "../..",
        "packages/integrations/core/src"
      ),
      "@corely/integrations-sumup": path.resolve(
        __dirname,
        "../..",
        "packages/integrations/sumup/src"
      ),
      "@corely/integrations-adyen": path.resolve(
        __dirname,
        "../..",
        "packages/integrations/adyen/src"
      ),
      "@corely/integrations-microsoft-graph-mail": path.resolve(
        __dirname,
        "../..",
        "packages/integrations/microsoft-graph-mail/src"
      ),
      "@corely/integrations-google-gmail": path.resolve(
        __dirname,
        "../..",
        "packages/integrations/google-gmail/src"
      ),
      "@corely/storage": path.resolve(__dirname, "../..", "packages/storage/src"),
      "@corely/public-urls": path.resolve(__dirname, "../..", "packages/public-urls/src"),
      "@corely/testkit": path.resolve(__dirname, "../..", "packages/testkit/src"),
      "@corely/data": path.resolve(__dirname, "../..", "packages/data/src"),
    },
  },
});
