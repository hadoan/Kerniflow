import tseslint from "typescript-eslint";
import config from "@corely/eslint-config";

export default tseslint.config(
  { ignores: ["playwright-report/", "test-results/"] },
  config.base,
  config.typescript,
  config.node,
  config.test,
  {
    files: ["**/*.ts"],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
  }
);
