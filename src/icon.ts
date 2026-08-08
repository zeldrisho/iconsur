// The `set` icon-generation pipeline: resolve the app identity, obtain a
// source icon (App Store search or local ICNS/PNG), compose the adaptive
// canvas, apply the mask, and write/apply the result.
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import * as icns from "icns-lib";
import { resolveAsset } from "./assets.ts";
import { runWithEscalation, setCustomIcon } from "./fileicon.ts";
import { Jimp, type JimpInstance } from "./jimp.ts";
import { readInfoPlist } from "./plist.ts";

/** Options controlling the `set` icon-generation pipeline. */
export interface IconOptions {
  local: boolean;
  keyword?: string;
  region?: string;
  scale?: string;
  color?: string;
  input?: string;
  output?: string;
  /** Skip the apply confirmation prompt (interactive preview). */
  yes?: boolean;
}

/** Resolved app display name and source icon path. */
export interface AppIdentity {
  name: string;
  iconPath: string;
}

/** Final canvas edge length in pixels. */
const IMAGE_SIZE = 1024;
/** Margin between the canvas edge and the icon box. */
const ICON_PADDING = 100;
/** Edge length of the centered icon box (canvas minus padding). */
const ICON_SIZE = IMAGE_SIZE - 2 * ICON_PADDING;

/** Builds a random temp path with the given prefix. */
function tempPath(prefix: string): string {
  return path.resolve(os.tmpdir(), `${prefix}-${Math.random().toString(36).slice(2, 8)}`);
}

/**
 * Applies the rounded-corner mask with a per-pixel AND that is both
 * alpha- and color-friendly (full of magic).
 */
export function applyMask(image: JimpInstance, mask: JimpInstance): void {
  image.scan(0, 0, image.width, image.height, (x, y) => {
    image.setPixelColor((mask.getPixelColor(x, y) & image.getPixelColor(x, y)) >>> 0, x, y);
  });
}

/**
 * Returns the largest embedded image from an ICNS buffer, or null when the
 * buffer is not a parseable ICNS (e.g. a plain PNG passed via `--input`).
 */
function largestIcnsImage(iconBuffer: Buffer<ArrayBuffer>): Buffer<ArrayBuffer> | null {
  try {
    const subIconBuffer = Object.entries(icns.parse(iconBuffer))
      .filter(([key]) => icns.isImageType(key))
      .map(([, value]) => value)
      .sort((a, b) => b.length - a.length)[0];
    return subIconBuffer ?? null;
  } catch {
    return null;
  }
}

/**
 * True when the user's answer accepts the apply prompt. The prompt defaults
 * to apply: a plain Enter (empty answer) and `y`/`yes` (any case) accept;
 * anything else declines.
 */
export function parseApplyAnswer(input: string): boolean {
  const trimmed = input.trim();
  return trimmed === "" || /^y(es)?$/i.test(trimmed);
}

/**
 * Opens the given images in the default viewer (Preview on macOS) so the
 * user can compare them side by side. Best-effort: never throws, and it is
 * a no-op outside macOS (the tool is macOS-only anyway).
 */
export function openForComparison(paths: string[]): void {
  if (process.platform !== "darwin" || paths.length === 0) {
    return;
  }
  try {
    const child = spawn("open", paths, { detached: true, stdio: "ignore" });
    child.unref();
  } catch {
    // Best-effort preview: a GUI-less session must not break the CLI.
  }
}

/**
 * Extracts the app's current icon to a temporary PNG so it can be opened
 * next to the generated preview. Prefers the custom icon payload stored in
 * the `Icon\r` resource fork (set by a previous `iconsur set`), then falls
 * back to the bundled icon (`identity.iconPath`). Returns null when no
 * readable icon exists — callers then open the preview alone.
 */
export async function extractOldIcon(
  appDir: string,
  identity: AppIdentity,
): Promise<string | null> {
  let image: Buffer | null = null;
  try {
    const fork = fs.readFileSync(path.join(appDir, "Icon\r", "..namedfork", "rsrc"));
    image = fork.includes(Buffer.from("icns", "ascii")) ? largestIcnsImage(fork) : null;
  } catch {
    // No custom-icon fork (or unsupported filesystem) — use the bundled icon.
  }
  if (image === null && identity.iconPath && fs.existsSync(identity.iconPath)) {
    const data = fs.readFileSync(identity.iconPath);
    image = largestIcnsImage(data) ?? data;
  }
  if (image === null) {
    return null;
  }
  let oldIcon: JimpInstance | null = null;
  try {
    oldIcon = await Jimp.read(image);
  } catch {
    const legacy = legacyIcnsImage(image);
    if (legacy) {
      oldIcon = jimpFromRgba(legacy.width, legacy.data);
    }
  }
  if (!oldIcon) {
    return null;
  }
  try {
    const oldPath = `${tempPath("old-icon")}.png`;
    await oldIcon.write(oldPath as `${string}.${string}`);
    return oldPath;
  } catch {
    return null;
  }
}

/**
 * True when `dir` looks like an app bundle: either the conventional `.app`
 * suffix or the bundle marker `Contents/Info.plist`. Some Steam games ship
 * as bare bundles without the extension (e.g. `Stardew Valley`), which
 * Finder and LaunchServices still treat as apps.
 */
export function isAppBundle(dir: string): boolean {
  return dir.endsWith(".app") || fs.existsSync(path.join(dir, "Contents", "Info.plist"));
}

/**
 * Legacy ICNS RGB+mask chunk pairs (16/32/128/256 px). Modern ICNS files
 * embed standalone PNG/JP2 payloads (handled by icns-lib above), but older
 * ones — still shipped by many Steam mac games, e.g. Stardew Valley — store
 * Apple-RLE-compressed RGB plus a raw 8-bit alpha mask instead.
 */
const LEGACY_ICNS_TYPES = [
  { size: 16, rgb: "is32", mask: "s8mk" },
  { size: 32, rgb: "il32", mask: "l8mk" },
  { size: 128, rgb: "it32", mask: "t8mk" },
  { size: 256, rgb: "ih32", mask: "h8mk" },
] as const;

/**
 * Decompresses an Apple RLE stream as found in legacy ICNS RGB chunks: a
 * high-bit count byte repeats the next byte (count & 0x7f + 3 times), a
 * low-bit count byte is followed by (count + 1) literal bytes.
 */
export function decodeAppleRle(data: Buffer): Buffer {
  // Repeat runs expand at most 65x (2 input bytes -> up to 130 output);
  // overallocate generously and trim with subarray below.
  const out = Buffer.alloc(data.length * 64);
  let o = 0;
  for (let i = 0; i < data.length;) {
    const b = data[i];
    if (b & 0x80) {
      const count = (b & 0x7f) + 3;
      out.fill(data[i + 1], o, o + count);
      o += count;
      i += 2;
    } else {
      const count = b + 1;
      data.copy(out, o, i + 1, i + 1 + count);
      o += count;
      i += 1 + count;
    }
  }
  return out.subarray(0, o);
}

/**
 * Extracts the largest legacy ICNS RGB+mask pair as interleaved RGBA, or
 * null when the buffer is not an ICNS or holds no legacy chunks. `it32`/
 * `ih32` payloads may carry a leading 4-byte length field; both the plain
 * and offset layouts are tried and accepted by exact decompressed size.
 */
export function legacyIcnsImage(iconBuffer: Buffer): { width: number; data: Buffer } | null {
  if (iconBuffer.length < 8 || iconBuffer.subarray(0, 4).toString("ascii") !== "icns") {
    return null;
  }
  const chunks = new Map<string, Buffer>();
  let body = iconBuffer.subarray(8);
  while (body.length >= 8) {
    const type = body.subarray(0, 4).toString("ascii");
    const size = body.readUInt32BE(4);
    chunks.set(type, body.subarray(8, size));
    body = body.subarray(size);
  }
  for (const { size, rgb, mask } of [...LEGACY_ICNS_TYPES].reverse()) {
    const rgbChunk = chunks.get(rgb);
    const maskChunk = chunks.get(mask);
    if (!rgbChunk || !maskChunk || maskChunk.length !== size * size) {
      continue;
    }
    const expected = size * size * 3;
    const candidates =
      rgb === "it32" || rgb === "ih32"
        ? [rgbChunk, rgbChunk.length >= 4 ? rgbChunk.subarray(4) : null]
        : [rgbChunk];
    for (const candidate of candidates) {
      if (!candidate) {
        continue;
      }
      const rgb = decodeAppleRle(candidate);
      if (rgb.length !== expected) {
        continue;
      }
      const rgba = Buffer.alloc(size * size * 4);
      for (let p = 0; p < size * size; p++) {
        rgba[p * 4] = rgb[p * 3];
        rgba[p * 4 + 1] = rgb[p * 3 + 1];
        rgba[p * 4 + 2] = rgb[p * 3 + 2];
        rgba[p * 4 + 3] = maskChunk[p];
      }
      return { width: size, data: rgba };
    }
  }
  return null;
}

/** Builds a Jimp image from raw interleaved RGBA (legacy ICNS decode). */
function jimpFromRgba(width: number, data: Buffer): JimpInstance {
  const image = new Jimp({ width, height: data.length / width / 4 });
  image.bitmap.data.set(data);
  return image;
}

/**
 * Resolves the app's display name and source icon from Contents/Info.plist,
 * falling back to the directory name and `AppIcon.icns`.
 */
export function resolveIdentity(appDir: string, opts: IconOptions): AppIdentity {
  let appName = opts.keyword;
  let srcIconFile = opts.input;
  const infoPlist = path.join(appDir, "Contents/Info.plist");
  const parsed = readInfoPlist(infoPlist);
  if (parsed === null) {
    console.log(
      "Plist file might be corrupted; using fallback name and AppIcon.icns as default icon location.",
    );
    console.log("Re-run with option -k or --keyword to specify custom app name to search for.");
    console.log(
      "Re-run with option -i or --input to specify custom input image for an adaptive icon.",
    );
  } else {
    if (!appName) {
      appName =
        (parsed.CFBundleDisplayName as string | undefined) ||
        path.basename(appDir).replace(/\.app$/, "");
    }
    if (!srcIconFile) {
      const iconFile = parsed.CFBundleIconFile as string | undefined;
      if (iconFile) {
        srcIconFile = path.resolve(appDir, "Contents/Resources", iconFile);
        if (!srcIconFile.endsWith(".icns")) {
          srcIconFile += ".icns";
        }
      }
    }
  }
  if (!appName) {
    appName = path.basename(appDir).replace(/\.app$/, "");
  }
  if (!srcIconFile) {
    srcIconFile = path.resolve(appDir, "Contents/Resources/AppIcon.icns");
  }
  return { name: appName, iconPath: srcIconFile };
}

async function searchAppStore(appName: string, region: string): Promise<JimpInstance | null> {
  console.log(`Searching iOS App with name: ${appName}`);
  const url =
    `https://itunes.apple.com/search?media=software&entity=software%2CiPadSoftware` +
    `&term=${encodeURIComponent(appName)}&country=${region}&limit=1`;
  const res = await fetch(url);
  const data = (await res.json()) as {
    results?: Array<{ trackName: string; artworkUrl512?: string; artworkUrl100?: string }>;
  };
  const app = data.results?.[0];
  if (!app) {
    console.log(`Cannot find iOS App with name: ${appName}`);
    return null;
  }
  const trackName = app.trackName;
  const iconUrl = app.artworkUrl512 || app.artworkUrl100;
  console.log(`Found iOS app: ${trackName} with icon: ${iconUrl}`);
  console.log(
    "If this app is incorrect, specify the correct name with -k or --keyword, or generate an icon locally with option -l or --local",
  );
  if (!iconUrl) {
    console.log(
      "No artwork URL returned by the App Store search; falling back to local generation.",
    );
    return null;
  }
  const iconRes = await fetch(iconUrl);
  const iconData = Buffer.from(await iconRes.arrayBuffer());
  return (await Jimp.read(iconData)).resize({ w: ICON_SIZE, h: ICON_SIZE });
}

/**
 * Builds the adaptive icon from the app's own ICNS (largest embedded image,
 * which may be a JP2 decoded by our custom format) or a custom input image.
 */
async function generateLocalIcon(identity: AppIdentity, opts: IconOptions): Promise<JimpInstance> {
  console.log("Generating adaptive icon...");
  if (!fs.existsSync(identity.iconPath)) {
    throw new Error(`Cannot find icon at ${identity.iconPath}`);
  }

  let iconBuffer = fs.readFileSync(identity.iconPath);
  const subIconBuffer = largestIcnsImage(iconBuffer);
  if (subIconBuffer) {
    iconBuffer = subIconBuffer;
  }

  let originalIcon: JimpInstance;
  try {
    originalIcon = await Jimp.read(iconBuffer);
  } catch (e) {
    const legacy = legacyIcnsImage(iconBuffer);
    if (legacy === null) {
      const message = e instanceof Error ? e.message : String(e);
      throw new Error(
        `Failed to read original icon: ${message}\nRe-run with option -i or --input to use a custom image for generation.`,
      );
    }
    console.log(`Decoded legacy ICNS icon (${legacy.width}x${legacy.width})`);
    originalIcon = jimpFromRgba(legacy.width, legacy.data);
  }

  let originalIconScaleSize: number;
  if (originalIcon.hasAlpha()) {
    originalIconScaleSize = parseFloat(opts.scale || "0.9");
    originalIcon.contain({
      w: ICON_SIZE * originalIconScaleSize,
      h: ICON_SIZE * originalIconScaleSize,
    });
  } else {
    console.log("The original icon image is opaque; thus it will not be scaled down.");
    originalIconScaleSize = 1;
    originalIcon.cover({ w: ICON_SIZE, h: ICON_SIZE });
  }

  const scalePosition = (ICON_SIZE * (1 - originalIconScaleSize)) / 2;
  const resultIcon = new Jimp({ width: ICON_SIZE, height: ICON_SIZE });
  resultIcon.composite(originalIcon, scalePosition, scalePosition);
  return resultIcon;
}

/** Generates and applies (or saves) an adaptive icon for one app bundle. */
export async function processApp(appDir: string, opts: IconOptions): Promise<void> {
  console.log(`Processing ${appDir}...`);

  const resolved = path.resolve(process.cwd(), appDir);
  const stat = fs.statSync(resolved, { throwIfNoEntry: false });
  if (!stat?.isDirectory()) {
    throw new Error(`${resolved}: No such directory`);
  }
  if (!isAppBundle(resolved)) {
    throw new Error(
      `${resolved}: Not an App directory (expected a .app bundle or a directory with Contents/Info.plist)`,
    );
  }

  const identity = resolveIdentity(resolved, opts);
  const region = opts.region || "us";
  const mask = (await Jimp.read(resolveAsset("mask.png"))).resize({ w: IMAGE_SIZE, h: IMAGE_SIZE });

  let resultIcon: JimpInstance;
  if (!opts.local && !opts.input) {
    resultIcon =
      (await searchAppStore(identity.name, region)) ?? (await generateLocalIcon(identity, opts));
  } else {
    resultIcon = await generateLocalIcon(identity, opts);
  }

  // Compose the 1024x1024 canvas: background color + icon box + mask.
  const image = new Jimp({ width: IMAGE_SIZE, height: IMAGE_SIZE, color: opts.color || "#ffffff" });
  image.composite(resultIcon, ICON_PADDING, ICON_PADDING);
  applyMask(image, mask);

  if (opts.output) {
    // Replace only the basename extension so dotted parent directories
    // (e.g. build.1/icon) are preserved in the derived .png path.
    const parsed = path.parse(String(opts.output));
    const outputPath = path.join(parsed.dir, `${parsed.name}.png`);
    await image.write(outputPath as `${string}.${string}`);
    console.log(`Successfully saved icon for ${appDir} at ${outputPath}\n`);
  } else {
    const tmpFile = tempPath("tmp-icon");
    const pngPath = `${tmpFile}.png`;
    await image.write(pngPath as `${string}.${string}`);
    const applied = await applyWithPreview(resolved, identity, pngPath, opts.yes ?? false);
    if (applied) {
      fs.rmSync(pngPath, { force: true });
      console.log(`Successfully set icon for ${appDir}\n`);
    }
  }
}

/**
 * Applies the generated preview to the app and returns whether the icon was
 * applied. In an interactive terminal the generated preview and the app's
 * current icon are auto-opened side by side for comparison and the user is
 * asked to confirm, defaulting to apply (Enter = yes); non-interactive runs
 * (scripts, CI) apply directly. `yes` forces apply without prompting.
 * Returns false when the user declines, in which case the caller keeps the
 * preview file on disk.
 */
async function applyWithPreview(
  appDir: string,
  identity: AppIdentity,
  previewPath: string,
  yes: boolean,
): Promise<boolean> {
  const apply = (): boolean => {
    runWithEscalation(appDir, (o) => setCustomIcon(appDir, previewPath, o), "Setting icon for");
    return true;
  };
  if (yes || !process.stdin.isTTY) {
    return apply();
  }
  // Interactive session: open the new preview next to the current icon so the
  // user can see and compare them before deciding; the prompt defaults to
  // apply (plain Enter accepts).
  const oldIconPath = await extractOldIcon(appDir, identity);
  openForComparison(oldIconPath ? [previewPath, oldIconPath] : [previewPath]);
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const prompt = [
      `Generated preview at ${previewPath}`,
      oldIconPath
        ? "Opening the preview and the current icon in Preview for comparison..."
        : "Opening the preview in Preview for comparison...",
      `Apply icon to ${appDir}? [Y/n] `,
    ].join("\n");
    const answer = await new Promise<string>((resolve) => {
      rl.question(prompt, resolve);
    });
    if (!parseApplyAnswer(answer)) {
      console.log(`\nIcon not applied. Preview kept at ${previewPath}.`);
      console.log(
        `Re-run the same command to apply it, or revert an applied icon with: iconsur unset ${appDir}`,
      );
      return false;
    }
    return apply();
  } finally {
    rl.close();
  }
}
