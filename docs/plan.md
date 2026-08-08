# Change Plan

Registry for code/config changes deferred from docs-only sessions. Each entry records the change, why it matters, and acceptance criteria. Implement entries only in code sessions; update status as work lands.

Legend: `[ ]` planned · `[~]` in progress · `[x]` done

---

## 1. Fork identity (P1)

- [ ] `package.json`: `name` → `@zeldrisho/iconsur`, `repository.url` → `https://github.com/zeldrisho/iconsur` (both still point at the archived upstream). First scoped publish needs `npm publish --access public`.
- [~] README: fork banner added, `brew` install removed, npm install line + badges + Releases link point at `@zeldrisho/iconsur` / this fork. (Docs done; re-verify badge URLs after first publish.)
- [x] LICENSE retained as-is: MIT, © 2020 Rikumi Yu. MIT requires keeping the upstream copyright notice when publishing the fork — never remove it or relicense.

**Why:** npm/Homebrew/CI all still resolve to the dead upstream; Homebrew formula is deprecated and disabled 2027-02-01.

## 2. Vite+ (vp) adoption (P1)

Current state: `vp v0.2.8` installed at `~/.vite-plus/bin/vp`; project is **not** migrated (no local `vite-plus`, no `vite.config.ts`). `iconsur` is installed as a vp-managed global package (`~/.vite-plus/packages/iconsur`, running under vp-managed Node 24.19.0) — that is what the maintainer runs day to day.

- [ ] Declare `packageManager: pnpm@…` (and/or `devEngines.packageManager`) in `package.json`; add `.node-version` so `vp env` and CI agree on Node.
- [ ] Standardize on `vp install` / `vp add` / `vp update` for dependency work (resolves to pnpm via `pnpm-lock.yaml`); `git rm` the stale `package-lock.json` and keep it in `.gitignore`.
- [ ] Evaluate `vp pack` (tsdown) vs the current `pkg` build for producing `dist/iconsur`; test that bundled `child_process`/`fs` usage keeps working. Add `vp pm publish` (or `vp pm stage publish`) as the npm publish path.
- [ ] Add Vitest tests via `vite-plus/test` (zero tests today); wire `vp check` + `vp test` into CI.
- [ ] Do **not** run `vp migrate` blindly: it rewrites scripts/imports and assumes a Vite app. This is a plain CommonJS CLI bundled with `pkg`; prefer targeted adoption.

**Why:** `vp` is the maintainer's toolchain; the origin CI (Node 10, unversioned actions) is 4+ years stale.

## 3. git-cliff changelog + releases (P1)

Mirror the `pi-packages` release setup (see `docs/release.md`) scaled to one package:

- [ ] Add `cliff.toml` (conventional-commits config for git-cliff).
- [ ] Add generated `CHANGELOG.md` — never hand-edited.
- [ ] New `.github/workflows/release.yml`: on push to `main` → git-cliff (compute version + changelog) → build binary → publish `@zeldrisho/iconsur` to npm → GitHub release with `dist/iconsur` asset. First publish must pass `--access public` (scoped packages default to private).
- [ ] Retire/fold the legacy `.github/workflows/build.yml` (Node 10, `pascalgn/npm-publish-action@1.3.8`, unversioned actions).
- [ ] Versioning rules: breaking → major, `feat` → minor, `fix`/`perf`/`revert` → patch; docs/refactor/test/ci/chore appear in release notes but never bump. Tag format `v<version>` (single package).

**Why:** gives the fork its own versioning after npm being frozen at 1.7.0 since 2022.

## 4. Modernize CI (P1)

- [ ] Add a PR status-check workflow (`ci.yml`): runs on `pull_request` + push to `main` → `vp install --frozen-lockfile`, `vp check`, `vp test`, `vp run build`. Today the only CI is the release pipeline (`build.yml`, push-only), so PRs have no checks to gate on.
- [ ] Enable branch protection on `main` (GitHub settings): require the status check to pass, require a PR review, require up-to-date branches. Optionally lint conventional commits (commitlint) since git-cliff depends on them.
- [ ] Bump `actions/checkout@v2` / `actions/setup-node@v1` to current major versions; pin semantic action versions (Dependabot-friendly).
- [ ] Replace Node 10.x with current LTS (20/22) — or use `vp env use` / `.node-version` in CI.
- [ ] `pkg` target `node16-macos-x64` is from 2022: test on current Node/macOS; consider an arm64 target.

## 5. Verify sudo-free operation (P2)

Observed: the vp-installed `iconsur` ran `set`/`cache` **without `sudo`** on the maintainer machine.

Hypothesis: `cache`'s `sudo` steps fail silently (each wrapped in try/catch), while `killall Dock`/`killall Finder` run user-level and are enough to refresh icons; `set` succeeds on user-writable `.app` bundles (e.g. in `~/Applications` or vp-installed paths).

- [ ] Reproduce on a clean machine and document exactly which steps need `sudo` (system `/Applications`, Mac App Store apps).
- [ ] Update `README.md` and `docs/security-invariants.md` with the verified reality.

## 6. macOS modern support (P2)

- [ ] Icon services cache paths have changed since Big Sur; verify `cache` is still effective on current macOS.
- [ ] `npm audit` + update 2020-era deps (`jimp`, `icns-lib`, `plist`, `glob`, `commander`) and re-test JP2/ICNS decoding (`src/openjpeg.js`).
- [ ] Confirm behavior on SIP-protected and user-owned apps.

## 7. Homebrew (P3)

- [ ] Decide: maintain a fork tap + formula, or rely on `npm`/`vp install -g iconsur`. Document the choice in README before the origin formula is disabled (2027-02-01).

## 8. Upstream sync check (P3)

- [ ] Check `mklement0/fileicon` for fixes newer than the vendored v0.3.0.
- [ ] Leave `src/openjpeg.js` (Emscripten build) as-is unless JP2 decoding breaks.

---

Status: docs-only sessions contribute to this file; nothing here has been implemented yet.
