import js from "@eslint/js";

/**
 * Base ESLint config - recommended JavaScript rules
 */
export default {
  files: ["**/*.{js,jsx,ts,tsx}"],
  extends: [js.configs.recommended],
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: "module",
  },
  rules: {
    // Possible problems
    "no-console": ["warn", { allow: ["warn", "error"] }],
    "no-debugger": "warn",

    // Best practices
    eqeqeq: ["error", "always", { null: "ignore" }],
    "no-var": "error",
    "prefer-const": "error",
    "prefer-arrow-callback": "error",
    "object-shorthand": "error",

    // Style (minimal - let Prettier handle formatting)
    curly: ["error", "all"],
  },
};
