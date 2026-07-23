# CLAUDE.md

## Module map

[docs/MODULES.md](docs/MODULES.md) maps each feature module to its associated files, for scoping code reviews. When adding, removing, renaming, or moving a file under `src/`, update the corresponding entry in that file so it stays copy-paste accurate.

## Release notes / changelog

When asked to update release notes for unreleased work, follow [.notes/dev/versioning-and-release-process.md](.notes/dev/versioning-and-release-process.md) exactly — don't improvise the format. Key points to not forget:

- Three files, different jobs: [.notes/release/unreleased.md](.notes/release/unreleased.md) gets the long, prose writeup (why/how, headed sections, emoji); [CHANGELOG.md](CHANGELOG.md) gets terse one-line bullets under `### Added`/`Changed`/`Deprecated`/`Removed`/`Fixed`/`Security` only (Keep a Changelog format); [src/constants/changelog.ts](src/constants/changelog.ts) is a generated mirror of `CHANGELOG.md` — never hand-edit it, regenerate per Section 4 of the process doc (and strip the link-reference footer when doing so).
- Don't pad `CHANGELOG.md` bullets with rationale — match the shortest existing entries, not the longest.
- While a feature is still under `### Added` in `[Unreleased]`, don't give its own refinements a separate `### Changed`/`Fixed` bullet — nest them under the feature's own `Added` bullet instead. Only use `Changed`/`Fixed`/etc. for something that shipped in an already-released version.

Routine "update the unreleased notes" requests only touch the three files above and stay under `[Unreleased]` — don't bump `package.json`/`app.json` or move content into a dated `## [X.Y.Z]` section unless explicitly asked to cut/tag a release. When that release step is asked for, the version bump follows Section 1's decision rule (PATCH/MINOR/MAJOR) — don't guess it.
