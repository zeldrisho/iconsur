// Cache invalidation with zero `sudo` by default.
//
// Verified reality on macOS 15 (arm64):
// - Per-user icon caches under /private/var/folders are user-owned -> plain
//   `rm -rf` via find, no elevation.
// - /Library/Caches/com.apple.iconservices.store is system-owned and only
//   touched behind the explicit `--system` flag (interactive sudo; skipped
//   with a note when passwordless sudo is unavailable, so scripts/CI never
//   hang on a prompt).
// - The legacy `touch /Applications/*` step is dropped; restarting Dock and
//   Finder suffices to refresh icons.
import { spawnSync } from "node:child_process";

/** Per-user icon caches; user-owned, deletable without elevation. */
export const PER_USER_CACHE_FIND = [
  "/private/var/folders/",
  "(",
  "-name",
  "com.apple.dock.iconcache",
  "-or",
  "-name",
  "com.apple.iconservices",
  ")",
  "-exec",
  "rm",
  "-rf",
  "{}",
  ";",
];
/** System-wide IconServices store; only removed via `cache --system`. */
export const SYSTEM_ICON_SERVICES_STORE = "/Library/Caches/com.apple.iconservices.store";

/** Runs a command with constant argv; a failed step is non-fatal. */
function run(args: string[]): void {
  try {
    spawnSync(args[0], args.slice(1), { stdio: "ignore" });
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
  // Per-user caches — no elevation, ever.
  run(["find", ...PER_USER_CACHE_FIND]);

  if (options.system) {
    if (process.stdin.isTTY) {
      // Interactive: allow a single sudo prompt for the opt-in system nuke.
      run(["sudo", "rm", "-rf", SYSTEM_ICON_SERVICES_STORE]);
    } else {
      // Non-interactive (CI/scripts): only nuke with passwordless sudo; never
      // hang on a prompt.
      const probe = spawnSync("sudo", ["-n", "true"], { stdio: "ignore" });
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
