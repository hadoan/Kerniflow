module.exports = {
  "**/*.{ts,tsx,js,jsx,json,md,yml,yaml,css,scss}": ["prettier --write"],
  "**/*.{ts,tsx,js,jsx}": ["eslint --fix"],
};
