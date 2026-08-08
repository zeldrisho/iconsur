import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildProgram } from "../src/cli.ts";
import { Jimp } from "../src/jimp.ts";
import { resolveIdentity } from "../src/icon.ts";

function tempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "iconsur-test-"));
}

function makeAppDir(dir: string, name: string): string {
  const appDir = path.join(dir, `${name}.app`);
  fs.mkdirSync(path.join(appDir, "Contents"), { recursive: true });
  return appDir;
}

describe("CLI arg parsing (commander)", () => {
  it("parses global options and generates an icon from a custom input", async () => {
    const dir = tempDir();
    const appDir = makeAppDir(dir, "Test");
    const srcPath = path.join(dir, "src.png");
    await new Jimp({ width: 100, height: 100, color: "#ff8800" }).write(
      srcPath as `${string}.${string}`,
    );
    const outPath = path.join(dir, "out.png");

    const program = buildProgram("9.9.9");
    await program.parseAsync(
      ["set", appDir, "-l", "-i", srcPath, "-s", "0.8", "-c", "87cdf0", "-o", outPath],
      {
        from: "user",
      },
    );

    const out = await Jimp.read(outPath);
    expect(out.width).toBe(1024);
    expect(out.height).toBe(1024);
  });
});

describe("plist fallback parsing", () => {
  it("falls back to the directory name when the plist is unreadable", () => {
    const dir = tempDir();
    const appDir = makeAppDir(dir, "FallbackApp");
    // No Contents/Info.plist at all -> plutil fails -> fallback identity.
    const identity = resolveIdentity(appDir, { local: true });
    expect(identity.name).toBe("FallbackApp");
    expect(identity.iconPath).toBe(path.join(appDir, "Contents/Resources/AppIcon.icns"));
  });

  it("reads CFBundleDisplayName from a well-formed plist", () => {
    const dir = tempDir();
    const appDir = makeAppDir(dir, "Named");
    fs.writeFileSync(
      path.join(appDir, "Contents/Info.plist"),
      `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>CFBundleDisplayName</key><string>Custom Name</string></dict></plist>`,
    );
    const identity = resolveIdentity(appDir, { local: true });
    expect(identity.name).toBe("Custom Name");
  });
});
