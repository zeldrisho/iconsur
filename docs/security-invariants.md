# Security Invariants

`iconsur` is a developer tool that intentionally runs privileged commands against the host it executes on. This document records the invariants that must hold; do not weaken them without review.

## Privilege boundaries

- The `cache` command executes destructive filesystem commands **with `sudo`**: it removes `/Library/Caches/com.apple.iconservices.store`, `find`s `/private/var/folders/` for icon caches and deletes them with `rm -rf`, `touch`es `/Applications/*`, and `killall`s `Dock`/`Finder`. The paths are hardcoded constants — never derive them from user input.
- `set` and `unset` invoke the vendored `fileicon.sh` with the user-supplied app directory and a tool-generated temp PNG. The app directory is validated (must exist and end with `.app`) before any filesystem mutation.

## Observed: runs without `sudo` on the maintainer machine

The vp-installed `iconsur` (`vp install -g iconsur`) runs `set` and `cache` **without `sudo`**. Mechanism (to be verified — `docs/plan.md` item 5):

- Every `sudo` step in `cache` is wrapped in try/catch; when `sudo` is unavailable they fail silently and `cache` still exits 0.
- `killall Dock` / `killall Finder` are user-level and do not require `sudo`; restarting Dock/Finder alone is enough to refresh icons in many cases.
- `set` succeeds without `sudo` on user-writable `.app` bundles (e.g. `~/Applications`); system-owned apps and Mac App Store apps still require `sudo`.

Treat the README's blanket `sudo` instructions as legacy until item 5 lands; the documented invariants below are about what must never change, not about what requires elevation.

## Input handling

- **App directories** are user-controlled but validated: must resolve to an existing directory ending in `.app`. Glob expansion happens through `glob` before validation.
- **Search keyword** is URL-encoded with `encodeURIComponent` before being embedded in the iTunes Search API request. It is also printed to stdout — never log anything sensitive into it.
- **Background color** (`-c`) is passed to `jimp.create` as a hex string; **scale** (`-s`) is parsed with `parseFloat` and used arithmetically only.
- **Temp files** are created in `os.tmpdir()` with random 6-digit suffixes; the extracted `fileicon.sh` is `chmod +x`'d at runtime.

## Repository invariants

- No secrets, API keys, or credentials may be committed. The iTunes Search API is public and requires no key; the tool must never need one.
- The distributed artifacts (npm package, `dist/iconsur` binary, GitHub release assets) are public — treat the entire repository as public.
- Do not introduce new shell command construction from user input (`execSync`/`spawnSync` strings must stay constant or use validated arguments).
- `sudo` usage must remain explicit in code and documented in `README.md`; never add blanket privilege escalation.
- `npm audit` findings should be reviewed before release since the `pkg` binary bundles its Node runtime and dependencies; 2020-era deps are being updated (`docs/plan.md` item 6).

## Release-time checks

- Once the git-cliff workflow lands, a push to `main` with feature commits is a release — review diffs accordingly (see `docs/release.md`).
- The legacy CI pipeline runs on `ubuntu-latest` with Node 10.x (inherited from upstream); the `set`/`cache` code paths cannot run in CI. Only dependency install, `pkg` build, and artifact upload are exercised.
