# Architecture

`iconsur` is a macOS CLI written in TypeScript. It generates a 1024×1024 Big Sur-style icon, then applies it to an app bundle using macOS icon services.

## Runtime flow

1. `src/cli.ts` parses `set`, `unset`, and `cache` commands.
2. `src/plist.ts` identifies an app and its bundled icon. App targets must be directories ending in `.app` or containing `Contents/Info.plist`.
3. `src/icon.ts` obtains artwork from the iTunes Search API or decodes the local ICNS icon. Legacy ICNS RGB/mask resources and JPEG 2000 payloads are supported.
4. The icon is composed on a colored canvas and rounded with `src/mask.png`.
5. `src/fileicon.ts` applies or removes the custom icon using `osascript`, `xattr`, and `rm`.
6. `src/cache.ts` clears per-user caches and restarts Finder and Dock.

`--output` stops after writing a PNG. Interactive `set` previews the generated and current icons before applying; `--yes` and non-interactive execution skip confirmation.

## Packaging and assets

- Source runs as ESM TypeScript with Node.js `>=22.18`.
- `vp pack` bundles the application into `dist/index.cjs`.
- `vp run build` packages that bundle as separate macOS arm64 and x64 binaries with `@yao-pkg/pkg`.
- `src/assets.ts` resolves `mask.png` and `package.json` in source, bundle, and pkg snapshot layouts. Do not hand-edit `src/openjpeg.ts` or `src/mask.png`.

## Security boundaries

The normal path is unprivileged. `set` and `unset` check bundle writability and retry the same operation with `sudo` only when needed. `cache` never elevates; `cache --system` is the explicit exception and skips the system-store deletion in non-interactive sessions unless passwordless sudo is available.

All subprocesses use constant programs and argument arrays. User paths are passed as arguments, not interpolated into shell commands or AppleScript. Search terms are URL-encoded, and app targets are validated before use. Do not weaken these boundaries when changing subprocesses or path handling.
