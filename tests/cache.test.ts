import { describe, expect, it } from "vite-plus/test";
import {
  clearIconCache,
  PER_USER_CACHE_NAMES,
  PER_USER_CACHE_ROOT,
  setCacheCommandRunner,
  setCacheFileCleaner,
  SYSTEM_ICON_SERVICES_STORE,
} from "../src/cache.ts";

describe("cache command construction", () => {
  it("cleans per-user caches and restarts both UI processes without sudo", () => {
    const calls: string[][] = [];
    const cleanup: Array<{ root: string; names: readonly string[] }> = [];

    const previousCleaner = setCacheFileCleaner((root, names) => {
      cleanup.push({ root, names });
    });

    const previous = setCacheCommandRunner((args) => {
      calls.push(args);

      return { status: 0 };
    });

    try {
      clearIconCache();
    } finally {
      setCacheCommandRunner(previous);
      setCacheFileCleaner(previousCleaner);
    }

    expect(cleanup).toEqual([{ root: PER_USER_CACHE_ROOT, names: PER_USER_CACHE_NAMES }]);
    expect(calls).toEqual([
      ["killall", "Dock"],
      ["killall", "Finder"],
    ]);
    expect(calls.flat()).not.toContain("sudo");
  });

  it("does not attempt a password prompt for system cleanup in non-interactive mode", () => {
    const calls: string[][] = [];
    const previousCleaner = setCacheFileCleaner(() => {});

    const previous = setCacheCommandRunner((args) => {
      calls.push(args);

      return { status: args[0] === "sudo" ? 1 : 0 };
    });

    const originalTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: false });

    try {
      clearIconCache({ system: true });
    } finally {
      Object.defineProperty(process.stdin, "isTTY", { configurable: true, value: originalTTY });
      setCacheCommandRunner(previous);
      setCacheFileCleaner(previousCleaner);
    }

    expect(calls).toContainEqual(["sudo", "-n", "true"]);
    expect(calls).not.toContainEqual(["sudo", "rm", "-rf", SYSTEM_ICON_SERVICES_STORE]);
  });

  it("keeps per-user cache cleanup scoped to the known cache names", () => {
    expect(PER_USER_CACHE_ROOT).toBe("/private/var/folders/");
    expect(PER_USER_CACHE_NAMES).toEqual(["com.apple.dock.iconcache", "com.apple.iconservices"]);
  });

  it("keeps the system-wide store behind the explicit --system flag", () => {
    expect(SYSTEM_ICON_SERVICES_STORE).toBe("/Library/Caches/com.apple.iconservices.store");
    // The store path is a constant — never derived from user input.
    expect(SYSTEM_ICON_SERVICES_STORE).not.toMatch(/\$\{|\+|\*/);
  });
});
