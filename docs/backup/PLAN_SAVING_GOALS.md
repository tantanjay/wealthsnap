# Savings Goals — Implementation Plan

## Context

WealthSnap tracks Cash, Investments, and Debt but has no way to earmark cash for a recurring-but-spendable purpose (Travel fund, Annual Insurance, Car Maintenance). The accounting model and every open design question were already settled in a prior discussion and written into [TODO.md](TODO.md)'s "🎯 Savings Goals" section: contributions are transfers (not expenses), spending from a goal uses an "Auto-Offset" pair (EXPENSE + linked TRANSFER_IN) so Total Cash isn't double-deducted, goals can't go negative (split-funding covers any shortfall from general cash as a second plain expense), and Net Worth must stay flat on a contribution by counting goal balances as an asset.

This plan turns that settled spec into phased, file-level engineering work. Phase 1 ships a complete, usable feature end-to-end. Phases 2–5 are the "crawl" — fixing every existing calculation/export/sync path that now sees `savingsGoalId`-tagged transactions for the first time, in order of how badly it silently breaks if skipped.

**Schema decision (confirmed with user, deviates from TODO's original two-table sketch):** one new table only — `savings_goals`. No child `savings_goal_transactions` ledger. This matches the existing Debt feature exactly (`debts` table + tagged rows in the shared `transactions` table, balance always derived, never stored) — confirmed by reading the full table list in [databaseSchema.ts](src/services/database/databaseSchema.ts) (no `debt_transactions` table exists). TODO.md's schema bullet will be corrected to match once implementation starts.

---

## Phase 0 — Decisions locked before code starts

- **`subCategory` vocabulary** (single source of truth every later phase depends on) — export as a const from `src/types/index.ts` or a new `src/constants/savingsGoals.ts`:
  - `CONTRIBUTION` — recurring/manual/top-up `TRANSFER_OUT`
  - `INITIAL_FUNDING` — creation-time lump sum `TRANSFER_OUT`
  - `GOAL_SPEND` — Auto-Offset `TRANSFER_IN` leg, linked to its paired `EXPENSE`
  - `WITHDRAWAL` — emergency-cash `TRANSFER_IN`
  - `SWEEP` — goal-deletion balance-return `TRANSFER_IN`
- **`SavingsGoal` fields:**
  ```ts
  export interface SavingsGoal {
      id: string;
      name: string;
      targetAmount: BigNumber;
      recurringAmount?: BigNumber;
      frequency?: RecurrenceFrequency;  // reuse existing union
      category: string;                 // prefilled onto goal-tagged expenses
      subCategory?: string;
      isPaused: boolean;
      recurrenceId?: string;            // mirrors Transaction.recurrenceId
      currency?: string;
      notes?: string;
      goalReachedNotifiedAt?: string;    // one-time-ever dedup
      createdAt: string;
      updatedAt: string;
  }
  ```
  No `currentAmount`/`status` field stored — balance is always derived (`calculateGoalBalance`), and "Completed" is a computed display bucket (`balance >= targetAmount`), not a stored state, so it can never drift from the ledger.
- **Recurring-rule desync (confirmed real via [ProfileScreen.tsx:102](src/screens/ProfileScreen.tsx:102)'s generic "Manage Recurring Rules" list, which can toggle/delete *any* rule including a goal's):** filter any rule whose `transactionTemplate.savingsGoalId` is set out of that generic list in Phase 1, so pause/resume only ever happens through the goal's own toggle.
- **History tap-gating** (mirrors the existing `isDebtRepayment` special case in `HistoryListItem.tsx`): `CONTRIBUTION`/`INITIAL_FUNDING` `TRANSFER_OUT` rows stay tappable (so "Canceling a Contribution" by deleting the row works). `GOAL_SPEND`/`WITHDRAWAL`/`SWEEP` `TRANSFER_IN` rows are not tappable — undoing a spend/withdrawal/sweep only happens through the paired EXPENSE or the goal's own Options modal.

---

## Phase 1 — Core feature (schema → service → forms → screen → Home widget)

### Schema & types
- [databaseSchema.ts](src/services/database/databaseSchema.ts): add `CREATE TABLE IF NOT EXISTS savings_goals` (model on the `debts` DDL at [databaseSchema.ts:216](src/services/database/databaseSchema.ts:216) — encrypted TEXT columns, `createdAt`/`updatedAt DEFAULT CURRENT_TIMESTAMP`, an index on `isPaused`). Add `migrateToVersion17` following the exact rebuild recipe already used in `migrateToVersion11` ([databaseSchema.ts:417](src/services/database/databaseSchema.ts:417)): rebuild `transactions` adding a `savingsGoalId TEXT` column and `'SAVINGS_GOAL'` to the `transferAccount` CHECK list (SQLite can't ALTER a CHECK constraint in place). Bump `DATABASE_VERSION` to 17.
- [databaseService.ts](src/services/database/databaseService.ts): wire `if (currentVersion < 17) await migrateToVersion17(db);` into `initializeDatabase()`.
- [types/index.ts](src/types/index.ts): add `savingsGoalId?: string` to `Transaction` (next to `investmentId`/`debtId`), add `'SAVINGS_GOAL'` to the `TransferAccount` union, add the `SavingsGoal` interface from Phase 0.

### Domain service & metrics
- `src/services/domain/savingsGoalService.ts` (new): mirror [debtService.ts](src/services/domain/debtService.ts) exactly — `saveSavingsGoal`/`getAllSavingsGoals` (encrypt/decrypt sensitive fields, sort in JS since name is ciphertext)/`deleteSavingsGoal` (tombstone via `upsertTombstone('savings_goals', id)`)/`bulkSaveSavingsGoals`. Add action helpers here too: `contributeToGoal` (manual top-up / initial funding — one tagged `TRANSFER_OUT`), `withdrawFromGoal` (one tagged `TRANSFER_IN`, `WITHDRAWAL`), `deleteGoalWithSweep` (computes balance, writes a `SWEEP` `TRANSFER_IN` if >0, then deletes), `toggleGoalPause` (flips `isPaused` and the linked `RecurrenceRule.isActive` atomically so they can't drift).
- `src/utils/savingsGoalMetrics.ts` (new): `calculateGoalBalance(goal, transactions)` — sum tagged `TRANSFER_OUT` minus tagged `TRANSFER_IN`, clamped at 0 — mirrors `calculateCurrentDebtBalance` in [debtMetrics.ts:165](src/utils/debtMetrics.ts:165). `calculateGoalProgress` mirrors `calculateDebtProgress` ([debtMetrics.ts:312](src/utils/debtMetrics.ts:312)).

### The Auto-Offset / Split-Funding logic (the core new accounting behavior)
- [TransactionForm.tsx](src/components/transaction/TransactionForm.tsx): add a "Funding Source" selector (same UI convention as the existing category strip/modal, [TransactionForm.tsx:309](src/components/transaction/TransactionForm.tsx:309)) defaulting to General Funds; picking a goal pre-fills `category`/`subCategory` from it (still overridable). Force `isRecurring` off (or disable the selector while Recurring is checked) the moment a goal is selected — nothing today stops both being true simultaneously, and a `RecurrenceRule.transactionTemplate` would otherwise silently keep re-spawning goal-tagged transactions. In `handleSave` ([TransactionForm.tsx:91](src/components/transaction/TransactionForm.tsx:91)), when a goal is selected: if `amount <= balance`, save one `EXPENSE` (tagged) then one `TRANSFER_IN` (`GOAL_SPEND`, `linkedTransactionId` pointing at the EXPENSE) — same shape as the principal/fee pairing in [DebtScreen.tsx:291](src/screens/DebtScreen.tsx:291). If `amount > balance` (Split Funding), save that same pair capped at `balance`, **plus** a second, fully separate plain `EXPENSE` for the remainder (no tag, no linked leg, hits cash normally) — two rows, never one combined row. Wrap the pair-write in a transaction at the service layer so a partial failure can't leave cash/goal balance inconsistent.
- No changes needed in [transactionService.ts](src/services/domain/transactionService.ts) — its existing cascade-delete ([transactionService.ts:266](src/services/domain/transactionService.ts:266)) already deletes a `GOAL_SPEND` leg when its paired EXPENSE is deleted, and `savingsGoalId` is just a dumb tag column like `investmentId`/`debtId`, consistent with keeping entity-specific logic out of this shared file.

### Recurring contribution & notification
- Building the `RecurrenceRule` for a goal's `recurringAmount`/`frequency` is pure config — no engine change (`processRecurrenceRules` in [recurrenceService.ts](src/services/domain/recurrenceService.ts) is already fully generic): `transactionTemplate: { type:'TRANSFER_OUT', category, subCategory:'CONTRIBUTION', savingsGoalId, transferAccount:'SAVINGS_GOAL', amount: recurringAmount }`. Store the returned rule id on `goal.recurrenceId`.
- [notificationService.ts](src/services/background/notificationService.ts): add `checkAndNotifyGoalReached(goal, newBalance)` mirroring `checkAndNotifyAnomalies`'s immediate-notification call ([notificationService.ts:96](src/services/background/notificationService.ts:96)), but dedup via the goal's own `goalReachedNotifiedAt` field (once-ever) instead of the month-keyed AsyncStorage map that pattern normally uses. Call it explicitly from the contribution-save path in `savingsGoalService.ts`, not from a blanket hook in `transactionService.ts`.

### Screens, forms, gear menu, Home widget
- `src/screens/SavingsGoalsScreen.tsx` (new): mirror [DebtScreen.tsx](src/screens/DebtScreen.tsx)'s shape — `loadData`/`useFocusEffect`, one `useMemo` deriving each goal's balance/progress and bucketing Active / Paused / Completed (computed, not stored), summary cards, goal-card list.
- `src/components/savingsGoals/SavingsGoalForm.tsx` (new): mirror [DebtForm.tsx](src/components/debts/DebtForm.tsx)'s fields; reuse its "Syncing Your Cash Flow" 3-way modal pattern ([DebtForm.tsx:674](src/components/debts/DebtForm.tsx:674)) for the Initial Funding (Ramp Up) choice at creation.
- `src/components/savingsGoals/SavingsGoalOptionsModal.tsx` (new): mirror the consolidated gear-menu convention from [DebtStatusModal.tsx](src/components/debts/DebtStatusModal.tsx) — quick actions (Edit/Delete) on top, then inline-explained action cards for Pause/Resume, Withdraw, Add Funds below. Delete routes through a new `useConfirmDeleteSavingsGoal.ts` hook (mirrors [useConfirmDeleteDebt.ts](src/hooks/useConfirmDeleteDebt.ts)), warning about the balance sweep.
- `src/components/home/HomeSavingsGoalsCard.tsx` (new): props shape mirrors [HomeDebtCard.tsx](src/components/home/HomeDebtCard.tsx).
- [HomeScreen.tsx](src/screens/HomeScreen.tsx): add `'savings-goals'` to the default `cardOrder` array ([HomeScreen.tsx:108](src/screens/HomeScreen.tsx:108)) and a matching `case` in the render switch. **Net Worth fix (core, ships in Phase 1, not deferred to "insights"):** at [HomeScreen.tsx:622](src/screens/HomeScreen.tsx:622), add the summed goal balances into `assetsTotal` before subtracting liabilities — a contribution already reduces `currentCashBalance`, so the goal balance must be added back as its own asset bucket exactly like `totalMarketValue` already is for investments, or Net Worth will incorrectly drop on every contribution.
- [HomeSettingsModal.tsx](src/components/home/HomeSettingsModal.tsx): add `'savings-goals': 'Savings Goals'` to its label map ([HomeSettingsModal.tsx:20](src/components/home/HomeSettingsModal.tsx:20)).
- [AppNavigator.tsx](src/navigation/AppNavigator.tsx): register `SavingsGoalsScreen` in `HomeStackNavigator`, same nested-stack pattern as `Debts` ([AppNavigator.tsx:31](src/navigation/AppNavigator.tsx:31)).
- [ProfileScreen.tsx](src/screens/ProfileScreen.tsx): filter recurrence rules whose `transactionTemplate.savingsGoalId` is set out of the generic "Manage Recurring Rules" list ([ProfileScreen.tsx:102](src/screens/ProfileScreen.tsx:102)), per the confirmed decision above.

**Phase 1 done when:** create a goal with initial funding → balance correct, Net Worth unchanged. Trigger a recurring contribution → cash drops, goal balance rises, Net Worth flat, notification fires exactly once on hitting target. Spend less than the goal's balance → one EXPENSE + one linked TRANSFER_IN. Spend more than the balance → exactly two EXPENSE rows + one linked TRANSFER_IN (not one combined row). Delete the EXPENSE leg → the linked TRANSFER_IN cascades away too. Pause a goal → recurring stops, manual top-up still works, and the rule no longer appears in the generic recurring-rules list. Delete a goal with balance > 0 → a sweep TRANSFER_IN appears and cash rises accordingly.

---

## Phase 2 — Insights/Analytics filtering

As soon as Phase 1 ships, goal-tagged transactions are already visible to every burn-rate/trend/runway calculation that reads `transactions` — so every chart is silently wrong (double-counting or mis-bucketing) until this lands. Do all of these together, not incrementally — they're near-identical-looking edits to slightly different existing filter idioms, easy to miss one and get Home right but Insights wrong.

- [financialMetrics.ts](src/utils/financialMetrics.ts): `getCumulativeSpendingCurve`/`getCurrentMonthCumulative` — add `&& !t.savingsGoalId` to their local `isExpense` filters.
- [financialSnapshotBuilder.ts](src/utils/financialSnapshotBuilder.ts): extend the existing `nonDebtTransactions = transactions.filter(tx => !tx.debtId)` ([financialSnapshotBuilder.ts:140](src/utils/financialSnapshotBuilder.ts:140)) to also exclude `!tx.savingsGoalId`; add goal-`CONTRIBUTION` transfers into the burn figure alongside the existing `monthlyDebtObligations` addition.
- [InsightScreen.tsx](src/screens/InsightScreen.tsx): unlike debt (a fixed obligation number), goal contributions are real transfers — sum `TRANSFER_OUT` rows tagged `savingsGoalId` and add them into burn rate directly (not as a fixed-obligation model). Apply the same EXPENSE exclusion before the Avg Daily Spending calculation.
- [HistoryScreen.tsx](src/screens/HistoryScreen.tsx): add `&& !t.savingsGoalId` to the Safe-to-Spend expense filter; add a `goalContributionsMade` block mirroring the existing `debtPaymentsMade` pattern so contributions count as burn already consumed.
- [FinancialHealthScreen.tsx](src/screens/FinancialHealthScreen.tsx): extend its `nonDebtTransactions` filter the same way.
- No changes to `ComparisonChart.tsx`, `SavingsRateTrend.tsx`, `CumulativeSpendingChart.tsx`, `SmartAlerts.tsx`, `ExpenseAnalysis.tsx`, `HomeFinancialHealthCard.tsx`, `InsightsOverviewCards.tsx`, `FinancialStateCard.tsx`, `HistorySummary.tsx` — all confirmed pure-presentational; the fix propagates from the util/screen layer. `ExpenseAnalysis.tsx` deliberately keeps goal-tagged expenses in its category pie (composition view, not cross-month comparison) — verify nothing gets filtered there by accident.

**Phase 2 done when:** a goal `EXPENSE` and a goal `CONTRIBUTION` created in the same month — trend charts (Comparison/Cumulative/SavingsRateTrend) exclude the EXPENSE, but Burn Rate/Runway/Safe-to-Spend/Avg-Daily-Spending everywhere include the CONTRIBUTION as burn, and the ExpenseAnalysis pie still shows the EXPENSE.

---

## Phase 3 — History display & Monthly Summary formatting

User-visible but not a silent-math risk — without this, goal transfers show generic "To Savings Goal" text, which is confusing but not incorrect.

- [HistoryScreen.tsx](src/screens/HistoryScreen.tsx): build a `savingsGoalNameMap` (same place debt/investment name maps are already built) and pass it to `HistoryListItem`.
- [HistoryListItem.tsx](src/components/history/HistoryListItem.tsx): `getDisplayName()` — add a branch appending the mapped goal name (e.g. "Transferred to Travel Fund") when `savingsGoalId` is set; extend the existing tap-gating condition to include the Phase 0 rule (`CONTRIBUTION`/`INITIAL_FUNDING` tappable, `GOAL_SPEND`/`WITHDRAWAL`/`SWEEP` not).
- [monthlySummaryBuilder.ts](src/utils/monthlySummaryBuilder.ts): add a `--- Savings Goals ---` section copying the existing `--- Debts ---` block's shape (group by `savingsGoalId`, join name, show contribution/spend amounts + remaining balance). **Critical:** extend the generic `--- Transfers ---` section's exclusion (currently `!t.debtId && !t.investmentId`) to also exclude `!t.savingsGoalId`, or goal transfers double-count as generic "Transfers" — the same bug class debt/investment already had to guard against.

**Phase 3 done when:** History shows named goal transfers; tap-gating behaves per Phase 0; Monthly Summary has a dedicated Savings Goals section and the generic Transfers section no longer double-lists the same amounts.

---

## Phase 4 — AI context

Lowest risk (text-only). Do after Phase 2 so the numbers the AI reasons about are already correct.

- [financialSnapshotBuilder.ts](src/utils/financialSnapshotBuilder.ts) `renderFinancialSnapshotText`: add a line explaining the Auto-Offset mechanic (treat the EXPENSE as the true spend, the TRANSFER_IN is just an accounting offset) alongside the existing Savings-Rate-formula/Debts explanatory lines. Optionally list active goals with balance/target so the AI can answer direct balance questions.
- No changes to `chatContextService.ts`/`geminiChatService.ts` — confirmed pure orchestration/formatting, no domain prose belongs there.

**Phase 4 done when:** asking the AI about a month containing a goal-funded purchase doesn't double-count the TRANSFER_IN as extra income, and it can answer a basic goal-balance question.

---

## Phase 5 — Backup / Export / Sync / Clear-data wiring

Mechanical for most of this, but skipping it means a user who restores a pre-Phase-5 backup silently loses all their goals. Do this before removing any "beta" gating on the feature.

- [backupEntities.ts](src/services/integrations/backupEntities.ts): add one `ENTITY_REGISTRY` entry for `savingsGoals` (mirrors the `debts` entry exactly); add `{ field:'savingsGoalId', refEntity:'savingsGoals' }` to the `transactions` entry's `fkFields`.
- [backupService.ts](src/services/integrations/backupService.ts): the one hard-coded nested-field remap (`remapRecurrenceTemplateFks`, which already remaps `investmentId`/`debtId` inside a `RecurrenceRule.transactionTemplate` on restore) needs `savingsGoalId` added too — the generic `fkFields` loop can't reach into that nested template.
- [exportService.ts](src/services/integrations/exportService.ts): no generic registry here — add `getAllSavingsGoals()` to its data fetch, a goal-name map, a "Savings Goals" sheet and a "Goal Transactions" sheet (filter `transactions` by `savingsGoalId`), mirroring the existing Debts/Debt-Payments sheet pair exactly.
- [syncEntities.ts](src/services/integrations/syncEntities.ts): add a `SYNC_ENTITY_REGISTRY` entry for `savingsGoals` (`bulkUpsertForMerge`/`deleteOne` built in `savingsGoalService.ts`).
- [storageService.ts](src/services/core/storageService.ts) `clearAllData()`: add `DELETE FROM savings_goals;` to the hard-coded list (no second table needed, per the Phase 0 schema decision — goal-tagged rows in `transactions` are already cleared by the existing statement).
- No changes to `importService.ts` (plain CSV bank-statement importer, no entity awareness of any kind).

**Phase 5 done when:** Export produces two new populated sheets; Backup → Clear Data → Restore brings goals and their recurring rules back intact with FKs correctly remapped; a two-device merge-sync edit conflict on a goal resolves the same way a debt conflict does today; Clear Data leaves no orphaned goal-tagged rows in `transactions`.

---

## Verification

- No test runner exists for domain logic in this repo beyond `tsc`/`eslint` (confirmed pattern from the Backup & Restore v2 work in TODO.md's Done section) — after each phase, run `npx tsc --noEmit` and the project's lint command, then hand-verify the phase's "done when" checklist on a real device/emulator per this repo's established practice of flagging device-untested work explicitly in TODO.md until it gets a real pass.
- Phase 1 in particular needs a real-device walkthrough of the full contribution → spend → split-funding → delete → pause → goal-deletion-sweep sequence before Phase 2 starts, since Phase 2's correctness assumes Phase 1's tagging/subCategory discipline is already right.