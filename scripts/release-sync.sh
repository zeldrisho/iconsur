#!/usr/bin/env bash
# Synchronizes a release's tag and description across GitHub, npmjs, and the
# repo:
#   - GitHub release notes come from git-cliff (the exact CHANGELOG.md section
#     for this tag, generated with `--latest --tag`), created on first publish
#     and edited idempotently on re-runs (`gh release create`/`edit`);
#   - the npm-published version must match the git tag (npm shows package.json's
#     description, which tests/repo-metadata.test.ts keeps in sync with README).
#
# Usage: release-sync.sh <version> [asset ...]   (version without the "v" prefix)
set -euo pipefail

VERSION="${1:?usage: release-sync.sh <version> [asset ...]}"
shift
TAG="v${VERSION}"

# Notes for exactly this tag. Requires the tag to exist locally (the release
# workflow pushes it before this script runs; checkout uses fetch-tags: true).
NOTES="$(vp exec git-cliff --config cliff.toml --latest --tag "${TAG}" --strip all 2>/dev/null || true)"
if [ -z "$NOTES" ]; then
  echo "::error::No changelog section found for ${TAG} (git-cliff --latest --tag produced nothing); refusing to create an empty release."
  exit 1
fi

if gh release view "${TAG}" >/dev/null 2>&1; then
  gh release edit "${TAG}" --notes "$NOTES"
  echo "Synced GitHub release ${TAG} notes."
else
  gh release create "${TAG}" "$@" --notes "$NOTES"
  echo "Created GitHub release ${TAG}."
fi

if vp exec pnpm view "@zeldrisho/iconsur@${VERSION}" version >/dev/null 2>&1; then
  echo "npm @zeldrisho/iconsur@${VERSION} matches tag ${TAG}."
else
  echo "::error::@zeldrisho/iconsur@${VERSION} is not published on npm; tag ${TAG} and npm are out of sync."
  exit 1
fi
