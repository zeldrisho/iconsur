# Development

## Fork status

This repository is a continuation of the archived [`rikumi/iconsur`](https://github.com/rikumi/iconsur) (last upstream code activity Apr 2022). Upstream npm (`1.7.0`, May 2022) and the Homebrew formula (deprecated, disabled 2027-02-01) are stale; treat this repo as the source of truth. Code changes deferred from docs-only sessions are tracked in `docs/plan.md`.

## Requirements

- macOS (the tool reads `.app` bundles and touches the icon services cache)
- Node.js 20+ recommended (upstream targeted 14; the vp-managed runtime is Node 24.19.0)
- `vp` CLI (Vite+ toolchain) — the maintainer's toolchain; `vp` delegates dependency work to pnpm via `pnpm-lock.yaml`

## Setup

```sh
vp install    # resolves to pnpm install
```

pnpm is the canonical package manager. The stale `package-lock.json` is being removed (see `docs/plan.md`).

End users install the published package with npm (see `README.md`); contributors use `vp` for development.

## Running from source

The CLI is plain CommonJS with no build step for source:

```sh
node src/index.js --help
node src/index.js set /Applications/SomeApp.app -l -o out.png   # dry-run: write PNG to a file
```

Use `-o/--output` during development to exercise the icon pipeline without touching a real app bundle or requiring `sudo`.

A vp-installed copy lives at `~/.vite-plus/packages/iconsur` (managed by `vp install -g iconsur`); it runs under the vp-managed Node runtime.

## Vite+ (vp) usage

The project is not yet migrated to Vite+ (no `vite.config.ts`, no `vite-plus` dependency). Targeted adoption is planned:

| Intent | Command |
|--------|---------|
| Install / add / update deps | `vp install` / `vp add` / `vp update` |
| Publish to npm | `vp pm publish` (evaluated in `docs/plan.md` item 2) |
| Lint + format + type-check | `vp check` (once configured) |
| Tests | `vp test` / `vitest` via `vite-plus/test` (none exist yet) |

Do not run `vp migrate` blindly — it assumes a Vite app and would rewrite scripts/imports. See `docs/plan.md` item 2.

## Building the standalone binary

```sh
vp run build    # runs the `build` script (pkg) via pnpm
```

Runs `pkg . --targets node16-macos-x64 --output dist/iconsur --debug`. The artifact lands in `dist/iconsur` (gitignored) and is what CI uploads to GitHub Releases. `vp pack` (tsdown) is being evaluated as a `pkg` replacement (`docs/plan.md` item 2).

## Project layout

| Path | Purpose |
|------|---------|
| `src/index.js` | All runtime logic: argument parsing, icon generation, cache invalidation |
| `src/openjpeg.js` | Vendored Emscripten OpenJPEG build for decoding JP2 images |
| `src/fileicon.sh` | Vendored `mklement0/fileicon` v0.3.0, used to set/remove icons |
| `src/mask.png` | Mask applied to the generated 1024×1024 canvas |
| `.github/workflows/build.yml` | Legacy release pipeline (see `docs/release.md`) |

## Testing and linting

There are no tests or lint scripts yet (adding Vitest is `docs/plan.md` item 2). Validate changes manually:

1. Generate to a file: `node src/index.js set <app> -l -o /tmp/icon.png`
2. Inspect the PNG at 1024×1024 with the mask applied.
3. Apply to a throwaway app with `set`, then remove with `unset`, then run `cache`.

## Vendored code

`src/openjpeg.js`, `src/fileicon.sh`, and `src/mask.png` are imported artifacts:

- `fileicon.sh` must stay in sync with upstream `mklement0/fileicon` (v0.3.0 vendored; newer fixes are item 8 in `docs/plan.md`).
- `openjpeg.js` is an Emscripten build; regenerate from OpenJPEG rather than patching.
- Replace `mask.png` only deliberately — it defines the adaptive-icon corner shape.
