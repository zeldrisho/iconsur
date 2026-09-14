# Development

## Requirements and setup

Development and builds require macOS, Node.js `>=22.18`, and Vite+ (`vp`). Install dependencies with:

```sh
vp install
```

The repository uses pnpm through Vite+. Do not run `vp migrate`; this is a CLI rather than a Vite application.

## Run and validate

Run the source directly with Node's built-in TypeScript support:

```sh
node src/index.ts --help
node src/index.ts set /Applications/SomeApp.app -l -o /tmp/icon.png
```

Use `--output` for development to avoid modifying an app bundle. Standard checks are:

```sh
vp check    # format, lint, and type-check
vp test     # tests in tests/
vp run build # bundle and macOS arm64/x64 binaries
```

`dist/` is generated output. Source imports use `.ts` extensions. Tests belong in `tests/*.test.ts` and import test APIs from `vite-plus/test`.

## Manual macOS verification

CI builds and smoke-tests the native binary, but privileged and interactive behavior needs an actual Mac. For a safe pipeline check:

1. Generate an image with `node src/index.ts set <app> -l -o /tmp/icon.png`.
2. Inspect the 1024×1024 PNG.
3. Apply the icon to a throwaway app with `set`, confirm the preview prompt, remove it with `unset`, and refresh with `cache`.
4. Test `cache --system` only when system-wide cache removal is intentional.

Keep `set`/`unset` unprivileged for writable targets and preserve the constant-argv subprocess behavior described in [architecture.md](architecture.md).
