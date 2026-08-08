import { describe, expect, it } from "vite-plus/test";
import { decodeJp2, Jimp, planarToInterleaved } from "../src/jimp.ts";
import { TINY_JP2_BASE64 } from "./jp2-fixture.ts";

const TINY_JP2 = Buffer.from(TINY_JP2_BASE64, "base64");

describe("planar RGBA -> interleaved remap", () => {
  it("reads each output channel from the correct plane and pixel (floor division)", () => {
    // 1x2 planar RGBA: R plane = [10, 11], G = [20, 21], B = [30, 31], A = [40, 41].
    const planar = Buffer.from([10, 11, 20, 21, 30, 31, 40, 41]);
    const rgba = planarToInterleaved(planar);
    // Pixel 0: R,G,B,A  Pixel 1: R,G,B,A — no cross-pixel bleed.
    expect([...rgba]).toEqual([10, 20, 30, 40, 11, 21, 31, 41]);
  });
});

describe("JP2 decoding", () => {
  it("decodes a JP2 buffer into interleaved RGBA via the vendored OpenJPEG build", () => {
    const { width, height, data } = decodeJp2(TINY_JP2);
    expect(width).toBe(64);
    expect(height).toBe(64);
    expect(data).toHaveLength(width * height * 4);
    // Planar -> interleaved remap must be a valid RGBA quad per pixel.
    expect(data.length % 4).toBe(0);
    expect(data[0]).toBeGreaterThanOrEqual(0);
    expect(data[0]).toBeLessThanOrEqual(255);
  });

  it("reads a JP2 buffer through the registered jimp format plugin", async () => {
    const image = await Jimp.read(TINY_JP2);
    expect(image.width).toBe(64);
    expect(image.height).toBe(64);
  });
});
