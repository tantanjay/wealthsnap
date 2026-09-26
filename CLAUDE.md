# CLAUDE.md

Guidance for Claude Code when working in this repository.

**A note on how this file itself is written:** this CLAUDE.md gets copied across many projects/repos, so keep every rule below general. Avoid repository-specific filenames, paths, or implementation details — describe patterns and concepts instead so the guidance stays applicable regardless of which project it lands in. Project-specific facts (design system, backend, architecture, etc.) belong in this repo's `PROJECT.md`, not here.

**Check the repo root for a `PROJECT.md`.** If one exists, read it before making implementation decisions — it contains the project's specific context and conventions. It follows the same draft-and-confirm flow as this file: propose additions or changes, show them, and wait for a yes before writing — don't add to it silently mid-task.

**How this file grows:** this file is built reactively, not from external best practices. A rule only belongs here once it has actually cost time — a correction, a clarification, a repeated question. When that happens, don't interrupt the task to propose it — hold onto it and suggest it only at a natural stopping point: the user signals they're satisfied ("perfect", "all good", etc.), or they commit or open a PR. At that point, draft it into a concise, general rule and show it to the user first — never write it into this file until they say yes. Don't propose rules for things that haven't actually gone wrong yet.

## Git commit conventions

- **Never commit without the user explicitly asking first.** Finishing a change (even a verified, working one) is not by itself permission to commit it. Wait for the user to say something like "commit to main", "create a PR", or "commit on a new branch" — and do exactly that (which branch, PR vs direct commit) rather than assuming. If unsure whether "looks good" or similar means "commit it", ask.
- **Stage everything — but check what that actually includes first.** Before running `git add -A` (or equivalent), run `git status` and scan the untracked/new files for anything that shouldn't be committed: large binaries, generated log files or folders, local env dumps, build/dependency caches — the kind of thing that just hasn't made it into `.gitignore` yet. If something like that shows up, stop and flag it to the user instead of staging it — ask whether it should be added to `.gitignore` (and add the entry once confirmed) rather than committed. Once nothing unexpected is left, stage everything as usual — don't cherry-pick a subset, and don't leave a file out just because it looks unrelated to the current session's work. This includes generated files produced by the build; commit them alongside whatever else is staged rather than leaving them out or splitting them into their own commit.
- **Match the commit message to the size of the change.**
  - For small/mechanical changes — a UI label tweak, a variable/rename, a static asset rebuild with changed asset hashes — use a short, single-line commit message. Don't write a multi-paragraph body explaining rationale for something this small.
  - Reserve a fuller descriptive body (what changed, why, anything a reviewer should know) for substantive changes: new features, bug fixes, behavior changes, or anything spanning multiple files/concerns.

## Discussion vs. implementation

- When a message reads as discussion, brainstorming, or planning (including a reply that just answers a clarifying question), don't treat it as authorization to start coding — even if it sounds like a decision or an instruction phrased close to "do this."
- Only start coding once the user explicitly says so — "code it," "implement it," "proceed," "please do this [as the actual ask, not a hypothetical]," or similarly unambiguous. If it's unclear whether a message means "build this" vs. "here's my thinking, keep discussing," ask rather than assume.
- Exception: a small, obvious refinement to something already implemented this session (a tweak to styling/copy/sizing, "make X simpler," "that's too tall," etc.) can be coded directly, no confirmation needed. This only covers minor follow-up polish — a new feature, a behavior change, or anything with real design decisions still needs explicit go-ahead first.

## Code comment style

- Keep comments short and concise — 2 lines max, stating the fact/rationale directly. No multi-paragraph explanatory blocks.
- Delete a comment that just restates what the code/types already say (e.g. a prop list duplicating the interface right below it).
- For comments carrying real non-obvious rationale (a business rule, why a check is skipped somewhere, a subtle return-value contract), keep the fact and cut the prose — tight, not padded.
- Never point a comment at context outside the repo ("see the brainstorm history on X", "as discussed") — a future reader wasn't in that conversation, so the comment has to stand on its own.

## Mock/dummy data pages & panels

- Dummy data must never render by default. Gate it behind a flag (e.g. local component state) that starts off, and only flips on an explicit user click — never on mount, timeout, or route change.
- Before the flag flips, show an empty-state in its place, not the raw content or a placeholder shape: an icon, a short heading naming what's missing, one sentence of context on when real data will actually appear there, and a button (styled as the app's primary/accent action) labeled something like "Load mock data" that flips the flag.
- Scope the empty-state to what's actually mocked. If an entire page is dummy data, replace the whole page — header included — with one empty-state. If only one chart/card within an otherwise-real page is mocked, scope the empty-state to just that card, and hide anything else derived from the same mock data (e.g. a summary badge fed by the same numbers) until that same flag flips. Don't gate real, already-wired-up content just because it sits next to mocked content.

## Component extraction

- **Building a page/panel "like X"? Don't copy X wholesale.** Treat each block on it separately — if a block already exists as a shared component elsewhere (a loading state, a badge, etc.), reuse it even if X itself has it inlined. Reusing an existing component needs no permission — just do it.
- **Flag new extraction candidates, but let the user decide.** Noticing a block that could become a shared component is good — say so. What needs a yes first is creating the file: name the block, which existing places would actually use it, and why now, then wait for confirmation.

## UI design principles

Structural rules for frontend work, independent of whatever specific visual style is in play. Specific visual values (palette, typography, component patterns) live in this project's `PROJECT.md` when one exists — that's one execution of the rules below; a different visual direction later would swap its specific values but keep these rules:

- **Color has three jobs, never one.** Neutral (backgrounds/text), Accent (the one interactive/brand color, user-selectable), and Semantic (success/warning/danger — must never shift meaning just because the accent changes). Decide which job an element is doing before picking its color.
- **Two type tiers: reading text vs. data.** One typeface for labels/headings/UI text; a separate treatment (typically monospace + `tabular-nums`) reserved for numbers a user scans in a column — stat values, chart axes, tabular dates.
- **Related elements share one type scale.** A trigger and the popup/panel it opens are one component — they need the same font-size/weight, not independently "reasonable" choices.
- **Simplify by hiding, not shrinking.** A control that shows every option at once, all the time, for a decision made rarely (theme, accent) should collapse into progressive disclosure — a cycling button, an expand-on-click panel — not just get visually smaller.
- **One icon, one meaning.** Never let two different concepts share the same icon; a user scanning a row should be able to tell them apart without reading the label.
- **A component must survive every page and width it's used on.** Don't anchor a popup/dropdown to "wherever the trigger happens to render" unless its position is verified stable everywhere it's used. When unsure, prefer a positioning strategy that can't overflow (e.g. a centered overlay) over one that assumes the trigger behaves predictably.
- **A hover-feedback tone shouldn't also be a resting default.** If a neutral fill means "you're hovering this" in one place, giving that same fill to a container's resting state elsewhere makes interactive and static surfaces indistinguishable — pick a quieter resting state (often just a border, no fill) so the feedback tone still reads as feedback.
- **When creating a new page or component, match existing siblings' actual computed values from the start.** Check the nearest comparable existing page/component for table padding, chart axis styling, header badges, page-shell height/position, font treatments — before writing new markup, not after someone flags the drift.
- **When the user flags a visual inconsistency, treat it as a search query, not a two-element fix.** Grep for every other instance of that element kind across the app, diff them against the same property — including rendered height/position, not just className strings — and report what's actually inconsistent before changing anything.
- **Never use browser-native dialogs.** `alert()`, `confirm()`, `prompt()`, or anything similar can't be styled and look broken next to the rest of the UI — use an in-app modal with its own buttons instead, even for a single yes/no confirmation.
- **Every modal/dialog state needs a matching icon and color, not bare text.** An error, warning, success, or plain info message shown in a dialog should pair its severity with an icon and a matching color — never just colored text with nothing else. Put the icon next to the message in the body, not next to the title — the body is what a reader's eye actually goes to, so that's where severity needs to be unmissable. Give each severity level its own icon rather than sharing one across levels (e.g. error and warning are different severities and need different icons, not the same triangle recolored). Reuse one icon+color mapping for every such state across the app so severity reads the same way everywhere, rather than each dialog inventing its own.
- **A modal's action-button footer is a distinct region, not a continuation of the body.** Give it a subtly different background than the body (not just a border) plus the separator border, so the eye reads "content" and "actions" as two zones — and keep any button inside it visually against that footer's own background, not the body's.