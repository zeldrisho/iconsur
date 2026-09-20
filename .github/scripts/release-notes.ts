import fs from "node:fs";

const version = process.argv[2];

if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node .github/scripts/release-notes.ts <version>");
  process.exit(2);
}

const changelog = fs.readFileSync("CHANGELOG.md", "utf8");

const lines = changelog.split(/\r?\n/);

const headingPrefix = `## [${version}]`;

const headingIndex = lines.findIndex((line) => line.startsWith(headingPrefix));

if (headingIndex < 0) {
  console.error(`No changelog entry found for ${version}`);
  process.exit(1);
}

const nextHeadingIndex = lines.findIndex(
  (line, index) => index > headingIndex && line.startsWith("## "),
);

const section = lines
  .slice(headingIndex, nextHeadingIndex < 0 ? undefined : nextHeadingIndex)
  .join("\n")
  .trim()
  .replace(
    new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\]`, "m"),
    `## [${version}](https://github.com/zeldrisho/iconsur/releases/tag/v${version})`,
  );

process.stdout.write(section + "\n");
