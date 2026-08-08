# Agent Instructions

## Module layout

- `src/`: TS CLI runtime — `index.ts` (entry) plus `cli.ts`, `icon.ts`, `fileicon.ts` (native osascript/xattr icon set/rm), `openjpeg.ts` (vendored Emscripten OpenJPEG), `jimp.ts` (JP2 format registration), `plist.ts`, `cache.ts`, `assets.ts`. Vendored artifacts (`openjpeg.ts`, `mask.png`) are not hand-edited.
- `.github/workflows/`: `ci.yml` (PR status checks) and `release.yml` (git-cliff release pipeline).
- `docs/`: maintainer docs.

## Commands

| Task                    | Command                               |
| ----------------------- | ------------------------------------- |
| Install dependencies    | `vp install` (pnpm)                   |
| Run from source         | `node src/index.ts <command>`         |
| Build standalone binary | `vp run build` (tsdown + pkg)         |
| Validate / test         | `vp check` / `vp test`                |
| Release                 | push to `main`; see `docs/release.md` |

## Constraints

- Before implementation, run `git fetch --prune`, inspect local and upstream state, and start from the latest target branch without discarding uncommitted work.
- Delete a completed local branch only when it is merged into its target and its upstream branch is gone.
- pnpm is the canonical package manager; the stale `package-lock.json` is removed (in `.gitignore`).
- Write conventional commits; git-cliff drives versioning and `CHANGELOG.md` (see `docs/release.md`). Commit hooks (`.vite-hooks/`) enforce this; opt out with `VP_GIT_HOOKS=0`.
- Docs-only sessions: never touch code or config; record changes in `docs/plan.md`.

## References

- Usage (end users): `README.md`
- Development: `docs/development.md`
- Architecture: `docs/architecture.md`
- Security: `docs/security-invariants.md`
- Releases: `docs/release.md`
