# Time Deposits — Implementation Plan

## Context

WealthSnap can record moving money into a time deposit today, but only as a bare transfer: the "Locked" chip in [TransferForm.tsx:36](../../src/components/transaction/TransferForm.tsx:36) writes a plain `TRANSFER_OUT` with `transferAccount: 'TIME_DEPOSIT'`. Nothing remembers the deposit afterwards, so per the "Plain transfer out" row in [METRICS.md](../METRICS.md#what-each-transaction-counts-toward), **locking money in a time deposit currently lowers Net Worth** as if the money was gone.

This plan adds Time Deposits as a real entity: principal, rate, withholding tax, term, maturity. The deposit is treated as an investment: it lives in Holdings and counts in the Investments total and Net Worth. The app prompts on maturity, both on open and as a push notification, and the user can withdraw or re-deposit.

**Builds on [Accounts](ACCOUNTS.md), which ships first.** Every cash row a deposit writes (opening, maturity, interest, penalty) belongs to an account. So the deposit form has a **"Funded from"** picker, and withdrawing has a **"Withdraw to"** picker, from day one. That avoids retrofitting these forms, and the backup and sync logic for their rows, after Accounts lands.

**Decisions made with the user:**
- **Interest is counted only at maturity.** No daily accrual. Net Worth includes principal while the deposit is active; interest enters as `INCOME` when it's paid out.
- **Withholding tax is a stored field** (`taxRate`, e.g. 20% PH final tax), separate from `interestRate`.
- **Interest estimate uses 365 days**, but the maturity sheet always lets the user edit the interest to what the bank actually credited.
- **Deposits live in the Holdings tab and count as an investment**: in the Holdings total, the Snapshot "Investments" row, and allocation.
- **Maturity prompt** works like Reminder Catch-up: a sheet on app open (when unlocked) listing matured deposits, with Withdraw / Re-deposit / Later. **Later** hides a deposit until the next day.
- **Push notification on the maturity date**, plus the on-open sheet.
- **Funded from an account, withdrawn to an account.** The deposit remembers its funding account (`fundingAccountId`).
  - Withdraw, Re-deposit (for interest that isn't rolled in) and Pre-terminate pre-select that same account, since money usually goes back where it came from. The user can pick another account.
  - Cash on hand is the default when nothing else is chosen, as everywhere else.
- **"Locked" is already gone from the Transfer form**, because Accounts removes all of its destination chips. The `TIME_DEPOSIT` enum value stays in the type and the DB CHECK, and old rows stay as they are, with an opt-in "Convert to time deposit" action.
- **Pre-termination:** if the amount received is less than the principal, the shortfall is recorded as an expense. If it's at least the principal, the excess is just (reduced) interest.
- **One new table**, `time_deposits`, plus a `timeDepositId` tag column on `transactions`, the same shape as debts and savings goals.

---

## Phase 0 — Decisions locked before code starts

### Schema shape

```ts
export type TimeDepositStatus = 'ACTIVE' | 'MATURED' | 'PRETERMINATED';

export interface TimeDeposit {
    id: string;
    name: string;               // bank / label, e.g. "BPI 6-mo TD"
    principal: BigNumber;
    interestRate: BigNumber;    // annual %, e.g. 6.25
    taxRate: BigNumber;         // withholding %, default 20
    startDate: string;
    termMonths?: number;        // either termMonths or termDays drives maturityDate
    termDays?: number;
    maturityDate: string;       // stored, not recomputed - bank's date wins over our math
    status: TimeDepositStatus;
    closedAt?: string;          // set on withdraw / pre-terminate / roll-over
    rolledFromId?: string;      // the deposit this one was re-deposited from
    fundedFromCash: boolean;    // false = money was never in tracked cash (no opening transfer)
    fundingAccountId?: string;  // account the OPENING row came from; default for Withdraw to. Unset = Cash on hand
    currency?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
```

**Deliberate deviation from Savings Goals: the balance is stored, not derived.** A goal's balance is summed from tagged transfers. A deposit's balance is `principal` while `status === 'ACTIVE'` (or, as of a past date, while `startDate <= asOf < closedAt`), else 0. Why:
- A deposit has a fixed principal with no top-ups or partial spends, so there's no ledger to sum.
- A deposit opened before the user started using WealthSnap (or funded from an untracked account) has no opening transfer to sum. Deriving from the ledger would show it as ₱0 or require fake balancing rows.
- Historical Net Worth (the sparkline's month-end points) needs "was it active then?". `startDate`/`closedAt` answers that the same way `isOwedAsOf` does for debts ([snapshotMetrics.ts:32](../../src/utils/snapshotMetrics.ts:32)).

Tagged transactions record **cash movements only**: opening, maturity, interest, penalty.

### `subCategory` vocabulary (export from a new `src/constants/timeDeposits.ts`)

| subCategory | Row | When |
|---|---|---|
| `OPENING` | `TRANSFER_OUT` +deposit, `transferAccount: 'TIME_DEPOSIT'` | Deposit created with `fundedFromCash: true` |
| `MATURITY` | `TRANSFER_IN` +deposit | Principal returned to cash (withdraw, roll-over, pre-terminate) |
| `ROLLOVER` | `TRANSFER_OUT` +new deposit, `transferAccount: 'TIME_DEPOSIT'` | Re-deposit: principal (± interest) moved into the new deposit |
| `INTEREST` | `INCOME` +deposit, category `Interest` | Net interest paid (gross − tax) |
| `PENALTY` | `EXPENSE` +deposit, category `Fees` | Pre-termination where the amount received < principal |

**Every row also carries an `accountId`** (Accounts plan):
- `OPENING` uses the funding account.
- `MATURITY`, `INTEREST` and `PENALTY` use the account chosen in Withdraw to / Received into.
- A roll-over writes its `MATURITY`, `INTEREST` and `ROLLOVER` rows all on that one account, so the account nets to zero, or to the net interest when interest isn't rolled in.

### Interest and tax math (pre-fill only, always editable)

- `gross = principal × interestRate/100 × days/365`, where `days = maturityDate − startDate`
- `tax = gross × taxRate/100`, `net = gross − tax`
- One `INCOME` row for **net** interest. Its note records gross and tax ("Gross ₱1,250.00 − 20% tax ₱250.00").
- **Not** gross `INCOME` + a `Tax` `EXPENSE`. A tax expense would show up in Total Expense, budgets and Burn Rate as if it were spending.
- The maturity sheet and the withdraw / re-deposit actions pre-fill `net` in an editable field. The user's typed number is what gets recorded, and the estimate is never stored.

### Pre-termination rule

One input: **total amount received from the bank**.
- `received >= principal`: `MATURITY` `TRANSFER_IN` of the principal, plus an `INTEREST` `INCOME` of `received − principal` (skipped if 0). No expense.
- `received < principal`: `MATURITY` `TRANSFER_IN` of the principal, plus a `PENALTY` `EXPENSE` of `principal − received`. Cash nets to exactly what was received, and the loss shows as an expense. The penalty counts in Total Expense but is **excluded from Burn Rate** (one-off).

### "Locked" transfer UI

- Remove `TIME_DEPOSIT` from the manual Transfer form's `DEST_CONFIG` only (`Exclude<TransferAccount, 'SAVINGS_GOAL' | 'TIME_DEPOSIT'>`). **Keep** `'TIME_DEPOSIT'` in the `TransferAccount` type and the `transferAccount` CHECK: old rows still use it, and the new `OPENING`/`ROLLOVER` rows use it too.
- Old untagged rows (`transferAccount === 'TIME_DEPOSIT' && !timeDepositId`) are untouched, so no number changes on upgrade. Transaction Options gets a **"Convert to time deposit"** action on them. It opens the deposit form pre-filled with the row's date and amount (`fundedFromCash: true`), and on save tags that existing row as `OPENING` instead of writing a new one.

### METRICS.md rows first (PROJECT.md rule)

Before any code, add these rows to "What each transaction counts toward" and a "Time deposits" shared rule:

| Kind | Cash Bal | Total Expense | Savings Rate | Budget | Burn Rate | Safe-to-Spend | Category | Net Worth |
|---|---|---|---|---|---|---|---|---|
| **Deposit opened** `TRANSFER_OUT`+deposit, `OPENING`/`ROLLOVER` | − | ✗ | ✗ counts as saved | ✗ | ✗ | − | ✗ | 0 (cash becomes deposit) |
| **Deposit returned** `TRANSFER_IN`+deposit, `MATURITY` | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | 0 |
| **Deposit interest** `INCOME`+deposit, `INTEREST` | + | — | ✓ income | — | — | + | ✓ income | + |
| **Pre-termination loss** `EXPENSE`+deposit, `PENALTY` | − | ✓ | ✓ spent | ✗ | ✗ (one-off) | ✓ spent, ✗ allowance | ✓ | − |

Net Worth formula: `assets = cash + investments (market value + active time-deposit principal) + goals`. Runway and Safe-to-Spend stay **cash-only**, because deposits are illiquid. State that in the shared rule.

---

## Phase 1 — Core: schema, service, Net Worth, Holdings, create/edit/delete

### Schema & types
- [databaseSchema.ts](../../src/services/database/databaseSchema.ts): add `CREATE TABLE IF NOT EXISTS time_deposits`, modeled on `debts`. Encrypt TEXT `name`, `principal` and `notes`; plaintext for rates, dates, status. Add indexes on `status` and `maturityDate`. The table needs no migration (same reason given in the `migrateToVersion17` comment, [databaseSchema.ts:615](../../src/services/database/databaseSchema.ts:615)).
- Add `timeDepositId TEXT` to the `transactions` CREATE (fresh installs). Add `migrateToVersion19` as a plain `ALTER TABLE transactions ADD COLUMN timeDepositId TEXT`. **No table rebuild:** `'TIME_DEPOSIT'` is already in the CHECK, and a column with no default can be added in place. Swallow only the "duplicate column name" error, as `addColumnWithBackfill` ([databaseSchema.ts:299](../../src/services/database/databaseSchema.ts:299)) does. Bump `DATABASE_VERSION` to 19 ([databaseSchema.ts:7](../../src/services/database/databaseSchema.ts:7)) and wire it after Accounts' `migrateToVersion18` in [databaseService.ts](../../src/services/database/databaseService.ts). If Accounts' version number changes, this one moves with it.
- [transactionService.ts](../../src/services/domain/transactionService.ts): add `timeDepositId` to both INSERT queries (lines 17 and 26), the values array (line 56) and the row mapper (line 258).
- [types/index.ts](../../src/types/index.ts): `timeDepositId?: string` on `Transaction`; `TimeDeposit` and `TimeDepositStatus` from Phase 0. `TransferAccount` unchanged.

### Domain service & metrics
- `src/services/domain/timeDepositService.ts` (new): mirror [savingsGoalService.ts](../../src/services/domain/savingsGoalService.ts). Covers `save`, `getAll` (decrypt, then sort in JS), `delete` (tombstone via `upsertTombstone('time_deposits', id)`) and `bulkSave`. Actions:
  - `openDeposit(deposit, fundedFromCash, fundingAccountId)`: saves the deposit with `fundingAccountId`, plus an `OPENING` transfer from that account if funded from cash.
  - `convertLegacyTransfer(deposit, existingTx)`: saves the deposit and tags `existingTx` as `OPENING`. The deposit's `fundingAccountId` is copied from the row's own `accountId`.
  - `withdrawAtMaturity(deposit, netInterest, toAccountId)`: writes `MATURITY` and `INTEREST` into `toAccountId`, sets `status = 'MATURED'` and `closedAt`.
  - `rollOver(old, newDeposit, netInterest, includeInterest, toAccountId)`: closes the old deposit like a withdrawal into `toAccountId`, then opens the new one with `rolledFromId` and a `ROLLOVER` transfer of principal (or principal + net interest) out of that same account. The new deposit's `fundingAccountId` = `toAccountId`.
  - `preterminate(deposit, amountReceived, toAccountId)`: applies the Phase 0 pre-termination rule, with every row on `toAccountId`.
  - `deleteDeposit(deposit, mode)`: see edge cases.
  - Write each action's rows in one DB transaction, so a partial failure can't leave cash and deposit status disagreeing. Every action ends by calling `syncMaturityNotifications` (Phase 2).
- `src/utils/timeDepositMetrics.ts` (new): `getDepositBalance(d, asOf?)`, `isActiveAsOf(d, asOf)`, `estimateInterest(d)` (returns `{ gross, tax, net }` on a 365-day basis), `isMatured(d, today)` and `daysToMaturity`.
- [snapshotMetrics.ts:81](../../src/utils/snapshotMetrics.ts:81) `calculateNetWorth`: add a `deposits: TimeDeposit[]` parameter, summed with `isActiveAsOf` so past month-ends are right. Keep a separate `timeDeposits` field on `NetWorthBreakdown` (for explanations and AI), but the Snapshot "Investments" row shows `investments + timeDeposits`. Thread it through `calculateNetWorthChange` and its single caller, [HomeScreen.tsx:121](../../src/screens/HomeScreen.tsx:121).
- [financialMetrics.ts:80](../../src/utils/financialMetrics.ts:80) `isBurnRateBase`: also exclude `PENALTY` rows (`!(t.timeDepositId && t.subCategory === 'PENALTY')`). No other metric filter needs a change. Opening and maturity rows are plain transfers and interest is plain income, which existing rules already handle the way the table above says. Verify each column against the code anyway.

### UI (Holdings tab)
- New `HoldingsSectionId` `'deposits'` ([storageService.ts:237](../../src/services/core/storageService.ts:237)), appended to `DEFAULT_HOLDINGS_ORDER`. `normalizeHoldingsOrder` already appends missing ids, so saved orders upgrade safely. Add its label in `HomeSettingsSheet`.
- "Time deposits" section in [HoldingsTab.tsx](../../src/components/home/HoldingsTab.tsx): active rows with name, principal, "Matures 15 Mar 2027 · in 42 days" or a "Matured" badge, and estimated net interest. Then "Add time deposit", a collapsed "Closed" list, and an empty state when none exist.
- **Holdings hero total includes active deposit principal.** Gain/loss and return % stay securities-only (confirmed with the user). A deposit's return shows up as its `INTEREST` `INCOME` at maturity: it counts in Income, Savings Rate and Net Worth, and the closed deposit's row shows "Earned ₱X interest". Label the hero breakdown so the difference is visible (e.g. "Securities ₱X · Time deposits ₱Y").
- Allocation chart ([AllocationChart.tsx](../../src/components/investments/AllocationChart.tsx)): each active deposit is one holding with **Type: "Time deposit"** and **Sector: "Fixed income"**. Both are set automatically, since deposits never go through the Asset Dictionary.
  - **Assets** view: its own box, labelled with the deposit name, in a **neutral** colour, not the gain/loss green/red (0% would otherwise render as light green). It shows the rate ("6.25% p.a.") where other boxes show return %.
  - **Sector** view: adds to the "Fixed income" box. Bonds the user tags "Fixed income" in the Asset Dictionary share it.
  - **Type** view: adds to a "Time deposit" box, kept separate from Bonds (no market price, guaranteed principal).
  - Weights use the same total (securities market value + deposit principal) in all three views.
- `src/components/timeDeposits/TimeDepositForm.tsx` (new): name, principal, rate, tax rate (default 20), start date, term and maturity date.
  - **Term:** quick-pick chips for **1, 3, 6, 12, 24, 36 months** (labelled "1 mo", "3 mo", "6 mo", "1 yr", "2 yrs", "3 yrs"; stored as `termMonths`), plus **Custom**. Custom shows a number field with a months / days switch (default months), for banks that quote 30/60/90/180/360-day terms (`termDays`). There's no years unit: years are stored as months.
  - **Maturity date:** auto-filled from start date + term and editable, since the bank's date wins. Editing it by hand deselects the chip and shows "Custom".
  - Re-deposit pre-fills the same chip as the old deposit.
  - **Cash flow section**, copying [InvestmentForm.tsx:713](../../src/components/investments/InvestmentForm.tsx:713) exactly. It has a "Cash flow" `SectionHeader` and a "Record a transaction" `Row` with an info icon and a `Switch`, which sets `fundedFromCash`.
    - Subtitle: "Will record as Transfer Out (cash out)" when on, "No transaction will be recorded" when off.
    - **Default on.** It defaults to off when the start date is before the user's first recorded transaction (an existing deposit).
    - Turning it off shows the same warning as investments: "This will not deduct from your cash."
    - The info icon opens a "Syncing Your Cash Flow" sheet that reuses the investment one's cash ⇄ deposit flow diagram.
    - When editing, the switch is disabled, and the subtitle reads "Auto-updated with deposit changes".
  - **Funded from:** the Accounts `AccountPicker`, shown under the Cash flow switch while it's on. Cash on hand is pre-selected. Hidden when the switch is off, since there's no `OPENING` row. While editing it's locked, like the switch; to move a deposit's funding to another account, delete and re-add it. Only profile-currency accounts are listed (deposits are profile currency in v1).
  - Show the estimated net interest live under the rate fields.
  - **Notes:** an optional multi-line field at the bottom, the same style as InvestmentForm's notes, for things like account number hints, the branch, or "auto-renews". It's saved to `notes` (encrypted), stays editable after the deposit closes, and shows in the deposit's Options modal under its details. It isn't copied into the `OPENING` transaction's note, and it's carried over to the new deposit on Re-deposit.
- **Record menu entry:** add a "Time deposit" item (`lock-closed-outline`, free now that the "Locked" chip is removed) to the Investment section of [RecordMenuModal.tsx:139](../../src/components/record/RecordMenuModal.tsx:139), after Commodities. It skips the Asset Dictionary check that `handleInvestmentSelect` does (deposits have no symbol). Add an `onSelectTimeDeposit` prop, wired in [RecordScreen.tsx:384](../../src/screens/RecordScreen.tsx:384), that renders `TimeDepositForm` the same way `handleDebtSelect` renders `DebtForm` (line 181). The Holdings "Add time deposit" row opens the same form.
- `src/components/timeDeposits/TimeDepositOptionsModal.tsx` (new): same gear-menu convention as `SavingsGoalOptionsModal`. Edit and Delete on top, then action cards: Withdraw (if matured), Re-deposit (if matured), Pre-terminate (if active).
- Transfer form: nothing to do. Accounts already removed every destination chip, "Locked" included. Old `TIME_DEPOSIT` rows keep their label through the label map Accounts moved to `src/constants/accounts.ts`.
- [TransactionOptionsModal.tsx](../../src/components/transaction/TransactionOptionsModal.tsx): add "Convert to time deposit" for legacy untagged `TIME_DEPOSIT` rows.
- History and Ledger locking: tagged deposit rows are **not tappable for edit or delete** (extend `isLocked` in [HistoryListItem.tsx:217](../../src/components/history/HistoryListItem.tsx:217) and the gate in [LedgerTab.tsx:115](../../src/components/home/LedgerTab.tsx:115)). Deleting an `OPENING` row by hand would bring the cash back while the deposit still counts, inflating Net Worth. Changes go through the deposit's Options.

**Phase 1 done when:**
- A deposit funded from cash makes cash drop by the principal while Net Worth stays flat; the Holdings total and the Snapshot Investments row rise by the principal.
- A deposit saved with the Cash flow switch off leaves cash unchanged and raises Net Worth by the principal.
- A deposit funded from BDO lowers BDO's balance only; other accounts are unchanged.
- Last month's sparkline point includes a deposit that started before that month-end and excludes one that started after.
- Tagged rows can't be edited or deleted from History or Ledger.
- "Locked" is gone from the Transfer form.
- Converting a legacy "Locked" row raises Net Worth by its amount without adding a second transfer.

---

## Phase 2 — Maturity: sheet, re-deposit, pre-terminate, notifications

### On-open sheet
- `src/components/timeDeposits/MaturityCatchupModal.tsx` (new): same structure as [ReminderCatchupModal.tsx](../../src/components/reminders/ReminderCatchupModal.tsx) (a `Group` + `FlatList` of `Row`s and a footer). Each row shows the deposit, principal, maturity date and an **editable net interest** field pre-filled from the 365-day estimate, with actions:
  - **Withdraw:** `withdrawAtMaturity` with the typed interest, into the row's **Withdraw to** account. That's a compact account chip on the row, pre-selected to the deposit's funding account (or Cash on hand), and tapping it opens the picker.
  - **Re-deposit:** opens `TimeDepositForm` pre-filled with the same name, rate, tax and term, start = old maturity date, the typed interest, and a toggle "Include interest in new principal". On save, `rollOver`.
  - **Later:** hides the deposit until the next calendar day. Store `{ [depositId]: 'YYYY-MM-DD' }` in AsyncStorage (device-local UI state, like the backup-reminder date; not synced or backed up).
- Footer: "Withdraw all (n)" when more than one is listed, like "Complete all" in Reminder Catch-up. It uses each row's current interest value and Withdraw to account.
- Re-deposit's form shows the same Withdraw to chip, labelled "Interest to" when "Include interest in new principal" is off. That's where the interest lands, and it's the account the roll-over rows run through.
- [App.tsx:149](../../App.tsx:149) `checkBackupsAndReminders`: after the reminders check, load deposits where `status === 'ACTIVE' && maturityDate <= today` and not snoozed for today. Only one sheet shows at a time: if reminders are pending, show them first, then check deposits from that sheet's `onClose`. Mount a second `BottomModal` next to Reminder Catch-up ([App.tsx:208](../../App.tsx:208)). Only run when unlocked, as reminders do.

### Pre-terminate (from Options, not the sheet)
- One input, "Total amount received", pre-filled with the principal, plus a **Received into** account picker, pre-selected to the funding account. Below it, a live preview of what will be recorded: "₱X interest" or "₱Y loss recorded as an expense". Then `preterminate`.

### Push notification on maturity date
- `syncMaturityNotifications(deposits)` in `timeDepositService.ts`:
  1. Cancel every scheduled notification with `content.data.type === 'TIME_DEPOSIT'`, using the same scan-and-cancel approach as `cancelReminderNotifications` ([reminderService.ts:279](../../src/services/domain/reminderService.ts:279)).
  2. Schedule one date-trigger notification per `ACTIVE` deposit whose maturity date is in the future, at **9:00 local time on `maturityDate`**, with `data: { type: 'TIME_DEPOSIT', depositId }`.
  - Idempotent, so it's safe to call anywhere.
- Call it after every deposit action, on app launch, after Restore, after sync merges, and from Clear Data (deposits are empty, so it only cancels).
- **Body text never includes amounts or the bank name** (lock-screen privacy): "A time deposit has matured. Open WealthSnap to withdraw or re-deposit." Tapping it opens the app, and the on-open sheet does the rest. No new notification category or action buttons are needed.
- Uses the existing permission flow (`requestPermissions` in `notificationService`). If permission is denied, the on-open sheet still works.

**Phase 2 done when:**
- A deposit whose maturity date has passed shows in the sheet on the next app open, but not while the PIN lock is up.
- Editing the interest before Withdraw records the edited amount.
- Withdraw raises cash by principal + net interest. Net Worth rises by net interest only, and the deposit moves to "Closed".
- Re-deposit with interest included: cash unchanged, new deposit principal = old + net interest, `rolledFromId` set.
- Re-deposit without interest: cash rises by net interest only.
- Later hides it until tomorrow, then it reappears.
- Pre-terminate with received < principal writes a `PENALTY` expense of the difference; received > principal writes interest; received = principal writes neither.
- A notification fires at 9:00 on the maturity date. Editing the maturity date moves it, and closing or deleting the deposit cancels it.
- With both a pending reminder and a matured deposit, the two sheets show one after the other, never stacked.

---

## Phase 3 — History, Ledger & Monthly Summary display

- History and Ledger: build a `timeDepositNameMap` next to the goal name map. `getDisplayName` shows "To BPI 6-mo TD", "From BPI 6-mo TD (matured)", "Interest · BPI 6-mo TD", "Pre-termination loss · BPI 6-mo TD", and "Deleted deposit" when the name is missing.
- [monthlySummaryBuilder.ts](../../src/utils/monthlySummaryBuilder.ts): add a `--- Time Deposits ---` section shaped like the Savings Goals block (line 247): opened, matured, interest earned and losses this month. Extend the generic Transfers exclusion at line 290 with `&& !t.timeDepositId` so deposit transfers aren't listed twice. Finished months only change via Reprocess (METRICS.md); note this in the release notes.

**Phase 3 done when:** History names every deposit row, and the Monthly Summary has a Time Deposits section whose amounts don't also appear under Transfers.

---

## Phase 4 — AI context

- [financialSnapshotBuilder.ts](../../src/utils/financialSnapshotBuilder.ts): add a `timeDeposits` list (name, principal, rate, tax rate, maturity date, days left, estimated net interest) next to `savingsGoals` (line 145). Add one explanatory line: deposits are illiquid investments; opening and maturity transfers are not spending or income; interest is recorded net of tax at maturity.

**Phase 4 done when:** Chat can answer "when does my BPI deposit mature and how much will I get?", and doesn't count a maturity `TRANSFER_IN` as income.

---

## Phase 5 — Backup / Export / Sync / Clear-data

- [backupEntities.ts](../../src/services/integrations/backupEntities.ts): add a `timeDeposits` registry entry (mirroring `savingsGoals`, line 31). Add `{ field: 'timeDepositId', refEntity: 'timeDeposits' }` to the transactions `fkFields` (line 44), `{ field: 'fundingAccountId', refEntity: 'accounts' }` on the deposit entry (placed after `accounts` in the registry), and a self-reference FK for `rolledFromId`. Check the registry supports an entity referencing itself; if not, remap it after insert.
- [syncEntities.ts:34](../../src/services/integrations/syncEntities.ts:34): add a `SYNC_ENTITY_REGISTRY` entry.
- [exportService.ts](../../src/services/integrations/exportService.ts): a "Time Deposits" sheet and a "Deposit Transactions" sheet, mirroring the goal pair (lines 114 and 128).
- [storageService.ts:688](../../src/services/core/storageService.ts:688) `clearAllData`: add `DELETE FROM time_deposits;` and clear the "Later" AsyncStorage key.
- After Restore, sync merge and Clear Data, call `syncMaturityNotifications`.
- `backupService.ts` `remapRecurrenceTemplateFks`: **no change.** Deposits create no recurrence rules.

**Phase 5 done when:**
- Backup → Clear Data → Restore brings back deposits, their tagged rows (FKs remapped), roll-over chains, and the maturity notifications.
- Export has the two new sheets.
- A two-device sync conflict on a deposit resolves the way a goal conflict does.
- Clear Data leaves no scheduled deposit notifications.

---

## Phase 6 — Docs & explanations (same change as the code, per PROJECT.md)

- [METRICS.md](../METRICS.md): the Phase 0 rows. Net Worth's Formula line plus an `Unreleased` history row. Update the Investments definition (market value + active deposit principal). Add `time_deposits` to "Where the numbers come from", and a note that Runway and Safe-to-Spend exclude deposits.
- [helpContent.ts](../../src/constants/helpContent.ts): Net Worth and Investments wording in Math & Formulas and the Home Snapshot guide, plus a short Time Deposits guide (interest at maturity, 365-day estimate you can edit, tax, re-deposit, pre-termination loss). Grep for every "Net Worth =" or portfolio-total explanation in the `*InfoModal` / `*HelpModal` / "How is this calculated?" sheets and update them.
- [CAPABILITIES.md](../CAPABILITIES.md), [MODULES.md](../MODULES.md) (new files under `src/components/timeDeposits/`, service and metrics files), and the release notes per the versioning doc.

---

## Edge cases

**Creation**
- **Start date in the past, not yet matured** (e.g. a 9-month deposit opened 6 months ago): the start date is editable and defaults to today. Maturity is computed from the past start date (3 months from now), and its notification is scheduled. Interest is estimated over the full start → maturity period. The Cash flow switch **defaults to off** when the start date is before the user's first recorded transaction. Turning it on back-dates the `OPENING` transfer, which lowers cash in past months too, so it's only right if that cash was already tracked then. Either way, past Net Worth points from `startDate` onward now include the deposit.
- **Start date in the past, already matured:** saving makes it show in the maturity sheet immediately (check again after save). No notification is scheduled, since its date has passed.
- **Start date in the future:** allowed. Future-dated rows count for cash immediately (METRICS shared rule), so the `OPENING` transfer (dated `startDate`) lowers cash now. To match, "now" Net Worth counts any `ACTIVE` deposit regardless of start date; past month-ends use `startDate`. Cash and deposit move together, and Net Worth stays flat.
- **Maturity date before start date, zero or negative principal, rate > 100%, tax rate outside 0–100:** form validation via an in-app alert, never `alert()`.
- **`fundedFromCash` but the funding account would go negative:** warn, allow (same as other transfers).
- **Funding from a non-spendable account** (e.g. an emergency fund): Safe-to-Spend and Runway don't change, since that money was already excluded. Withdrawing into a spendable account doesn't raise Safe-to-Spend either, because no `TRANSFER_IN` does (Accounts rules).

**Accounts**
- **Funding account archived:** Withdraw to still pre-selects it, since banks often return a deposit to the account it came from. The picker shows it with an "Archived" tag, so the user can switch if that account is closed.
- **Funding account deleted:** Accounts moves its rows to Cash on hand. `fundingAccountId` points nowhere, so Withdraw to falls back to Cash on hand. The `OPENING` row already moved with the rest.
- **Withdrawing to a different account than the funding one:** allowed, nothing special. The two accounts' balances just reflect where the money went.
- **Foreign-currency accounts:** not offered in either picker in v1, since deposits are profile currency.
- **Term in months landing on a non-existent day** (31 Jan + 1 month): clamp to the month end, and let the user edit the maturity date because the bank's date wins.

**While active**
- **Editing principal or start date** of a cash-funded deposit: update its `OPENING` row's amount and date in the same DB transaction. The Cash flow switch is locked after creation, as on investments. To change it, delete the deposit and re-add it.
- **Editing the maturity date:** reschedules the notification (via `syncMaturityNotifications`). A date moved into the past makes it show in the sheet.
- **Editing after it's closed:** only name and notes are editable. Amounts are locked because interest and maturity rows already reflect them.
- **Editing the rate or tax on an active deposit:** fine. Only the estimate changes.
- **Manual delete of a tagged row:** blocked (Phase 1 locking). Otherwise Net Worth and cash would drift apart.
- **Converting a legacy "Locked" row that was later "returned"** with a plain `TRANSFER_IN`: the app can't pair them automatically. The convert form warns "If this deposit already matured, mark it closed after converting", and Withdraw then records the return. The user should delete the old plain `TRANSFER_IN` to avoid counting it twice. Call this out in the form.

**Maturity**
- **Matured but the user keeps tapping Later:** the deposit stays `ACTIVE` and keeps counting its principal, which is correct because the money is still at the bank. Interest isn't counted until confirmed. The Holdings row shows a "Matured" badge, and the sheet reappears the next day.
- **The bank auto-rolled over before the user opened the app:** the user picks Re-deposit with start = old maturity date. Dates line up and history stays correct.
- **Credited amount differs from the estimate:** the user edits it in the sheet; only the typed amount is recorded.
- **Net interest of 0** (0% promo or fully forfeited): skip the `INCOME` row rather than writing ₱0.
- **Several matured at once:** one sheet lists all of them, with "Withdraw all (n)".
- **App opened while PIN-locked:** no sheet until unlocked.
- **Reminder sheet open at the same time:** queue it; never stack two `BottomModal`s.
- **"Later" on one device, not another:** the snooze is device-local by design, so the other device still shows the sheet.

**Notifications**
- **Permission denied:** nothing is scheduled; the on-open sheet still covers it.
- **Device timezone change:** the trigger is scheduled at local 9:00; `syncMaturityNotifications` on launch reschedules to the new local time.
- **App reinstalled or restored on a new phone:** notifications are rebuilt from data on launch and after Restore, never assumed to exist.
- **Two deposits maturing the same day:** two notifications with the same generic text. Acceptable; optionally collapse to "2 time deposits have matured" by scheduling per date instead of per deposit.
- **Lock-screen privacy:** no amounts or bank names in the notification body.

**Delete**
- **Delete an active deposit** (an entry mistake): confirm modal. Removes the deposit **and** its `OPENING` row, so cash comes back and Net Worth is as if it never existed. Cancels its notification. Tombstone for sync. A converted legacy row is untagged back to a plain "Locked" transfer instead of deleted.
- **Delete a closed deposit:** confirm modal with a choice: "Remove from list only" (keep its rows, labelled "Deleted deposit" in History, which keeps past cash and income correct) or "Delete with its transactions" (also removes the maturity, interest and loss rows, so past months change).
- **Delete a deposit that's part of a roll-over chain:** the successor keeps a dangling `rolledFromId`. Display code must treat a missing parent as "no parent" and not crash.

**Pre-termination**
- **Received exactly the principal:** only the `MATURITY` row; no interest, no expense.
- **Received less than the principal:** `MATURITY` (full principal) + `PENALTY` `EXPENSE` for the shortfall. Excluded from Burn Rate, included in Total Expense and Savings Rate.
- **Pre-terminating a deposit with a future start date:** block it. Delete instead.

**Data, sync, metrics**
- **Existing "Locked" rows after upgrade:** no change to any number. The enum stays, and conversion is opt-in per row.
- **Restore of a pre-v18 backup:** has no `timeDeposits` key and no `timeDepositId`, so it imports as before.
- **Restore of a v18 backup on an older app version:** unknown key ignored. Existing behavior for unknown registry keys; verify.
- **Currency:** deposits are in profile currency for v1, same as goals. The `currency` column is stored for later but not used in math.
- **Holdings return %:** stays securities-only; deposits are added to the total, not to gain/loss, so a big deposit doesn't dilute the portfolio's return figure.
- **Runway / Safe-to-Spend:** deposits are excluded (illiquid). Opening a deposit lowers both, which is intended. Document it in the help text so it doesn't look like a bug.
- **Monthly Summary for months already finished:** not recomputed until Reprocess.

---

## Verification

- After each phase: `npx tsc --noEmit` and the lint command.
- Visually verify every new screen and sheet on a phone-width emulator in light and dark mode, including the Holdings hero breakdown. Typecheck alone isn't enough for UI.
- Notifications need a real-device check: set a deposit's maturity to today, with the device clock just before 9:00, or temporarily use a near-future trigger in dev.
- Before Phase 2, do a real-device walkthrough of the Phase 1 "done when" list. Phase 2's roll-over math assumes the opening and Net Worth plumbing is right.
- Flag anything not device-tested in TODO.md until it gets a real pass.
