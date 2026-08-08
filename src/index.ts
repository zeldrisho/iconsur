#!/usr/bin/env node
// iconsur entry point. Runs directly under Node >=22.18 via type stripping
// (node src/index.ts), or as the bundled CJS entry for the npm bin
// (dist/index.cjs) and the standalone binary.
import fs from "node:fs";
import { resolvePackageJson } from "./assets.ts";
import { buildProgram } from "./cli.ts";

const { version } = JSON.parse(fs.readFileSync(resolvePackageJson(), "utf8")) as {
  version: string;
};

process.on("unhandledRejection", (e) => {
  throw e;
});
process.on("uncaughtException", (e) => {
  console.error("Error:", e.message);
  process.exit(1);
});

buildProgram(version).parse(process.argv);
