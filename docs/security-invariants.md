# Security Invariants

`iconsur` is a developer tool that may run privileged commands against the host it executes on. This document records the invariants that must hold; do not weaken them without review.

## Privilege boundaries

**The default path is unprivileged.** Elevation is per-command, opt-in, and explicit in code — never blanket.

- `cache` runs with **no elevation, ever** on the default path: it `find`s `/private/var/folders/` for per-user icon caches (user-owned) and deletes them with `rm -rf`, then `killall`s `Dock`/`Finder`. All paths are hardcoded constants — never derived from user input.
- `cache --system` (explicit opt-in flag) additionally removes `/Library/Caches/com.apple.iconservices.store` via `sudo`. In non-interactive sessions (scripts/CI) it probes `sudo -n` first and skips with a note — a sudo prompt must never hang automation.
- `set`/`unset` probe the target with `fs.access(W_OK)` before mutating. Writable targets (user-owned apps, `~/Applications`) are handled unprivileged; on permission failure the **same operation is retried under `sudo`** with an explanatory message. There is no code path that elevates without first failing the unprivileged attempt.
- The `osascript`/`xattr`/`rm` invocations behind `fileicon` use constant programs and argv arrays. Paths are passed as argv to `osascript` (after `--`), never shell- or script-interpolated.

## Input handling

- **App directories** are user-controlled but validated: must resolve to an existing directory ending in `.app`. Glob expansion happens through `glob` before validation.
- **Search keyword** is URL-encoded with `encodeURIComponent` before being embedded in the iTunes Search API request. It is also printed to stdout — never log anything sensitive into it.
- **Background color** (`-c`) is passed to the Jimp constructor as a hex string; **scale** (`-s`) is parsed with `parseFloat` and used arithmetically only.
- **Temp files** are created in `os.tmpdir()` with random 6-8 character suffixes.

## Repository invariants

- No secrets, API keys, or credentials may be committed. The iTunes Search API is public and requires no key; the tool must never need one.
- The distributed artifacts (npm package, `dist/iconsur-*` binaries, GitHub release assets) are public — treat the entire repository as public.
- Do not introduce new shell command construction from user input (`execSync`/`spawnSync` strings must stay constant or use validated argv).
- `sudo` usage must remain explicit in code and documented in `README.md`; never add blanket privilege escalation.
- `npm audit` findings should be reviewed before release since the pkg binary bundles its Node runtime and dependencies.
- The vendored `src/openjpeg.ts` (Emscripten asm.js) is a generated artifact with `@ts-nocheck` and is excluded from lint; regenerate from OpenJPEG rather than hand-editing.

## Release-time checks

- A push to `main` with releasable (feat/fix/perf/breaking) commits triggers the git-cliff release workflow — review diffs accordingly (see `docs/release.md`).
- CI runs on `ubuntu-latest` and cannot exercise `set`/`cache` (macOS + privileges); macOS-specific verification stays manual/on-device.
