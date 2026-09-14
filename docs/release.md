# Release

Releases are published from a version tag. The tag must use the form `vX.Y.Z` and match `package.json#version`.

## Before tagging

1. Update the version and review the matching manually curated section in `CHANGELOG.md`.
2. Run `vp check`, `vp test`, and `vp run build` on macOS.
3. Commit the release changes and push the tag:

```sh
git tag vX.Y.Z
git push origin main vX.Y.Z
```

`CHANGELOG.md` is maintained by hand; do not generate or rewrite it as part of an unrelated change.

## GitHub Actions release

`.github/workflows/release.yml` runs for `v*` tags on `macos-latest` and:

- verifies the tag and package versions match;
- checks, tests, and builds arm64 and x64 binaries;
- publishes `@zeldrisho/iconsur` to npm if that version is not already present;
- extracts the exact changelog section with `scripts/release-notes.ts`;
- creates or updates the GitHub release with `dist/iconsur-arm64` and `dist/iconsur-x64`.

The workflow uses npm trusted publishing (`id-token`) and needs the repository's `publish` environment. Do not publish a version manually unless recovering from a documented workflow failure.

## Distribution notes

The supported standalone artifacts are separate macOS arm64 and x64 binaries. Do not combine them into a universal binary: the pkg bootstrap is not compatible with a `lipo`-merged executable. Investigate any disagreement between the tag, package version, npm, GitHub release, or changelog before making corrective changes.
