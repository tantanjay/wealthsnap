# Retroactive Code Review Log

Tracks deep code reviews of **already-released** WealthSnap versions, done to catch bugs that
shipped but were never caught (as opposed to reviewing work still in `[Unreleased]`). Check this
log before starting a new round so ranges aren't re-reviewed, and so context survives across
conversations once a session's context window fills up.

## Status as of last update

- Rounds 1, 2, and 3 are all complete: findings reported, user picked fix/propose/skip per item,
  fixes applied, release notes updated.
- **Not pushed to `origin/master`** — confirm with the user before pushing.
- Round 3's `encryptionService.ts` findings are proposals only, not yet applied — see that
  section below for the four proposed fixes awaiting a decision.
- No further round has been started. See "Recommendation for further rounds" at the bottom for
  what's left if another round is wanted — ask the user, don't assume.

## Methodology

1. Pick a version range (two git tags).
2. `git diff --stat <oldTag>..<newTag>` to size it up and group files by feature area.
3. Split into 2-4 parallel background subagents by risk area (e.g. "backup/restore", "AI features",
   "UI/navigation"). Each agent reviews the diff **and** reads full current file contents for any
   heavily-changed file, not just diff hunks — isolated hunks miss bugs in near-total rewrites.
4. Compile findings, dedupe overlaps between agents, rank by severity, report to user.
5. User decides per finding: fix now, propose a fix first, or skip (with reason).
6. Fixes + release notes/changelog updates get committed as separate commits.

## Known repo quirk (not a bug, just FYI)

The git history was rewritten at some point — there's an `origin/backup-before-reset` branch, and
`git merge-base v1.15.0 HEAD` returns nothing (no common ancestor). Diffing between two old tags
still works fine (git diff doesn't require shared ancestry with HEAD), but `git blame`/`git log`
across that boundary won't. Confirmed the rewrite doesn't affect diff *content* — cross-checked
findings against the actual tagged file contents via `git show <tag>:<path>`.

---

## Round 1: `v1.14.0` → `v1.15.0`

Chat, Monthly Summary, the Backup/Restore v2 rewrite, Auto Backup, CSV import, floating gear.
Also covered the still-unreleased work on top of it (Sync from Device, debt encryption, Excel
export, recurrence batching) as a separate pass, since it was uncommitted work at the time.

**Commits:** `f1872dc`, `7dc68de` (unreleased-work fixes), `c8ef4a4`, `4ae7281` (v1.14→v1.15
retro fixes), `8441878` (investmentService follow-up), `098a1ac` (local-date-stamp rollout).

### Fixed
- Sync merge: delete + tombstone write wasn't transactional in 5 domain services (budgets, debts,
  recurrence rules, reminders, investments) — wrapped in `db.withTransactionAsync`.
- `syncService.ts`: a partial sync failure threw and showed a blanket "Sync Failed" instead of
  reporting what actually succeeded — now returns `{ added, updated, removed, failures }` and the
  UI shows "Sync Partially Completed."
- `liveSyncTransport.ts`: sockets that connected but never completed the pairing handshake were
  never closed — added a 10s handshake timeout + cleanup on session expiry/cancel.
- `InvestmentHistoryModal.tsx`: stale `navigation.navigate('Record', ...)` after the tab was
  renamed to `'Actions'` — silently broke editing an investment from history.
- `debtMetrics.ts`: `getNextDueDate` treated a $0 minimum payment as already met on day one of the
  month, pushing the due date a month ahead of reality.
- `investmentService.ts`: `deleteInvestment` didn't cascade to linked `CAPITAL_GAIN`/`CAPITAL_LOSS`
  transactions, corrupting `realizedPLPercent`. Fixed (Option A: always cascade), then a follow-up
  user edit made the cascade fully atomic (single transaction) and fixed a cache-invalidation gap
  the raw-SQL rewrite introduced (`deleteTransactionFromCache` wasn't being called).
- `investmentService.ts` `getPortfolioStats`: UTC-string month comparison for "this month's
  dividends/invested" — same bug class as below, fixed via local `parseDate` comparison.
- Monthly Summary (`monthlySummaryService.ts`, `monthlySummaryBuilder.ts`): cached decrypted
  transaction notes/debt names in **plaintext** in the new `monthly_summary` table, running in the
  background regardless of AI consent. Added migration 16 (clears the table so it regenerates
  encrypted) + `encryptField`/`decryptField` on write/read.
- Monthly Summary + Chat: amounts always labeled "PHP" regardless of actual currency — both call
  sites of `renderMonthlySummaryText` were dropping the currency argument.
- Monthly Summary + `financialSnapshotBuilder.ts`: UTC-string-prefix month matching vs. local-time
  boundary — could misfile a transaction near a month boundary depending on timezone.
- Monthly Summary: unescaped transaction notes spliced into AI context (sanitized: strip
  quotes/newlines/control chars) — low-likelihood prompt-injection surface via receipt-OCR text.
- Monthly Summary: `budgetAlerts` could show `Infinity%` for a $0 budget — added a guard.
- Auto Backup: folder picker left the app locked on Android (already fixed pre-review, confirmed).
- Auto Backup: `createBackup` wrote straight to the final filename with no atomic rename — a
  killed background write could leave a corrupt file under the real name. Now writes to `.tmp`
  first, then moves into place.
- Restore (`backupService.ts` `restoreV2`): wiped data before rewriting with no rollback on
  failure. Now snapshots current data first and rolls back to it if the write fails partway.
- CSV import (`importService.ts`): duplicate-detection key ignored transaction type, so a
  legitimate income row could be falsely rejected as a duplicate of an unrelated expense sharing
  date/amount/category (Insurance, Interest, Others, Uncategorized are valid for both types).
- `financialMetrics.ts` `getCategoryAverages` / Smart Suggestions: divisor was shared across all
  categories rather than per-category — a one-off expense got suggested as if recurring monthly.
  **Fixed via Option C** (user's choice): kept the shared-divisor math, added `activeMonths`/
  `totalMonths` to the return shape, and the UI now footnotes sporadic categories as "Occasional —
  smoothed average, not a recurring cost" instead of relabeling the math.
- Smart Suggestions: applying multiple budgets gave no partial-failure feedback — now reports
  exactly how many succeeded/failed and only removes successful ones from the list.
- Smart Suggestions: new users with no prior-month history saw a false "budgets already match"
  message — now distinguishes "no history yet" from "genuinely matches."
- `FloatingGearBubble.tsx`: rotating the device after manually dragging the bubble snapped it back
  to the original detach point (added `updatePosition` to `FloatingGearContext` so a drag updates
  the in-memory position, not just detach-time). Also fixed a stray un-themed border on whichever
  menu row was actually last.
- `DraggableIconButton.tsx`: a detach-drag completing before the first layout measurement resolved
  could compute a wrong drop position — added a `hasMeasured` guard.
- New shared `getLocalDateStamp()` helper (`financialMetrics.ts`) replacing `toISOString().split('T')[0]`
  (which renders in UTC) in `dividendHistoryService.ts`'s 12-month dividend cutoff and the
  backup/sync/export filename date stamps.

### Explicitly skipped/deferred (user's call, with reason)
- v15 migration double-encryption on interrupted first run — "ignore."
- PIN hashed with unsalted SHA-256 — discussed; since the hash lives in the same SecureStore as
  the encryption key, an attacker who can read one can likely read the other, so salting buys
  little marginal protection. Not fixed.
- PIN failed-attempt counter race (undercounts attempts) — "no need to complicate."
- PIN lockout state in weaker storage than the PIN itself — "ignore."
- `recurrenceService` auto-advance corrupting `updatedAt` (breaks last-write-wins sync) — reported,
  not fixed.
- Duplicate recurring transactions on partial batch failure — reported, not fixed.
- No clock-skew protection in the sync merge's last-write-wins logic — reported, not fixed.
- `syncService.ts` merge-apply non-atomicity (tombstone cleared before the chunked upsert commits)
  — described as a rare/intermittent edge case; not fixed.
- PIN comparison not timing-safe — low impact, not fixed.
- `FrameReader.feed` O(n²) buffer reassembly for large sync payloads — not fixed.
- Dividend FX conversion always uses today's rate instead of the historical rate at ex-date — not
  fixed (found in Round 2's Investments review, same underlying file).

---

## Round 2: `v1.11.0` → `v1.14.0`

Insights chart redesign + new persisted-preferences layer, Dividend Dashboard redesign, Home/Debt
screens, and the `expo-background-fetch` → `expo-background-task` migration.

**Commits:** `37ed6d8` (code fixes), `77f8416` (release notes).

### Fixed
- `backgroundService.ts`: the background-scheduler migration reused the same task name, so
  `isTaskRegisteredAsync` was already `true` for any pre-existing install and the new scheduler
  never got registered — recurring transactions, Monthly Summary sync, and Auto Backup could
  silently stop running in the background for upgrading users, with zero error logged anywhere.
  Renamed the task identifier (`BACKGROUND_TASK_V2`) so every existing install re-registers fresh.
- `dividendHistoryService.ts`: `getProjectedDividends`/`getDividendCalendar` used `.find()` to pick
  one dividend event per month, silently dropping a second same-month payment (a regular + special
  dividend, or a duplicate AI-fetch row). Now sums/pushes all matching events instead of picking one.
- `dividendHistoryService.ts`: AI-fetched dividend dates are stored as bare `YYYY-MM-DD` (parsed as
  UTC midnight) but read back with local `Date` getters — same UTC-vs-local bug class as Round 1,
  now here too. Added `getExDateYearMonth()` which detects the bare-date case and reads its
  calendar components directly instead of letting JS reinterpret it as a UTC instant.
- `DebtScreen.tsx`: `calculateMetrics`'s own Total Debt/Interest Leak/payoff simulation counted
  RECEIVABLE debts (money owed *to* the user) as liabilities — inconsistent with Home and
  Financial Health, which already exclude them. Split into `payableDebts` (used for totals/payoff
  sim) vs. the full `debtsWithBalances` (still shown in Priority Payoff so receivables stay
  trackable).
- `InsightScreen.tsx`: month navigation (back/forward arrows, month-picker grid) used
  `setMonth()`/`setFullYear()` on a date carrying an arbitrary day-of-month — JS doesn't clamp, so
  browsing from the 29th-31st could skip a month entirely or silently fail to move. Dates are now
  rebuilt from explicit `(year, month, 1)` components; confirmed no consumer of `selectedDate` ever
  reads the day component.
- Insights preference-load race (`SavingsRateTrend.tsx`, `ComparisonChart.tsx`,
  `IncomeAnalysis.tsx`, `CumulativeSpendingChart.tsx`): each restores a last-selected tab/range
  from storage on mount, but only guarded the *save* effect against a still-in-flight load, not the
  load itself — a fast tap right after opening the screen could be silently reverted once the load
  resolved (and wouldn't even get saved). Fixed in all four by flipping the guard ref the instant
  the user interacts, not just when the load resolves.
- `SavingsRateTrend.tsx`: the new per-tab average (`avgValue`) used plain-float arithmetic instead
  of BigNumber — switched to BigNumber for consistency (negligible practical impact at realistic
  data volumes).
- `CategoryTrendModal.tsx`: ignored the new month-browsing feature entirely, always computing
  "last 6 months" against today instead of the browsed month. Added a `selectedDate` prop (already
  available in `ExpenseAnalysis.tsx` but never forwarded) and a matching `referenceDate` param on
  `financialMetrics.ts`'s `getCategoryTrend`.
- `debtMetrics.ts` `calculatePrevDebtObligations`: used a debt's `updatedAt` as a payoff-date
  stand-in — since `updatedAt` bumps on *any* edit, editing a paid-off debt's name/notes later made
  it look active for months it wasn't, skewing Home/Financial Health's runway-change trend. Now
  takes `transactions` and reconstructs the actual balance as of the historical date via
  `calculateCurrentDebtBalance` instead of guessing.
- `InvestmentScreen.tsx`: Smart Advisor suggestions (Crash/Dip/Dividend/Balance) only refreshed on
  mount or when the priority filter changed — going stale after navigating away and back. Hoisted
  `fetchSuggestions` into a `useCallback` and call it from `useFocusEffect` too, alongside
  `loadStats()`.

### Explicitly not addressed
- Dividend currency conversion always uses today's FX rate rather than the historical rate at
  ex-date (`getDividendConversionRate` in `dividendHistoryService.ts`) — flagged, not asked to fix.

---

## Round 3: targeted review of never-diffed old files

Unlike Rounds 1-2 (diff two tags), this round used `git diff --stat` against both already-reviewed
ranges (`v1.11.0..v1.14.0`, `v1.14.0..v1.15.0`) to find calculation-adjacent files that had **zero**
changes in either — i.e. never actually reviewed despite predating both rounds. Found:
`encryptionService.ts`, `marketDataService.ts`, `priceHistoryService.ts`, `currencyService.ts` (zero
changes in both ranges), plus `smartAdvisorService.ts` (only a 21-line unrelated tweak touched it).
Reviewed each via a parallel background subagent, full current file + call sites, not a diff.

**Commit:** code fixes + this log entry in one commit; release notes in a separate commit (see
`.notes/release/unreleased.md` and `CHANGELOG.md` "Investments"/"Restore" Fixed bullets).

### Fixed
- `priceHistoryService.ts` `bulkSavePriceHistories`: bind array had 11 values for a 10-placeholder
  query (`history.source` duplicated), shifting `currency`/`exchangeRate` into the wrong columns —
  broke restoring any backup containing investment price history (hard failure or silent column
  corruption depending on driver leniency). Removed the duplicate.
- `priceHistoryService.ts` `getPriceHistory`/`getPriceHistoryForSymbols`: range queries compared
  `timestamp` as plain text, but AI_FETCH rows store a bare `YYYY-MM-DD` while other rows store a
  full ISO datetime — a bare date sorts as less-than a same-day datetime, silently dropping
  boundary-date rows (e.g. from Smart Advisor's 30-day-high calc). Fixed via `date(timestamp) >=
  date(?)` / `<= date(?)` normalization.
- `marketDataService.ts` `refreshAssetPrices`: when `fetchExchangeRate` failed (API down/rate
  limited), the code skipped the conversion math but still saved/overwrote the price tagged as the
  target currency — silently storing a foreign-currency price mislabeled as already-converted
  (e.g. a USD price saved as if it were PHP). Now skips (`continue`) that price point entirely
  instead of saving bad data.
- `marketDataService.ts` `refreshAssetPrices`: check-then-act dedup (`getPriceHistory` then
  `.find()`) had no DB-level backstop, so concurrent refreshes (double-tap, two screens triggering
  at once) could create duplicate price rows for the same symbol+day. Fixed by giving new AI_FETCH
  rows a deterministic id (`AI_{symbol}_{date}`) instead of a random UUID, so `INSERT OR REPLACE`
  (already used by the upsert query) naturally collapses concurrent duplicates at the DB layer.
  Required adding an optional `id` param to `priceHistoryService.addPriceHistory`.
- `smartAdvisorService.ts` dividend "DIV SOON" check: same UTC-vs-local bug class fixed in
  `dividendHistoryService.ts` in Round 1/2, reintroduced here — a bare `YYYY-MM-DD` exDate parsed
  as UTC midnight compared against local `now` could make the alert disappear on the actual
  ex-dividend date depending on timezone. Added a local `parseExDateLocal` helper (same pattern as
  `dividendHistoryService.ts`'s `getExDateYearMonth`) and normalized `today`/`nextMonth` to local
  midnight.
- `smartAdvisorService.ts` Balance suggestions: `allSectors` and the suggestion candidate were both
  built only from already-held stocks, so a sector with zero holdings could never be evaluated or
  suggested — contradicting the function's own comment and in-app description. Now built from all
  stock-type assets (owned or not), preferring an unowned candidate in the under-allocated sector.
- `smartAdvisorService.ts` Balance suggestions: if the picked candidate already had a Crash/Dip
  suggestion, Balance used to merge onto it (`"🔥 CRASH(-22%) + ⚖️ BAL"`), reading as a
  contradictory combined alert. Now always pushed as its own separate suggestion entry.
- `smartAdvisorService.ts` 30-day-high calc: unguarded division if every price-history row for a
  symbol was non-positive (`high30` stays 0 → `Infinity`). User's own read was "just defensive
  programming, low real-world odds" — agreed after checking there's no upstream validation
  preventing a bad price row, but it already failed open (no suggestion shown) rather than
  crashing, so this is a pure hardening fix, not a behavior change. Added a `high30 <= 0` guard.
- `currencyService.ts` `fetchExchangeRate`: falsy-check (`data.rates[target]`) would treat a
  literal `0` rate as "missing". Not realistic for real currency pairs per the reviewing agent, but
  fixed to `typeof ... === 'number'` anyway since it was a one-line change.
- `SmartAdvisor.tsx` help modal: said Crash alerts trigger at a >10% drop; actual (and the same
  modal's own "Detection Logic" section) is >15%. Corrected the copy.

### Proposed, not yet applied — `encryptionService.ts` (user asked for proposals, not fixes)
All four are edge-case/low-probability scenarios by the user's own assessment, not everyday-usage
bugs — matches what the reviewing agent found (concurrent first-use, corrupted data, wrong key,
weak-but-not-currently-exploited KDF). Proposals below, awaiting a decision:
- **Key-generation race** (`getStorageKey`, line 26): no in-flight-promise lock, so concurrent
  calls on a fresh install (e.g. first bulk import) can each generate and persist their own random
  key, orphaning data encrypted under whichever key loses the race. Proposed: add a `keyPromise`
  singleton so concurrent callers await the same in-flight generation instead of racing.
- **Decrypt failures collapse to `null`** (`decryptField`/`decryptData`, line 71): wrong key,
  corrupted ciphertext, and transient SecureStore errors are all indistinguishable from "no value"
  to every caller, so corrupted data silently renders as ₱0/empty with no error surfaced. No clean
  minimal fix proposed — a distinct failure sentinel would need updating every call site (large
  blast radius); noted that fixing the key race above reduces how often this can actually trigger.
- **No integrity/MAC check** (line 74): unauthenticated AES-CBC means a wrong key can by chance
  decode to plausible-looking garbage instead of failing loudly. Proposed: prepend a version marker
  (e.g. `v1:`) to plaintext before encrypting, verify/strip it after decrypting, treat a missing
  marker as a decrypt failure — with a backward-compat fallback (no marker = treat as legacy data)
  so existing encrypted rows aren't invalidated.
- **Weak KDF** (`getStorageKey`, line 36): the generated 256-bit key is passed to CryptoJS as a
  passphrase, so the actual AES key/IV are derived via single-round MD5 (`EVP_BytesToKey`) rather
  than using the generated bytes directly — discards most of the intended key strength, though no
  live exploit demonstrated. Proposed fix (explicit key+IV mode) is a breaking ciphertext-format
  change requiring a migration or dual-path decrypt (try new format, fall back to legacy) to avoid
  breaking every existing install's encrypted data — meaningfully more involved than the other
  three proposals.

---

## Recommendation for further rounds

Older ranges (`v1.8.0..v1.11.0`: 163 files/~20.7k lines — the DB-architecture-rewrite period;
`v1.0.0..v1.8.0`: 150 files/~38.3k lines — pre-rewrite foundation) are **not** safe to assume are
low-impact just because the surrounding architecture was later rewritten — a calculation bug
written once and never revisited is exactly as live today as one from last release. The real
reason to deprioritize diffing those ranges wholesale is cost-effectiveness: they're dominated by
dependency/config churn and now-deleted scaffolding (the old V1-V6 migration system, replaced UI),
which dilutes the signal-to-effort ratio badly compared to the two rounds above.

**Better alternative if you want to catch old-but-still-live bugs:** identify which core
calculation files (`debtMetrics.ts`, `financialMetrics.ts`, `investmentMetrics.ts`, etc.) have
survived largely unchanged since before `v1.8.0` (via `git log --follow` / `git blame`), and review
*their current state directly* rather than diffing the entire historical range. Targets the actual
risk (old, unrevisited formulas) without wading through thousands of lines of irrelevant history.
