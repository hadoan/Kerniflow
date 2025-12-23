/**
 * @type {import('prettier').Config}
 */
export default {
  // Formatting
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  quoteProps: "as-needed",
  jsxSingleQuote: false,
  trailingComma: "es5",
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: "always",

  // Special rules
  endOfLine: "lf",
  proseWrap: "preserve",
  htmlWhitespaceSensitivity: "css",
  embeddedLanguageFormatting: "auto",

  // Plugins
  plugins: [],

  // File overrides
  overrides: [
    {
      files: "*.md",
      options: {
        proseWrap: "always",
      },
    },
  ],
};
