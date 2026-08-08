# Change Plan

Registry for code/config changes deferred from docs-only sessions. Each entry records the change, why it matters, and acceptance criteria. Implement entries only in code sessions; update status as work lands.

Legend: `[ ]` planned · `[~]` in progress · `[x]` done

Status (2026-08): **implemented** — full TypeScript 7 migration landed (zero `.js`/`.sh` in the repo), vp-native pre-commit hook active (commitlint removed by maintainer request), sudo-free `cache`/`set` with preview-before-apply, fully automated git-cliff release pipeline (no manual release/publish except the first npm publish), six cross-platform binaries. Remaining manual steps: branch protection on `main` (item 7) and re-verify npm badge URLs after the first publish (item 1).

---

## 1. Fork identity (P1)

- [x] `package.json`: `name` → `@zeldrisho/iconsur`, `repository.url` → `https://github.com/zeldrisho/iconsur`. First scoped publish needs `npm publish --access public` (release workflow passes it).
- [x] README: fork banner added, `brew` install removed, npm install line + badges + Releases link point at `@zeldrisho/iconsur` / this fork. (Re-verify badge URLs after first publish.)
- [x] LICENSE: MIT, © 2020 Rikumi Yu **+ © 2026 Zeldris** (upstream notice retained — MIT requires it; never remove or relicense).

**Why:** npm/Homebrew/CI all still resolve to the dead upstream; Homebrew formula is deprecated and disabled 2027-02-01.

## 2. TypeScript 7 migration — no `.js`, no `.sh` (P1)

**Goal:** the repo source tree contains only `.ts` (plus `.png`, `.toml`, `.yml`, `.md`, `.json`). No `.js`, no `.sh` anywhere outside `node_modules`/`.git`/`dist`.

### Module style (verified 2026-08, Node 24.19.0)

- Package becomes `"type": "module"`; **all source is ESM-syntax `.ts` (`import`/`export`, no `require()`)**. Verified: pure-ESM `.ts` runs directly under Node type stripping (`node src/index.ts`, relative `./x.ts` imports, `import.meta` all fine). **Mixed `require()` + `import` in one `.ts` file fails** ("Failed to load the ES module") — the no-`require` rule is mandatory, not stylistic.
- Runtime floor: Node `>=22.18` (type stripping on by default; commander 15 needs `>=22.12`); dev/CI on the vp-managed Node 24.19.0. `bin` stays `src/index.ts` (shebang `#!/usr/bin/env node`) — npm consumers need Node ≥22.18; decide publish form in item 3/6 (source TS vs compiled dist; `dist/` is generated, gitignored, and does not count as repo source).
- Use `import.meta.dirname` (Node 20.11+) for resolving vendored assets instead of `__dirname`.
- Asset paths: `src/mask.png` (binary, stays), `src/openjpeg.*` (below).

### tsconfig (verified against typescript@7.0.2 native `tsc`)

- `module`/`moduleResolution`: `nodenext` — **`node10` resolution is removed in TS 7** (error TS5108); explicit `rootDir` is required (TS5011).
- `erasableSyntaxOnly: true` (Node type stripping can't erase `enum`/`namespace`/parameter properties — banned), `strict: true`, `allowImportingTsExtensions` + `rewriteRelativeImportExtensions` (lets `tsc` emit runnable output and Node run source), `skipLibCheck: true`, `target: es2023`.
- `tsc --noEmit` is the type check wired into `vp check` and CI; compile-to-JS happens only inside the `build` pipeline (items 4/6).

### Vendored artifacts — removing the last `.js`/`.sh`

- [x] **`src/openjpeg.js` → `src/openjpeg.ts`** via the interim fallback (WASM rebuild deferred): renamed, `// @ts-nocheck`, converted to an ESM default export, and the sloppy-mode runtime globals (`printErr`/`read`/`load`/`require`) declared at module scope so the asm.js factory runs under ESM strict mode. Contract preserved: `openjpeg(buffer, 'jp2') → { width, height, data }`; the planar→pixel remap lives in `src/jimp.ts` (`decodeJp2`).
- [x] **`src/fileicon.sh` → native `src/fileicon.ts`, no `.sh`.** Reimplements upstream v0.3.5 semantics: constant AppleScript-ObjC program via `osascript -e SCRIPT -- <icon> <dest>` (argv paths, never interpolated), plus `rm` via `com.apple.FinderInfo` xattr flag clearing and `Icon\r`/resource-fork cleanup. `osascript`/`xattr`/`rm` are runtime dependencies (ship with macOS).
- `src/mask.png` is binary — no action. `src/index.js` → `src/index.ts` + split into modules (`cli.ts`, `icon.ts`, `fileicon.ts`, `jimp.ts`, `openjpeg.ts`, `plist.ts`, `cache.ts`, `assets.ts`); pipeline steps are unit-tested in `tests/`.

**Acceptance:** `find . \( -name node_modules -o -name .git -o -name dist \) -prune -o \( -name '*.js' -o -name '*.sh' \) -print` is empty; `node src/index.ts --help` runs with no build step; JP2/ICNS and `set`/`unset`/`cache` behave identically to today.

## 3. Dependency modernization (P1)

Research 2026-08 — versions verified against the npm registry; API claims verified against shipped `.d.ts` where noted:

| Dep                                     | Pinned | Modern                    | Action                                                                                            |
| --------------------------------------- | ------ | ------------------------- | ------------------------------------------------------------------------------------------------- |
| `typescript`                            | —      | 7.0.2                     | **add** (native Go-compiler `tsc` verified; TS7 removed `node10` resolution)                      |
| `jimp`                                  | 0.14.0 | 1.6.1                     | migrate (below)                                                                                   |
| `commander`                             | 6.0.0  | 15.0.0                    | bump — API-compatible for our usage (node ≥22.12)                                                 |
| `glob`                                  | 7.1.6  | 13.0.6                    | bump — `glob.sync` → `globSync`; dual CJS/ESM so ESM import is fine                               |
| `plist`                                 | 3.0.5  | 5.0.0                     | bump — **ESM-only** (verified `require('plist')` fails on Node 24); fine under `"type": "module"` |
| `cross-fetch`                           | 3.1.5  | —                         | **drop** — native `fetch`; `res.buffer()` → `Buffer.from(await res.arrayBuffer())`                |
| `icns-lib`                              | 1.0.1  | 1.0.1                     | keep (unmaintained but works); add ambient `src/types/icns-lib.d.ts`                              |
| `pkg`                                   | 5.8.1  | `@yao-pkg/pkg` 6.22.0     | replace (below)                                                                                   |
| `@types/node`                           | 14.x   | ^24                       | bump (matches runtime 24.19.0; do not take 26.x)                                                  |
| `vitest` / `tsdown` / `@commitlint/cli` | —      | 4.1.10 / 0.22.14 / 21.2.1 | add (items 4/5)                                                                                   |

- [x] **jimp 0.x → 1.x** — migrated in `src/icon.ts`: `Jimp.read` retained, `write` replaces `writeAsync`, `new Jimp({ width, height, color })` constructor, `resize`/`contain`/`cover` take `{ w, h }` option objects (floats are rounded internally), `composite(src, x, y)` positional, `scan`/`hasAlpha`/`getPixelColor`/`setPixelColor` retained.
- [x] **JP2 decoder registration** — registered as a 1.x format plugin (`{ mime, hasAlpha, encode, decode }`) in `src/jimp.ts` via `createJimp` from `@jimp/core` (direct dep; the `jimp` ESM entry does not export it). Decoder body (Planar-RGB→RGBA remap) moved into `jimp.ts` (`decodeJp2`); `file-type` detects `image/jp2` and jimp routes it to the custom format.
- [x] **`pkg` replacement** — `@yao-pkg/pkg` 6.22.0. Pipeline: `vp pack` (tsdown single-CJS, all deps inlined — pkg cannot load external ESM like `plist@5`) → `pkg -c .pkgrc.json dist/index.cjs --targets node22-macos-arm64,node22-macos-x64`. Assets (`package.json`, `src/mask.png`, `dist/mask.png`) mounted via `.pkgrc.json`. Node SEA remains an evaluated alternative.
- [x] Node floor (`>=22.18`) gates engines; pkg targets `node24-*` (current LTS — verified fetchable via `@yao-pkg/pkg`) for **macOS arm64 + x64** (maintainer decision 2026-08: Linux/Windows builds not needed). CI Node is 24 via setup-vp.

## 4. Vite+ (vp) adoption (P1)

Current state: `vp v0.2.8` at `~/.vite-plus/bin/vp`; project **not** migrated (no local `vite-plus`, no `vite.config.ts`). `iconsur` runs as a vp-managed global package (`~/.vite-plus/packages/iconsur`, Node 24.19.0).

- [x] Declare `devEngines.packageManager` + `devEngines.runtime` (Node 24.19.0 pinned via `vp env pin`); `.node-version` dropped by maintainer request — CI sets Node 24 via setup-vp.
- [x] Standardize on `vp install` / `vp add` / `vp update`; `git rm` stale `package-lock.json`, keep it in `.gitignore` (already listed).
- [x] Add `vite.config.ts` (`defineConfig` from `vite-plus`): `staged` block (item 5), vitest config, tsdown entry for `vp pack`.
- [x] `vp check` (oxfmt + oxlint + tsc diagnostics via `typeCheck`) and `vp test` (vitest via vite-plus-bundled runner; the `vitest` devDep only supplies types for test files). `CHANGELOG.md` excluded from auto-format via `fmt.ignorePatterns`. Tests: JP2 decode roundtrip, mask compositing, plist fallback parsing, `fileicon.ts` osascript argv construction, commander arg parsing, cache command construction. Wired into CI (item 7).
- [x] `vp pack` (tsdown) is the single-CJS bundle step feeding the binary (item 3); `vp pm publish` is the npm publish path (item 6).
- [x] Do **not** run `vp migrate` blindly: it rewrites scripts/imports and assumes a Vite app. This is a plain CLI; targeted adoption only.

## 5. Pre-commit hooks (P1, new)

vp-native, no husky/lint-staged. Verified against viteplus.dev/guide/commit-hooks and `vp config`/`vp staged --help`:

- [x] Run `vp config` to install the hook dispatcher (project-owned hooks live in `.vite-hooks/`, dispatcher + shims in `.vite-hooks/_`, gitignored). **Run with `--no-agent`** so vp does not rewrite coding-agent instruction files (see item 11).
- [x] `.vite-hooks/pre-commit` (committed) runs `vp staged`; `vite.config.ts` `staged` block: `'*.ts': 'vp check --fix'`, `'*.{json,md,toml,yml}': 'vp fmt'`.
- [x] ~~commit-msg lint~~ **removed by maintainer decision** (2026-08): no commitlint; conventional messages remain a convention, and git-cliff skips non-conventional commits with a warning.
- [x] `VP_GIT_HOOKS=0` documented as the opt-out (CI commits, tooling).

**Acceptance:** `git commit` with an unformatted `.ts` file or a non-conventional message is blocked; staged-only enforcement (unstaged changes untouched).

## 6. git-cliff changelog + releases (P1)

Mirror the `pi-packages` release setup (see `docs/release.md`) scaled to one package:

- [x] Add `cliff.toml` (conventional-commits config for git-cliff 2.13.1).
- [x] Add generated `CHANGELOG.md` — generated by git-cliff from full history; never hand-edited.
- [x] New `.github/workflows/release.yml`: on push to `main` → git-cliff (compute version + changelog, bump `package.json` version) → build binary (`tsc` → tsdown bundle → `@yao-pkg/pkg`/SEA, x64 + arm64) → `vp pm publish` to npm (`--access public` on first publish) → GitHub release with `dist/iconsur` assets.
- [x] Retired legacy `.github/workflows/build.yml` (Node 10, `pascalgn/npm-publish-action@1.3.8`, unversioned actions).
- [x] Versioning rules encoded in `cliff.toml` + `release.yml` (breaking → major, `feat` → minor, `fix`/`perf`/`revert` → patch; docs/refactor/test/ci/chore never bump; tag format `v<version>`).

## 7. CI modernization (P1)

- [x] Add PR status-check workflow (`ci.yml`): `pull_request` + push to `main` → `voidzero-dev/setup-vp` (Node 24, cache, install) → `vp check`, `vp test`, `vp run build`.
- [x] `actions/checkout@v7` + `voidzero-dev/setup-vp@v1.17.0` (exact tag: setup-vp's moving `v1` is frozen at v1.15.0 per upstream docs — do not use it). Node 24 LTS via `node-version` input; `.node-version` dropped (pin lives in `package.json#devEngines.runtime`). `@yao-pkg/pkg` cross-compiles macOS targets from `ubuntu-latest`.
- [x] macOS-specific verification (`set`/`cache` can't run on ubuntu) stays manual/on-device — item 8.
- [ ] Enable branch protection on `main` (GitHub settings): require the status check, a PR review, and up-to-date branches; optionally enforce conventional commits via commitlint (already local, item 5).

## 8. Sudo reduction — `cache` becomes sudo-free; `set` escalates only when required (P1)

Goal: **zero `sudo` by default**. Elevation happens only (a) for an optional system-wide cache nuke behind an explicit flag, and (b) as an automatic retry when a `set`/`unset` target bundle is not user-writable. Verified per-step on the dev machine (macOS 15.7.5, arm64; user in `admin` group; `sudo -n` requires a password — interactive only):

| Step (current code)                                                                            | Current                 | Verified reality                                                                                                                                                                                                               | Verdict                                                                                                                  |
| ---------------------------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `find /private/var/folders … com.apple.iconservices / com.apple.dock.iconcache … -exec rm -rf` | `sudo`                  | Per-user caches are **user-owned** (`zeldrisho:staff` under `/private/var/folders/<hash>/C/`, two hashes found) — deletable without elevation                                                                                  | **drop `sudo`**                                                                                                          |
| `sudo rm -rf /Library/Caches/com.apple.iconservices.store`                                     | `sudo`                  | Exists on 15.7.5, owned by `_iconservices:admin`, `drwx--x--x` — **not writable by admin group** (write probe denied); the system-wide IconServices store                                                                      | **optional** behind `cache --system`, only if the user opts in (interactive `sudo`; probe `sudo -n` and skip in scripts) |
| `sudo touch /Applications/*`                                                                   | `sudo`                  | Legacy hack; `/Applications` is `root:admin drwxrwxr-x`, but bundles are `root:wheel` (verified `Developer.app`); per-user invalidation + Dock/Finder restart is sufficient (matches canonical guides, several omit this step) | **drop**                                                                                                                 |
| `killall Dock` / `killall Finder`                                                              | none                    | User-level, no elevation (already works)                                                                                                                                                                                       | keep                                                                                                                     |
| `set`/`unset` on user-owned bundle                                                             | `sudo` (README blanket) | Most `/Applications` apps are `staff`-owned (Alacritty, Brave, Donut, Ente Auth) plus `~/Applications` — writable without sudo                                                                                                 | **drop — works today**                                                                                                   |
| `set`/`unset` on root/SIP/MAS bundle                                                           | `sudo`                  | `root:wheel` bundles (Developer.app) and Cryptex/SIP targets (Safari → `/System/Cryptexes/…`) genuinely require write on the bundle                                                                                            | **auto-escalate** on write failure                                                                                       |

- [x] `cache`: remove `sudo` from the per-user `find`; delete the `touch /Applications/*` step; keep `killall Dock`/`killall Finder`. Result: plain `iconsur cache` runs with **no elevation, ever**.
- [x] `cache --system` (new flag): optional full nuke including `/Library/Caches/com.apple.iconservices.store` via `sudo`; skip with a note when `sudo -n` fails (non-interactive/CI safety — verified passwordless sudo is not available here).
- [x] `set`/`unset`: probe the target with `fs.access(W_OK)` before mutating; run `fileicon.ts` without `sudo`; on permission failure, retry the same operation under `sudo` (osascript spawn re-run with elevation — constant script, argv paths, per security invariants) with an explanatory message. Never blanket-elevate.
- [x] README: replace the blanket `sudo iconsur …` examples with the verified reality (no sudo for user-owned apps; auto-escalation only for system-owned/MAS/SIP bundles; `cache` needs no sudo; `cache --system` is the only opt-in escalation). Update `docs/security-invariants.md` accordingly — the invariant becomes: _default path is unprivileged; elevation is per-command, opt-in, and explicit in code_.
- [~] Re-test on a clean machine (verified on the dev machine: macOS 15.7.5 arm64, incl. escalated `set` message + non-interactive `cache --system` skip).

**Acceptance:** `iconsur cache` on a fresh admin session never prompts for a password; `iconsur set ~/Applications/X.app -l -o out.png` and `iconsur set` on a user-owned app never prompt; `iconsur set /Applications/root-owned.app` prompts exactly once (escalated retry) with a clear message; CI/scripts never hang on a sudo prompt.

## 9. Homebrew (P3)

- [x] Decision documented in README: rely on `npm`/release binary; no fork tap (origin formula disabled 2027-02-01).

## 10. Upstream sync check (P3)

- [x] `mklement0/fileicon` newer fixes (now v0.3.5 vs vendored v0.3.0) are **superseded**: the native `fileicon.ts` reimplementation (item 2) adopts the v0.3.5 AppleScript-ObjC mechanism directly. Track upstream only if `set`/`rm` edge cases regress.
- [x] `src/openjpeg.js` stays as-is (or becomes WASM per item 2) unless JP2 decoding breaks.

## 11. Repo hygiene: AGENTS.md stops referencing plan.md (P1, new)

- [x] Removed every mention of `docs/plan.md` from `AGENTS.md`:
  - Commands table note: "`docs/plan.md` tracks code/config changes deferred from docs-only sessions" → drop the sentence (docs-only changes are recorded in plan.md, but AGENTS.md does not need to say so).
  - References list: `Deferred changes: docs/plan.md` → remove the entry.
  - Keep AGENTS.md minimal (per the agents-md skill); the plan remains discoverable via `docs/development.md`.
- [x] Ran `vp config --no-agent`; AGENTS.md left untouched by the hook setup and cleaned of `docs/plan.md` references.

---

## Appendix: verified research findings (2026-08)

Runtime and API claims above were probed on this machine / registry; record here so implementers trust them:

- **Node 24.19.0 type stripping**: `node src/main.ts` with `import` + `./helper.ts` relative import + `import.meta.url` runs clean. `require('./math.ts')` of a pure-`export` file works. `require()` **and** `import` in the same `.ts` fails ("Failed to load the ES module") → ESM-only rule.
- **typescript@7.0.2**: native `tsc` runs (`Version 7.0.2`); `moduleResolution: node10` removed (TS5108); explicit `rootDir` required when `include` narrows (TS5011); the tested config (`nodenext`, `erasableSyntaxOnly`, `allowImportingTsExtensions`, `rewriteRelativeImportExtensions`) passes `--noEmit` and emits runnable CJS/ESM.
- **jimp@1.6.1**: dual CJS/ESM (`require('jimp')` works); `getPixelColor`/`setPixelColor`/`scan`/`hasAlpha`/`composite`/`write` present in `.d.ts`; methods like `contain`/`cover`/`resize` are plugin-mixins taking `{ w, h }`-style options; formats are `@jimp/js-*`-style plugin objects (`{ mime, extensions, decoder }`); `createJimp` export **absent from the CJS build** — verify in ESM entry.
- **plist@5.0.0**: ESM-only exports map (no `require` condition); `require('plist')` throws on Node 24 → import, don't require.
- **glob@13.0.6**: dual exports (both `import` and `require` conditions); API is `globSync`.
- **commander@15.0.0**: engines `>=22.12`; our option/command usage is API-compatible.
- **@yao-pkg/pkg@6.22.0**: maintained pkg fork; ESM input fails (ERR_REQUIRE_ESM) → bundle to single CJS first (tsdown); cross-compiles macOS targets.
- **openjpeg.js**: 217 KB, Emscripten **asm.js** (0 `WebAssembly` tokens), CJS factory `module.exports = function(input, type)` returning `{ width, height, data }` (line 432).
- **fileicon**: vendored v0.3.0 calls **python3** (gone since macOS 12.3); upstream **v0.3.5** uses AppleScript-ObjC `osascript` (`NSWorkspace setIcon:imageData forFile:destPath options:2`) + FinderInfo/resource-fork/`Icon\r` handling — the model for `fileicon.ts`.
- **vp v0.2.8**: `vp config` (hook dispatcher; `--no-hooks`/`--no-agent`), `vp staged` (rules from `vite.config.ts` `staged` block), `vp check`, `vp test`, `vp pack` (tsdown), `vp pm publish`, `vp env pin` (`.node-version`); `VP_GIT_HOOKS=0` opt-out.
- **Latest versions on npm (2026-08)**: typescript 7.0.2 · jimp 1.6.1 · commander 15.0.0 · glob 13.0.6 · plist 5.0.0 · @yao-pkg/pkg 6.22.0 · @types/node 26.2.0 (use ^24 for Node 24) · vitest 4.1.10 · tsdown 0.22.14 · @commitlint/cli 21.2.1 · git-cliff 2.13.1.
