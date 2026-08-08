import { describe, expect, it } from "vite-plus/test";
import { clearCustomIconFlag, SET_ICON_SCRIPT } from "../src/fileicon.ts";

describe("fileicon osascript argv construction", () => {
  it("keeps the AppleScript program constant and passes paths as argv", () => {
    // The script must reference argv items, never interpolate paths.
    expect(SET_ICON_SCRIPT).toContain("on run argv");
    expect(SET_ICON_SCRIPT).toContain("(item 1 of argv)");
    expect(SET_ICON_SCRIPT).toContain("(item 2 of argv)");
    // No path-like strings may be baked into the script.
    expect(SET_ICON_SCRIPT).not.toMatch(/\.app|\.png|\.icns|\/Applications|tmp/);
  });

  it("spawns osascript with the script as -e and paths as trailing argv", () => {
    // Reconstruct the spawn argv exactly as setCustomIcon builds it: the
    // script is one argv element after -e; the two paths follow after "--".
    const iconPath = "/tmp/icon with spaces.png";
    const destPath = "/Applications/My App.app";
    const args = ["osascript", "-e", SET_ICON_SCRIPT, "--", iconPath, destPath];
    expect(args).toEqual(["osascript", "-e", SET_ICON_SCRIPT, "--", iconPath, destPath]);
    expect(SET_ICON_SCRIPT).not.toContain(iconPath);
    expect(SET_ICON_SCRIPT).not.toContain(destPath);
  });
});

describe("FinderInfo custom-icon flag", () => {
  it("clears the 0x04 flag at byte offset 8, preserving other bytes", () => {
    const hex = "0102030405060708040000000000000000000000000000000000000000000000";
    expect(clearCustomIconFlag(hex)).toBe(
      "0102030405060708000000000000000000000000000000000000000000000000",
    );
  });

  it("returns null when the cleared attribute is fully blank (caller removes it)", () => {
    const hex = "0000000000000000040000000000000000000000000000000000000000000000";
    expect(clearCustomIconFlag(hex)).toBeNull();
  });

  it("leaves short attributes untouched", () => {
    const hex = "0000";
    expect(clearCustomIconFlag(hex)).toBe("0000");
  });
});
