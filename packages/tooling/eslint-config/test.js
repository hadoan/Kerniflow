import globals from "globals";

/**
 * Test files ESLint config (Vitest/Jest)
 */
export default {
  files: ["**/*.{test,spec}.{js,ts,jsx,tsx}", "**/__tests__/**/*.{js,ts,jsx,tsx}"],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    // Relax some rules for tests
    "@typescript-eslint/no-explicit-any": "off",
    "no-console": "off",
  },
};
