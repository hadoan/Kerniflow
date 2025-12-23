import globals from "globals";

/**
 * Node.js-specific ESLint config
 */
export default {
  files: ["**/*.{js,ts}"],
  languageOptions: {
    globals: {
      ...globals.node,
    },
  },
  rules: {
    // Node.js best practices
    "no-process-exit": "error",
    "no-path-concat": "error",
  },
};
