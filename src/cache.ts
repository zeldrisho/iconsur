// Cache invalidation with zero `sudo` by default.
//
// Verified reality on macOS 15 (arm64):
// - Per-user icon caches under /private/var/folders are user-owned -> direct
//   filesystem removal, no elevation.
// - /Library/Caches/com.apple.iconservices.store is system-owned and only
//   touched behind the explicit `--system` flag (interactive sudo; skipped
//   with a note when passwordless sudo is unavailable, so scripts/CI never
//   hang on a prompt).
// - The legacy `touch /Applications/*` step is dropped; restarting Dock and
//   Finder suffices to refresh icons.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Injectable native command result used by cache tests. */
export interface CacheCommandResult {
  status: number | null;
}

/** Runs a cache command through the default synchronous subprocess adapter. */
let commandRunner = (args: string[]): CacheCommandResult => ({
  status: spawnSync(args[0], args.slice(1), { stdio: "ignore" }).status,
});

/** Injectable filesystem cleanup used to keep cache deletion testable. */
let cacheFileCleaner = (root: string, names: readonly string[]): void => {
  const visit = (directory: string): void => {
    let entries: fs.Dirent[];

    try {
      entries = fs.readdirSync(directory, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const entryPath = path.join(directory, entry.name);

      if (names.includes(entry.name)) {
        try {
          fs.rmSync(entryPath, { recursive: true, force: true });
        } catch {
          // Cache cleanup is best-effort; continue with other cache entries.
        }
      } else if (entry.isDirectory()) {
        visit(entryPath);
      }
    }
  };

  visit(root);
};

/** Installs the filesystem cleaner and returns the previous one. */
export function setCacheFileCleaner(
  cleaner: (root: string, names: readonly string[]) => void,
): (root: string, names: readonly string[]) => void {
  const previous = cacheFileCleaner;
  cacheFileCleaner = cleaner;

  return previous;
}

/** Installs a command runner and returns the previous one. */
export function setCacheCommandRunner(
  runner: (args: string[]) => CacheCommandResult,
): (args: string[]) => CacheCommandResult {
  const previous = commandRunner;
  commandRunner = runner;

  return previous;
}

/** Per-user icon caches; user-owned, deletable without elevation. */
export const PER_USER_CACHE_ROOT = "/private/var/folders/";

export const PER_USER_CACHE_NAMES = ["com.apple.dock.iconcache", "com.apple.iconservices"] as const;

/** System-wide IconServices store; only removed via `cache --system`. */
export const SYSTEM_ICON_SERVICES_STORE = "/Library/Caches/com.apple.iconservices.store";

/** Runs a command with constant argv; a failed step is non-fatal. */
function run(args: string[]): void {
  try {
    commandRunner(args);
  } catch {
    // A failed cache-clearing step is non-fatal: Dock/Finder restart is the
    // part that actually refreshes icons.
  }
}

/**
 * Clears the icon services caches and restarts Dock and Finder.
 * With `system: true`, also removes the system-wide store (opt-in elevation).
 */
export function clearIconCache(options: { system?: boolean } = {}): void {
  // Per-user caches — no elevation, ever. This mirrors the old find/rm
  // behavior without invoking either utility and does not follow symlinks.
  try {
    cacheFileCleaner(PER_USER_CACHE_ROOT, PER_USER_CACHE_NAMES);
  } catch {
    // Cache cleanup is best-effort; restarting the UI processes still runs.
  }

  if (options.system) {
    if (process.stdin.isTTY) {
      // Interactive: allow a single sudo prompt for the opt-in system nuke.
      run(["sudo", "rm", "-rf", SYSTEM_ICON_SERVICES_STORE]);
    } else {
      // Non-interactive (CI/scripts): only nuke with passwordless sudo; never
      // hang on a prompt.
      const probe = commandRunner(["sudo", "-n", "true"]);

      if (probe.status === 0) {
        run(["sudo", "rm", "-rf", SYSTEM_ICON_SERVICES_STORE]);
      } else {
        console.log(
          `Skipping system-wide icon cache (${SYSTEM_ICON_SERVICES_STORE}): requires sudo, which is unavailable in this session.`,
        );
      }
    }
  }

  run(["killall", "Dock"]);
  run(["killall", "Finder"]);
}
