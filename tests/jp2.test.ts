import { describe, expect, it } from "vite-plus/test";
import { decodeJp2, Jimp } from "../src/jimp.ts";
import { TINY_JP2_BASE64 } from "./jp2-fixture.ts";

const TINY_JP2 = Buffer.from(TINY_JP2_BASE64, "base64");

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
