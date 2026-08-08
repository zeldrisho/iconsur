# Agent Instructions

## Module layout

- `src/`: CLI runtime (`index.js`) plus vendored `openjpeg.js`, `fileicon.sh`, and `mask.png` — vendored files are not hand-edited.
- `.github/workflows/build.yml`: legacy release pipeline (git-cliff replacement planned).
- `docs/`: maintainer docs; `docs/plan.md` tracks code/config changes deferred from docs-only sessions.

## Commands

| Task | Command |
|------|---------|
| Install dependencies | `vp install` (pnpm) |
| Run from source | `node src/index.js <command>` |
| Build standalone binary | `vp run build` (`pkg` script) |
| Validate / test (once wired) | `vp check` / `vp test` |
| Release | push to `main`; see `docs/release.md` |

## Constraints

- Before implementation, run `git fetch --prune`, inspect local and upstream state, and start from the latest target branch without discarding uncommitted work.
- Delete a completed local branch only when it is merged into its target and its upstream branch is gone.
- pnpm is the canonical package manager; the stale `package-lock.json` is being removed (`docs/plan.md`).
- Write conventional commits; git-cliff drives versioning and `CHANGELOG.md` (see `docs/release.md`).
- Docs-only sessions: never touch code or config; record changes in `docs/plan.md`.

## References

- Usage (end users): `README.md`
- Development: `docs/development.md`
- Architecture: `docs/architecture.md`
- Security: `docs/security-invariants.md`
- Releases: `docs/release.md`
- Deferred changes: `docs/plan.md`
