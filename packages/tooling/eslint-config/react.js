import globals from "globals";

/**
 * React-specific ESLint config
 */
export default {
  files: ["**/*.{jsx,tsx}"],
  languageOptions: {
    globals: {
      ...globals.browser,
    },
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
    },
  },
  rules: {
    // React best practices (minimal - extend with eslint-plugin-react if needed)
    "react/jsx-uses-react": "off", // Not needed with new JSX transform
    "react/react-in-jsx-scope": "off", // Not needed with new JSX transform
  },
};
