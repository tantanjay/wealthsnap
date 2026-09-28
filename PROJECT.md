# PROJECT.md

Project-specific facts and decisions for Claude Code — everything CLAUDE.md's portable rules intentionally leave out.

Add new top-level sections as project-specific needs come up. Keep this file inline and self-contained; don't add pointers to other project documentation unless Claude genuinely needs to follow them.

## Module map

[docs/MODULES.md](docs/MODULES.md) maps each feature module to its associated files, for scoping code reviews. When adding, removing, renaming, or moving a file under `src/`, update the corresponding entry in that file so it stays copy-paste accurate.

## Feature capabilities

When a new feature is introduced, you must also check and update [docs/CAPABILITIES.md](docs/CAPABILITIES.md) to ensure the app's highlighted capabilities list remains accurate and up to date.

## Metric definitions

[docs/METRICS.md](docs/METRICS.md) is the single source of truth for what each metric includes and excludes, and where it's shown. Before changing how a metric is calculated, check its row there. Afterwards, update the row, noting the decision and date, and update every place it lists (code first, then explanations, per the section below). If a change would break a shared rule for just one screen, raise it with the user instead of quietly making an exception.

**New transaction kinds.** When a feature adds a new kind of transaction (a new type/tag/subCategory combination), add its row to the "What each transaction counts toward" table in `docs/METRICS.md` and fill every column before writing code. Screens and components never filter transactions for a metric themselves; they call the shared function in `financialMetrics.ts` (e.g. `getBurnRateBase`, `calculateBalance`), so a rule change is a one-place edit.

**Metric history.** [docs/METRIC_HISTORY.md](docs/METRIC_HISTORY.md) keeps one timeline per metric. Read a metric's timeline before changing it, and add an entry whenever its row in `METRICS.md` changes. If the change undoes part of an earlier one, mark it **↩** with that version, and say so in the release notes too.

## Calculation explanations

When a calculation changes, update its explanations in the same change. Search for every user-facing description of that number (help guides, info/"how is this calculated" modals, tooltips) and bring its wording and formula in line before calling the change done — don't wait for the user to ask about each one.

In this repo these live in `src/constants/helpContent.ts` (Help Center guides, including Math & Formulas), the `*HelpModal.tsx` / `*InfoModal.tsx` components, and inline "How is this calculated?" / "Understanding Your Chart" `BottomModal`s inside screens and chart components (e.g. `HomeScreen`'s `renderInfoModalContent`).

## Release notes / changelog

When asked to update release notes for unreleased work, follow [.notes/dev/versioning-and-release-process.md](.notes/dev/versioning-and-release-process.md) exactly — don't improvise the format. Key points to not forget:

- Three files, different jobs: [.notes/release/unreleased.md](.notes/release/unreleased.md) gets the long, prose writeup (why/how, headed sections, emoji); [CHANGELOG.md](CHANGELOG.md) gets terse one-line bullets under `### Added`/`Changed`/`Deprecated`/`Removed`/`Fixed`/`Security` only (Keep a Changelog format); [src/constants/changelog.ts](src/constants/changelog.ts) is a generated mirror of `CHANGELOG.md` — never hand-edit it. Regenerate with `npm run regen-changelog`, then confirm it matches with `npm run verify-changelog` (`scripts/regen-changelog.js` / `scripts/verify-changelog.js`) before committing — see Section 4 of the process doc.
- Don't pad `CHANGELOG.md` bullets with rationale — match the shortest existing entries, not the longest.
- While a feature is still under `### Added` in `[Unreleased]`, don't give its own refinements a separate `### Changed`/`Fixed` bullet — nest them under the feature's own `Added` bullet instead. Only use `Changed`/`Fixed`/etc. for something that shipped in an already-released version.

Routine "update the unreleased notes" requests only touch the three files above and stay under `[Unreleased]` — don't bump `package.json`/`app.json` or move content into a dated `## [X.Y.Z]` section unless explicitly asked to cut/tag a release. When that release step is asked for, the version bump follows Section 1's decision rule (PATCH/MINOR/MAJOR) — don't guess it.
