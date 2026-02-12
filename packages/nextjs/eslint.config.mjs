import eslintConfigNext from "eslint-config-next";
import prettierPlugin from "eslint-plugin-prettier";
import tsEslint from "typescript-eslint";

const eslintConfig = [
  {
    ignores: ["**/public/sw.js", "**/public/workbox-*.js"],
  },
  ...eslintConfigNext,
  {
    plugins: {
      prettier: prettierPlugin,
      "@typescript-eslint": tsEslint.plugin,
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^(_.*|e|error|err)$",
        },
      ],
      "prettier/prettier": [
        "warn",
        {
          endOfLine: "auto",
        },
      ],
    },
  },
];

export default eslintConfig;
