# Development

## Setup and validation

Development and builds require macOS, Node.js `>=22.18`, and Vite+ (`vp`). Install dependencies with:

```sh
vp install
```

The repository uses pnpm through Vite+. Run the source directly with Node's built-in TypeScript support:

```sh
node src/index.ts --help
node src/index.ts set /Applications/SomeApp.app -l -o /tmp/icon.png
```

Use `--output` to avoid modifying an app bundle. Standard checks are:

```sh
vp check       # format, lint, and type-check
vp test        # tests in tests/
vp run build   # bundle and macOS arm64/x64 binaries
vp run scriptc:coverage  # optional native-compiler compatibility report
```

`dist/` is generated output. Source imports use `.ts` extensions. Tests belong in `tests/*.test.ts` and import APIs from `vite-plus/test`. Do not run `vp migrate`; this is a CLI rather than a Vite application.

`scriptc:coverage` is an opt-in experiment for evaluating a future Node-free
binary. It downloads the pinned experimental ScriptC release through `vp dlx`
and reports static, dynamic, and unsupported code paths. The production
`build` remains on `@yao-pkg/pkg` until the report and native smoke tests show
that image decoding, assets, networking, subprocesses, and privilege
escalation are compatible.

## Manual macOS verification

CI builds and smoke-tests the native binary, but privileged and interactive behavior needs a Mac. For a safe check:

1. Generate an image with `node src/index.ts set <app> -l -o /tmp/icon.png` and inspect the 1024×1024 PNG.
2. Apply it to a throwaway app, confirm the preview prompt, remove it with `unset`, and refresh with `cache`.
3. Run `cache --system` only when system-wide cache removal is intentional.

Keep writable-target `set`/`unset` unprivileged and preserve the constant-argv subprocess behavior described in [architecture.md](architecture.md).

## Releases

Releases are published from a `vX.Y.Z` tag matching `package.json#version`.

1. Update the version and its manually curated `CHANGELOG.md` section.
2. Run `vp check`, `vp test`, and `vp run build` on macOS.
3. Commit the changes and push the tag:

```sh
git tag vX.Y.Z
git push origin main vX.Y.Z
```

`.github/workflows/release.yml` validates the tag, publishes the npm package with trusted publishing, builds separate arm64/x64 binaries, and creates the GitHub release from `CHANGELOG.md`. Do not publish manually unless recovering from a documented workflow failure. Do not combine the binaries with `lipo`; the pkg bootstrap does not support a universal binary.
