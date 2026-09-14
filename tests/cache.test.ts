import { describe, expect, it } from "vite-plus/test";
import {
  clearIconCache,
  PER_USER_CACHE_FIND,
  setCacheCommandRunner,
  SYSTEM_ICON_SERVICES_STORE,
} from "../src/cache.ts";

describe("cache command construction", () => {
  it("runs per-user cleanup and restarts both UI processes without sudo", () => {
    const calls: string[][] = [];

    const previous = setCacheCommandRunner((args) => {
      calls.push(args);

      return { status: 0 };
    });

    try {
      clearIconCache();
    } finally {
      setCacheCommandRunner(previous);
    }

    expect(calls).toEqual([
      ["find", ...PER_USER_CACHE_FIND],
      ["killall", "Dock"],
      ["killall", "Finder"],
    ]);
    expect(calls.flat()).not.toContain("sudo");
  });

  it("does not attempt a password prompt for system cleanup in non-interactive mode", () => {
    const calls: string[][] = [];

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
    }

    expect(calls).toContainEqual(["sudo", "-n", "true"]);
    expect(calls).not.toContainEqual(["sudo", "rm", "-rf", SYSTEM_ICON_SERVICES_STORE]);
  });
  it("clears per-user caches without sudo (constant argv, no shell interpolation)", () => {
    expect(PER_USER_CACHE_FIND[0]).toBe("/private/var/folders/");
    expect(PER_USER_CACHE_FIND).toContain("com.apple.dock.iconcache");
    expect(PER_USER_CACHE_FIND).toContain("com.apple.iconservices");
    expect(PER_USER_CACHE_FIND).not.toContain("sudo");
    // find -exec rm -rf {} ; — the terminator is a separate argv element.
    expect(PER_USER_CACHE_FIND[PER_USER_CACHE_FIND.length - 1]).toBe(";");
  });

  it("keeps the system-wide store behind the explicit --system flag", () => {
    expect(SYSTEM_ICON_SERVICES_STORE).toBe("/Library/Caches/com.apple.iconservices.store");
    // The store path is a constant — never derived from user input.
    expect(SYSTEM_ICON_SERVICES_STORE).not.toMatch(/\$\{|\+|\*/);
  });
});
