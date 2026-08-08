// Info.plist handling. `plutil` (ships with macOS) normalizes the plist to XML
// first — including binary plists — then the `plist` package parses it.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { parse } from "plist";

/** Builds a random temp path with the given prefix. */
function tempPath(prefix: string): string {
  return path.resolve(os.tmpdir(), `${prefix}-${Math.random().toString(36).slice(2, 8)}`);
}

/**
 * Parses the app's Info.plist into a plain object.
 * Returns null when the plist is unreadable or malformed (callers fall back to
 * the directory name and `AppIcon.icns`).
 */
export function readInfoPlist(infoPlistPath: string): Record<string, unknown> | null {
  try {
    return parse(fs.readFileSync(infoPlistPath, "utf8")) as Record<string, unknown>;
  } catch {
    // Not a (readable) XML plist -- fall through to `plutil`, which also
    // handles binary plists.
  }
  const convertedPlist = tempPath("tmp-plist");
  try {
    const res = spawnSync(
      "plutil",
      ["-convert", "xml1", "-o", convertedPlist, "--", infoPlistPath],
      {
        encoding: "utf8",
      },
    );
    if (res.status !== 0) {
      return null;
    }
    return parse(fs.readFileSync(convertedPlist, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    try {
      fs.rmSync(convertedPlist, { force: true });
    } catch {
      // ignore cleanup failures
    }
  }
}
