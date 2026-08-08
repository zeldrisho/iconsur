# Changelog

All notable changes to this project are documented in this file.


## [2.1.0](https://github.com/zeldrisho/iconsur/releases/tag/v2.1.0) - 2026-08-08

### Bug Fixes

- Set explicit read-only workflow token permissions (`ci`)

### Build

- Run checks on macos-latest and smoke-test the built binary

### Documentation

- Preview compare UX, macOS CI, release sync, universal-binary findings

### Features

- Default the apply prompt to Y and auto-open preview + current icon (`preview`)

### Other

- Merge pull request #6 from zeldrisho/release/v2.0.1

chore(release): v2.0.1
- Initial plan
- Merge pull request #7 from zeldrisho/copilot/fix-code-scanning-alerts

feat: preview compare UX, macOS CI, and simplified gh-synced releases

## [2.0.1](https://github.com/zeldrisho/iconsur/releases/tag/v2.0.1) - 2026-08-08

### Bug Fixes

- Hand release PR to a human instead of auto-merging (`release`)
- Run the npm bin from the prebuilt bundle (`packaging`)
- Address review findings on the release workflow (`release`)

### Other

- Merge pull request #4 from zeldrisho/release/v2.0.0

chore(release): v2.0.0
- Merge branch 'iconsur' into fix/release-human-merge

# Conflicts:
#	.github/workflows/release.yml
- Merge pull request #5 from zeldrisho/fix/release-human-merge

fix(release): hand release PR to a human and ship the prebuilt npm bin

## [2.0.0](https://github.com/zeldrisho/iconsur/releases/tag/v2.0.0) - 2026-08-08

### Bug Fixes

- Address review findings on the trusted-publishing pipeline
- Normalize version prefix in the release workflow (`release`)
- Use pnpm for version/view/publish to avoid npm EBADDEVENGINES (`release`)
- Compute versions from tags and merge release commit via PR (`release`)
- Address review findings on PR merge flow (`release`)

### Build

- Adopt vp toolchain, commit hooks, and git-cliff release pipeline
- Setup-vp CI, node24 six-platform binaries, drop commitlint
- Macos-only binaries, git-cliff as devDependency, checkout@v7
- Publish via npm trusted publishing (OIDC) without tokens

### Chore

- Regenerate CHANGELOG with tagged v1.7.0 history
- Test hook cleanup
- Remove hook test file
- Regenerate CHANGELOG and exclude it from staged formatting
- Import vitest through vite-plus and pin it to the bundled version

### Documentation

- Update README, maintainer docs, and AGENTS.md for the migration
- License attribution, preview/usage docs, plan status updates

### Features

- Migrate to TypeScript 7 ESM with native fileicon and sudo-free cache
- Preview the generated icon and confirm before applying

### Other

- Fix 2 failing CI check(s): GitHub Actions: CI / Check, test, and build, GitHub Actions: CI / 0_Check, test, and build.txt

Co-Authored-By: CodeRabbit <noreply@coderabbit.ai>
- Merge pull request #1 from zeldrisho/ci/trusted-publishing

ci: publish via npm trusted publishing (OIDC), no tokens
- Merge pull request #2 from zeldrisho/fix/release-pnpm-commands

fix(release): use pnpm for version/view/publish to avoid npm EBADDEVENGINES
- Merge pull request #3 from zeldrisho/fix/release-workflow

fix(release): compute versions from tags and merge release commit via PR

## [1.7.0](https://github.com/zeldrisho/iconsur/releases/tag/v1.7.0) - 2026-08-08

### Bug Fixes

- Remove outputs during cache update
- Mask local adaptive icons after composition
- Cache command fails
- Search term with spaces fail
- Remove dep cheerio
- Workflow
- Binary plist parsing
- Error clearing cache on machines with T2; fixed #8
- Substitute node-fetch with cross-fetch for cjs compatibility

### Chore

- Bump version for testing github actions
- Update workflow
- Build with npm publish
- Bump node-fetch from 2.6.0 to 2.6.1 (`deps`)
- Bump node-fetch from 2.6.0 to 2.6.1 (`deps`)
- Bump minimist from 1.2.5 to 1.2.6 (`deps`)
- Bump glob-parent from 5.1.1 to 5.1.2 (`deps`)
- Bump path-parse from 1.0.6 to 1.0.7 (`deps`)
- Bump plist from 3.0.1 to 3.0.5 (`deps`)
- Bump node-fetch from 2.6.1 to 3.1.1 (`deps`)
- Bump node-fetch from 2.6.1 to 2.6.7 (`deps`)
- Update to pnpm and npm@7
- Bump plist from 3.0.1 to 3.0.5 (`deps`)
- Fix actions won't run with main branch
- Update pkg and node version

### Documentation

- Unset
- Modify known issues
- Credits
- Add shields
- Change --name to --keyword
- Update known issues
- Change expressions
- Update readme to npm
- Update screenshot
- Initialize fork documentation

### Features

- V1.0
- Change -a option to -l
- Use itunes store API
- Custom input
- Input option is treated locally
- Packaging
- Jpeg2000 support; fixed #3
- Bump v1.5.0
- Output icon to a file without applying
- Use new full-size mask image and masking algorithm; fixed #1
- Bump 1.6.2
- Bump 1.7.0

### Other

- Merge branch 'master' of https://github.com/rikumi/iconsur
- Update README.md
- Merge branch 'master' of https://github.com/rikumi/iconsur
- Create build.yml
- Update build.yml
- Merge branch 'master' of https://github.com/rikumi/iconsur
- Update README.md
- Update README.md
- Update README.md
- Update README.md
- Add link to npm
- Merge pull request #4 from donavanbecker/patch-1

Enhance Readme
- Updated packages
- Merge pull request #5 from Steffion/master

Updated packages
- Merge branch 'master' into dependabot/npm_and_yarn/node-fetch-2.6.1
- Merge pull request #9 from rikumi/dependabot/npm_and_yarn/node-fetch-2.6.1

chore(deps): bump node-fetch from 2.6.0 to 2.6.1
- Update README.md
- Add installation method
- Merge pull request #21 from leejongyoung/master

Add installation method
- Merge pull request #10 from rikumi/dependabot/npm_and_yarn/node-fetch-2.6.1

chore(deps): bump node-fetch from 2.6.0 to 2.6.1
- Update fileicon to v0.3.0
- Merge pull request #37 from szhu/patch-1

Update fileicon to v0.3.0
- Merge pull request #35 from rikumi/dependabot/npm_and_yarn/minimist-1.2.6

chore(deps): bump minimist from 1.2.5 to 1.2.6
- Merge pull request #27 from rikumi/dependabot/npm_and_yarn/glob-parent-5.1.2

chore(deps): bump glob-parent from 5.1.1 to 5.1.2
- Merge pull request #29 from rikumi/dependabot/npm_and_yarn/path-parse-1.0.7

chore(deps): bump path-parse from 1.0.6 to 1.0.7
- Merge pull request #30 from rikumi/dependabot/npm_and_yarn/node-fetch-3.1.1

chore(deps): bump node-fetch from 2.6.1 to 3.1.1
- Update nyaascii/package-version to v1.0.3

hopefully fix environment export syntax deprecation
- Merge branch 'master' into dependabot/npm_and_yarn/plist-3.0.5
- Merge branch 'master' into dependabot/npm_and_yarn/node-fetch-2.6.7
- Merge pull request #38 from rikumi/dependabot/npm_and_yarn/node-fetch-2.6.7

chore(deps): bump node-fetch from 2.6.1 to 2.6.7
- Merge branch 'dependabot/npm_and_yarn/plist-3.0.5' of github.com:rikumi/iconsur into dependabot/npm_and_yarn/plist-3.0.5
- Merge pull request #39 from rikumi/dependabot/npm_and_yarn/plist-3.0.5

chore(deps): bump plist from 3.0.1 to 3.0.5
<!-- generated by git-cliff -->
