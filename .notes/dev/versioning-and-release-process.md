# Versioning & Release Process

How WealthSnap version numbers, changelog content, and git tags are supposed to work together. Read this before bumping a version — it's the reference for "what do I update, in what order, with what content."

---

## 1. Versioning rules (SemVer: `MAJOR.MINOR.PATCH`)

Follow [semver.org](https://semver.org/) strictly going forward — the pre-1.14.0 history does **not** consistently follow this (see [Known historical drift](#5-known-historical-drift-do-not-repeat)), so don't pattern-match off old bumps.

| Bump | When | Example |
|---|---|---|
| **PATCH** (`x.y.Z`) | Bug fixes only. No new user-facing functionality, no behavior changes a user would notice as "new." | Crash fix, wrong calculation fix, dependency security patch. |
| **MINOR** (`x.Y.0`) | New backward-compatible functionality, or a UX/behavior change that isn't a fix. | New chart view, new screen, redesigned selector, new persisted preference. |
| **MAJOR** (`X.0.0`) | Breaking changes — anything that forces the user to take action or invalidates existing state. | PIN reset required, encryption key rotation, API key reconfiguration required. |

**Decision rule:** if the release has *any* `### Added` or breaking-change content, it is at minimum MINOR. If it has a breaking change, it is MAJOR — do not fold a breaking change into a MINOR bump just because the rest of the release is small.

If a release is fixes-only, it's a PATCH — do not bump MINOR just because it "feels like a bigger release."

---

## 2. Two places version content lives — keep both in sync

1. **`package.json`** (`"version"`) and **`app.json`** (`expo.version`) — the actual build version. Bump both together.
2. **`CHANGELOG.md`** — the source of truth for changelog *content*. **`src/constants/changelog.ts`** is a generated mirror of this file (wrapped in a template literal for the in-app Help Center viewer) — never hand-edit `changelog.ts` directly, regenerate it from `CHANGELOG.md` (see [Section 4](#4-regenerating-changelogts)).

Optionally, a longer-form, user-facing writeup goes in `.notes/release/vX.Y.Z.md` (see existing files in that folder for the tone/format — headed sections with emoji, prose explanation, not terse bullets). This is a separate, richer document from `CHANGELOG.md`; it's not required to keep the repo consistent, but keep doing it if the project already has one per version.

---

## 3. `CHANGELOG.md` content rules (Keep a Changelog 1.1.0)

Full spec: [keepachangelog.com/en/1.1.0](https://keepachangelog.com/en/1.1.0/). The essentials:

- **Only these six category headers**, in this order, only include the ones that have content:
  `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`
  - Do **not** invent new headers (`Improved`, `Maintenance`, `Known Issues`, `Legal & Privacy`, `Developer`, `Breaking Changes`, etc.). Everything maps onto the six above:
    - Perf/UX tweaks, dependency bumps, refactors, legal-text edits → `Changed`
    - Dependency/security patches → `Security`
    - Deleted permissions/features/files → `Removed`
    - A breaking change → still `Changed`, but prefix the bullet with **`**BREAKING:**`** so it isn't lost
    - A known issue you're shipping with anyway → still `Changed`, prefixed with `*(Known issue)*`
- **Every version gets a real ISO date**: `## [x.y.z] — YYYY-MM-DD`. No "Initial Release" placeholders.
- **Keep `## [Unreleased]` at the very top**, above the newest version. Move its content under a new dated version heading at release time; leave it empty again after.
- **Add a link reference at the bottom of the file for every version** (see [Section 6](#6-tagging-a-release) — this only resolves once the matching tag is pushed):
  ```
  [Unreleased]: https://github.com/tantanjay/wealthsnap/compare/vX.Y.Z...HEAD
  [X.Y.Z]: https://github.com/tantanjay/wealthsnap/compare/vPREV...vX.Y.Z
  ```
  Insert the new version's line right after `[Unreleased]`, and update `[Unreleased]`'s base to the new version.
- Bullet content should describe *what changed for the user*, not implementation detail — this file (via `changelog.ts`) is rendered directly in the in-app Help Center, so it's user-facing copy, not a commit log.

---

## 4. Regenerating `changelog.ts`

`changelog.ts` must always be a byte-identical mirror of `CHANGELOG.md`, wrapped as:

```ts
export const CHANGELOG_MARKDOWN = `
...contents of CHANGELOG.md, with every ` + "`" + ` escaped as \\` + "`" + `...
`
```

**Important divergence from a literal mirror:** the in-app renderer ([`src/utils/markdownParser.ts`](../../src/utils/markdownParser.ts)) only understands `#`/`##`/`###` headings, `-`/`*` bullets, `>` blockquotes, and `---` dividers. It does **not** render markdown links. That means the link-reference footer block (`[X.Y.Z]: https://...`) is useful for `CHANGELOG.md` on GitHub, but would show up as ugly raw text if included in the in-app copy. **Strip the trailing link-reference block before generating `changelog.ts`** — only the version sections above it should be mirrored in.

Regenerate with a small script rather than hand-editing (manual edits are how the two files drifted out of sync before — see [Section 5](#5-known-historical-drift-do-not-repeat)):

```js
const fs = require('fs');
let md = fs.readFileSync('CHANGELOG.md', 'utf8');
md = md.replace(/\n\[.+?\]: https:\/\/github\.com\/[\s\S]*$/, '\n'); // drop link-reference footer
const escaped = md.split('\\').join('\\\\').split('`').join('\\`').split('${').join('\\${');
fs.writeFileSync('src/constants/changelog.ts', 'export const CHANGELOG_MARKDOWN = `\n' + escaped + '`\n');
```

Then verify it round-trips correctly (evaluate the exported string and diff it against `CHANGELOG.md` minus the footer) before committing.

---

## 5. Known historical drift (do not repeat)

Found and (mostly) fixed while writing this doc — flagged so future-you doesn't rediscover the same issues:

- `CHANGELOG.md` and `changelog.ts` had actually diverged in wording once (a stray edit added spaces around hyphens in a package name). Always regenerate `changelog.ts` from `CHANGELOG.md`, never edit it separately.
- Several PATCH releases historically shipped new features that should've been MINOR bumps (1.3.1, 1.8.1, 1.8.2, 1.10.1, 1.10.2, 1.11.1).
- 1.5.0 had explicit breaking changes (PIN reset, encryption key rotation, API key reconfig) but was only a MINOR bump — should have been MAJOR.
- 1.13.0 was a MINOR bump containing only fixes — should have been PATCH.
- `package.json` briefly had version `1.1.1` (commit `7f79293`, "ai initial") that was never a real release — just a WIP bump superseded by 1.2.0. Not documented in the changelog, and that's correct — don't add an entry for it if you ever see it referenced.
- `CHANGELOG.md`'s `1.0.1` entry had no corresponding `package.json` version bump (`package.json` stayed at `1.0.0` even though the commit was titled `"v1.0.1"`). Tag/version drift like this is exactly what this doc exists to prevent — bump `package.json`/`app.json` *every* time you cut a release, even a small one.

These are not renumbered — the versions already shipped to users/Play Store, so rewriting history would be misleading. This is a "don't do this going forward" list, not a to-do list.

---

## 6. Tagging a release

Every release must get a matching git tag once it's merged/shipped, or the compare-links in `CHANGELOG.md` (Section 3) will 404 forever:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

Do this **after** the release commit (version bump + changelog update) lands, at that exact commit. If you use `npm version` to bump `package.json`, it creates the tag automatically — just remember to `git push --tags` afterward.

All 24 releases from `v1.0.0` through `v1.14.0` were backfilled with tags on 2026-07-19 (see git history / `git tag -l`), so `CHANGELOG.md`'s compare links are live. Don't need to redo that — just keep tagging forward from here.

---

## 7. Release checklist (copy this when cutting a release)

- [ ] Decide the version bump (PATCH/MINOR/MAJOR) using the rules in Section 1
- [ ] Bump `"version"` in `package.json` **and** `expo.version` in `app.json` — keep them equal
- [ ] Move `[Unreleased]` content in `CHANGELOG.md` into a new `## [X.Y.Z] — YYYY-MM-DD` section, categorized per Section 3
- [ ] Add the new version's link-reference line at the bottom of `CHANGELOG.md`; update `[Unreleased]`'s compare base
- [ ] Regenerate `src/constants/changelog.ts` from `CHANGELOG.md` (Section 4) — verify it matches before committing
- [ ] (Optional but consistent with existing practice) write `.notes/release/vX.Y.Z.md` with the fuller user-facing writeup
- [ ] Commit, merge
- [ ] `git tag vX.Y.Z` on the release commit, `git push origin vX.Y.Z`
