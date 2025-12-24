module.exports = {
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
    type: "commonjs", // NestJS typically uses commonjs
  },
  sourceMaps: true,
  exclude: ["**/*.test.ts", "**/*.spec.ts", "**/__tests__/**", "**/testkit/**"],
};
