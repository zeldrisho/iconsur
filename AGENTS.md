# Agent Instructions

## Toolchain

- Use Vite+ (`vp`) with pnpm; versions are pinned in `package.json` and `pnpm-workspace.yaml`.
- Use Vite+'s bundled tools rather than adding standalone lint, formatter, bundler, or test-runner dependencies.

## Commands

| Task                           | Command                     |
| ------------------------------ | --------------------------- |
| Install dependencies           | `vp install`                |
| Check a changed file (example) | `vp check src/cli.ts`       |
| Run one test file (example)    | `vp test tests/cli.test.ts` |
| Full validation                | `vp check && vp test`       |
| Build macOS binaries           | `vp run build`              |

- File-scoped checks narrow formatting and linting; configured type checking remains project-wide.
- Use `vp run build`, not `vp build`: this CLI's build is a package script.
- CI runs on macOS and smoke-tests the native binary.

## Key Conventions

- Keep tests in `tests/*.test.ts`, importing test APIs from `vite-plus/test`.
- Preserve asset resolution across source ESM, bundled CJS, and pkg snapshots in `src/assets.ts`.
- Do not hand-edit vendored `src/openjpeg.ts` or `src/mask.png`; regenerate OpenJPEG when needed.
- Treat `dist/` as generated build output, not source.
- Follow `docs/architecture.md` when changing subprocesses, path handling, or privilege escalation.
- Keep `CHANGELOG.md` manually curated; release notes are extracted by `scripts/release-notes.ts`.

## References

| Need                                       | File                                       |
| ------------------------------------------ | ------------------------------------------ |
| CLI installation and usage                 | `README.md`                                |
| Architecture and security boundaries       | `docs/architecture.md`                     |
| Development tooling and setup              | `docs/development.md`                      |
| Checks, tests, and packaging configuration | `vite.config.ts`                           |
| CI platform and binary smoke test          | `.github/workflows/ci.yml`                 |
| Tag-based release and publication          | `.github/workflows/release.yml`            |
| Release history and notes                  | `CHANGELOG.md`, `scripts/release-notes.ts` |
