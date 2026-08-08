# Development

## Fork status

This repository is a continuation of the archived [`rikumi/iconsur`](https://github.com/rikumi/iconsur) (last upstream code activity Apr 2022). Upstream npm (`1.7.0`, May 2022) and the Homebrew formula (deprecated, disabled 2027-02-01) are stale; treat this repo as the source of truth. Code/config changes deferred from docs-only sessions are tracked in `docs/plan.md`.

## Requirements

- macOS (the tool reads `.app` bundles and touches the icon services cache)
- Node.js `>=22.18` (type stripping runs the `.ts` sources directly; the pinned dev runtime is Node 24.19.0 — see `.node-version` and `package.json#devEngines`)
- `vp` CLI (Vite+ toolchain) — resolves to pnpm for dependency work

## Setup

```sh
vp install    # resolves to pnpm install
```

pnpm is the canonical package manager (`pnpm-lock.yaml`; `package-lock.json` is deleted and gitignored). `vp config --no-agent` installs the Git hook dispatcher; project-owned hooks live in `.vite-hooks/` (`pre-commit` → `vp staged`, `commit-msg` → commitlint). Opt out per-invocation with `VP_GIT_HOOKS=0`.

## Running from source

The CLI is ESM TypeScript with no build step for source:

```sh
node src/index.ts --help
node src/index.ts set /Applications/SomeApp.app -l -o out.png   # dry-run: write PNG to a file
```

Use `-o/--output` during development to exercise the icon pipeline without touching a real app bundle or requiring `sudo`. The `bin` field points at `src/index.ts`; npm consumers need Node `>=22.18` (type stripping is on by default).

## Vite+ (vp) usage

| Intent                      | Command                                       |
| --------------------------- | --------------------------------------------- |
| Install / add / update deps | `vp install` / `vp add` / `vp update`         |
| Lint + format + type-check  | `vp check` (oxfmt + oxlint + tsc diagnostics) |
| Tests                       | `vp test` (vitest, `tests/`)                  |
| Library bundle (CJS)        | `vp pack` (tsdown → `dist/index.cjs`)         |
| Publish to npm              | `vp pm publish` (or the release workflow)     |

Do not run `vp migrate` — it assumes a Vite app and would rewrite scripts/imports. See `docs/plan.md`.

## Building the standalone binary

```sh
vp run build    # runs the `build` script
```

Pipeline: `vp pack` (tsdown single-CJS bundle, all deps inlined — pkg cannot load external ESM like `plist@5`) → copy `src/mask.png` into `dist/` → `@yao-pkg/pkg` with `.pkgrc.json` assets (`node22-macos-arm64` + `node22-macos-x64`). Artifacts land in `dist/iconsur-arm64` / `dist/iconsur-x64` (gitignored) and are what CI attaches to GitHub Releases.

## Project layout

| Path                 | Purpose                                                   |
| -------------------- | --------------------------------------------------------- |
| `src/index.ts`       | Entry point (shebang); wires error handlers + commander   |
| `src/cli.ts`         | Commander program: `set`, `unset`, `cache` (+ `--system`) |
| `src/icon.ts`        | Icon-generation pipeline (search, ICNS/JP2, mask, apply)  |
| `src/fileicon.ts`    | Native `fileicon` reimplementation (osascript + xattr)    |
| `src/openjpeg.ts`    | Vendored Emscripten OpenJPEG (asm.js, `@ts-nocheck`)      |
| `src/jimp.ts`        | Jimp class with the JP2 format plugin registered          |
| `src/plist.ts`       | Info.plist parsing via `plutil` + `plist`                 |
| `src/cache.ts`       | Sudo-free cache invalidation (+ `--system` nuke)          |
| `src/assets.ts`      | Asset resolution across source/bundle/pkg layouts         |
| `src/mask.png`       | Mask applied to the generated 1024×1024 canvas            |
| `.github/workflows/` | `ci.yml` (PR checks) and `release.yml` (git-cliff)        |

## Testing and linting

```sh
vp check    # oxfmt + oxlint + type checking (tsc diagnostics)
vp test     # vitest: JP2 decode, mask compositing, plist fallback, fileicon argv, CLI parsing, cache construction
```

Manual macOS verification (CI is ubuntu and cannot run `set`/`cache`):

1. Generate to a file: `node src/index.ts set <app> -l -o /tmp/icon.png`
2. Inspect the PNG at 1024×1024 with the mask applied.
3. Apply to a throwaway app with `set`, then remove with `unset`, then run `cache`.

## Vendored code

`src/openjpeg.ts` (Emscripten asm.js; converted to an ESM default export) and `src/mask.png` are imported artifacts — replace them by regenerating, never by hand-editing. `src/fileicon.sh` is gone: `src/fileicon.ts` reimplements upstream `mklement0/fileicon` v0.3.5 semantics natively (AppleScript-ObjC via `osascript`, FinderInfo/`Icon\r` cleanup), so the shell script and its python3 dependency are no longer vendored.
