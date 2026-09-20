// Native replacement for the vendored `fileicon.sh` (mklement0/fileicon v0.3.0).
//
// Mirrors upstream v0.3.5 semantics:
// - `set` uses AppleScript-ObjC (`osascript`) to call NSWorkspace setIcon —
//   upstream's python3-based path died with macOS 12.3.
// - `unset` clears a custom icon through NSWorkspace's AppKit API, which removes
//   both the FinderInfo flag and icon payload.
//
// Security invariant: the AppleScript programs are constant; user-supplied
// paths are passed to `osascript` as argv (after `--`), never shell- or
// script-interpolated. `osascript` ships with macOS and is the only runtime
// dependency used to modify icon metadata.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

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
  "  if not (current application's NSWorkspace's sharedWorkspace()'s setIcon:squareImage forFile:destPath options:2) then error \"NSWorkspace could not set the icon\"",

  "end run",
  "",
].join("\n");

/** Constant AppleScript-ObjC program; argv = [destPath]. */
export const REMOVE_ICON_SCRIPT = [
  'use framework "AppKit"',
  "",
  "on run argv",
  "  set destPath to (item 1 of argv)",
  "  if not (current application's NSWorkspace's sharedWorkspace()'s setIcon:(missing value) forFile:destPath options:0) then error \"NSWorkspace could not remove the icon\"",

  "end run",
  "",
].join("\n");

/** Options for native fileicon operations (sudo escalation for non-writable targets). */
export interface FileiconOptions {
  /** Run the operation under sudo (escalation for non-writable bundles). */
  sudo?: boolean;
}

/** Byte offset (0-based) of the flags byte inside the 32-byte FinderInfo struct. */
const CUSTOM_ICON_BYTE_OFFSET = 8;

/** The `custom icon` flag bit in that byte. */
const CUSTOM_ICON_FLAG = 0x04;

/** Result of a native command invocation. */
export interface FileiconCommandResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/** Injectable only to make native command decisions testable without macOS. */
let commandRunner = (args: string[]): FileiconCommandResult => {
  const res = spawnSync(args[0], args.slice(1), { encoding: "utf8" });

  return { status: res.status, stdout: res.stdout ?? "", stderr: res.stderr ?? "" };
};

/** Installs a command runner and returns the previous one. */
export function setFileiconCommandRunner(
  runner: (args: string[]) => FileiconCommandResult,
): (args: string[]) => FileiconCommandResult {
  const previous = commandRunner;
  commandRunner = runner;

  return previous;
}

/** Runs a constant-argv command, optionally under sudo. */
function run(args: string[], opts: FileiconOptions = {}): FileiconCommandResult {
  const fullArgs = opts.sudo ? ["sudo", ...args] : args;

  return commandRunner(fullArgs);
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
}

/**
 * Removes a custom icon from a file or folder (.app bundle), mirroring
 * upstream v0.3.5's removeCustomIcon. NSWorkspace removes both the FinderInfo
 * flag and icon payload in one native operation.
 */
export function removeCustomIcon(destPath: string, opts: FileiconOptions = {}): void {
  if (!fs.existsSync(destPath)) {
    throw new Error(`Target not found: ${destPath}`);
  }

  const res = run(["osascript", "-e", REMOVE_ICON_SCRIPT, "--", destPath], opts);

  if (res.status !== 0) {
    throw new Error(
      `osascript exited with status ${res.status}: ${res.stderr.trim() || "unknown error"}`,
    );
  }
}
