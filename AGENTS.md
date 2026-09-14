# Agent Instructions

## Toolchain

- Use Vite+ (`vp`) with pnpm; versions are pinned in `package.json` and `pnpm-workspace.yaml`.
- Use Vite+'s bundled tools instead of adding standalone lint, formatter, bundler, or test-runner dependencies.

## Commands

| Task                 | Command                     |
| -------------------- | --------------------------- |
| Install              | `vp install`                |
| Check a file         | `vp check src/cli.ts`       |
| Test a file          | `vp test tests/cli.test.ts` |
| Full validation      | `vp check && vp test`       |
| Build macOS binaries | `vp run build`              |

- Use `vp run build`, not `vp build`.
- CI runs on macOS and smoke-tests the native binary.

## Conventions

- Keep tests in `tests/*.test.ts`, importing test APIs from `vite-plus/test`.
- Preserve asset resolution across source ESM, bundled CJS, and pkg snapshots in `src/assets.ts`.
- Do not hand-edit vendored `src/openjpeg.ts` or `src/mask.png`.
- Treat `dist/` as generated build output.
- Follow `docs/architecture.md` for subprocesses, path handling, and privilege escalation.
- Keep `CHANGELOG.md` manually curated; release notes are extracted by `scripts/release-notes.ts`.

## References

| Need                      | File                       |
| ------------------------- | -------------------------- |
| CLI usage                 | `README.md`                |
| Architecture and security | `docs/architecture.md`     |
| Development and releases  | `docs/development.md`      |
| Checks and packaging      | `vite.config.ts`           |
| CI smoke test             | `.github/workflows/ci.yml` |
