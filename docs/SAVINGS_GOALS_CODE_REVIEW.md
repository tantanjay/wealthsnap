# Savings Goals — Code Review & Verification Report

**Branch:** `feat/savings-goals`  
**Reference Specifications:** [TODO.md](file:///d:/Projects/TOOLS/wealthsnap/TODO.md) (`## 🎯 Savings Goals`), [docs/PLAN_SAVING_GOALS.md](file:///d:/Projects/TOOLS/wealthsnap/docs/PLAN_SAVING_GOALS.md)  
**Date:** September 13, 2026  
**Status:** Verification Complete — **8 Critical Accounting/Data-Integrity/Analytics Bugs** & **6 Edge Cases** Identified  

---

## 1. Executive Summary

A comprehensive code audit was conducted on the `feat/savings-goals` branch across all 48 modified and newly introduced files, with specific focus on **Insights, Financial Analysis, Burn Rate, and Cash Flow Accounting**.

The core ledger design adheres to the planned model:
- **Ledger design:** Dynamic balance derivation via tagged transactions (`savingsGoalId`) without redundant balance columns.
- **Contribution model:** `TRANSFER_OUT` from Cash to Goal, preserving Net Worth equality.
- **Auto-Offset & Split-funding:** Paired `EXPENSE` and `TRANSFER_IN` (`GOAL_SPEND`) with secondary general cash expenses for overdraws.
- **Type safety:** Clean static check with zero TypeScript diagnostics (`npx tsc --noEmit` exited with code 0).

However, **8 critical bugs** were discovered. In addition to data integrity risks during backup restore and transaction editing, there are severe discrepancies in the **Insights, Analytics, Runway, Safe-to-Spend, and AI Context** calculations. Specifically, the codebase violates the central accounting rule: **a goal contribution is a `TRANSFER_OUT` and represents committed cash burn; a goal spend is an `EXPENSE` offset by a linked `TRANSFER_IN` and must NOT be counted as monthly burn or double-counted against spending.**

---

## 2. Alignment Matrix (Phase by Phase)

| Phase | Planned Scope ([PLAN_SAVING_GOALS.md](file:///d:/Projects/TOOLS/wealthsnap/docs/PLAN_SAVING_GOALS.md)) | Implementation Status | Alignment Notes |
|---|---|---|---|
| **Phase 0** | Locked vocabulary (`subCategory`), `SavingsGoal` interface, derived balance model | ✅ **Aligned** | Defined in [types/index.ts](file:///d:/Projects/TOOLS/wealthsnap/src/types/index.ts) & [constants/savingsGoals.ts](file:///d:/Projects/TOOLS/wealthsnap/src/constants/savingsGoals.ts). |
| **Phase 1** | DB schema (v19), CRUD services, UI screens, forms, detail screens, top-ups, sweeps | ✅ **Aligned** | Complete in [savingsGoalService.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/database/savingsGoalService.ts), [SavingsGoalsScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/SavingsGoalsScreen.tsx), [SavingsGoalDetailScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/SavingsGoalDetailScreen.tsx). |
| **Phase 2** | Dashboard widget, Net Worth preservation, Cash Flow exclusion | ⚠️ **Critical Bug** | Net worth flat calculation verified. Widget exists, but **default widget order omits it for existing users**. Home Cash Flow card's "Earnings vs Spending" mode treats goal spend as unearned operational deficit. |
| **Phase 3** | Auto-Offset in `TransactionForm`, split-funding, recurring sync, goal reached notification | ⚠️ **Critical Bug** | Logic works on creation, but **transactions can be edited later**, which desynchronizes the offset pair. |
| **Phase 4** | Safe-to-Spend obligations, Monthly budget isolation, Financial health metrics, Insights | ⚠️ **Critical Bugs** | `calculateBurnRate()` inverted; `InsightScreen` Net Cash Flow inverted; manual contributions ignored; daily Safe-to-Spend wiped out on goal spends; false AI budget overages. |
| **Phase 5** | Backup/Restore, CSV import/export, Hard reset | ⚠️ **Critical Bug** | Added to backup registry, but **missing foreign key mapping** for `recurrenceId`. |

---

## 3. Critical Severity Findings

### 🔴 Bug 1: Editing Goal-Linked Transactions Breaks Accounting & Strips Tags
- **Affected Files:**
  - [src/components/transaction/TransactionOptionsModal.tsx#L34-L38](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionOptionsModal.tsx#L34-L38)
  - [src/components/transaction/TransactionForm.tsx#L314-L336](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L314-L336)
  - [src/components/transaction/TransferForm.tsx#L83-L96](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransferForm.tsx#L83-L96)
- **Root Cause:**
  In `TransactionOptionsModal.tsx`, `canEdit` is guarded only against debt repayments:
  ```typescript
  const isDebtRepayment = transaction?.debtId != null;
  const canEdit = !isDebtRepayment;
  ```
  Transactions with `savingsGoalId != null` are permitted to be edited.
- **Failure Modes:**
  1. **Goal-Funded Expense:** If a user edits a goal-funded `EXPENSE` (e.g., changes amount from $100 to $150), `TransactionForm` updates only the `EXPENSE` row. The paired `TRANSFER_IN` (`GOAL_SPEND`) remains at $100. Goal balance and Cash balance immediately desynchronize.
  2. **Goal Contribution:** If a user edits a `TRANSFER_OUT` contribution, `TransferForm.tsx` (edit mode) has no fields or state for `savingsGoalId`. When saved, `savingsGoalId` is dropped (`undefined`), detaching the contribution from the goal entirely.
- **Recommended Remediation:**
  Follow the existing debt repayment safety pattern: disable editing for any transaction attached to a savings goal.
  ```typescript
  const isDebtRepayment = transaction?.debtId != null;
  const isSavingsGoalTx = transaction?.savingsGoalId != null;
  const canEdit = !isDebtRepayment && !isSavingsGoalTx;
  ```
  Provide user feedback: *"Savings goal transactions cannot be edited. Delete and recreate if needed."*

---

### 🔴 Bug 2: Backup Restore Breaks Goal Recurring Rules (`fkFields` Missing in Registry)
- **Affected Files:**
  - [src/services/integrations/backupEntities.ts#L30](file:///d:/Projects/TOOLS/wealthsnap/src/services/integrations/backupEntities.ts#L30)
- **Root Cause:**
  The `savingsGoals` entity descriptor in `backupEntities.ts` is registered as:
  ```typescript
  { name: 'savingsGoals', table: 'savings_goals', schema: savingsGoalSchema, priority: 6 },
  ```
  It lacks the `fkFields` property mapping `recurrenceId` to `recurrenceRules`.
- **Impact:**
  During database restore, all entity IDs are remapped to new UUIDs. Because `savingsGoals.recurrenceId` is not registered as a foreign key, it retains its old pre-backup UUID while `recurrenceRules` receives a new UUID.
  - Calling `toggleGoalPause()` or `deleteGoalWithSweep()` queries `recurrenceRules` with the stale ID and silently fails.
  - Scheduled contributions continue triggering in SQLite as un-cancellable, orphaned cron jobs.
- **Recommended Remediation:**
  Update the registry entry in [backupEntities.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/integrations/backupEntities.ts#L30):
  ```typescript
  {
      name: 'savingsGoals',
      table: 'savings_goals',
      schema: savingsGoalSchema,
      priority: 6,
      fkFields: [{ field: 'recurrenceId', refEntity: 'recurrenceRules' }],
  },
  ```

---

### 🔴 Bug 3: Existing Users Never See Savings Goals Widget on HomeScreen
- **Affected Files:**
  - [src/screens/HomeScreen.tsx#L156](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HomeScreen.tsx#L156)
- **Root Cause:**
  In `HomeScreen.tsx`, the fallback widget order omits `'savings-goals'`:
  ```typescript
  const defaultOrder = ['financial-health', 'cash-flow', 'portfolio', 'debt', 'transactions'];
  ```
  When an existing user opens the app, their stored preference in `AsyncStorage` (`@wealthsnap_home_widget_order`) already contains the 5 legacy widget IDs. The reconciliation logic only filters out invalid IDs but does not append newly introduced default widgets.
- **Impact:**
  Existing users who upgrade to the new version will never see the Savings Goals widget on their home dashboard unless they manually reset their layout in settings.
- **Recommended Remediation:**
  1. Add `'savings-goals'` to `defaultOrder` in [HomeScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HomeScreen.tsx#L156).
  2. During layout hydration, append any widgets present in `defaultOrder` that are missing from `savedOrder`.

---

### 🔴 Bug 4: Safe-to-Spend Double-Deducts Scheduled Goal Contributions
- **Affected Files:**
  - [src/screens/HistoryScreen.tsx#L484-L530](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HistoryScreen.tsx#L484-L530)
- **Root Cause:**
  The Safe-to-Spend calculation aggregates upcoming outflows in two passes:
  1. Lines 484–514: Iterates all active `recurrenceRules` up to period-end and adds all `TRANSFER_OUT` amounts to `upcomingBills`. Goal auto-contributions are stored as `TRANSFER_OUT` recurrence rules, so they are added to `upcomingBills`.
  2. Line 529: Subtracts `remainingGoalObligations` (which calculates the monthly target obligation for all active goals).
- **Impact:**
  Upcoming goal contributions are subtracted twice from available discretionary spend, resulting in an artificially deflated Safe-to-Spend figure.
- **Recommended Remediation:**
  When summing recurring rules into `upcomingBills`, exclude rules linked to a savings goal:
  ```typescript
  // In HistoryScreen.tsx:485
  const isGoalContribution = rule.transactionTemplate?.savingsGoalId != null;
  if (!isGoalContribution) {
      // add to upcomingBills
  }
  ```

---

### 🔴 Bug 5: Inverted Burn Rate & False Runway Drop Alerts in `calculateBurnRate()`
- **Affected Files:**
  - [src/utils/financialMetrics.ts#L216-L256](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts#L216-L256)
  - [src/utils/financialMetrics.ts#L481-L512](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts#L481-L512)
- **Root Cause:**
  `calculateBurnRate()` relies purely on `calculateTotals(monthlyTransactions)`:
  ```typescript
  const { expense } = calculateTotals(monthlyTransactions);
  totalExpense = totalExpense.plus(expense);
  ```
  `calculateTotals()` only examines `t.type === 'EXPENSE'`. It does **not** exclude `t.savingsGoalId` expenses, and does **not** include `t.type === 'TRANSFER_OUT' && t.savingsGoalId` contributions.
- **Impact:**
  1. `detectAnomalies()` passes raw `allTransactions` to `calculateBurnRate(allTransactions, 6)`.
  2. When a user spends from a goal (e.g., ₱60,000 travel expense), `calculateBurnRate()` counts it as a massive monthly expense surge, crashing calculated runway and triggering false high-severity `RUNWAY_DROP` anomalies.
  3. Conversely, regular monthly contributions (`TRANSFER_OUT`) are ignored in `calculateBurnRate()`, understating actual baseline burn when called directly.
- **Recommended Remediation:**
  In `calculateBurnRate()`, exclude goal-funded expenses (`!(t.type === 'EXPENSE' && t.savingsGoalId)`) and include goal contributions (`t.type === 'TRANSFER_OUT' && t.savingsGoalId`).

---

### 🔴 Bug 6: Inverted Net Cash Flow & Conflicting Expense/Savings Rate KPIs on `InsightScreen.tsx`
- **Affected Files:**
  - [src/screens/InsightScreen.tsx#L144-L156](file:///d:/Projects/TOOLS/wealthsnap/src/screens/InsightScreen.tsx#L144-L156)
  - [src/screens/InsightScreen.tsx#L234-L237](file:///d:/Projects/TOOLS/wealthsnap/src/screens/InsightScreen.tsx#L234-L237)
- **Root Cause:**
  1. `InsightScreen.tsx` sets `netCashFlow: totals.net` where `totals = Metrics.calculateTotals(currentMonthTrans)`. `totals.net` is `income - expense`, which ignores `TRANSFER_IN` and `TRANSFER_OUT`.
  2. `setData` passes raw `totals.expense` to the main Expense KPI and `calculateSavingsRate(totals.income, totals.expense)`.
- **Impact:**
  1. **Inverted Cash Flow:** Contributing ₱10,000 to a goal has zero impact on `netCashFlow` on the overview card. Spending ₱10,000 from a goal increases `totals.expense` by ₱10,000 and ignores the offsetting `TRANSFER_IN`, causing `netCashFlow` to falsely plummet by ₱10,000 even though net liquid cash did not change.
  2. **In-Screen Visual Contradiction:** The Expense KPI at the top includes goal spend, but the Spending Comparison chart directly below it uses `nonGoalCurrentMonthExpense` and excludes it. The Savings Rate KPI plunges, while the Savings Rate Trend chart directly below it keeps the goal spend excluded.
- **Recommended Remediation:**
  1. In `InsightScreen.tsx`, calculate `netCashFlow` using `calculateBalance(currentMonthTrans, monthEnd)` so the Auto-Offset pair nets to ₱0 and contributions reflect real cash outflows.
  2. Use `nonGoalCurrentMonthExpense` for the primary Expense KPI and Savings Rate KPI.

---

### 🔴 Bug 7: Manual Goal Contributions Excluded from Burn Rate & Completed Goals Continuing to Burn
- **Affected Files:**
  - [src/utils/savingsGoalMetrics.ts#L73-L77](file:///d:/Projects/TOOLS/wealthsnap/src/utils/savingsGoalMetrics.ts#L73-L77)
  - [src/screens/InsightScreen.tsx#L166-L187](file:///d:/Projects/TOOLS/wealthsnap/src/screens/InsightScreen.tsx#L166-L187)
  - [src/screens/FinancialHealthScreen.tsx#L215-L225](file:///d:/Projects/TOOLS/wealthsnap/src/screens/FinancialHealthScreen.tsx#L215-L225)
  - [src/screens/HomeScreen.tsx#L530-L545](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HomeScreen.tsx#L530-L545)
  - [src/utils/financialSnapshotBuilder.ts#L167-L171](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialSnapshotBuilder.ts#L167-L171)
- **Root Cause:**
  All four screens strip all goal transactions (`const nonGoalTransactions = t.filter(tx => !tx.savingsGoalId)`) and add `calculateTotalGoalContributions(goals)`.
- **Impact:**
  1. `calculateTotalGoalContributions` only checks `g.recurringAmount && g.frequency`. If a user makes manual ad-hoc contributions or initial lump sums, those `TRANSFER_OUT` records are stripped by `!tx.savingsGoalId` and `calculateTotalGoalContributions` returns 0. Manual contributions are **never counted in burn rate**.
  2. `calculateTotalGoalContributions` does not check if `balance >= targetAmount`. A goal that has reached 100% completion continues adding to monthly burn obligations indefinitely until manually paused.
- **Recommended Remediation:**
  1. Check `balance < targetAmount` before adding an active goal's recurring obligation in `calculateTotalGoalContributions`.
  2. In historical burn rate calculation, derive actual contributions from historical `TRANSFER_OUT` transactions tagged `savingsGoalId`.

---

### 🔴 Bug 8: Daily/Weekly Safe-to-Spend Wiped Out on Goal Spend & False AI Budget Overage Alerts
- **Affected Files:**
  - [src/screens/HistoryScreen.tsx#L377-L380](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HistoryScreen.tsx#L377-L380)
  - [src/screens/HistoryScreen.tsx#L452-L475](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HistoryScreen.tsx#L452-L475)
  - [src/utils/financialSnapshotBuilder.ts#L187-L191](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialSnapshotBuilder.ts#L187-L191)
  - [src/utils/monthlySummaryBuilder.ts#L162-L180](file:///d:/Projects/TOOLS/wealthsnap/src/utils/monthlySummaryBuilder.ts#L162-L180)
- **Root Cause:**
  1. In `HistoryScreen.tsx`, `summary.totalExpense` sums all `EXPENSE` rows without checking `!t.savingsGoalId`.
  2. In `financialSnapshotBuilder.ts`, `spentByCategory` filters `t.type === 'EXPENSE'` without checking `!t.savingsGoalId`.
  3. In `monthlySummaryBuilder.ts`, `expense.total` and `momExpenseChangePercent` use unfiltered `calculateTotals(monthTx)`.
- **Impact:**
  1. If a user spends ₱5,000 from their Vacation Goal today, `summary.totalExpense` includes it, and `dailyBurnRate.minus(summary.totalExpense)` causes today's Safe-to-Spend allowance to plunge negative.
  2. If a user spends ₱50,000 from their Vacation Goal, `financialSnapshotBuilder.ts` reports that the Travel budget is 1,000% over budget, misinforming the AI assistant.
  3. `monthlySummaryBuilder.ts` reports an alarming month-over-month expense spike and deflated savings rate.
- **Recommended Remediation:**
  Exclude `!(t.type === 'EXPENSE' && t.savingsGoalId)` from `summary.totalExpense` in `HistoryScreen`, `spentByCategory` in `financialSnapshotBuilder`, and `calculateTotals` in `monthlySummaryBuilder`.

---

## 4. Edge Cases & UX Gaps

### 🟡 Edge Case 1: Non-Atomic Database Writes in Auto-Offset Execution
- **Location:** [src/components/transaction/TransactionForm.tsx#L179-L214](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L179-L214)
- **Issue:** The Auto-Offset flow executes 2 or 3 separate `await saveTransaction(...)` calls sequentially. If an unexpected exception or termination occurs mid-sequence, a user can end up with an un-reimbursed expense or half-applied split funding transaction.
- **Solution:** Encapsulate the creation of the offset pair and optional split transaction into a single service method in [savingsGoalService.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/database/savingsGoalService.ts) using `db.withTransactionAsync`.

### 🟡 Edge Case 2: Stale `allTransactions` State on Rapid Sequential Goal Spends
- **Location:** [src/components/transaction/TransactionForm.tsx#L86-L95](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L86-L95)
- **Issue:** `TransactionForm` loads `allTransactions` once on mount. If a user logs multiple goal-funded expenses without dismissing the modal, `calculateGoalBalance` uses stale transaction history, risking an erroneous split calculation or overdrawing the goal balance.
- **Solution:** Refresh transaction state immediately after saving, or compute remaining balance by querying the database directly.

### 🟡 Edge Case 3: Missing Visual Confirmation on Goal Spend
- **Location:** [src/components/transaction/TransactionForm.tsx#L228-L232](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L228-L232)
- **Issue:** When a goal spend is submitted, the form resets input fields but does not display a confirmation alert or toast detailing the breakdown (e.g. *"Spent $80 from Vacation Goal and $20 from Cash"*).
- **Solution:** Trigger an in-app confirmation modal detailing the breakdown.

### 🟡 Edge Case 4: Missing Validation for `recurringAmount` in Goal Form
- **Location:** [src/components/savingsGoals/SavingsGoalForm.tsx#L72-L75](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalForm.tsx#L72-L75)
- **Issue:** While `targetAmount` is strictly validated to be positive, `recurringAmount` is not validated when a recurring frequency is chosen.
- **Solution:** Enforce `recurringAmount.isGreaterThan(0)` if `frequency != null`.

### 🟡 Edge Case 5: Pause/Resume Card Visible for Non-Recurring Goals
- **Location:** [src/components/savingsGoals/SavingsGoalOptionsModal.tsx#L85-L97](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalOptionsModal.tsx#L85-L97)
- **Issue:** The options bottom sheet unconditionally renders "Pause Auto-Contribution" even if the goal has no recurring rule (`goal.recurringAmount == null`).
- **Solution:** Conditionally render the pause action only when `goal.recurrenceId != null` or `goal.frequency != null`.

### 🟡 Edge Case 6: Run-Rate Projection Distortion in Month-End Forecast
- **Location:** [src/utils/financialMetrics.ts#L162-L215](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts#L162-L215)
- **Issue:** `getMonthEndProjection` calculates the daily run rate using all expenses in the current month. A lump-sum goal expenditure artificially inflates the daily average, producing a falsely alarming month-end expense forecast.
- **Solution:** Exclude goal-funded expenses (`t.savingsGoalId != null`) from the standard discretionary run rate.

---

## 5. Remediation Plan & Implementation Checklist

Prioritized checklist for implementing the required fixes once approved:

- [ ] **Phase 1: Critical Accounting, Data Integrity & Burn Rate Fixes**
  - [ ] Disable edit action for `transaction.savingsGoalId != null` in [TransactionOptionsModal.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionOptionsModal.tsx#L34).
  - [ ] Add `fkFields: [{ field: 'recurrenceId', refEntity: 'recurrenceRules' }]` in [backupEntities.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/integrations/backupEntities.ts#L30).
  - [ ] Add `'savings-goals'` to `defaultOrder` and add migration merge in [HomeScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HomeScreen.tsx#L156).
  - [ ] Fix `calculateBurnRate()` in [financialMetrics.ts](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts#L216) to exclude goal `EXPENSE` and include goal `TRANSFER_OUT`.
  - [ ] Exclude goal recurrence rules from `upcomingBills` in [HistoryScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HistoryScreen.tsx#L485).
  - [ ] Exclude goal `EXPENSE` from `summary.totalExpense` in [HistoryScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HistoryScreen.tsx#L378) to preserve daily/weekly Safe-to-Spend.
  - [ ] Fix `InsightScreen.tsx` overview cards: compute true `netCashFlow` via `calculateBalance`, and use non-goal expense for Expense and Savings Rate KPIs.
  - [ ] Guard `calculateTotalGoalContributions()` in [savingsGoalMetrics.ts](file:///d:/Projects/TOOLS/wealthsnap/src/utils/savingsGoalMetrics.ts#L73) to ignore completed goals (`balance >= targetAmount`).
  - [ ] Exclude goal `EXPENSE` from `spentByCategory` in [financialSnapshotBuilder.ts](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialSnapshotBuilder.ts#L188) and `calculateTotals()` in [monthlySummaryBuilder.ts](file:///d:/Projects/TOOLS/wealthsnap/src/utils/monthlySummaryBuilder.ts#L162).
- [ ] **Phase 2: Edge Cases & Transaction Reliability**
  - [ ] Create atomic `saveGoalFundedExpense` in [savingsGoalService.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/database/savingsGoalService.ts) using `db.withTransactionAsync`.
  - [ ] Refactor [TransactionForm.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx) to call the atomic service method and provide user feedback.
  - [ ] Add positive amount validation for `recurringAmount` in [SavingsGoalForm.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalForm.tsx).
  - [ ] Conditionally render Pause/Resume in [SavingsGoalOptionsModal.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalOptionsModal.tsx).
  - [ ] Filter `!t.savingsGoalId` in `getMonthEndProjection` in [financialMetrics.ts](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts).
- [ ] **Phase 3: Verification**
  - [ ] Run `npx tsc --noEmit` to guarantee clean type checks.
  - [ ] Verify runway, safe-to-spend, cash flow, and spending comparison charts with simulated contribution and goal spend transactions.
