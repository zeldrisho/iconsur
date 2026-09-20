# Changelog

All notable changes to this fork are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/2.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Use AppKit APIs for setting and removing custom icons without invoking external commands.
- Replace icon-cache shell cleanup with direct filesystem traversal.
- Reduce routine CLI, property-list, and JPEG 2000 decoder output.

## [2.2.1] - 2026-09-14

### Fixed

- Harden legacy ICNS decoding with bounded decompression and stricter validation.
- Validate icon scaling and preserve local generation when App Store lookup fails.
- Report extended-attribute failures instead of treating them as missing.
- Remove temporary comparison icons after interactive previews.

## [2.2.0] - 2026-08-08

### Added

- Support bare app bundles and legacy ICNS icons.

## [2.1.0] - 2026-08-08

### Added

- Preview the generated icon and the current icon before applying changes.

### Changed

- Default the apply confirmation prompt to `Y`.

## [2.0.1] - 2026-08-08

### Fixed

- Run the npm command from the bundled executable so packaged installations work correctly.

## [2.0.0] - 2026-08-08

### Added

- Preview the generated icon and confirm before applying it.

### Changed

- **Breaking:** migrate the CLI to the TypeScript/ESM implementation and replace the legacy shell-backed implementation with native macOS icon and cache operations.
- **Breaking:** require Node.js `>=22.18` for source and package execution.

## [1.7.0] - 2022-04-07

This fork begins from the upstream `1.7.0` release. See the [upstream release](https://github.com/rikumi/iconsur/releases/tag/1.7.0) for its historical changes.

[Unreleased]: https://github.com/zeldrisho/iconsur/compare/v2.2.1...HEAD
[2.2.1]: https://github.com/zeldrisho/iconsur/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/zeldrisho/iconsur/compare/v2.1.0...v2.2.0
[2.1.0]: https://github.com/zeldrisho/iconsur/compare/v2.0.1...v2.1.0
[2.0.1]: https://github.com/zeldrisho/iconsur/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/zeldrisho/iconsur/compare/v1.7.0...v2.0.0
[1.7.0]: https://github.com/rikumi/iconsur/releases/tag/1.7.0
