const path = require("path");

const buildWebEslintCommand = (filenames) => {
  const relativePaths = filenames
    .map((f) => path.relative(path.join("packages", "web"), f))
    .join(" ");
  return `cd packages/web && bun run lint --fix ${relativePaths}`;
};

const checkTypesWebCommand = () => "bun run web:check-types";

const buildFoundryFormatCommand = (filenames) => {
  const relativePaths = filenames.map((f) => path.relative(path.join("packages", "foundry"), f)).join(" ");
  return `cd packages/foundry && forge fmt ${relativePaths}`;
};

module.exports = {
  "packages/web/**/*.{ts,tsx}": [
    buildWebEslintCommand,
    checkTypesWebCommand,
  ],
  "packages/foundry/**/*.sol": [buildFoundryFormatCommand],
};
