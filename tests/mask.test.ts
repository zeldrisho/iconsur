import { describe, expect, it } from "vitest";
import { applyMask } from "../src/icon.ts";
import { Jimp } from "../src/jimp.ts";
import { resolveAsset } from "../src/assets.ts";

describe("mask compositing", () => {
  it("rounds the corners of a filled canvas using the vendored mask", async () => {
    const mask = (await Jimp.read(resolveAsset("mask.png"))).resize({ w: 1024, h: 1024 });
    const image = new Jimp({ width: 1024, height: 1024, color: "#ffffff" });
    applyMask(image, mask);

    // Rounded-corner silhouette: corners transparent, center opaque.
    expect(image.getPixelColor(0, 0) & 0xff).toBe(0);
    expect(image.getPixelColor(1023, 1023) & 0xff).toBe(0);
    expect(image.getPixelColor(512, 512) & 0xff).toBe(255);
  });
});
