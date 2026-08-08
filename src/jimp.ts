// Jimp construction with a custom JPEG 2000 format registered as a 1.x format
// plugin (jimp 0.x's global `jimp.decoders['image/jp2']` mutation is gone).
import { createJimp } from "@jimp/core";
import { defaultFormats, defaultPlugins } from "jimp";
import openjpeg from "./openjpeg.ts";

export interface DecodedImage {
  width: number;
  height: number;
  data: Buffer;
}

/**
 * Decodes a JP2 buffer with the vendored OpenJPEG build and converts its
 * planar RGBA output into the interleaved RGBA layout jimp expects.
 */
export function decodeJp2(buffer: Buffer): DecodedImage {
  const { width, height, data } = openjpeg(buffer, "jp2");
  // Planar RGB -> Pixel RGB: each byte stream (all R, then all G, then all B,
  // then all A) is re-strided into RGBA quads.
  const rgba = Buffer.alloc(data.length);
  for (let i = 0; i < data.length; i++) {
    rgba[i] = data[(data.length / 4) * (i % 4) + Math.round(i / 4)] || 0;
  }
  return { width, height, data: rgba };
}

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

export type JimpInstance = InstanceType<typeof Jimp>;
