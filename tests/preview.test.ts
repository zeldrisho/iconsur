import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { extractOldIcon, parseApplyAnswer } from "../src/icon.ts";
import { Jimp } from "../src/jimp.ts";

describe("preview apply prompt (default Y)", () => {
  it("defaults to apply: a plain Enter (empty answer) accepts", () => {
    expect(parseApplyAnswer("")).toBe(true);
    expect(parseApplyAnswer("   ")).toBe(true);
  });

  it("accepts y/yes in any case", () => {
    expect(parseApplyAnswer("y")).toBe(true);
    expect(parseApplyAnswer("Y")).toBe(true);
    expect(parseApplyAnswer("yes")).toBe(true);
    expect(parseApplyAnswer("YES")).toBe(true);
  });

  it("declines on anything else", () => {
    expect(parseApplyAnswer("n")).toBe(false);
    expect(parseApplyAnswer("no")).toBe(false);
    expect(parseApplyAnswer("abc")).toBe(false);
  });
});

describe("old-icon extraction for the comparison preview", () => {
  it("extracts the bundled icon to a temp PNG when no custom icon fork exists", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iconsur-test-"));
    const appDir = path.join(dir, "Test.app");
    fs.mkdirSync(path.join(appDir, "Contents"), { recursive: true });
    const srcPath = path.join(dir, "old.png");
    await new Jimp({ width: 64, height: 64, color: "#336699" }).write(
      srcPath as `${string}.${string}`,
    );

    const oldPath = await extractOldIcon(appDir, { name: "Test", iconPath: srcPath });
    expect(oldPath).toBeTruthy();
    const old = await Jimp.read(oldPath as string);
    expect(old.width).toBe(64);
    expect(old.height).toBe(64);
  });

  it("returns null when there is no readable icon", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iconsur-test-"));
    const appDir = path.join(dir, "Missing.app");
    fs.mkdirSync(path.join(appDir, "Contents"), { recursive: true });
    const oldPath = await extractOldIcon(appDir, {
      name: "Missing",
      iconPath: path.join(appDir, "Contents/Resources/AppIcon.icns"),
    });
    expect(oldPath).toBeNull();
  });
});
