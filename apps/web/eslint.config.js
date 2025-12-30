import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import config from "@corely/eslint-config";

export default tseslint.config(
  { ignores: ["dist"] },
  config.base,
  config.typescript,
  config.react,
  config.test,
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*", "@/modules/*/**"],
              message: "shared/* must not import from modules/*.",
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/modules/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/modules/*/*", "@/modules/*/*/**"],
              message: "Import other modules via their public index export.",
            },
          ],
        },
      ],
    },
  }
);
