# WealthSnap – TODO

Working notes for planned improvements. Not scheduled to a release yet.

---

## 🤖 Multi-Provider LLM Support

Currently every AI call is hardcoded to Google's `@google/genai` SDK. Goal: let users choose their provider (OpenAI, Claude, Ollama, self-hosted) and model, not just bring a Gemini key.

- [ ] Design a provider-agnostic interface (`chat()`, `stream()`, `analyzeImage()`) to sit in front of [geminiService.ts](src/services/integrations/geminiService.ts) and [geminiChatService.ts](src/services/integrations/geminiChatService.ts)
- [ ] Implement OpenAI provider adapter (structured JSON output, vision input, streaming, usage metadata all have equivalents)
- [ ] Implement Claude (Anthropic) provider adapter
- [ ] Implement Ollama / self-hosted adapter (OpenAI-compatible endpoint — should ride on the OpenAI adapter with a configurable base URL)
- [ ] Add model selection UI — [GeminiSettingsModal.tsx](src/components/profile/settings/GeminiSettingsModal.tsx) currently only has an API key field, no model picker despite `modelId` already being stored via `getAIConfig`/`saveAIConfig`
- [ ] Rework or gate the AI-assisted price/dividend history feature — it depends on Gemini's `googleSearch` grounding tool ([geminiService.ts:478](src/services/integrations/geminiService.ts:478)), which has no equivalent on Ollama/self-hosted models; needs a fallback (disable, or bring-your-own search API)
- [ ] Update pricing table ([geminiService.ts:50](src/services/integrations/geminiService.ts:50)) to be per-provider instead of Gemini-only
- [ ] Update AI Data Usage Consent copy to reflect provider choice

---

## 🎯 Savings Goals

A feature to track funds that accumulate over time for specific purposes (like a recurring budget that rolls over) and can be spent down. Examples: Travel fund, Annual Insurance, Car Maintenance.

**Status:** Phases 1–4 implemented (schema/migration, `savingsGoalService.ts`/`savingsGoalMetrics.ts`, the Auto-Offset/Split-Funding logic in [TransactionForm.tsx](src/components/transaction/TransactionForm.tsx), recurring contribution + one-time goal-reached notification, [SavingsGoalsScreen.tsx](src/screens/SavingsGoalsScreen.tsx) + form + gear menu, Home dashboard widget, the Net Worth fix in [HomeScreen.tsx](src/screens/HomeScreen.tsx), Insights/Analytics burn-rate/trend filtering, History-list/Monthly-Summary display, and AI chat context below), following a phased plan (Phase 1 core feature, Phase 2 Insights filtering, Phase 3 History/Monthly-Summary display, Phase 4 AI context, then Phase 5 Backup/Export/Sync/Clear-Data). All of it passes `tsc`/`eslint` clean. **Not yet run on a real device/emulator** — same caveat as other recent features in this log — needs a full walkthrough of contribution → spend → split-funding → delete → pause → goal-deletion-sweep, a check that Insights/Home/History/FinancialHealth all show consistent Burn Rate/Runway numbers, a look at the History list + Monthly Summary text for a goal-tagged month, and an actual AI chat conversation touching a goal-funded purchase, before being considered verified. Phase 5 (checklist items below under Data Management) is not yet implemented.

See [docs/PLAN_SAVING_GOALS.md](docs/PLAN_SAVING_GOALS.md) for the full phased implementation plan and rationale.

- [ ] **Database Schema Updates:** ([databaseSchema.ts](src/services/database/databaseSchema.ts))
  - Update `transactions` table: Add `savingsGoalId TEXT` to keep linking uniform with how `investmentId` and `debtId` work.
  - ~~Create a child table for `savings_goal_transactions`~~ — **decided against**, mid-implementation: Debt (the closest existing analog) has no child payments table — a debt's payments are just rows in `transactions` filtered by `debtId`, with balance always derived, never stored. Savings Goals follows the same precedent exactly: one new `savings_goals` table holds only the goal definition (`id`, `name`, `targetAmount`, `recurringAmount`, `frequency`, `category`, `subCategory`, `isPaused`, `recurrenceId`, `currency`, `notes`, `goalReachedNotifiedAt`); every contribution/spend/withdrawal/sweep is a normal row in `transactions` tagged `savingsGoalId` + a `subCategory` (`CONTRIBUTION`/`INITIAL_FUNDING`/`GOAL_SPEND`/`WITHDRAWAL`/`SWEEP`). A second ledger table would just be a second, driftable source of truth for no benefit.
- [ ] **Core Logic (The "True Asset" Accounting Model):** ([transactionService.ts](src/services/domain/transactionService.ts), [financialMetrics.ts](src/utils/financialMetrics.ts))
  - **The Contribution (Transfer):** The recurring addition is logged as a *Transfer Out* in the main `transactions` table. This drops your "Total Cash" but **does not** hit your monthly Expense report.
  - **The Net Worth Calculation:** Savings Goals are explicitly included as Assets (`Total Cash + Total Investments + Total Savings Goals Balances - Total Debt`). Since a contribution is just a transfer from Cash to a Savings Goal, your Net Worth stays perfectly flat.
  - **The Spending (Realized Expense & Auto-Offset):** 
    - *The Bug:* If you just log an `EXPENSE` when spending from a goal, Total Cash drops a *second* time (once during the initial `TRANSFER_OUT` contribution, and again on the expense).
    - *The Fix (Auto-Offset):* When a user spends from a goal, the app saves *two* transactions to the main ledger under the hood:
      1. A standard `EXPENSE` (so your Monthly Summary, Budgets, and category charts work perfectly).
      2. An equal-value `TRANSFER_IN` tagged with the `savingsGoalId`.
      - **Pairing:** the two rows must be linked via the existing `linkedTransactionId` mechanism, the same way ordinary account-to-account transfers are paired today. This is not optional — it's what makes deleting/editing either leg cascade to its pair instead of leaving an orphaned, unbalanced entry (cash math would silently drift otherwise). Reuse the existing cascade-delete + tombstone-both-legs logic already in `deleteTransaction` ([transactionService.ts:271](src/services/domain/transactionService.ts:271)) rather than writing new delete handling.
    - *Result:* The Expense drops cash by 5k, the Transfer In raises it by 5k. The net impact on Cash is ₱0. Your aggregation formulas remain completely untouched, and the money correctly flows out of the Goal and hits the expense reports.
  - Allow funds to accumulate indefinitely until used. They can accumulate *over* the `target_amount` regardless of `is_paused` — going over target doesn't pause or cap anything by itself.
  - **`is_paused` semantics:** it's a manual "don't *auto*-contribute to this goal right now" switch and nothing more — it only gates the recurring auto-contribution (stops the scheduled `TRANSFER_OUT` from firing). It does not cap the balance, and a Manual Top-Up is always allowed regardless of pause state.
  - **Recurring contributions are allowed to push Total Cash negative.** The scheduled auto-contribution posts on its normal cadence with no insufficient-funds check — same as any other scheduled transfer in the app today. No special-casing needed beyond what the recurrence engine already does.
  - **Goal Reached Notification:** When an auto-contribution pushes the balance over the target, fire a one-time notification.
  - **Canceling a Contribution:** If a user is tight on cash, they can delete a past contribution. This deletes the `Transfer Out` in the main ledger, giving them their Total Cash back.
  - **Withdrawing to Cash:** If a user needs emergency cash, they can "Withdraw" from a Savings Goal. This logs a deduction from the goal and adds a *Transfer In* to the main `transactions` table.
  - **No Negative Balances (Split Funding):** A goal cannot go negative. If a user buys a ₱7,000 item but the goal only has ₱5,000, the app drains the goal to zero and covers the rest as a normal out-of-pocket expense — logged as **two separate transactions**, not one combined row:
    1. A ₱5,000 `EXPENSE` (with `savingsGoalId` set) + its linked ₱5,000 `TRANSFER_IN` offset, per the Auto-Offset/pairing logic above (net ₱0 cash impact, drains the goal to zero).
    2. A plain ₱2,000 `EXPENSE` (no `savingsGoalId`) that hits Total Cash normally, exactly like any other expense.
- [ ] **Goal Management & Lifecycle:**
  - **Initial Funding (Ramp Up):** When creating a new Savings Goal, give the user an option to make an initial lump-sum contribution (e.g., "Start this goal with ₱5,000 today").
  - **Manual Top-Ups:** Let the user manually "Add Funds" at any time if they have extra cash to ramp up the goal faster, entirely separate from the recurring auto-schedule.
  - **Goal Deletion (Balance Sweep):** If a user deletes a goal, prompt them that any remaining balance will be swept back into their general cash pool via a `Transfer In` (releasing unspent savings back to their pocket). Since goals cannot go negative, there is no negative balance to absorb.
- [ ] **Add Expense Form Updates:** ([TransactionForm.tsx](src/components/transaction/TransactionForm.tsx))
  - Add a "Funding Source" or "Deduct From" selector when logging an Expense. It defaults to "General Funds" (or "Out of Pocket") but allows selecting from active Savings Goals.
  - **Auto-Categorization:** If a Savings Goal is selected, the form automatically pre-fills the `category` and `subCategory` based on the Goal's settings (but allows the user to change it).
  - If "General Funds" is selected, the app saves an `EXPENSE` to the main `transactions` table like normal.
  - If a "Savings Goal" is selected, the app saves an `EXPENSE` to the main `transactions` table (with `savingsGoalId` attached, linked via `linkedTransactionId` to its offsetting `TRANSFER_IN`) AND logs an expense to `savings_goal_transactions`. If the entered amount exceeds the goal's current balance, submit logic must split it per the No Negative Balances (Split Funding) rule above — one goal-linked `EXPENSE`+`TRANSFER_IN` pair capped at the goal's balance, plus a second plain `EXPENSE` (no `savingsGoalId`) for the remainder.
    - *Edge Case Warning:* If the user checks "Recurring" and *then* switches to a Savings Goal, the checkbox is hidden but the React state might still be `true`. Ensure the submit logic ignores the recurring state (e.g., `if (!is_savings_goal && is_recurring)`) so it doesn't accidentally create a recurring rule.
- [x] **UI Placement & Screens:** implemented — [SavingsGoalsScreen.tsx](src/screens/SavingsGoalsScreen.tsx) + `HomeSavingsGoalsCard.tsx` summary widget on [HomeScreen.tsx](src/screens/HomeScreen.tsx) tapping through to it.
- [x] **Data Formatting (History Screen, Monthly Summary):** implemented — `tsc`/`eslint` clean, not yet device-tested. `HistoryListItem.tsx`'s `getDisplayName()` appends the goal name to `TRANSFER_IN`/`TRANSFER_OUT` rows (e.g. "To Savings Goal (Travel Fund)"); tap-gating extended so the CONTRIBUTION/INITIAL_FUNDING leg and the real-spend EXPENSE leg stay tappable while the auto-generated GOAL_SPEND/WITHDRAWAL/SWEEP legs are locked (mirrors debt's principal-vs-interest/fee tappability split). `monthlySummaryBuilder.ts` gained a `savingsGoals` section (contributed/spent/balance per goal, mirroring the Debts section) and the generic Transfers section now excludes `savingsGoalId`-tagged rows so they don't double-count — same bug class debt/investment already had to guard against.
- [x] **AI Context:** implemented — `tsc`/`eslint` clean, not yet device/chat-tested. The explanatory prose lives in [financialSnapshotBuilder.ts](src/utils/financialSnapshotBuilder.ts)'s `renderFinancialSnapshotText`, not `chatContextService.ts`/`geminiChatService.ts` (confirmed both are pure orchestration/formatting with no domain prose of their own). Added a `savingsGoals: SavingsGoalSnapshotItem[]` field to `FinancialSnapshotData` (name/target/current balance/progress/paused, mirroring the existing `debts` list) plus a "Current Savings Goals" block and an explicit Auto-Offset note ("treat the EXPENSE as the true spend... never treat that TRANSFER_IN as separate spending or as income") rendered right where the Savings Rate formula note already lives, so the AI can answer direct goal-balance questions and won't double-count a goal-funded purchase.
- [x] **Insights & Analytics Filtering (The "Operational Filter"):** implemented — `tsc`/`eslint` clean, not yet device-tested. Turned out `insightMetrics.ts` itself needed no changes (it only holds pure formula helpers with no transaction filtering of its own); the real math lives in `financialMetrics.ts` (`getMonthlyTrends`/`getMonthlyTrendsForYear`/`getCumulativeSpendingCurve`/`getCurrentMonthCumulative`/`detectAnomalies`) plus per-screen burn-rate computations in [HomeScreen.tsx](src/screens/HomeScreen.tsx), [InsightScreen.tsx](src/screens/InsightScreen.tsx), [HistoryScreen.tsx](src/screens/HistoryScreen.tsx), [FinancialHealthScreen.tsx](src/screens/FinancialHealthScreen.tsx), and [financialSnapshotBuilder.ts](src/utils/financialSnapshotBuilder.ts) (AI chat context) — a new `calculateTotalGoalContributions` in [savingsGoalMetrics.ts](src/utils/savingsGoalMetrics.ts) mirrors `calculateTotalDebtObligations`, normalizing each active/unpaused goal's `recurringAmount` to a monthly-equivalent regardless of its actual frequency. `detectAnomalies`'s SPIKE/BUDGET_EXCEEDED checks (feeding SmartAlerts) also needed the same goal-EXPENSE exclusion, which wasn't originally called out explicitly. No historical "as of last month" reconstruction exists for goal contributions (unlike debt) since goals have no status-change audit trail — the runway-*trend* figures on Home/FinancialHealth approximate it with today's contribution rate; this only affects the trend delta, not the primary Runway/Burn Rate numbers.
  - To prevent a massive lump-sum goal purchase (e.g., a ₱60k flight) from skewing comparative analytics, while still recognizing your monthly discipline of saving:
  - **Include Transfers as Burn:** In operational metrics (Burn Rate, Runway, Safe-to-Spend, Avg Daily Spending), INCLUDE `TRANSFER_OUT` transactions that have a `savingsGoalId` as if they were expenses. This impacts:
    - `[insightMetrics.ts](src/utils/insightMetrics.ts)` & `[financialMetrics.ts](src/utils/financialMetrics.ts)` (The math)
    - `[HomeFinancialHealthCard.tsx](src/components/home/HomeFinancialHealthCard.tsx)` (Dashboard)
    - `[InsightsOverviewCards.tsx](src/components/insights/InsightsOverviewCards.tsx)` (Insights Screen)
    - `[FinancialStateCard.tsx](src/components/financialHealth/FinancialStateCard.tsx)` (Financial Health Screen)
    - `[HistorySummary.tsx](src/components/history/HistorySummary.tsx)` (Safe-to-Spend)
  - **Exclude Goal Spending from Trends:** You must IGNORE `EXPENSE` transactions that have a `savingsGoalId` in comparative/trend analysis to prevent massive spikes in these specific components:
    - `[ComparisonChart.tsx](src/components/insights/ComparisonChart.tsx)`
    - `[SavingsRateTrend.tsx](src/components/insights/SavingsRateTrend.tsx)`
    - `[CumulativeSpendingChart.tsx](src/components/insights/CumulativeSpendingChart.tsx)`
    - `[SmartAlerts.tsx](src/components/insights/SmartAlerts.tsx)`
  - **Categorized Charts:** It is fine to INCLUDE the goal `EXPENSE` in the pie charts like `[ExpenseAnalysis.tsx](src/components/insights/ExpenseAnalysis.tsx)`, because that chart just shows the composition of what you bought and doesn't compare cashflow against other months.
- [ ] **Data Management (Backup, Restore, & Clear Data):**
  - **Clear Data:** Update the database reset routines to ensure `savings_goals` and `savings_goal_transactions` are dropped/cleared when a user wipes their app data. (`[databaseService.ts](src/services/database/databaseService.ts)`)
  - **Backup & Restore:** Ensure the two new tables are explicitly included in the JSON backup payload, CSV exports, and the restore/import parsers so users don't lose their goal data. (`[backupEntities.ts](src/services/integrations/backupEntities.ts)`, `[exportService.ts](src/services/integrations/exportService.ts)`, `[importService.ts](src/services/integrations/importService.ts)`)
  - **Live Sync (If applicable):** Add the tables to the sync engine and tombstone logic for multi-device sync. (`[syncEntities.ts](src/services/integrations/syncEntities.ts)`)

---

## 🌱 Ideas to Reconsider

Broader brainstorm from a feature-gap pass over README/release notes. Not scoped or committed — revisit and pull individual items up into their own section when ready to act on them.

**History Calendar**
- Weekly Mini-Summaries — a trailing column per week row showing Weekly Net / Burn Rate on [HistoryCalendar.tsx](src/components/history/HistoryCalendar.tsx); needs a real layout change since the grid is hardcoded to 7 equal-width columns (`width: '14.28%'`)
- Safe-to-Spend Progress Bar — turn the current static number in [HistorySummary.tsx](src/components/history/HistorySummary.tsx:48) into a bar that visually drains as the month progresses

**Budgeting**
- Budget rollover — unspent amount carries into next month instead of resetting, or a "rolling average" budget that self-adjusts
- Split transactions — one receipt/transaction across multiple categories (currently each transaction is single-category)

**Investments**
- Target allocation vs. actual — set a target mix (e.g. 60% stocks / 30% funds / 10% crypto) and get a drift/rebalance nudge, complementing the existing Allocation Heatmap
- Tax-lot aware selling — FIFO/LIFO/specific-lot choice when recording a Sell, since Realized P/L currently doesn't distinguish which lot was sold
- "What-if" buy/sell simulator — preview the runway/net-worth impact of a hypothetical trade before committing

**Debt**
- Extra-payment / refinance simulator distinct from the existing Avalanche/Snowball toggle — "what if I paid ₱2,000 extra this month" or "what if I refinance at 8%"

**Chat / AI** (ties into the Multi-Provider LLM Support section above)
- Actionable suggestions — Chat currently only answers questions; it could propose concrete actions (adjust a budget, flag a subscription) that you approve rather than acting blind
- Voice input for Chat and receipt-less quick-add ("₱500 for gas")

**Insights & Goals**
- Net-worth / FIRE-style goal tracking — set a target number and date, get a progress bar against Wealth Growth Acceleration, since Insights currently reports trends but no explicit user-set target
- User-defined alert thresholds — Smart Alerts' spike/runway-drop thresholds (≥25%) are currently fixed; letting users tune sensitivity would cut noise for people with naturally volatile cash flow

**Reporting / Data Portability**
- PDF/CSV export of Monthly Summary or a custom date range — useful for tax season or sharing with an accountant, and the local narrative-generation engine already exists to build on

**Architecture**
- On-device/local LLM option (e.g. via Ollama) for Chat and receipt scanning — the strongest privacy story given the "zero-knowledge, offline-first" philosophy, and it's the natural payoff of the multi-provider work already in the TODO

---
---

## ✅ Done

### 🗂️ History Screen

- [x] ~~**Consolidate Type filter and Period into one "Filters" control**~~ — the always-visible 6-chip Type row and 4-button Day/Week/Month/Year row are gone from [HistoryScreen.tsx](src/screens/HistoryScreen.tsx)'s header; both now live in one `BottomModal` sheet ("Type" and "Period" sections) opened from a single filter-icon button next to the date navigator, with a small dot indicator when a non-default filter or period is active
- [x] ~~**Default `timeFrame` to `'MONTHLY'` instead of `'DAILY'`**~~ — changed the initial `useState` default in [HistoryScreen.tsx](src/screens/HistoryScreen.tsx); `getHistoryTimeFrame`/`saveHistoryTimeFrame` still take precedence once a preference has been saved, so this only changes first-run/no-saved-pref behavior
- [x] ~~**Match History's date navigator to Insight's**~~ — the date label is now tappable (with a calendar-outline icon, mirroring [InsightScreen.tsx](src/screens/InsightScreen.tsx:326)) and opens [HistoryDatePickerModal.tsx](src/components/history/HistoryDatePickerModal.tsx) (new), which adapts per `TimeFrame`: **Daily/Weekly** share a lightweight day grid (Weekly highlights and snaps to the Sun–Sat week rather than a single day); **Monthly** reuses Insight's year-nav + 12-month grid; **Yearly** is a year-only stepper with a "Jump to {year}" confirm (no natural single-tap grid for a lone value). Calendar view mode — which always steps month-to-month regardless of List's `timeFrame` — opens the Monthly variant.
  - **Not yet run in the actual app** — verified via `tsc`/`eslint` only (both clean); this repo isn't set up for Expo web (`react-dom`/`react-native-web` not installed) so no in-browser preview was done here. Needs a real device/emulator pass before considering it fully verified.

### 💰 Budget Management

- [x] ~~**Reality check button** — compare set budgets against actual spending patterns and surface two kinds of gaps~~ — shipped as **Smart Suggestions** (sparkles icon, top-right of [BudgetManagementModal.tsx](src/components/profile/BudgetManagementModal.tsx)), opening [SmartSuggestionsModal.tsx](src/components/profile/SmartSuggestionsModal.tsx): computes trailing-12-month category averages via `getCategoryAverages`, lists out-of-sync budgets (>15% and >₱50 gap) and unbudgeted-but-spending categories, with an editable amount + delete-row per category and a bulk "Update Budgets" apply
- [x] ~~**Add total** — show a summed total label across all budgets, not just per-category amounts~~

### 💬 Chat

- [x] ~~**Sanity context** — in the date-range picker, add a follow-up question letting users exclude specific sensitive categories (e.g. Credit Payment) from what's sent to the LLM~~ — added a category-exclusion step before the range picker in [ChatScreen.tsx](src/screens/ChatScreen.tsx), backed by `getAvailableCategories`/`fetchChatContextInputs(excludeCategories)` in [chatContextService.ts](src/services/domain/chatContextService.ts). Excluded categories are stripped from category-level detail (breakdowns, top expenses, budget alerts) and rolled into one lifetime "Private Categories" line in the snapshot — but totals (Total Cash, burn rate, monthly income/expense/savings rate) always compute from the full unfiltered data, so hiding a category can no longer skew those numbers (first cut of this wrongly dropped the transactions outright, which corrupted Total Cash — fixed same session)
- [x] ~~**Include Budgets in Snapshot** — add budget data to the financial snapshot built in chatContextService.ts~~ — `buildFinancialSnapshotData` now takes `budgets` and renders a "Current Month Budgets" section ([financialSnapshotBuilder.ts](src/utils/financialSnapshotBuilder.ts))
- [x] ~~**Monthly Summary over-budget detail** — when a category is flagged over budget, also include what the budget was actually set to, not just the overage~~ — `BudgetAlert` now carries `budgetAmount`/`spentAmount` ([monthlySummaryBuilder.ts](src/utils/monthlySummaryBuilder.ts))
- [x] ~~**Explain savings rate** — clarify/expand what "savings rate" means in the context sent to the LLM so it has enough to reason about accurately~~ — added a one-time glossary note in the snapshot text explaining the formula and that transfers/investments/debt payments count as savings, not expenses
- [x] ~~**Top spending notes** — if a transaction has a written note, surface it in the top-spending summary since a note is often a flag worth explaining~~ — `TopTransactionItem.note` flows through to the "Top Expenses" line
- [x] ~~**Copy context button labeling** — in "View Context", relabel the Copy button and add a privacy disclaimer near it~~ — button now reads "Copy for another AI" with a disclaimer banner above the context text in [ChatScreen.tsx](src/screens/ChatScreen.tsx)

### 📦 Backup & Restore

- [x] ~~**Scheduled encrypted backup**~~ — ✅ implemented; got a first real-device pass on Android (see the Google Drive finding below), iOS still unverified
  - [autoBackupService.ts](src/services/integrations/autoBackupService.ts) (new): settings CRUD (`getAutoBackupSettings`/`setAutoBackupEnabled`/`setAutoBackupFrequency`, **weekly/biweekly only — no daily**, since `expo-background-task` execution is opportunistic/OS-scheduled rather than guaranteed at a fixed time), the SecureStore-backed backup password (`SECURE_KEYS.AUTO_BACKUP_PASSWORD`, alongside the existing device key mechanism in [encryptionService.ts](src/services/core/encryptionService.ts) — a disclosed weakening of "password never touches disk" for manual backups, called out in the settings copy), and `runAutoBackupIfDue()` (no-ops unless enabled + due + password set; never throws so it can't take down the rest of the background task)
  - **Folder picker is platform-scoped, not a single cross-platform path picker**: Android uses the *legacy* Storage Access Framework (`StorageAccessFramework.requestDirectoryPermissionsAsync`, imported from `expo-file-system/legacy` — reintroduced for this one feature since the modern `Directory.pickDirectoryAsync()` only grants iOS access for the current session and its Android persistence isn't documented) so the app gets a durable, re-writable folder (can be a synced cloud-drive folder like Google Drive) across restarts. iOS has no equivalent in the managed workflow, so auto-backups there just land in the app's own `Paths.document` (same as manual backups) — `UIFileSharingEnabled`/`LSSupportsOpeningDocumentsInPlace` were added to `ios.infoPlist` in [app.json](app.json) so that folder is browsable/movable via the Files app instead of being trapped in the sandbox
  - **No auto-pruning/rotation** — auto-backups are never overwritten or deleted by the app once they land in the user's chosen folder; the user manages cleanup themselves. (The one exception: the internal `Paths.document` staging copy `createBackup` always writes first gets deleted after a successful Android SAF copy, since that staging file was never meant to be user-visible — see `runAutoBackupIfDue`.)
  - **Manifest + filename distinguish manual vs. auto**: `BackupManifestV2.source: 'manual' | 'auto'` (plaintext, no decryption needed) and filename gets an `_auto_` marker (`wealthsnap_backup_auto_YYYY-MM-DD.zip`) — see `createBackup`'s `source` param in [backupService.ts](src/services/integrations/backupService.ts:74)
  - Settings UI: [AutoBackupCard.tsx](src/components/data/AutoBackupCard.tsx) (new), living alongside `DataManagementCard` in [ProfileScreen.tsx](src/screens/ProfileScreen.tsx) — toggle, frequency picker, Android folder-picker row, password set/change (biometric-gated via `Security.authenticateBiometrics` when changing an existing password), last-auto-backup timestamp, iOS Files-app hint. Turning the toggle on chains straight into password setup then (Android) the folder picker, sequenced so the two native prompts never overlap
  - Wired into the existing daily `expo-background-task` in [backgroundService.ts](src/services/background/backgroundService.ts) (already used for recurrence processing/summary sync) rather than registering a second task
  - **Found on real-device testing**: Google Drive's Android SAF folder provider (`com.google.android.apps.docs.storage`) grants the directory-permission prompt but then throws `IOException: Location ... isn't writable` on actual file creation — a limitation of Google's own provider, not fixable from the app side. Fixed by having `pickAutoBackupFolder()` immediately probe the chosen folder with a real create+write+delete before accepting it (`probeFolderWritable`), so an unwritable folder is rejected at pick time with a clear explanation (`FOLDER_NOT_WRITABLE_MESSAGE`) instead of silently failing weeks later in the background. The actual run path in `runAutoBackupIfDue` also maps this same error pattern to the friendly message if it somehow still occurs (e.g. permission revoked after picking). Practical implication for users: pick local/device storage or a provider like Dropbox/OneDrive, not Google Drive, until/unless Google fixes their provider.

#### 🔧 Backup & Restore v2 (Refactor) — ✅ shipped (Phases 1–3a), Phase 3b held back

Implemented in full: UI split ([BackupRestoreModal.tsx](src/components/data/BackupRestoreModal.tsx), [CsvImportFlow.tsx](src/components/data/CsvImportFlow.tsx)), the v2 container format below ([backupEntities.ts](src/services/integrations/backupEntities.ts), rewritten [backupService.ts](src/services/integrations/backupService.ts)), and the File System API migration off `expo-file-system/legacy`. Along the way also fixed: the double-`JSON.stringify` bug, the ID-remap gap (`Transaction.investmentId`/`debtId`/`recurrenceId` and `Investment.recurrenceId` were previously left dangling on restore if those entities' legacy ids got regenerated — now generalized via `ENTITY_REGISTRY`'s `fkFields`), a null-item bug in `sanitizeIds` (falsy items were pushed into the output array instead of dropped), and a reminder-rescheduling bug (was scheduling notifications off the raw pre-sanitize array instead of the ids actually saved to SQLite). Also found and fixed two more `BackupModal`/`RestoreModal` call sites the original audit missed — `App.tsx`'s 7-day-reminder flow and `SetupScreen.tsx`'s onboarding restore — both now on the unified modal too.

**Phase 3b (JSZip → `fflate` streaming) intentionally not implemented** — turned out riskier/lower-value on inspection: needs a new dependency with a callback-driven API foreign to the rest of the codebase, and since `CryptoJS.AES` isn't incremental here, true streaming could only avoid buffering the whole multi-entity zip at once (not each entity's encrypt/decrypt step) — a real but small win, not worth the risk of unverified native-stream code in a backup feature. Phase 3a's switch to `uint8array` (from base64 strings) already removed the bigger memory cost. Revisit later if large backups prove to be an actual problem.

**Needs a real device/emulator verification pass** — everything above was checked via `tsc`/`eslint` (clean) plus a standalone Node script reproducing the pure ID-remap/container logic (all assertions passed, including the FK-remap fix, wrong-password rejection, and legacy double-stringify fallback), but none of it has run inside the actual RN app — no device/emulator/web build was available in the environment this was built in.

##### v2 container format spec — ✅ shipped as spec'd

`manifest.json` (plaintext, `containerVersion`/`schemaVersion`/`createdAt`/`appVersion`/`entities`/`counts`) + `entities/*.enc` (one `JSON.stringify`'d-once, AES-encrypted file per entity) inside the same `.zip` wrapper. Restore dispatches on file presence (`manifest.json` → v2 reader; else `backup.enc` → untouched legacy reader) — see [backupService.ts](src/services/integrations/backupService.ts)'s `restoreFromBackup`/`restoreV2`/`restoreV1Legacy`, and [backupEntities.ts](src/services/integrations/backupEntities.ts) for the entity registry (`getAll`/`bulkSave`/`hasId`/`fkFields` per entity) that drives both create and restore.

##### File System API Migration — ✅ shipped (the migration itself; streaming held back, see above)

All 4 files (`geminiService.ts`, `ProfileScreen.tsx`, `backupService.ts`, and CSV import — now in `CsvImportFlow.tsx`) migrated off `expo-file-system/legacy` onto the modern `File`/`Directory`/`Paths` API. `backupService.ts` also switched its zip I/O from base64 strings to `Uint8Array` throughout (`JSZip`'s `type: 'uint8array'`, `File.write()`/`.bytes()`), which was the main memory-pressure win from this migration even without the streaming library swap.
