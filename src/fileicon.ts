// Native replacement for the vendored `fileicon.sh` (mklement0/fileicon v0.3.0).
//
// Mirrors upstream v0.3.5 semantics:
// - `set` uses AppleScript-ObjC (`osascript`) to call NSWorkspace setIcon —
//   upstream's python3-based path died with macOS 12.3.
// - `rm` clears the custom-icon flag in `com.apple.FinderInfo`, then removes
//   the `Icon\r` helper file (folder targets such as `.app` bundles) or the
//   resource fork (file targets).
//
// Security invariant: the AppleScript program is a constant; the user-supplied
// paths are passed to `osascript` as argv (after `--`), never shell- or
// script-interpolated. `osascript` ships with macOS and stays a runtime
// dependency; `xattr` / `rm` are invoked with static argv too.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

/** Constant AppleScript-ObjC program; argv = [sourceImagePath, destPath]. */
export const SET_ICON_SCRIPT = [
  'use framework "Cocoa"',
  "",
  "on run argv",
  "  set sourcePath to (item 1 of argv)",
  "  set destPath to (item 2 of argv)",
  "  set sourceImage to (current application's NSImage's alloc()'s initWithContentsOfFile:sourcePath)",
  "  set imageSize to sourceImage's |size|()",
  "  set imageWidth to (width of imageSize) as real",
  "  set imageHeight to (height of imageSize) as real",
  "  set canvasSide to imageWidth",
  "  if imageHeight > canvasSide then set canvasSide to imageHeight",
  "  set drawWidth to imageWidth",
  "  set drawHeight to imageHeight",
  "  set drawOriginX to (canvasSide - drawWidth) / 2",
  "  set drawOriginY to (canvasSide - drawHeight) / 2",
  "  set squareImage to (current application's NSImage's alloc()'s initWithSize:{width:canvasSide, height:canvasSide})",
  "  squareImage's lockFocus()",
  "  current application's NSColor's clearColor()'s |set|()",
  "  current application's NSRectFill(current application's NSMakeRect(0, 0, canvasSide, canvasSide))",
  "  sourceImage's drawInRect:(current application's NSMakeRect(drawOriginX, drawOriginY, drawWidth, drawHeight)) fromRect:(current application's NSZeroRect) operation:(current application's NSCompositingOperationSourceOver) fraction:1.0",
  "  squareImage's unlockFocus()",
  "  (current application's NSWorkspace's sharedWorkspace()'s setIcon:squareImage forFile:destPath options:2)",
  "end run",
  "",
].join("\n");

export interface FileiconOptions {
  /** Run the operation under sudo (escalation for non-writable bundles). */
  sudo?: boolean;
}

/** Hidden helper file holding a folder's custom icon (with its resource fork). */
const FOLDER_CUSTOM_ICON = "Icon\r";
/** FinderInfo attribute carrying the custom-icon flag (folder and file). */
const FINDER_INFO_ATTRIB = "com.apple.FinderInfo";
/** Resource fork attribute holding the icon payload for file targets. */
const RESOURCE_FORK_ATTRIB = "com.apple.ResourceFork";
/** Byte offset (0-based) of the flags byte inside the 32-byte FinderInfo struct. */
const CUSTOM_ICON_BYTE_OFFSET = 8;
/** The `custom icon` flag bit in that byte. */
const CUSTOM_ICON_FLAG = 0x04;
/** Lowercase 'icns' magic found inside an icon-bearing resource fork. */
const ICNS_RESOURCE_MAGIC = "icns";

function run(
  args: string[],
  opts: FileiconOptions = {},
): { status: number | null; stdout: string; stderr: string } {
  const fullArgs = opts.sudo ? ["sudo", ...args] : args;
  const res = spawnSync(fullArgs[0], fullArgs.slice(1), { encoding: "utf8" });
  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
}

/** True when the current user can write to the target (no elevation needed). */
export function isWritable(target: string): boolean {
  try {
    fs.accessSync(target, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * Runs `op` against `target` unprivileged when writable; otherwise logs an
 * explanatory message and retries the same operation under sudo. Never
 * blanket-elevates.
 */
export function runWithEscalation(
  target: string,
  op: (opts: FileiconOptions) => void,
  description: string,
): void {
  if (isWritable(target)) {
    op({});
    return;
  }
  console.log(
    `${description} ${target} requires write access to the app bundle; retrying with sudo...`,
  );
  op({ sudo: true });
}

/** Reads an extended attribute as a hex string, or null when absent/unreadable. */
function readXattr(target: string, name: string, opts: FileiconOptions = {}): string | null {
  const res = run(["xattr", "-px", name, target], opts);
  if (res.status !== 0) {
    return null;
  }
  return res.stdout.replace(/\s/g, "");
}

/** Clears the custom-icon flag in a FinderInfo hex string; null when fully blank. */
export function clearCustomIconFlag(hex: string): string | null {
  const flagEnd = (CUSTOM_ICON_BYTE_OFFSET + 1) * 2;
  if (hex.length < flagEnd) {
    return hex;
  }
  const byte = parseInt(hex.slice(CUSTOM_ICON_BYTE_OFFSET * 2, flagEnd), 16);
  const patched = byte & ~CUSTOM_ICON_FLAG & 0xff;
  const out =
    hex.slice(0, CUSTOM_ICON_BYTE_OFFSET * 2) +
    patched.toString(16).padStart(2, "0").toUpperCase() +
    hex.slice(flagEnd);
  return /^0+$/.test(out) ? null : out;
}

/** True when the target's FinderInfo has the custom-icon flag set. */
function hasCustomIconFlag(target: string, opts: FileiconOptions = {}): boolean {
  const hex = readXattr(target, FINDER_INFO_ATTRIB, opts);
  if (hex === null || hex.length < (CUSTOM_ICON_BYTE_OFFSET + 1) * 2) {
    return false;
  }
  return (
    (parseInt(hex.slice(CUSTOM_ICON_BYTE_OFFSET * 2, (CUSTOM_ICON_BYTE_OFFSET + 1) * 2), 16) &
      CUSTOM_ICON_FLAG) !==
    0
  );
}

/**
 * True when actual icon payload exists: for a folder, the `Icon\r` helper
 * file with an icns resource in its fork; for a file, its own resource fork.
 */
function hasIconData(target: string, _opts: FileiconOptions = {}): boolean {
  const stat = fs.statSync(target, { throwIfNoEntry: false });
  const helper = stat?.isDirectory() ? path.join(target, FOLDER_CUSTOM_ICON) : target;
  if (!fs.existsSync(helper)) {
    return false;
  }
  try {
    const fork = fs.readFileSync(`${helper}/..namedfork/rsrc`);
    return fork.includes(Buffer.from(ICNS_RESOURCE_MAGIC, "ascii"));
  } catch {
    return false;
  }
}

function customIconState(
  target: string,
  opts: FileiconOptions = {},
): { flag: boolean; hasData: boolean } {
  return { flag: hasCustomIconFlag(target, opts), hasData: hasIconData(target, opts) };
}

/** True when the target currently has a custom icon (flag + payload). */
export function hasCustomIcon(target: string, opts: FileiconOptions = {}): boolean {
  const state = customIconState(target, opts);
  return state.flag && state.hasData;
}

/**
 * Sets a custom icon on a file or folder (.app bundle) from a PNG file.
 * Throws when the target is not writable — callers escalate via sudo.
 */
export function setCustomIcon(
  destPath: string,
  iconPath: string,
  opts: FileiconOptions = {},
): void {
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Image file not found: ${iconPath}`);
  }
  const res = run(["osascript", "-e", SET_ICON_SCRIPT, "--", iconPath, destPath], opts);
  if (res.status !== 0) {
    throw new Error(
      `osascript exited with status ${res.status}: ${res.stderr.trim() || "unknown error"}`,
    );
  }
  // NSWorkspace setIcon reports success even for corrupt images; verify like
  // upstream v0.3.5's testForCustomIcon.
  const state = customIconState(destPath, opts);
  if (!state.flag) {
    throw new Error(
      `Failed to set the custom-icon flag in '${FINDER_INFO_ATTRIB}' of ${destPath}. ` +
        "Typically the target is on a volume that does not support custom icons; re-run with unset to clean up.",
    );
  }
  if (!state.hasData) {
    throw new Error(
      `Custom-icon flag was set for ${destPath} but no icon data was found; re-run with unset to clean up.`,
    );
  }
}

/**
 * Removes a custom icon from a file or folder (.app bundle), mirroring
 * upstream v0.3.5's removeCustomIcon.
 */
export function removeCustomIcon(destPath: string, opts: FileiconOptions = {}): void {
  const stat = fs.statSync(destPath, { throwIfNoEntry: false });
  if (!stat) {
    throw new Error(`Target not found: ${destPath}`);
  }

  // Step 1: clear the custom-icon flag in com.apple.FinderInfo.
  const hex = readXattr(destPath, FINDER_INFO_ATTRIB, opts);
  if (hex !== null) {
    const patched = clearCustomIconFlag(hex);
    if (patched === null) {
      // All bytes cleared -> drop the attribute entirely.
      run(["xattr", "-d", FINDER_INFO_ATTRIB, destPath], opts);
    } else if (patched !== hex) {
      run(["xattr", "-wx", FINDER_INFO_ATTRIB, patched, destPath], opts);
    }
  }

  // Step 2: remove the icon payload — the `Icon\r` helper file for folders,
  // or the resource fork for plain files.
  if (stat.isDirectory()) {
    run(["rm", "-f", path.join(destPath, FOLDER_CUSTOM_ICON)], opts);
  } else if (hasIconData(destPath, opts)) {
    run(["xattr", "-d", RESOURCE_FORK_ATTRIB, destPath], opts);
  }
}
