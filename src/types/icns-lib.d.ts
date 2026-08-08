// Ambient types for icns-lib@1.0.1 (unmaintained, ships no type declarations).
// Only the surface used by iconsur is declared.
declare module "icns-lib" {
  /** Parses an ICNS buffer into a map of type code -> image data. */
  export function parse(buffer: Buffer<ArrayBuffer>): Record<string, Buffer<ArrayBuffer>>;
  /** True if the type code identifies an image entry (e.g. `ic07`, `ic13`). */
  export function isImageType(type: string): boolean;
  /** True if the type code identifies an icon entry. */
  export function isIconType(type: string): boolean;
  /** True if the type code identifies a non-image entry (e.g. `TOC `). */
  export function isOtherType(type: string): boolean;
}
