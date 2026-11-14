# Audit

The single record of every bug and edge-case audit: what each phase covers, what was found, what was checked and at which commit. Each phase runs in its own session, and the next audit picks up from the log here instead of starting over.

**To run a phase:** start a new session with the [starter prompt](#starter-prompt), read this file down to the phase's section, history included, and follow [How to run a phase](#how-to-run-a-phase). **To audit everything that changed since last time,** new features included: use the "audit again" prompt and follow [Auditing again](#auditing-again).

An audit finds and logs. It doesn't change app code: fixes are a separate piece of work that the findings feed, and their commit goes back into the finding's row.

Earlier reviews by version range are in [retroactive-code-review-log.md](retroactive-code-review-log.md). Their unresolved and accepted items are carried into the phases below, so later audits don't raise them again.

## Overview

Phases are named by their prefix, not a number, so a new phase can go into its risk position without renumbering anything. Update a phase's row at the end of each run. Rows are ordered by what a bug there can cost, and each phase can run alone.

Scope lines were last checked against the tracked files at `f4e10bb`.

| Phase | Name | Risk | Last audited | At commit | Open (C / H / M / L) |
|---|---|---|---|---|---|
| [`SEC`](#sec-security-encryption-and-privacy) | Security, encryption and privacy | High | Never | | |
| [`DB`](#db-database-storage-and-app-start) | Database, storage and app start | High | Never | | |
| [`BAK`](#bak-backup-restore-import-and-export) | Backup, restore, import and export | High | Never | | |
| [`SYNC`](#sync-live-sync) | Live sync | High | Never | | 0 / 0 / 0 / 0 |
| [`TXN`](#txn-transactions-recurrence-and-budgets) | Transactions, recurrence and budgets | High | Never | | 0 / 0 / 0 / 0 |
| [`ACCT`](#acct-accounts) | Accounts | High | Not built | | |
| [`DEBT`](#debt-debts) | Debts | High | Never | | |
| [`INV`](#inv-investments-and-assets) | Investments and assets | High | Never | | 0 / 0 / 0 / 0 |
| [`TD`](#td-time-deposits) | Time deposits | High | Not built | | |
| [`MET`](#met-metrics-and-formulas) | Metrics and formulas | High | Never | | |
| [`AI`](#ai-ai-and-chat) | AI and chat | High | Never | | |
| [`GOAL`](#goal-savings-goals) | Savings goals | Medium | Never | | |
| [`BG`](#bg-reminders-notifications-and-background) | Reminders, notifications and background | Medium | Never | | |
| [`UIH`](#uih-home-and-history-ui) | Home and history UI | Medium | Never | | |
| [`UII`](#uii-insights-ui) | Insights UI | Medium | Never | | |
| [`UIS`](#uis-shell-onboarding-and-profile) | Shell, onboarding and profile | Low | Never | | |
| [`DOC`](#doc-docs-drift-and-tooling) | Docs drift and tooling | Low | Never | | |

**Not built** means the phase's feature has a plan in `docs/plans/` but no code yet. Its Scope line lists the files the plan will create. It isn't due until one of them exists.

## Starter prompt

To run one phase, paste into a new session, changing the prefix:

> Run audit phase `DEBT` from `docs/dev/AUDIT.md`. Read its shared rules and the phase's section first, history included, then follow "How to run a phase". This is an audit only: log findings and don't change app code.

To audit whatever has changed:

> Audit again from `docs/dev/AUDIT.md`: follow "Auditing again". This is an audit only: log findings and don't change app code.

Run one phase at a time, in the main checkout (no worktree), so every session reads and writes the same `docs/dev/AUDIT.md`.

## Auditing again

Use this when asked to "audit again" with no phase named. This session works out what's due. Each phase still runs in its own session.

1. **Sweep for new files,** as in step 1 of [How to run a phase](#how-to-run-a-phase).
2. **Find what's due.** For each phase with a commit in the Overview, run `git diff <its commit>..HEAD --stat -- <its scope>`.
   - **Not built:** due, Full, once any file in its Scope exists. Otherwise skip it with no history row.
   - **Never audited:** due, Full.
   - **Changed, or left Partial by its last run:** due, Delta (a Partial run finishes its unread part first).
   - **Unchanged, with Full or Delta as its last run:** add a history row saying so. Don't start a session for it.
   - **Rule change only:** if `git diff <its commit>..HEAD -- docs/METRICS.md docs/CAPABILITIES.md docs/TECHNICAL_DETAILS.md` changes a section the phase names under **Rules**, it's due even when its code didn't change.
3. **Say what's due and run it.** List the due phases with their depth, then run them in Overview order, one session at a time. `DOC` goes last.

New features need nothing written for them in advance. The sweep brings in their files, a Delta run reads what changed, and the rules diff turns their new METRICS.md rows into checks.

## How to run a phase

1. **Sweep for new files.** Run `git diff --name-status --diff-filter=ADR <oldest commit in the Overview, or the scope-check commit above>..HEAD -- src App.tsx index.ts scripts plugins`. Add each added or renamed source file that's in no **Scope** line to the phase it belongs to, and remove deleted ones. Do this for every phase, not only yours, and add a history row to each phase whose scope changed. A file added this way is read whole by that phase's next Delta run, and doesn't make the run Full.
2. **Pick the depth.** Run `git rev-parse --short HEAD` and record it.
   - **Full:** the phase has no history yet, its scope was reorganized (files moved between phases, not just added), or the last Full run is more than about six months old. Read every file in scope, whole.
   - **Delta:** otherwise. Run `git diff <last commit>..HEAD --stat -- <scope>` and read each changed file whole (not only the changed lines), plus any file added to the Scope since the last run. If nothing changed in the code or in the phase's rule sections, add a history row saying so and stop.
3. **Re-check what's open.** Go through the phase's Open and Suspect findings. If one no longer happens, mark it Stale and say why. Accepted findings stay closed unless the code around them changed. A row whose Proof is **Prior review** came from the old review log and was never proven to this file's standard: prove it, or mark it Suspect or Stale.
4. **Read the rules.** Read the doc sections the phase names. They say what the code is meant to do, so a difference is a finding (see [What counts](#what-counts)). On a Delta run, also read `git diff <last commit>..HEAD -- docs/METRICS.md` and add each new or changed rule to the **Look for** list of the phase that holds its entry point (the form, service call or app-start step where it starts), as something that must always hold, such as "an account transfer leaves Net Worth unchanged". The bullets stay for later audits.
5. **Hunt.** Follow each entry point from start to finish against the [shared checklist](#shared-checklist) and the phase's **Look for** list. Read outward to callers and callees in other phases when a path crosses them, and log the finding under the phase where the defect lives. **Trace each new rule from step 4 once, end to end,** through every phase's code it passes, including files that didn't change. A new feature can break code nobody edited. Name the rules you traced in the history row's Notes.
6. **Prove it.** See [Proving a finding](#proving-a-finding).
7. **Log it.** Add findings and one history row to the phase's section, and update its Overview row. Then report in the session: the Critical and High findings in plain words, the count of the rest, and anything the run couldn't reach.

**Staying safe while auditing:**

- All of the user's data lives on their phone. Never run Clear Data, Restore, Sync, Load mock data or any write on the user's own install. Device experiments run on an emulator or a scratch install, filled with mock data or rows typed in by hand.
- Never use a real backup file, backup password, Gemini API key or the user's financial data in an experiment, and never send any of it to an outside service.
- Throwaway tests go in `src/utils/__tests__/audit-<ID>.test.ts`, the only place vitest picks them up. Run one with `npx vitest run audit-<ID>`, and delete it before the session ends. Never commit it.
- `npm run regen-changelog` and `npm run bump-version` write files, so don't run them during an audit.
- An audit edits only this file. Committing follows CLAUDE.md: only when the user asks.

## What counts

**A finding** is a concrete way to reach a wrong result: a crash, lost or corrupted data, money appearing or disappearing from a total, a number that disagrees with METRICS.md, a backup that won't restore, financial data shown or sent where it shouldn't be, or the app disagreeing with its own help text.

**Not a finding:** style, naming, refactors, speculative performance worries with no failure behind them, or opinions about how a metric should be defined. The user owns the formulas: a formula that matches METRICS.md but looks unwise is a note for the user, not a finding. A performance problem counts when you can name the data size at which it breaks.

**Severity**

| Level | Meaning | Example |
|---|---|---|
| **C** Critical | Data loss or exposure that can't be undone, or a total that's wrong for every user | A restore wipes data and then fails; the PIN can be skipped; a backup is written unencrypted |
| **H** High | A normal user can hit it, and it corrupts data or a headline number | Saving a debt payment twice on a double tap; Net Worth off after an ordinary edit; a restore drops one entity |
| **M** Medium | Needs an uncommon state, or the damage is contained | Wrong result on a leap day; two devices syncing with clocks apart; a modal crashes on an empty list |
| **L** Low | Cosmetic, or both rare and harmless | A label shows `NaN` for one frame; a percentage off by rounding |

**Status**

| Status | Meaning |
|---|---|
| Open | Proven and not fixed |
| Suspect | Looks wrong, but couldn't be proven. Says what would settle it |
| Fixed | The Closed column has the commit |
| Accepted | Intended or not worth fixing. The row says why and who decided, so later audits don't raise it again |
| Stale | No longer happens, because the code changed around it |

If a fix undoes an earlier finding's fix or an Accepted decision, mark the new row **↩** and name that finding, as in "↩ reopens DEBT-004".

## Proving a finding

A finding needs one of these, strongest first. Say which one in its row.

- **Test:** a throwaway vitest test that calls the real function and shows the wrong result. Vitest runs without the Expo preset, so this only works for code that imports no native module (most of `src/utils/`). Tests run once per time zone (Manila and Los Angeles), so a date bug that shows in only one still counts.
- **Device:** reproduced on an emulator or scratch install, following [PROJECT.md](../../PROJECT.md)'s Android device notes. Say the steps and what the screen showed.
- **Traced:** a complete path written out from a real entry point (a form's save, a service call, app start, a sync or restore) through each branch to the wrong result, with `file:line` at each step and the values that take it there.

What's left is Suspect. Before logging, try to break your own finding: look for a guard upstream, a caller that can't pass that value, or a transaction that wraps it. Drop it if one holds. A short list of proven findings beats a long list of maybes.

## Shared checklist

Applies to every phase where it fits. A phase's **Look for** list adds to it.

**Writes that belong together**

- Rows that must change together (a debt and its opening transaction, a payment and its interest and fee legs, a goal spend and its withdrawal): are they written in one DB transaction? If a form saves them as separate `await`s, what does a failure or app kill between them leave behind?
- Deleting a parent: are its linked children deleted and tombstoned too? Deleting a child directly (from History or search): is the parent left orphaned?
- Editing: are every leg's amount and date updated together?
- Double tap on Save, or saving while an earlier save is still running.

**Inputs**

- Amounts: empty, `0`, negative, a comma or dot as decimal separator, many decimals, huge, pasted text.
- Dates: today, future, far past, the 29th to 31st, 29 February, a date before the first transaction.
- `BigNumber` vs `number`: a value converted to `number` and back loses precision; `NaN` from `new BigNumber('')`.
- `JSON.parse` on stored data with no guard. Decryption that returns `null`.

**Money and arithmetic**

- Does every new or changed transaction kind follow its row in METRICS.md's "What each transaction counts toward" table, column by column?
- Does a screen filter transactions for a metric itself, instead of calling the shared function in `financialMetrics.ts`?
- Division by zero, rounding that creates or loses a cent, sums of mixed currencies, a converted value using today's rate where the rule says the transaction's date.
- Empty and first-time states: no transactions, no income, one month of data, a brand-new install.

**Time**

- Month boundaries computed in local time vs UTC (`toISOString()` slices the UTC date). Day and month edges in UTC+8 and UTC−8.
- A recurrence or reminder that falls due while the app wasn't opened for weeks. A device clock that moved backward.

**Lifecycle**

- The thing a row points to was deleted, archived or renamed: a category, debt, goal, investment, recurrence rule, account.
- Old rows after a schema change: does a new column have a sensible value on an existing install? Does a backup made before the change restore?
- Running twice: is every migration, backfill, recurrence catch-up and restore safe to repeat?

**Privacy**

- Every amount on screen goes through `usePrivacyFormat` or `HiddenChart`. Discreet and Hidden modes per METRICS.md.
- Nothing financial in notification text, logs, crash reports or error messages.

**Client**

- A failed save: is the error shown, and is the screen's state rolled back? Async loads that finish out of order or after the screen unmounted.
- A modal left open on something that has since been deleted.

**Growth**

- Work that runs on every screen focus over all transactions, with no limit or cache. Name the row count where it gets slow.

## Logging format

A phase's two tables start as a placeholder line or row. Replace them on first use.

```markdown
**Findings**

| ID | Sev | Status | Where | What happens | Proof | Found | Closed |
|---|---|---|---|---|---|---|---|
| DEBT-001 | H | Open | `DebtForm.tsx:231` | Saving a new borrowed debt writes the debt, then its opening transaction, as separate writes. Killing the app between them leaves a debt whose cash never arrived, so Cash is ₱X too low. To reach it: … | Traced | 2026-11-20 `abc1234` | |

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-20 | `abc1234` | Full | All files in scope | 1 H, 2 M, 1 Suspect | Couldn't test the fee leg on a device |
```

- IDs are the phase prefix plus a number. Never reuse or renumber one. Findings stay in the table once closed, so the history of a bug survives.
- **Where** is `file:line` at the commit in **Found**, since line numbers move.
- **What happens** says the scenario and the wrong result, then a one-line idea for the fix if there's an obvious one.
- **Depth** is Full, Delta, Partial or Findings only (logged here by another phase's run). A run that left part of its scope unread is Partial, and **Covered** names what it did read. The next run finishes the rest before the phase counts as Full.
- Add a row every run, including clean ones: "no findings" at a known commit is the point of the log.

**Scope changes:** a new source file joins the phase it belongs to, in that phase's **Scope** line, either when it's written or at the next sweep. Every tracked source file belongs to exactly one phase. When a phase's scope changes, add a history row saying so. [MODULES.md](../MODULES.md) is a separate, feature-oriented list for review prompts, where a file can appear twice. This file's Scope lines decide audit ownership.

---

## `SEC`: Security, encryption and privacy

**Scope:** `src/services/core/encryptionService.ts` · `src/services/core/securityService.ts` · `src/context/SecurityContext.tsx` · `src/context/PrivacyContext.tsx` · `src/hooks/usePrivacyFormat.ts` · `src/hooks/useScreenshotProtection.ts` · `src/components/common/PrivacyGuard.tsx` · `src/components/common/HiddenChart.tsx` · `src/components/profile/SecurityCard.tsx` · `src/screens/security/*`

**Rules:** TECHNICAL_DETAILS *Encryption Model*, *Encryption Key Caching*; CAPABILITIES *Local-First, Zero-Knowledge Architecture*, *Privacy & Security*; METRICS *Discreet and Hidden rendering*

**Look for:**

- Key creation, caching and loss: first launch, a reinstall, SecureStore returning nothing, a key read failing halfway through app start. What happens to data encrypted under a key that's gone?
- Field encryption round trips: empty strings, `null`, numbers stored as encrypted text, decrypting data that was never encrypted (legacy rows).
- PIN set, change, remove and biometrics: can the lock be skipped by backgrounding, rotating, the back button or a deep link? Lockout after reopening mid-lockout.
- Every amount in Discreet and Hidden modes: `usePrivacyFormat` callers that format the number themselves first, charts that bypass `HiddenChart`.
- The app switcher and screenshots: `PrivacyGuard` and `FLAG_SECURE` across every screen and modal.

**Findings**

| ID | Sev | Status | Where | What happens | Proof | Found | Closed |
|---|---|---|---|---|---|---|---|
| SEC-001 | L | Accepted | `SecurityContext.tsx`, `App.tsx` | Screens load data from SQLite while the PIN screen is still up, because the PIN screen is an overlay over the app, not a gate. Intended: it makes unlocking feel instant on slow phones. A hardening fix would mask values under the overlay, not delay the fetch. The app switcher is covered separately by `PrivacyGuard` and `FLAG_SECURE`. Decided by the user, 2026-07-23 | Prior review | 2026-07-23 | |
| SEC-002 | M | Accepted | `securityService.ts:14` | The PIN is hashed with unsalted SHA-256. Not fixed: the hash sits in the same SecureStore as the encryption key, so anyone who can read one can likely read the other. Decided by the user, retro Round 1 | Prior review | Retro Round 1 | |
| SEC-003 | M | Accepted | `securityService.ts:82` | The failed-attempt counter is read, then written, so attempts made at the same time undercount. "No need to complicate." Decided by the user, retro Round 1 | Prior review | Retro Round 1 | |
| SEC-004 | L | Accepted | `securityService.ts:55` | The lockout state is kept in AsyncStorage, which is weaker storage than the PIN's SecureStore. "Ignore." Decided by the user, retro Round 1 | Prior review | Retro Round 1 | |
| SEC-005 | L | Accepted | `securityService.ts:72` | The PIN comparison isn't timing-safe. Low impact, not fixed. Decided by the user, retro Round 1 | Prior review | Retro Round 1 | |

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | 5 carried over | Phase created; accepted items carried over from the retro review log and memory. Not audited yet |

## `DB`: Database, storage and app start

**Scope:** `src/services/database/*` · `src/services/core/storageService.ts` · `src/services/core/dataCache.ts` · `src/services/domain/tombstoneService.ts` · `src/services/domain/logService.ts` · `src/context/DataStatusContext.tsx` · `src/types/index.ts` · `src/constants/config.ts` · `src/utils/uuid.ts` · `App.tsx` · `index.ts`

**Rules:** TECHNICAL_DETAILS *Storage Architecture*, *Database Policy*, *Background Decryption*, *Optimistic Cache System*, *Concurrency Safety*

**Look for:**

- Every migration from the oldest supported version up to `DATABASE_VERSION`: on a fresh install, on each older version, and when killed halfway. Is each one safe to run twice? Does each swallow only the error it means to?
- Fresh-install `CREATE`s vs what the migrations produce: a column or index that one path has and the other lacks.
- `clearAllData`: does it clear every table, every AsyncStorage and SecureStore key, scheduled notifications and the cache? Does a table added later get missed?
- `dataCache`: invalidation after every write path, including bulk saves, restore, sync merge and deletes with cascades.
- App start order in `App.tsx`: DB open, migrations, monthly summary sync, recurrence catch-up, reminders. A step that throws: does the app still start? Two of them racing?
- Tombstones: written for every delete that sync needs, cleared when a row is re-created, kept after restore.

**Findings**

| ID | Sev | Status | Where | What happens | Proof | Found | Closed |
|---|---|---|---|---|---|---|---|
| DB-001 | M | Accepted | `databaseSchema.ts:570` | If the first run of `migrateToVersion15` is interrupted, a retry can encrypt debt fields a second time. "Ignore." Decided by the user, retro Round 1 | Prior review | Retro Round 1 | |

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | 1 carried over | Phase created. Not audited yet |

## `BAK`: Backup, restore, import and export

**Scope:** `src/services/integrations/backupService.ts` · `src/services/integrations/backupEntities.ts` · `src/services/integrations/autoBackupService.ts` · `src/services/integrations/importService.ts` · `src/services/integrations/exportService.ts` · `src/services/integrations/dummyDataService.ts` · `src/services/integrations/index.ts` · `src/components/data/*` · `src/screens/AutoBackupScreen.tsx` · `src/screens/ImportExportScreen.tsx` · `src/components/common/GlobalErrorBoundary.tsx` · `src/components/profile/DeveloperToolsCard.tsx`

**Rules:** CAPABILITIES *Backup, Sync & Export*; TECHNICAL_DETAILS *Encryption Model*

**Look for:**

- Backup → Clear Data → Restore brings back every entity in `ENTITY_REGISTRY`, every field (encrypted ones included), receipts, recurrence templates and settings. List any table the registry doesn't cover.
- Foreign keys remapped on restore, including those inside JSON (recurrence templates). Bind arrays that don't match the placeholder count (the cause of a Round 3 bug).
- Restoring a backup made by every older format and app version. An unknown key from a newer version.
- A wrong password, a truncated or corrupted file, a backup from another app. Does a failed restore leave the existing data as it was?
- Auto-backup: schedule, where files go, how many are kept, what happens when storage is full or permission is gone.
- CSV import: header variants, quoted commas, dates in other formats, duplicate rows, categories that don't exist. Export round trip: does an exported file import back to the same totals?
- Mock data: can "Load mock data" ever mix with or overwrite real data?

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `SYNC`: Live sync

**Scope:** `src/services/integrations/syncService.ts` · `src/services/integrations/syncEntities.ts` · `src/services/integrations/liveSyncTransport.ts` · `src/screens/LiveSyncScreen.tsx`

**Rules:** CAPABILITIES *Backup, Sync & Export*

**Look for:**

- Last-write-wins by `updatedAt`: every write path that changes a row without bumping `updatedAt`, so the change loses a merge. Rows whose `updatedAt` is bumped by something that isn't a user change.
- Deletes on one device and edits on the other, in both orders. Tombstones for linked children.
- Every entity in the backup registry that's missing from `SYNC_ENTITY_REGISTRY`, and the reverse.
- Pairing: a wrong or reused code, a dropped connection, two phones pairing at once, the screen left mid-sync.
- Payload framing: partial frames, oversized frames, a payload that doesn't decrypt.

**Findings**

| ID | Sev | Status | Where | What happens | Proof | Found | Closed |
|---|---|---|---|---|---|---|---|
| SYNC-001 | M | Accepted | `syncService.ts:54` | Last-write-wins compares timestamps from two devices with no skew protection, so a phone whose clock runs ahead wins every conflict. Not fixed: phones keep network time, so it only matters for edits to the same record on both phones within moments, and a real fix (per-device or logical clocks) changes every synced table and the sync format. Decided by the user, 2026-11-14 | Prior review | Retro Round 1 | |
| SYNC-002 | M | Fixed | `syncService.ts:207` | The merge cleared a resurrected row's tombstone before the upsert ran. If the upsert failed, the row was neither present nor tombstoned. Fixed: tombstones are cleared only after the upsert lands; a failed sync leaves the row deleted and the next sync retries it. | Traced | Retro Round 1; proven 2026-11-14 `885355d` | uncommitted |
| SYNC-003 | M | Fixed | `recurrenceService.ts:141`, `recurrenceService.ts:169` | Catch-up saved advanced rules through `bulkSaveRecurrenceRules`, whose insert leaves out `updatedAt`, so SQLite stamped "now" on every advance. A phone that only caught up then beat the other phone's real edit to that rule in last-write-wins. Fixed: catch-up only runs `UPDATE … SET nextDueDate`, leaving `updatedAt` alone. | Traced | Retro Round 1; proven 2026-11-14 `885355d` | uncommitted |
| SYNC-004 | L | Accepted | `liveSyncTransport.ts:66` | `FrameReader.feed` concatenates every chunk into one buffer, which is O(n²) for large payloads. Not fixed: no sync has been reported slow, and a change to the wire protocol needs a two-phone test. Revisit if large syncs with many receipts drag. Decided by the user, 2026-11-14 | Prior review | Retro Round 1 | |

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | 4 carried over | Phase created; unresolved items carried over from the retro review log. Not audited yet |
| 2026-11-14 | `885355d` | Findings only | Re-check of carried-over items | SYNC-002 and SYNC-003 proven and fixed | SYNC-001 and SYNC-004 Accepted by the user. The phase itself is not audited yet |

## `TXN`: Transactions, recurrence and budgets

**Scope:** `src/services/domain/transactionService.ts` · `src/services/domain/recurrenceService.ts` · `src/services/domain/budgetService.ts` · `src/services/domain/categoryService.ts` · `src/screens/RecordScreen.tsx` · `src/components/record/*` · `src/components/transaction/*` · `src/components/profile/BudgetManagementModal.tsx` · `src/components/profile/RecurringRulesListModal.tsx` · `src/components/profile/SmartSuggestionsModal.tsx` · `src/components/profile/QuickActionsCard.tsx` · `src/constants/categories.ts`

**Rules:** METRICS *Shared rules*, *What each transaction counts toward*, *Budget Health*; CAPABILITIES *User Experience & Workflow*

**Look for:**

- `TransactionForm` and `TransferForm` save paths: the goal-spend pair, recurring options, editing a linked row, changing type on edit. Each kind they write against its METRICS.md row.
- `deleteTransaction` cascades: parent → children, child deleted directly, tombstones for each.
- Recurrence catch-up: a rule not run for months, the 365-step cap, the 31st in short months, end dates, a rule deleted while its rows exist. A partial failure halfway through.
- Budgets: a category renamed or deleted, a budget with no spending, the month boundary.
- Category deletion: what happens to transactions and budgets that use it.

**Findings**

| ID | Sev | Status | Where | What happens | Proof | Found | Closed |
|---|---|---|---|---|---|---|---|
| TXN-001 | M | Fixed | `recurrenceService.ts:137` | Catch-up saves the generated transactions, then the advanced rules, as two separate writes. If the second fails or the app is killed in between, the next run generates the same transactions again. Fixed with TXN-002's deterministic ids: a re-run skips occurrences that already exist or were deleted. | Traced | Retro Round 1; proven 2026-11-14 `885355d` | uncommitted |
| TXN-002 | M | Fixed | `recurrenceService.ts:110`, `syncService.ts:180` | With Live Sync on two phones, each phone's catch-up created its own copy of every occurrence under a random id. The merge has no duplicate check, so after syncing both copies survived and the rent or salary counted twice. Fixed: each occurrence's id is a v4-shaped hash of the rule id and due date (`deterministicUUID`), so both phones create the same row. Pre-existing duplicates are not removed, and phones in different time zones can still compute different due dates. | Traced | 2026-11-14 `885355d` | uncommitted |

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | 1 carried over | Phase created. Not audited yet |
| 2026-11-14 | `885355d` | Findings only | Re-check of TXN-001, recurrence catch-up | 1 M found; both fixed | TXN-002 found while re-checking TXN-001. The phase itself is not audited yet |

## `ACCT`: Accounts

**Status:** Not built. Plan: [ACCOUNTS.md](../plans/ACCOUNTS.md).

**Scope (planned):** `src/services/domain/accountService.ts` · `src/utils/accountMetrics.ts` · `src/constants/accounts.ts` · `src/components/accounts/*` · `src/components/home/AccountsTab.tsx`

**Rules:** ACCOUNTS.md *Decisions made with the user*, *Phase 0* and *Edge cases*; once shipped, METRICS *Accounts* shared rule and its rows in *What each transaction counts toward*

**Look for:**

- An account transfer (`ACCOUNT_TRANSFER` pair) leaves Cash, Net Worth and every metric unchanged, Cash kept In/Out included. Only the two account balances move.
- `transferBetweenAccounts`, `updateAccountTransfer`, `openAccount`, `adjustBalance` and `deleteAccount` each write all their rows in one DB transaction.
- Deleting any leg of a transfer deletes the whole group, with every row tombstoned.
- A `NULL` or unknown `accountId` always resolves to Cash on hand, so money never drops out of the totals. Cash on hand can't be deleted, archived or made non-spendable.
- Non-spendable accounts: Safe-to-Spend and Runway ignore their rows, as in the plan's footnotes ⁴ and ⁵.
- Foreign-currency accounts: spending fixed at the transaction day's rate; only balances follow the latest rate. Offline with no known rate.
- With no account created, every form and number is exactly as before.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase reserved for the Accounts plan. Not built |

## `DEBT`: Debts

**Scope:** `src/services/domain/debtService.ts` · `src/components/debts/*` · `src/components/home/LoansTab.tsx` · `src/hooks/useConfirmDeleteDebt.ts` · `src/constants/debtTemplates.ts`

**Rules:** CAPABILITIES *Debt & Loan Management*, *Loan Start-Date Awareness*; TECHNICAL_DETAILS *Debt Engine*; METRICS *Debts Drag*, *Loans Repaid / Obligations Paid*, *Loan Payoff Plan*, debt rows in *What each transaction counts toward*

**Look for:**

- `DebtForm` save: the debt, its opening borrow or lend transaction and its fee row. Are they written together? What does editing the amount, date or direction do to the rows already written?
- `LoansTab` payments: principal, interest and fee legs written together, linked, and deleted together. Status changes (paid off, reopened) and the transactions they delete.
- Each interest type and term against the amortization in `debtMetrics.ts` (formulas audited in `MET`, call sites here).
- A debt with a start date in the future or far past, a $0 minimum, a zero rate, a payment larger than the balance.
- Deleting a debt with payments: what happens to its transactions, and to Net Worth's history.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `INV`: Investments and assets

**Scope:** `src/services/domain/investmentService.ts` · `src/services/domain/assetService.ts` · `src/services/domain/priceHistoryService.ts` · `src/services/domain/dividendHistoryService.ts` · `src/services/domain/marketDataService.ts` · `src/services/domain/smartAdvisorService.ts` · `src/services/integrations/currencyService.ts` · `src/components/investments/*` · `src/components/home/HoldingsTab.tsx` · `src/components/profile/assets/*`

**Rules:** CAPABILITIES *Investments & Asset Management*, *Global Currency & Native Assets*; TECHNICAL_DETAILS *Investment Engine*, *Exchange Rate Handling*, *Portfolio Computation*; METRICS *Investment Return*, *Investment Boost*, investment rows in *What each transaction counts toward*

**Look for:**

- `InvestmentForm` and `InvestmentHistoryModal` saves: the investment, its cash leg, its P&L leg and price history, with the Cash flow switch on and off. Written together? Edited and deleted together?
- Sell more than held, a sell on the same day as the buy, a symbol renamed in the Asset Dictionary, an asset deleted while holdings use it.
- Currency: holdings in another currency, a rate fetch that fails or returns zero, the rate used for each stored value.
- Price and dividend fetches through Gemini: a malformed or empty response, a wrong symbol, quota errors. Nothing fetched overwrites a value the user typed without asking.
- Smart Advisor: holdings with no price history, a single holding, zero total.

**Findings**

| ID | Sev | Status | Where | What happens | Proof | Found | Closed |
|---|---|---|---|---|---|---|---|
| INV-001 | M | Accepted | `dividendHistoryService.ts:39` | `getDividendConversionRate` converts dividends at today's exchange rate, not the rate on the ex-date. Intended: the function only feeds projections, the annual estimate and the calendar, which look forward, so today's rate is the right one. Received dividends are recorded as transactions separately. Decided by the user, 2026-11-14 | Prior review | Retro Round 2 | |
| INV-002 | M | Fixed | `currencyService.ts:33`, `dividendHistoryService.ts:49` | Once the cached latest rate was over 24 hours old and the fetch failed (offline), `fetchExchangeRate` returned `null` and dividend conversion fell back to a rate of 1, so USD dividends showed as the same number of pesos. Fixed: an expired cached rate is used when the fetch fails, and with no rate at all the symbol is left out of dividend totals instead of counted 1:1. | Traced | 2026-11-14 `885355d` | uncommitted |

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | 1 carried over | Phase created. Not audited yet |
| 2026-11-14 | `885355d` | Findings only | Re-check of INV-001, dividend FX | 1 M found and fixed | INV-002 found while re-checking INV-001. The phase itself is not audited yet |

## `TD`: Time deposits

**Status:** Not built. Plan: [TIME_DEPOSITS.md](../plans/TIME_DEPOSITS.md). Ships after Accounts.

**Scope (planned):** `src/services/domain/timeDepositService.ts` · `src/utils/timeDepositMetrics.ts` · `src/constants/timeDeposits.ts` · `src/components/timeDeposits/*`

**Rules:** TIME_DEPOSITS.md *Decisions made with the user*, *Phase 0* and *Edge cases*; once shipped, METRICS *Time deposits* shared rule and its rows in *What each transaction counts toward*

**Look for:**

- Opening a cash-funded deposit lowers cash by the principal and leaves Net Worth flat. Withdrawing raises Net Worth by the net interest only.
- Every action (`openDeposit`, `withdrawAtMaturity`, `rollOver`, `preterminate`, `deleteDeposit`) writes its rows and the deposit's status in one DB transaction.
- Editing a deposit's principal or start date updates its `OPENING` row in the same transaction. Tagged rows can't be edited or deleted from History or Ledger.
- Past Net Worth points use `startDate` and `closedAt`, so a deposit counts only for the months it was active.
- Pre-termination: received below, equal to and above the principal. The penalty is excluded from Burn Rate.
- Maturity notifications: rescheduled after every action, restore, sync and Clear Data. Never show amounts or bank names.
- A deleted predecessor in a roll-over chain doesn't crash the successor.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase reserved for the Time Deposits plan. Not built |

## `MET`: Metrics and formulas

**Scope:** `src/utils/financialMetrics.ts` · `src/utils/snapshotMetrics.ts` · `src/utils/insightMetrics.ts` · `src/utils/debtMetrics.ts` · `src/utils/investmentMetrics.ts` · `src/utils/savingsGoalMetrics.ts` · `src/utils/monthlySummaryBuilder.ts` · `src/utils/scenarioUtils.ts` · `src/utils/historyFeed.ts` · `src/utils/currencyUtils.ts` · `src/utils/currencyData.ts` · `src/utils/index.ts` · `src/utils/__tests__/*` · `src/services/domain/monthlySummaryService.ts` · `src/hooks/useFinancialHealth.ts` · `src/hooks/useHistoryData.ts` · `src/components/insights/financialHealthPool.ts`

**Rules:** All of METRICS.md. PRODUCT.md *Everything Else is Derived*, *Monthly Summary*

**Look for:**

- Every metric's code against its Formula line in METRICS.md, and every transaction kind against each column of *What each transaction counts toward*.
- Shared functions that a screen re-implements instead of calling (grep for `TRANSFER_OUT`, `TRANSFER_IN`, `subCategory` filters outside `financialMetrics.ts`).
- Month and day boundaries in local time vs UTC, in both test time zones.
- Each metric with no data, one month of data, no income, zero spending, a negative balance.
- `historyFeed` folding of linked rows: each kind of pair folds into one row, and day totals still net correctly.
- Monthly Summary: finished months are fixed until Reprocess; the current month's numbers match the live screens.
- The amortization and payoff math in `debtMetrics.ts`, and the goal on-track math in `savingsGoalMetrics.ts`.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `AI`: AI and chat

**Scope:** `src/services/integrations/geminiService.ts` · `src/services/integrations/geminiChatService.ts` · `src/services/domain/chatContextService.ts` · `src/services/core/AIConsentService.ts` · `src/hooks/useAIConsent.ts` · `src/utils/financialSnapshotBuilder.ts` · `src/utils/chatMarkdown.ts` · `src/screens/ChatScreen.tsx` · `src/components/ai/*` · `src/components/common/MarkdownMessage.tsx` · `src/components/profile/settings/GeminiSettingsModal.tsx` · `src/components/profile/settings/GeminiUsageModal.tsx`

**Rules:** CAPABILITIES *Bring-Your-Own AI*, *AI-Assisted Market Research*; TECHNICAL_DETAILS *AI Integration*

**Look for:**

- Exactly what leaves the device on each call: the chat context, receipt images, market lookups. Excluded categories and "disclose debt names" honoured on every path, not just chat.
- Consent checked before every call, including market data fetches started from Holdings and history modals.
- The API key: where it's stored, whether it can end up in logs, errors, backups or exports.
- Receipt scan: a response that isn't valid JSON, amounts in another currency, a date the model made up. Nothing saved without the user reviewing it.
- The context builder's numbers against the live metrics (`financialSnapshotBuilder` should call the shared functions, not re-derive them).

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `GOAL`: Savings goals

**Scope:** `src/services/domain/savingsGoalService.ts` · `src/components/savingsGoals/*` · `src/components/home/GoalsTab.tsx` · `src/hooks/useConfirmDeleteSavingsGoal.ts`

**Rules:** CAPABILITIES *Savings Goals*; METRICS *Goals Progress / On Track*, goal rows in *What each transaction counts toward*

**Look for:**

- Contribution, withdrawal, sweep and goal-funded spend: each kind against its METRICS.md row. The spend pair written and deleted together.
- A goal's derived balance going negative, a withdrawal larger than the balance, a goal completed and then reopened.
- Recurring contributions: a goal deleted or completed while its rule still runs.
- Deleting a goal with money in it: where does the money go, and does Net Worth's history change?

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `BG`: Reminders, notifications and background

**Scope:** `src/services/background/*` · `src/services/domain/reminderService.ts` · `src/services/core/backgroundTaskService.ts` · `src/components/reminders/*` · `src/components/common/BackgroundTaskBanner.tsx` · `src/constants/reminders.ts`

**Rules:** CAPABILITIES *Smart Alerts & Reminders*; TECHNICAL_DETAILS *Reminder & Notification System*

**Look for:**

- Scheduled notifications match the reminders in the DB after every create, edit, delete, restore, sync and Clear Data. Stale ones left behind.
- Reminder catch-up: many missed, completing all, a reminder edited while the sheet is open, the sheet showing while PIN-locked.
- Permission denied or revoked, the OS limit on scheduled notifications, a time-zone change.
- Background tasks: what runs, how often, and what happens when it fails or runs while the app is open.
- Notification text never includes amounts or names.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `UIH`: Home and history UI

**Scope:** `src/screens/HomeScreen.tsx` · `src/components/home/SnapshotView.tsx` · `src/components/home/LedgerTab.tsx` · `src/components/home/HomeSettingsSheet.tsx` · `src/components/home/SnapshotOrderList.tsx` · `src/components/home/HomeSkeleton.tsx` · `src/components/history/*`

**Rules:** CAPABILITIES *Home Snapshot*, *Five-tab navigation*, *Smart History Calendar*; METRICS *Net Worth Change*, *Cash Kept*, *Safe-to-Spend*, *Discreet and Hidden rendering*

**Look for:**

- Each number on Home comes from the shared metric function, with the same inputs as Insights uses for the same metric.
- Overall vs Monthly, each range and order setting, and the saved settings after an upgrade adds a new row or section.
- Ledger and calendar: linked rows folded once, locked rows not editable, a row deleted while its detail is open.
- Empty states for a new install, and loading states that never resolve when a fetch fails.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `UII`: Insights UI

**Scope:** `src/screens/InsightScreen.tsx` · `src/components/insights/*.tsx` · `src/components/insights/modals/*`

**Rules:** CAPABILITIES *Financial Health & Analytics*, *Interactive Trend Analytics*, *Monthly Summary*; METRICS *Financial Health grid* and each metric a chart shows

**Look for:**

- Every chart's series against the metric it claims to show, including the first and last points and the current partial month.
- Year and range navigation: the earliest year, years with no data, leap years.
- "How is this calculated?" text against the code and METRICS.md.
- Hidden mode on every chart and tooltip; Discreet percentages that divide by zero.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `UIS`: Shell, onboarding and profile

**Scope:** `src/navigation/*` · `src/context/AlertContext.tsx` · `src/context/ThemeContext.tsx` · `src/components/common/BottomModal.tsx` · `src/components/common/CustomAlert.tsx` · `src/components/common/Disclaimer.tsx` · `src/components/common/EmptyState.tsx` · `src/components/common/ReviewAppModal.tsx` · `src/components/common/ScreenWrapper.tsx` · `src/components/common/Skeleton.tsx` · `src/components/common/TimeRangeSelector.tsx` · `src/components/common/YearSelector.tsx` · `src/components/ds/*` · `src/components/index.tsx` · `src/components/onboarding/*` · `src/screens/onboarding/*` · `src/screens/ProfileScreen.tsx` · `src/screens/LearnScreen.tsx` · `src/screens/ThankYouScreen.tsx` · `src/components/profile/AppearanceCard.tsx` · `src/components/profile/ProfileHeader.tsx` · `src/components/profile/settings/ContactDeveloperModal.tsx` · `src/components/profile/settings/SupportModal.tsx` · `src/components/thankyou/*` · `src/hooks/useReviewPrompt.ts` · `src/styles/theme.ts` · `src/utils/severity.ts` · `src/utils/markdownParser.ts` · `src/constants/thankyou.ts`

**Rules:** DESIGN.md; CAPABILITIES *Built-In Education & Transparency*

**Look for:**

- Onboarding: quitting halfway, changing the profile currency after data exists, accepting a newer terms version.
- Navigation: deep links and the back button into screens whose data isn't loaded, modals stacked on top of each other.
- Alerts and modals: every severity uses its own icon and colour, and no browser-native dialogs.
- The review prompt: when it fires, and that it can't loop.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |

## `DOC`: Docs drift and tooling

**Scope:** `src/constants/helpContent.ts` · `src/constants/changelog.ts` · `scripts/*` · `plugins/*` · `app.json` · `eas.json` · `package.json` · `tsconfig.json` · `babel.config.js` · `eslint.config.js` · `vitest.config.mts` · `docs/CAPABILITIES.md` · `docs/TECHNICAL_DETAILS.md` · `docs/MODULES.md`

**Rules:** All of METRICS.md; PROJECT.md *Calculation explanations*, *Release notes / changelog*

Run this one last in a round, since earlier phases log drift they trip over and this phase sweeps the rest.

**Look for:**

- Every formula and number the Help Center quotes, against METRICS.md and the code.
- CAPABILITIES and TECHNICAL_DETAILS claims against the code: features described that don't exist, and the reverse.
- MODULES.md against the tracked files.
- `src/constants/changelog.ts` matches `CHANGELOG.md` (`npm run verify-changelog` is read-only).
- Build scripts and config plugins: what they write, and whether a version bump touches every place a version lives.

**Findings**

No findings yet.

**History**

| Date | Commit | Depth | Covered | Result | Notes |
|---|---|---|---|---|---|
| 2026-11-14 | `f4e10bb` | — | — | — | Phase created. Not audited yet |
