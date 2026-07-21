const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  {
    ignores: [".next/", "node_modules/", "dist/", "out/"],
  },
  ...compat.extends("next/core-web-vitals"),
];
