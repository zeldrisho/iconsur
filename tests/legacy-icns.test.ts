import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { buildProgram } from "../src/cli.ts";
import { decodeAppleRle, legacyIcnsImage } from "../src/icon.ts";
import { Jimp } from "../src/jimp.ts";

/** Chunks a buffer into 128-byte literal RLE runs (valid Apple RLE). */
function literalRle(data: Buffer): Buffer {
  const out: number[] = [];
  for (let i = 0; i < data.length; i += 128) {
    const chunk = data.subarray(i, Math.min(i + 128, data.length));
    out.push(chunk.length - 1, ...chunk);
  }
  return Buffer.from(out);
}

/** Builds an ICNS container from raw chunk payloads. */
function buildIcns(chunks: Record<string, Buffer>): Buffer {
  const size = 8 + Object.values(chunks).reduce((n, b) => n + 8 + b.length, 0);
  const out = Buffer.alloc(size);
  out.write("icns", 0, "ascii");
  out.writeUInt32BE(size, 4);
  let o = 8;
  for (const [type, data] of Object.entries(chunks)) {
    out.write(type, o, "ascii");
    out.writeUInt32BE(8 + data.length, o + 4);
    data.copy(out, o + 8);
    o += 8 + data.length;
  }
  return out;
}

/** Planar RGB for a WxH image: pixel (x, y) = (x, y, x ^ y). */
function rgbPattern(width: number, height: number): Buffer {
  const rgb = Buffer.alloc(width * height * 3);
  const planeSize = width * height;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const p = y * width + x;
      rgb[p] = x & 0xff;
      rgb[planeSize + p] = y & 0xff;
      rgb[planeSize * 2 + p] = (x ^ y) & 0xff;
    }
  }
  return rgb;
}

/** A 16x16 legacy ICNS with one RGB+mask pair, like old Steam bundles. */
function legacy16Icns(): Buffer {
  const rgb = literalRle(rgbPattern(16, 16));
  const mask = Buffer.alloc(256);
  for (let i = 0; i < 256; i++) {
    mask[i] = i; // alpha ramp: corner pixels transparent
  }
  return buildIcns({ is32: rgb, s8mk: mask });
}

describe("Apple RLE decompression", () => {
  it("expands repeat runs (high-bit count byte)", () => {
    // 0x82 & 0x7f = 2 -> 5 copies of 0xff
    expect(decodeAppleRle(Buffer.from([0x82, 0xff]))).toEqual(Buffer.alloc(5, 0xff));
  });

  it("expands literal runs (low-bit count byte)", () => {
    // 0x01 -> 2 literal bytes; 0x80 & 0x7f = 0 -> 3 copies of 0x11
    const decoded = decodeAppleRle(Buffer.from([0x01, 0xab, 0xcd, 0x80, 0x11]));
    expect(decoded).toEqual(Buffer.from([0xab, 0xcd, 0x11, 0x11, 0x11]));
  });

  it("round-trips a literal-encoded RGB stream", () => {
    const source = rgbPattern(16, 16);
    expect(decodeAppleRle(literalRle(source))).toEqual(source);
  });

  it("handles maximum 130-byte repeat run (0xff, value)", () => {
    // 0xff & 0x7f = 127 -> 127 + 3 = 130 copies of 0xaa
    const decoded = decodeAppleRle(Buffer.from([0xff, 0xaa]));
    expect(decoded).toEqual(Buffer.alloc(130, 0xaa));
  });
});

describe("legacy ICNS decoding", () => {
  it("extracts a legacy RGB+mask pair as interleaved RGBA", () => {
    const image = legacyIcnsImage(legacy16Icns());
    expect(image?.width).toBe(16);
    const rgba = image?.data;
    expect(rgba).toBeTruthy();
    // pixel (0,0): r=0, g=0, b=0, a=0
    expect(rgba?.subarray(0, 4)).toEqual(Buffer.from([0, 0, 0, 0]));
    // pixel (1,1): r=1, g=1, b=0, a=17
    expect(rgba?.subarray(4 * 17, 4 * 17 + 4)).toEqual(Buffer.from([1, 1, 0, 17]));
    // pixel (15,15): r=15, g=15, b=0, a=255
    expect(rgba?.subarray(rgba.length - 4)).toEqual(Buffer.from([15, 15, 0, 255]));
  });

  it("prefers the largest available legacy size", () => {
    const rgb16 = literalRle(rgbPattern(16, 16));
    const rgb32 = literalRle(rgbPattern(32, 32));
    const mask32 = Buffer.alloc(1024, 0xff);
    const icns = buildIcns({
      is32: rgb16,
      s8mk: Buffer.alloc(256, 0xff),
      il32: rgb32,
      l8mk: mask32,
    });
    const image = legacyIcnsImage(icns);
    expect(image?.width).toBe(32);
    expect(image?.data.length).toBe(32 * 32 * 4);
  });

  it("skips the 4-byte length field in it32 payloads", () => {
    const rgb = literalRle(rgbPattern(128, 128));
    const prefixed = Buffer.concat([Buffer.from([0, 0, 0, 0]), rgb]);
    const icns = buildIcns({ it32: prefixed, t8mk: Buffer.alloc(128 * 128, 0xff) });
    const image = legacyIcnsImage(icns);
    expect(image?.width).toBe(128);
    expect(image?.data.length).toBe(128 * 128 * 4);
  });

  it("processes ih32 type at 48x48 with prefixed payload", () => {
    const rgb = literalRle(rgbPattern(48, 48));
    const prefixed = Buffer.concat([Buffer.from([0, 0, 0, 0]), rgb]);
    const icns = buildIcns({ ih32: prefixed, h8mk: Buffer.alloc(48 * 48, 0xff) });
    const image = legacyIcnsImage(icns);
    expect(image?.width).toBe(48);
    expect(image?.data.length).toBe(48 * 48 * 4);
  });

  it("returns null for non-ICNS buffers", () => {
    expect(legacyIcnsImage(Buffer.from("not an icns file at all"))).toBeNull();
  });

  it("rejects ICNS with invalid chunk sizes", () => {
    // Build a malformed ICNS with chunk size too small (< 8)
    const bad1 = Buffer.alloc(20);
    bad1.write("icns", 0, "ascii");
    bad1.writeUInt32BE(20, 4); // total size
    bad1.write("is32", 8, "ascii");
    bad1.writeUInt32BE(4, 12); // chunk size too small (< 8)
    expect(legacyIcnsImage(bad1)).toBeNull();

    // Build a malformed ICNS with chunk size larger than remaining body
    const bad2 = Buffer.alloc(20);
    bad2.write("icns", 0, "ascii");
    bad2.writeUInt32BE(20, 4); // total size
    bad2.write("is32", 8, "ascii");
    bad2.writeUInt32BE(500, 12); // chunk size too large
    expect(legacyIcnsImage(bad2)).toBeNull();
  });
});

describe("CLI on a legacy-ICNS bare bundle", () => {
  it("generates an adaptive icon from a Steam-style bundle", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "iconsur-test-"));
    const appDir = path.join(dir, "Stardew Valley");
    fs.mkdirSync(path.join(appDir, "Contents", "Resources"), { recursive: true });
    fs.writeFileSync(
      path.join(appDir, "Contents/Info.plist"),
      `<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0"><dict><key>CFBundleDisplayName</key><string>Stardew Valley</string>
<key>CFBundleIconFile</key><string>App</string></dict></plist>`,
    );
    fs.writeFileSync(path.join(appDir, "Contents/Resources/App.icns"), legacy16Icns());
    const outPath = path.join(dir, "out.png");

    const program = buildProgram("9.9.9");
    await program.parseAsync(["set", appDir, "-l", "-o", outPath], { from: "user" });

    const out = await Jimp.read(outPath);
    expect(out.width).toBe(1024);
    expect(out.height).toBe(1024);
  });
});
