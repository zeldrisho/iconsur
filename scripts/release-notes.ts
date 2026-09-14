import fs from "node:fs";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+$/.test(version)) {
  console.error("Usage: node scripts/release-notes.ts <version>");
  process.exit(2);
}

const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
const heading = new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\].*$`, "m");
const match = heading.exec(changelog);
if (match === null) {
  console.error(`No changelog entry found for ${version}`);
  process.exit(1);
}
const start = match.index;
const next = changelog.slice(start + match[0].length).search(/^## /m);
const section = changelog
  .slice(start, next < 0 ? undefined : start + match[0].length + next)
  .trim();
process.stdout.write(section + "\n");
