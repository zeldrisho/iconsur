import { describe, expect, it } from "vitest";
import { PER_USER_CACHE_FIND, SYSTEM_ICON_SERVICES_STORE } from "../src/cache.ts";

describe("cache command construction", () => {
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
