# PROJECT.md

Project-specific facts and decisions for Claude Code — everything CLAUDE.md's portable rules intentionally leave out.

Add new top-level sections as project-specific needs come up. Keep this file inline and self-contained; don't add pointers to other project documentation unless Claude genuinely needs to follow them.

## Module map

[docs/MODULES.md](docs/MODULES.md) maps each feature module to its associated files, for scoping code reviews. When adding, removing, renaming, or moving a file under `src/`, update the corresponding entry in that file so it stays copy-paste accurate.

## Feature capabilities

When a new feature is introduced, you must also check and update [docs/CAPABILITIES.md](docs/CAPABILITIES.md) to ensure the app's highlighted capabilities list remains accurate and up to date.

## Design system

[docs/DESIGN.md](docs/DESIGN.md) is the visual source of truth (Refined Minimal): tokens, type scale, components, and a checklist for new screens. Read it before building or restyling any UI, and match the prototype in `docs/mockups/navigation-redesign/`. If a screen needs something the guide doesn't cover, propose an addition to DESIGN.md instead of inventing a one-off style.

## Charts

- **Check what a library already does before adding your own adjustment on top.** Before adding offsets, alignment or sizing to something a library positions or lays out itself (a chart tooltip, an axis label), read how the library places it — stacking a manual shift on top of its auto-positioning double-applies, and a style meant for one layout direction can do something else in its container.

## Metric definitions

[docs/METRICS.md](docs/METRICS.md) is the single source of truth for each metric: its formula, where it's shown, which tables it reads, and a timeline of how its rule changed. Before changing how a metric is calculated, read its section, history included. Afterwards, update its Formula line, add a history row, and update every place under Shown on (code first, then explanations, per the section below). If a change would break a shared rule for just one screen, raise it with the user instead of quietly making an exception.

**New transaction kinds.** When a feature adds a new kind of transaction (a new type/tag/subCategory combination), add its row to the "What each transaction counts toward" table in `docs/METRICS.md` and fill every column before writing code. Screens and components never filter transactions for a metric themselves; they call the shared function in `financialMetrics.ts` (e.g. `getBurnRateBase`, `calculateBalance`), so a rule change is a one-place edit.

**Metric history.** Each metric's section ends with its timeline. Add a row whenever its Formula line changes. If the change undoes part of an earlier one, mark it **↩** with that version, and say so in the release notes too. While a change is unreleased, a metric gets at most one `Unreleased` row, stating the net difference from the last released version. A refinement made before release updates that row instead of adding another; a metric that's new in this release gets only its "Introduced" row.

**Date changes from the code, not the changelog.** When recording when or how a behavior changed (metric history, release notes, "since vX" claims), check the code at the `vX.Y.Z` tags, e.g. by diffing consecutive tags. `CHANGELOG.md` and `docs/release/` have been wrong about versions, formulas and affected screens, so treat their wording as a lead to verify, not as evidence.

## Calculation explanations

When a calculation changes, update its explanations in the same change. Search for every user-facing description of that number (help guides, info/"how is this calculated" modals, tooltips) and bring its wording and formula in line before calling the change done — don't wait for the user to ask about each one.

In this repo these live in `src/constants/helpContent.ts` (Help Center guides, including Math & Formulas and the Home Snapshot guide), the `*HelpModal.tsx` / `*InfoModal.tsx` components, and inline "How is this calculated?" / "Understanding Your Chart" `BottomModal`s inside screens and chart components, and the always-open "How is this calculated?" sections in Insights' Financial Health sheets (`src/components/insights/FinancialHealthSheet.tsx`, `FinancialHealthDetails.tsx`).

## Line endings

Working copies here are CRLF (`core.autocrlf=true`; the index stores LF). When changing files with sed, Python or similar instead of the editor tools, read and write in a way that keeps each file's existing line endings, and don't splice in text with the other style — a stray lone CR makes git treat the file as binary. Afterwards, check `git diff --stat`: a small edit showing up as a whole-file rewrite means the line endings changed, so fix that before moving on.

## Android device testing (Windows)

In Git Bash, set `MSYS_NO_PATHCONV=1` before passing device paths to `adb` (e.g. `/sdcard/ui.xml`). Otherwise they get rewritten as Windows paths (`/Files/Git/sdcard/...`) and the command quietly reads or writes the wrong place.

**Emulator screenshots are black in Open.** The app blocks screenshots in that mode, so `adb exec-out screencap` returns a black image. To check UI, read the layout with `uiautomator dump` (text and bounds), or ask for Discreet / Hidden mode / "Reveal for screenshot" when the visuals themselves need checking.

**Local Windows release builds and path length.** CMake build folders for some native libraries can go over the Windows path limit. `plugins/withCmakeObjectPathMax.js` works around this, but builds still fail from deep paths such as `.claude/worktrees/...`. Build from a short path, and don't lower the 240 value; smaller values make CMake skip the shortening.

## Release notes / changelog

When asked to update release notes for unreleased work, follow [docs/dev/versioning-and-release-process.md](docs/dev/versioning-and-release-process.md) exactly — don't improvise the format. Key points to not forget:

- Three files, different jobs: [docs/release/unreleased.md](docs/release/unreleased.md) gets the long, prose writeup (why/how, headed sections, emoji); [CHANGELOG.md](CHANGELOG.md) gets terse one-line bullets under `### Added`/`Changed`/`Deprecated`/`Removed`/`Fixed`/`Security` only (Keep a Changelog format); [src/constants/changelog.ts](src/constants/changelog.ts) is a generated mirror of `CHANGELOG.md` — never hand-edit it. Regenerate with `npm run regen-changelog`, then confirm it matches with `npm run verify-changelog` (`scripts/regen-changelog.js` / `scripts/verify-changelog.js`) before committing — see Section 4 of the process doc.
- Don't pad `CHANGELOG.md` bullets with rationale — match the shortest existing entries, not the longest.
- While a feature is still under `### Added` in `[Unreleased]`, don't give its own refinements a separate `### Changed`/`Fixed` bullet — nest them under the feature's own `Added` bullet instead. Only use `Changed`/`Fixed`/etc. for something that shipped in an already-released version.

Routine "update the unreleased notes" requests only touch the three files above and stay under `[Unreleased]` — don't bump `package.json`/`app.json` or move content into a dated `## [X.Y.Z]` section unless explicitly asked to cut/tag a release. When that release step is asked for, the version bump follows Section 1's decision rule (PATCH/MINOR/MAJOR) — don't guess it.
