const path = require("path");

const buildNextEslintCommand = (filenames) => {
  const relativePaths = filenames
    .map((f) => path.relative(path.join("packages", "nextjs"), f))
    .join(" ");
  return `cd packages/nextjs && yarn lint --fix ${relativePaths}`;
};

const checkTypesNextCommand = () => "yarn next:check-types";

const buildFoundryFormatCommand = (filenames) => {
  const relativePaths = filenames.map((f) => path.relative(path.join("packages", "foundry"), f)).join(" ");
  return `cd packages/foundry && forge fmt ${relativePaths}`;
};

module.exports = {
  "packages/nextjs/**/*.{ts,tsx}": [
    buildNextEslintCommand,
    checkTypesNextCommand,
  ],
  "packages/foundry/**/*.sol": [buildFoundryFormatCommand],
};
