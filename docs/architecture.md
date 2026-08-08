# Architecture

`iconsur` is a TypeScript CLI (`src/index.ts`) that generates a macOS Big Sur-style adaptive icon for a given `.app` bundle and applies it with a native `fileicon` implementation (`src/fileicon.ts`). The package is ESM-only, runs directly under Node type stripping, and bundles to a single CJS file for the standalone binary.

## CLI surface

Global options (defined on the `commander` program, valid for `set`):

| Option                    | Meaning                                              | Default          |
| ------------------------- | ---------------------------------------------------- | ---------------- |
| `-l, --local`             | Skip the App Store search; build from the local icon | off              |
| `-k, --keyword <keyword>` | Search term for the iTunes Search API                | app display name |
| `-r, --region <region>`   | 2-letter country code for the search                 | `us`             |
| `-s, --scale <float>`     | Scale of the local icon on the canvas                | `0.9`            |
| `-c, --color <hex>`       | Background color                                     | `ffffff`         |
| `-i, --input <path>`      | Use a custom source image instead of the app's ICNS  | —                |
| `-o, --output <path>`     | Write the PNG to a file instead of applying it       | —                |
| `-y, --yes`               | Apply without the interactive confirmation prompt    | off              |

Subcommands:

- `set <dir> [otherDirs...]` — generate and apply icons; supports glob patterns via `glob`.
- `unset <dir> [otherDirs...]` — remove custom icons via `fileicon.ts` `rm` semantics.
- `cache [--system]` — purge per-user icon caches and restart Dock/Finder; `--system` also nukes the system-wide store (opt-in sudo).

## Icon generation pipeline (`set`)

1. **Validate the app dir** — resolve the path, require it to exist and end with `.app`.
2. **Resolve identity** — convert `Contents/Info.plist` to XML with `plutil`, parse with `plist` (`src/plist.ts`); fall back to the directory name and `Contents/Resources/AppIcon.icns` if the plist is unreadable.
3. **Source icon** — unless `--local`/`--input` is set, query the iTunes Search API:
   `https://itunes.apple.com/search?media=software&entity=software,iPadSoftware&term=<encoded name>&country=<region>&limit=1`
   and download `artworkUrl512` (falling back to `artworkUrl100`). If no result, fall through to local generation.
4. **Local generation** — read the ICNS, extract the largest embedded image with `icns-lib`; JP2 payloads are decoded by the vendored `openjpeg.ts` via the custom format plugin registered in `src/jimp.ts` (`createJimp` from `@jimp/core` with a decoder-only `image/jp2` format — jimp 0.x's global `jimp.decoders` mutation no longer exists). Opaque icons are `cover`-filled to the icon box; alpha icons are `contain`-ed at the requested scale (jimp 1.x option-object API: `{ w, h }`).
5. **Compose the canvas** — create a 1024×1024 image, fill with the background color, composite the icon at 100px padding (icon box = 824×824), then apply `mask.png` with a per-pixel AND (`mask & pixel`), which rounds the corners.
6. **Apply** — write to a temp PNG, then show the preview path and ask for confirmation in an interactive terminal (`-y/--yes` skips; non-interactive runs apply directly), then `fileicon.ts set <appDir> <png>`. Declining keeps the original icon and leaves the preview on disk. `--output` (coerced to `.png`) skips the prompt entirely.

## fileicon (native)

`src/fileicon.ts` replaces the vendored `fileicon.sh` (v0.3.0) with upstream v0.3.5 semantics:

- `set` runs a **constant AppleScript-ObjC program** via `osascript -e SCRIPT -- <icon> <dest>`: it loads the PNG with `NSImage`, centers it on a square canvas, and calls `NSWorkspace setIcon:forFile:options:2`. Paths are argv — never interpolated into the script or shell.
- `rm` clears the custom-icon flag (0x04 at byte 8 of `com.apple.FinderInfo`, dropping the attribute when fully blank), then removes the `Icon\r` helper file (folder targets such as `.app` bundles) or the resource fork (file targets).
- `set`/`unset` are **sudo-free by default**: `runWithEscalation` probes `fs.access(W_OK)` and only retries the identical operation under `sudo` when the bundle is not user-writable (one prompt, explanatory message).

## Vendored components

- `src/openjpeg.ts` — Emscripten-compiled OpenJPEG (asm.js) for JPEG 2000 decoding; ESM default export `openjpeg(buffer, 'jp2') → { width, height, data }` (planar RGBA), with `@ts-nocheck` and excluded from lint. The sloppy-mode runtime globals (`printErr`, `read`, `load`, `require`) are declared at module scope so it runs under ESM strict mode.
- `src/mask.png` — 1024×1024 alpha mask defining the continuous-corner silhouette.

## Cache invalidation (`cache`)

Clears per-user icon caches under `/private/var/folders` (user-owned, no `sudo`), optionally the system-wide store behind `--system` (interactive `sudo`; skipped with a note when `sudo -n` fails, so scripts/CI never hang), and restarts `Dock` and `Finder`. The legacy `touch /Applications/*` step is dropped. Each step is wrapped in try/catch — a failed cache step is non-fatal because the Dock/Finder restart is what actually refreshes icons.

## Build / packaging

- Source: `node src/index.ts` (ESM, Node `>=22.18` type stripping; relative imports use literal `.ts` extensions).
- Bundle: `vp pack` (tsdown) emits a single-CJS `dist/index.cjs` with all dependencies inlined (pkg cannot load external ESM like `plist@5`).
- Binary: `@yao-pkg/pkg` (`-c .pkgrc.json`) targets `node24` for macOS arm64 + x64 (`dist/iconsur-arm64`, `dist/iconsur-x64`); `package.json` and `src/mask.png` are mounted as snapshot assets.
- Assets (`src/assets.ts`) resolve across all three layouts via `import.meta.dirname` (source), `__dirname` (bundle), and the pkg snapshot paths.

## Failure modes

- `plutil` conversion fails → falls back to name + `AppIcon.icns`.
- ICNS contains no decodable image / `Jimp` cannot read it → error advises `--input`.
- `osascript`/fileicon verification fails → error propagates with a diagnostic; `unset` cleans up partial state.
- `--output` is forced to `.png` (any extension is stripped).
