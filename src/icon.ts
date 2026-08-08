// The `set` icon-generation pipeline: resolve the app identity, obtain a
// source icon (App Store search or local ICNS/PNG), compose the adaptive
// canvas, apply the mask, and write/apply the result.
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

const IMAGE_SIZE = 1024;
const ICON_PADDING = 100;
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
  try {
    const subIconBuffer = Object.entries(icns.parse(iconBuffer))
      .filter(([key]) => icns.isImageType(key))
      .map(([, value]) => value)
      .sort((a, b) => b.length - a.length)[0];
    if (subIconBuffer) {
      iconBuffer = subIconBuffer;
    }
  } catch {
    // Not an ICNS (e.g. a plain PNG passed via --input) — read it directly.
  }

  let originalIcon: JimpInstance;
  try {
    originalIcon = await Jimp.read(iconBuffer);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Failed to read original icon: ${message}\nRe-run with option -i or --input to use a custom image for generation.`,
    );
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
  if (!resolved.endsWith(".app")) {
    throw new Error(`${resolved}: Not an App directory`);
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
    const applied = await applyWithPreview(resolved, pngPath, opts.yes ?? false);
    if (applied) {
      fs.rmSync(pngPath, { force: true });
      console.log(`Successfully set icon for ${appDir}\n`);
    }
  }
}

/**
 * Applies the generated preview to the app and returns whether the icon was
 * applied. In an interactive terminal the preview path is shown and the user
 * is asked to confirm; non-interactive runs (scripts, CI) apply directly.
 * `yes` forces apply without prompting. Returns false when the user declines,
 * in which case the caller keeps the preview file on disk.
 */
async function applyWithPreview(
  appDir: string,
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
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await new Promise<string>((resolve) => {
      rl.question(`Generated preview at ${previewPath}\nApply icon to ${appDir}? [y/N] `, resolve);
    });
    if (!/^y(es)?$/i.test(answer.trim())) {
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
