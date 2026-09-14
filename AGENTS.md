# Agent Instructions

## Module layout

- `src/`: TypeScript CLI runtime. `openjpeg.ts` and `mask.png` are vendored artifacts; do not hand-edit them.
- `tests/`: Vitest tests run through Vite+.
- `scripts/`: small TypeScript maintenance scripts.
- `.github/workflows/`: CI and tag-based release workflows.

## Commands

| Task                  | Command                                                            |
| --------------------- | ------------------------------------------------------------------ |
| Install               | `vp install`                                                       |
| Validate              | `vp check`                                                         |
| Test                  | `vp test`                                                          |
| Build bundle/binaries | `vp run build`                                                     |
| Release               | Update `package.json` and `CHANGELOG.md`, then push a `vX.Y.Z` tag |

## Conventions

- Use pnpm/Vite+; do not add standalone lint, formatter, bundler, or test-runner dependencies when Vite+ provides them.
- Keep user-supplied paths out of shell or AppleScript source; pass them as argv.
- Keep `CHANGELOG.md` manually curated using Keep a Changelog and Semantic Versioning.
- Treat `src/openjpeg.ts` and `src/mask.png` as generated/vendor inputs.
- The pre-commit hook runs staged checks; set `VP_GIT_HOOKS=0` to opt out.

## References

- Usage: `README.md`
- Security invariants: `docs/security-invariants.md`
- Release notes extraction: `scripts/release-notes.ts`
