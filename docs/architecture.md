# Architecture

`iconsur` is a single-file Node.js CLI (`src/index.js`) that generates a macOS Big Sur-style adaptive icon for a given `.app` bundle and applies it with a vendored `fileicon` shell script.

## Fork status

This repo is a continuation of the archived [`rikumi/iconsur`](https://github.com/rikumi/iconsur) (last upstream activity Apr 2022, npm frozen at `1.7.0`). The runtime architecture below is unchanged from upstream and still accurate; planned changes (Vite+ adoption, git-cliff releases, dependency updates, CI modernization) are tracked in `docs/plan.md` and do not alter the pipeline described here.

## CLI surface

Global options (defined on the `commander` program, valid for `set`):

| Option | Meaning | Default |
|--------|---------|---------|
| `-l, --local` | Skip the App Store search; build from the local icon | off |
| `-k, --keyword <keyword>` | Search term for the iTunes Search API | app display name |
| `-r, --region <region>` | 2-letter country code for the search | `us` |
| `-s, --scale <float>` | Scale of the local icon on the canvas | `0.9` |
| `-c, --color <hex>` | Background color | `ffffff` |
| `-i, --input <path>` | Use a custom source image instead of the app's ICNS | — |
| `-o, --output <path>` | Write the PNG to a file instead of applying it | — |

Subcommands:

- `set <dir> [otherDirs...]` — generate and apply icons; supports glob patterns via `glob`.
- `unset <dir> [otherDirs...]` — remove custom icons via `fileicon rm`.
- `cache` — purge the icon services cache and restart Dock/Finder.

## Icon generation pipeline (`set`)

1. **Validate the app dir** — resolve the path, require it to exist and end with `.app`.
2. **Resolve identity** — convert `Contents/Info.plist` to XML with `plutil`, parse with `plist`; fall back to the directory name and `Contents/Resources/AppIcon.icns` if the plist is unreadable.
3. **Source icon** — unless `--local`/`--input` is set, query the iTunes Search API:
   `https://itunes.apple.com/search?media=software&entity=software,iPadSoftware&term=<encoded name>&country=<region>&limit=1`
   and download `artworkUrl512` (falling back to `artworkUrl100`). If no result, fall through to local generation.
4. **Local generation** — read the ICNS, extract the largest embedded image with `icns-lib` (JP2 payloads are decoded by the vendored `openjpeg.js` via a custom `jimp` decoder for `image/jp2`). Opaque icons are `cover`-filled to the icon box; alpha icons are `contain`-ed at the requested scale.
5. **Compose the canvas** — create a 1024×1024 image, fill with the background color, composite the icon at 100px padding (icon box = 824×824), then apply `mask.png` with a per-pixel AND (`mask & pixel`), which rounds the corners.
6. **Apply** — write to a temp PNG, then run the vendored `fileicon.sh set <appDir> <png>`, or write to `--output`.

## Vendored components

- `fileicon.sh` — mklement0's `fileicon` v0.3.0; manages the custom-icon resource on `.app` bundles. Extracted to `$TMPDIR` with a random suffix at startup.
- `openjpeg.js` — Emscripten-compiled OpenJPEG for JPEG 2000 decoding (the format used inside modern ICNS files).
- `mask.png` — 1024×1024 alpha mask defining the continuous-corner silhouette.

## Cache invalidation (`cache`)

Runs privileged commands (via `sudo`) to clear the icon services store, the per-user icon caches under `/private/var/folders`, and restarts `Dock` and `Finder`. Each step is wrapped in try/catch and failures are ignored — which is why the command still "works" without `sudo` (see `security-invariants.md`).

## Failure modes

- `plutil` conversion fails → falls back to name + `AppIcon.icns`.
- ICNS contains no decodable image / `jimp` cannot read it → error advises `--input`.
- `fileicon set` exits non-zero → error propagates with the script's status code.
- `--output` is forced to `.png` (any extension is stripped).
