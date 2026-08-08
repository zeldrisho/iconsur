// Jimp construction with a custom JPEG 2000 format registered as a 1.x format
// plugin (jimp 0.x's global `jimp.decoders['image/jp2']` mutation is gone).
import { createJimp } from "@jimp/core";
import { defaultFormats, defaultPlugins } from "jimp";
import openjpeg from "./openjpeg.ts";

/** Decoded image dimensions plus raw interleaved RGBA pixel data. */
export interface DecodedImage {
  width: number;
  height: number;
  data: Buffer;
}

/**
 * Re-strides OpenJPEG's planar RGBA output (all R bytes, then all G, then
 * all B, then all A) into the interleaved RGBA quads jimp expects. Each
 * output byte `i` reads plane `i % 4` at pixel `floor(i / 4)`.
 */
export function planarToInterleaved(data: Buffer): Buffer {
  const rgba = Buffer.alloc(data.length);
  const planeSize = data.length / 4;
  for (let i = 0; i < data.length; i++) {
    rgba[i] = data[planeSize * (i % 4) + Math.floor(i / 4)] || 0;
  }
  return rgba;
}

/**
 * Decodes a JP2 buffer with the vendored OpenJPEG build and converts its
 * planar RGBA output into the interleaved RGBA layout jimp expects.
 */
export function decodeJp2(buffer: Buffer): DecodedImage {
  const { width, height, data } = openjpeg(buffer, "jp2");
  return { width, height, data: planarToInterleaved(data) };
}

/** Decode-only JP2 format plugin; JPEG 2000 encoding is out of scope. */
const jp2Format = () => ({
  mime: "image/jp2",
  hasAlpha: true,
  // decode-only format: encoding JP2 is out of scope
  encode: () => {
    throw new Error("JPEG 2000 encoding is not supported");
  },
  decode: async (data: Buffer): Promise<DecodedImage> => decodeJp2(data),
});

/** Jimp class with the standard plugins/formats plus the JP2 decoder. */
export const Jimp = createJimp({
  plugins: defaultPlugins,
  formats: [...defaultFormats, jp2Format],
});

/** Instance type of the configured Jimp class. */
export type JimpInstance = InstanceType<typeof Jimp>;
