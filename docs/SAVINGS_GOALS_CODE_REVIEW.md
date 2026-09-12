# Savings Goals — Code Review & Verification Report

**Branch:** `feat/savings-goals`  
**Reference Specifications:** [TODO.md](file:///d:/Projects/TOOLS/wealthsnap/TODO.md) (`## 🎯 Savings Goals`), [docs/PLAN_SAVING_GOALS.md](file:///d:/Projects/TOOLS/wealthsnap/docs/PLAN_SAVING_GOALS.md)  
**Date:** September 12, 2026  
**Status:** Verification Complete — **4 Critical Accounting/Data-Integrity Bugs** & **6 Edge Cases** Identified  

---

## 1. Executive Summary

A comprehensive code audit was conducted on the `feat/savings-goals` branch across all 48 modified and newly introduced files. The implementation closely adheres to the accounting model established in [TODO.md](file:///d:/Projects/TOOLS/wealthsnap/TODO.md) and [docs/PLAN_SAVING_GOALS.md](file:///d:/Projects/TOOLS/wealthsnap/docs/PLAN_SAVING_GOALS.md):
- **Core ledger design:** Dynamic balance derivation via tagged transactions (`savingsGoalId`) without redundant balance columns.
- **Contribution model:** `TRANSFER_OUT` from Cash to Goal, preserving Net Worth equality.
- **Auto-Offset & Split-funding:** Paired `EXPENSE` and `TRANSFER_IN` (`GOAL_SPEND`) with secondary general cash expenses for overdraws.
- **Type safety:** Clean static check with zero TypeScript diagnostics (`npx tsc --noEmit` exited with code 0).

However, **4 critical bugs** were discovered that pose immediate risks to cash accounting, database consistency during backup restore, dashboard widget discoverability for existing users, and Safe-to-Spend calculations. Additionally, **6 edge cases** in transaction atomicity and form state management were surfaced.

---

## 2. Alignment Matrix (Phase by Phase)

| Phase | Planned Scope ([PLAN_SAVING_GOALS.md](file:///d:/Projects/TOOLS/wealthsnap/docs/PLAN_SAVING_GOALS.md)) | Implementation Status | Alignment Notes |
|---|---|---|---|
| **Phase 0** | Locked vocabulary (`subCategory`), `SavingsGoal` interface, derived balance model | ✅ **Aligned** | Defined in [types/index.ts](file:///d:/Projects/TOOLS/wealthsnap/src/types/index.ts) & [constants/savingsGoals.ts](file:///d:/Projects/TOOLS/wealthsnap/src/constants/savingsGoals.ts). |
| **Phase 1** | DB schema (v19), CRUD services, UI screens, forms, detail screens, top-ups, sweeps | ✅ **Aligned** | Complete in [savingsGoalService.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/database/savingsGoalService.ts), [SavingsGoalsScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/SavingsGoalsScreen.tsx), [SavingsGoalDetailScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/SavingsGoalDetailScreen.tsx). |
| **Phase 2** | Dashboard widget, Net Worth preservation, Cash Flow exclusion | ⚠️ **Partial Bug** | Net worth flat calculation verified. Widget exists, but **default widget order omits it for existing users**. |
| **Phase 3** | Auto-Offset in `TransactionForm`, split-funding, recurring sync, goal reached notification | ⚠️ **Partial Bug** | Logic works on creation, but **transactions can be edited later**, which desynchronizes the offset pair. |
| **Phase 4** | Safe-to-Spend obligations, Monthly budget isolation, Financial health metrics | ⚠️ **Partial Bug** | Deducts remaining obligations, but **double-deducts scheduled recurrence rules**. |
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

## 4. Edge Cases & UX Gaps

### 🟡 Edge Case 1: Non-Atomic Database Writes in Auto-Offset Execution
- **Location:** [src/components/transaction/TransactionForm.tsx#L179-L214](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L179-L214)
- **Issue:** The Auto-Offset flow executes 2 or 3 separate `await saveTransaction(...)` calls sequentially. If an unexpected exception, process termination, or storage failure occurs mid-sequence, a user can end up with an un-reimbursed expense or a half-applied split funding transaction.
- **Solution:** Encapsulate the creation of the offset pair and optional split transaction into a single service method in [savingsGoalService.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/database/savingsGoalService.ts) using `db.withTransactionAsync`.

### 🟡 Edge Case 2: Stale `allTransactions` State on Rapid Sequential Goal Spends
- **Location:** [src/components/transaction/TransactionForm.tsx#L86-L95](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L86-L95)
- **Issue:** `TransactionForm` loads `allTransactions` once on mount. If a user logs multiple goal-funded expenses without dismissing the modal, `calculateGoalBalance` uses stale transaction history, risking an erroneous split calculation or overdrawing the goal balance.
- **Solution:** Refresh transaction state immediately after saving, or compute remaining balance by querying the database directly.

### 🟡 Edge Case 3: Missing Visual Confirmation on Goal Spend
- **Location:** [src/components/transaction/TransactionForm.tsx#L228-L232](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx#L228-L232)
- **Issue:** When a goal spend is submitted, the form resets input fields but does not display a confirmation alert or toast informing the user how much was deducted from the goal versus general cash.
- **Solution:** Trigger an in-app confirmation modal or alert detailing the breakdown (e.g. *"Spent $80 from Vacation Goal and $20 from Cash"*).

### 🟡 Edge Case 4: Missing Validation for `recurringAmount` in Goal Form
- **Location:** [src/components/savingsGoals/SavingsGoalForm.tsx#L72-L75](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalForm.tsx#L72-L75)
- **Issue:** While `targetAmount` is strictly validated to be positive, `recurringAmount` is not validated when a recurring frequency is chosen. This allows creating recurring rules with `$0`, negative, or invalid amounts.
- **Solution:** Enforce `recurringAmount.isGreaterThan(0)` if `frequency != null`.

### 🟡 Edge Case 5: Pause/Resume Card Visible for Non-Recurring Goals
- **Location:** [src/components/savingsGoals/SavingsGoalOptionsModal.tsx#L85-L97](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalOptionsModal.tsx#L85-L97)
- **Issue:** The options bottom sheet unconditionally renders the "Pause Auto-Contribution" / "Resume Auto-Contribution" row even if the goal has no recurring rule (`goal.recurringAmount == null`).
- **Solution:** Conditionally render the pause action only when `goal.recurrenceId != null` or `goal.frequency != null`.

### 🟡 Edge Case 6: Run-Rate Projection Distortion in Month-End Forecast
- **Location:** [src/utils/financialMetrics.ts#L162-L215](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts#L162-L215)
- **Issue:** `getMonthEndProjection` calculates the daily run rate using all expenses in the current month. A large lump-sum goal expenditure (such as booking a $2,500 vacation from a saved travel fund) artificially inflates the daily average, producing a falsely alarming month-end expense forecast.
- **Solution:** Exclude goal-funded expenses (`t.savingsGoalId != null`) from the standard discretionary run rate, or treat them as non-extrapolated one-time events.

---

## 5. Remediation Plan & Implementation Checklist

Prioritized checklist for implementing the required fixes once approved:

- [ ] **Phase 1: Critical Accounting & Data Integrity Fixes**
  - [ ] Disable edit action for `transaction.savingsGoalId != null` in [TransactionOptionsModal.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionOptionsModal.tsx#L34).
  - [ ] Add `fkFields: [{ field: 'recurrenceId', refEntity: 'recurrenceRules' }]` in [backupEntities.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/integrations/backupEntities.ts#L30).
  - [ ] Add `'savings-goals'` to `defaultOrder` and add migration merge in [HomeScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HomeScreen.tsx#L156).
  - [ ] Exclude goal recurrence rules from `upcomingBills` in [HistoryScreen.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/screens/HistoryScreen.tsx#L485).
- [ ] **Phase 2: Edge Cases & Transaction Reliability**
  - [ ] Create atomic `saveGoalFundedExpense` in [savingsGoalService.ts](file:///d:/Projects/TOOLS/wealthsnap/src/services/database/savingsGoalService.ts) using `db.withTransactionAsync`.
  - [ ] Refactor [TransactionForm.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/transaction/TransactionForm.tsx) to call the atomic service method and provide user feedback.
  - [ ] Add positive amount validation for `recurringAmount` in [SavingsGoalForm.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalForm.tsx).
  - [ ] Conditionally render Pause/Resume in [SavingsGoalOptionsModal.tsx](file:///d:/Projects/TOOLS/wealthsnap/src/components/savingsGoals/SavingsGoalOptionsModal.tsx).
  - [ ] Filter `!t.savingsGoalId` in `getMonthEndProjection` in [financialMetrics.ts](file:///d:/Projects/TOOLS/wealthsnap/src/utils/financialMetrics.ts).
- [ ] **Phase 3: Verification**
  - [ ] Run `npx tsc --noEmit` to guarantee clean type checks.
  - [ ] Perform regression testing on backup restore, transaction options, and home widget ordering.
