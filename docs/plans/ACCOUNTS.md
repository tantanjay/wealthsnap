# Accounts — Implementation Plan

## Context

WealthSnap tracks cash as one pool. `calculateBalance` ([financialMetrics.ts:35](../../src/utils/financialMetrics.ts:35)) sums every transaction, and nothing records *where* the money sits. A user with BDO, Security Bank, GCash, Maya and a wallet can't see each balance, or choose which one an expense came out of.

The Transfer form's "Account", "E-Wallet" and "ATM/Cash" chips ([TransferForm.tsx:28](../../src/components/transaction/TransferForm.tsx:28)) look like they cover this, but they write a plain `TRANSFER_OUT`. Per the "Plain transfer out" row in [METRICS.md](../METRICS.md#what-each-transaction-counts-toward), moving ₱5,000 from BDO to GCash today **lowers Net Worth** as if the money left.

This plan adds **Accounts**: named places cash lives (Bank, E-Wallet, Cash), each in its own currency. Every cash transaction belongs to one. Moving money between them is a balance-neutral transfer, shown as one Ledger row.

**Decisions made with the user:**
- **Account kinds for v1: Bank, E-Wallet, Cash.** Credit cards come later as a fourth kind (see [Later — Credit cards](#later--credit-cards)). The schema reserves room for that kind now, so cards need no schema change later.
- **Default account "Cash on hand"**, renamable, with an editable icon. All existing transactions belong to it, so no number changes on upgrade. Every form pre-selects it; picking another account is optional.
- **A new Home tab, "Accounts"**, lists every account with its balance.
- **The Snapshot "Cash" row expands and collapses** to list each account under it, instead of navigating. The children follow the Overall / Monthly switch, the same as the Cash row: each account's balance in Overall, and its net change this month in Monthly.
- **The Transfer form becomes two modes.** "Between my accounts" is the default. **"Send / Receive"** is a plain transfer out of or into an account, for money leaving or entering your tracked accounts without being income or spending (it only balances cash flow). The destination chips (Account, Invest, Debt, ATM/Cash, E-Wallet, Crypto, Lent) are removed from the form; Investments, Loans and Goals each have their own forms for that.
- **Moving money between your own accounts = `TRANSFER_OUT` + `TRANSFER_IN`**, linked by `linkedTransactionId`. Cash, Net Worth and every metric stay unchanged; only the two account balances move.
- **Transfer fees are an `EXPENSE` from the source account**, folded into the same Ledger row as the transfer, like debt fee legs.
- **One Ledger row per transfer.** The `TRANSFER_IN` and fee legs are folded into the `TRANSFER_OUT`, the same way goal spends and debt legs are folded today ([historyFeed.ts:51](../../src/utils/historyFeed.ts:51)).
- **Opening balance uses a "Cash flow" switch**, copying the Investment form's ([InvestmentForm.tsx:713](../../src/components/investments/InvestmentForm.tsx:713)):
  - **On** (money already tracked): an account transfer from Cash on hand. Total cash is unchanged.
  - **Off** (money new to the app): one `TRANSFER_IN`. It raises cash and Net Worth but is **not income**.
- **Old "Account" / "E-Wallet" / "ATM/Cash" transfer rows are left alone.** There's no conversion. Users fix their totals by creating the account with Cash flow off, which raises Net Worth back by the opening balance.
- **Adjust balance:** the user enters the real balance and picks how to record the difference:
  - **Lower** than the app's: **Expense** (counted as spending, Burn Rate included) or **Transfer out** (just gone: lowers cash and Net Worth, not counted as spending).
  - **Higher:** **Income** (counted as income) or **Transfer in** (just appears: raises cash and Net Worth, not income).
- **Deleting an account moves its transactions to Cash on hand.** Nothing is deleted with it.
- **Account detail page:** balance, a balance-over-time chart like the Net Worth chart, and the account's transactions.
- **"Count as spendable money" switch per account, default on.** Off excludes the account from Safe-to-Spend and Runway (e.g. an emergency-fund bank account):
  - Safe-to-Spend and Runway ignore every row in a non-spendable account.
  - A transfer *into* one lowers Safe-to-Spend: money set aside, like a goal contribution.
  - A transfer *out of* one doesn't raise it, since no `TRANSFER_IN` ever does.
  - An expense paid from one doesn't lower Safe-to-Spend, matching goal-funded purchases.
- **Foreign-currency accounts are in scope** (e.g. a USD savings account). Cash on hand is always in the profile currency.
  - Spending and income are fixed at the transaction day's rate.
  - Balances, Cash and Net Worth follow the latest rate, so a rate change moves Net Worth but never spending.
- **Credit cards** come later, after Bank/E-Wallet ships.

---

## Phase 0 — Decisions locked before code starts

### Schema shape

```ts
export type AccountKind = 'BANK' | 'EWALLET' | 'CASH';   // 'CREDIT_CARD' added in the later phase

export interface Account {
    id: string;
    name: string;              // "BDO Savings", "GCash"
    kind: AccountKind;
    currency: string;          // ISO code; defaults to the profile currency
    icon?: string;             // Ionicons name, defaults per kind
    color?: string;
    isSpendable: boolean;      // counts toward Safe-to-Spend and Runway; default true
    sortOrder: number;
    isArchived: boolean;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}
```

**Cash on hand is a real row with a fixed id (`CASH_ON_HAND_ID = 'cash-on-hand'`), but transactions point to it with `accountId = NULL`.**
- **The fixed row** holds its name and icon so they can be renamed. They're synced and backed up like any account. A fixed id means two synced devices merge it as one row instead of creating two. The migration inserts it with `INSERT OR IGNORE`.
- **NULL in transactions** means no backfill migration. Existing rows, recurrence templates (JSON), backups and CSV imports already have no `accountId`, so they land in Cash on hand as they are. The picker writes NULL, never the fixed id, for Cash on hand.
- **A missing account falls back to Cash on hand.** If an account is deleted on one device while another device adds a transaction to it, that transaction's `accountId` points nowhere. `resolveAccountId(t)` maps NULL and unknown ids to Cash on hand, so the money never vanishes from the totals.
- Cash on hand can't be deleted, archived or switched to non-spendable. Its currency is always the profile currency.

**An account's balance is derived, not stored**, the same as a goal's: `calculateBalance` over the transactions that resolve to that account. The overall cash balance still sums everything (plus foreign-currency revaluation, see Phase 3).

### Transaction kinds

`subCategory` marks the new kinds, rather than a new `transferAccount` value. Adding a value to the `transferAccount` CHECK would mean another table rebuild like [migrateToVersion17](../../src/services/database/databaseSchema.ts:622).

| subCategory | Rows | When |
|---|---|---|
| `ACCOUNT_TRANSFER` | `TRANSFER_OUT` (from) + `TRANSFER_IN` (to), IN's `linkedTransactionId` = OUT's id | Moving money between your own accounts, including opening an account with Cash flow on |
| `TRANSFER_FEE` | `EXPENSE`, category `Fees`, from the source account, `linkedTransactionId` = OUT's id | A fee entered on an account transfer |
| `OPENING_BALANCE` | One `TRANSFER_IN` into the account | Opening an account with Cash flow off |
| `BALANCE_ADJUSTMENT` | Down: `EXPENSE` (category `Balance adjustment`) **or** `TRANSFER_OUT`. Up: `INCOME` (category `Balance adjustment`) **or** `TRANSFER_IN` | Adjust balance |
| *(none)* | Plain `TRANSFER_OUT` / `TRANSFER_IN`, `transferAccount: 'OTHER_ACCOUNT'`, with `accountId` | Transfer form's Send / Receive mode. Same kind as today's plain transfers, so no new METRICS row |

Export the vocabulary from a new `src/constants/accounts.ts`, along with `CASH_ON_HAND_ID` and the default icon for each kind.

### METRICS.md rows first (PROJECT.md rule)

Add these to "What each transaction counts toward", plus an "Accounts" shared rule, before any code:

| Kind | Cash Bal | Total Expense | Savings Rate | Budget | Burn Rate | Safe-to-Spend | Category | Net Worth |
|---|---|---|---|---|---|---|---|---|
| **Account transfer** `TRANSFER_OUT` + `TRANSFER_IN`, `ACCOUNT_TRANSFER` | 0 (the two cancel) | ✗ | ✗ | ✗ | ✗ | 0⁴ | ✗ | 0 |
| **Transfer fee** `EXPENSE`, `TRANSFER_FEE` | − | ✓ | ✓ spent | ✓ (`Fees`) | ✓ | ✓ spent + allowance | ✓ | − |
| **Opening balance** `TRANSFER_IN`, `OPENING_BALANCE` | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | + |
| **Adjustment as expense** `EXPENSE`, `BALANCE_ADJUSTMENT` | − | ✓ | ✓ spent | ✓ if budgeted | ✓ 6M avg | ✓ spent + allowance | ✓ | − |
| **Adjustment as transfer out** `TRANSFER_OUT`, `BALANCE_ADJUSTMENT` | − | ✗ | ✗ | ✗ | ✗ | − | ✗ | − |
| **Adjustment as income** `INCOME`, `BALANCE_ADJUSTMENT` | + | — | ✓ income | — | — | + | ✓ income | + |
| **Adjustment as transfer in** `TRANSFER_IN`, `BALANCE_ADJUSTMENT` | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | + |
| **Any row in a non-spendable account** | as its kind | as its kind | as its kind | as its kind | as its kind | ✗⁵ | as its kind | as its kind |

⁴ Safe-to-Spend subtracts every `TRANSFER_OUT` ([financialMetrics.ts:371](../../src/utils/financialMetrics.ts:371)) and never adds a `TRANSFER_IN`, so an account transfer would **lower** it unless it's excluded. Exception: a transfer from a spendable into a non-spendable account counts as a transfer out (−), like a goal contribution.
⁵ Safe-to-Spend and Runway ignore every row in a non-spendable account. Runway's cash is the sum of spendable accounts only.

Shared rule text: *"An account transfer moves cash between your own accounts. Both legs are left out of every metric, including the Cash kept In/Out totals. Account balances are per-account sums of the same transactions."*

Other places that add up money in and money out separately and must skip `ACCOUNT_TRANSFER` (otherwise a ₱5,000 move inflates both In and Out by ₱5,000):
- Cash kept `moneyIn` / `moneyOut` ([snapshotMetrics.ts:232](../../src/utils/snapshotMetrics.ts:232), [:258](../../src/utils/snapshotMetrics.ts:258))
- Safe-to-Spend `transferOut` ([financialMetrics.ts:371](../../src/utils/financialMetrics.ts:371))
- Monthly Summary's generic Transfers list ([monthlySummaryBuilder.ts](../../src/utils/monthlySummaryBuilder.ts))
- Add one shared predicate, `isAccountTransfer(t)`, in `financialMetrics.ts`, and use it everywhere so a screen never re-implements the check.

Then grep every other `TRANSFER_IN` / `TRANSFER_OUT` filter in `src/utils/` and confirm it nets to zero for a pair, or exclude the pair.

---

## Phase 1 — Core: schema, service, Accounts tab, Transaction & Transfer forms

### Schema & types
- [databaseSchema.ts](../../src/services/database/databaseSchema.ts):
  - Add `CREATE TABLE IF NOT EXISTS accounts`, modeled on `debts`. Encrypt `name` and `notes` (bank names are sensitive); everything else stays plaintext.
  - Add `accountId TEXT`, `originalAmount TEXT` (encrypted, Phase 3) and `exchangeRate TEXT` (Phase 3) to the `transactions` CREATE, plus `idx_transactions_account`.
  - `migrateToVersion18`:
    - three plain `ALTER TABLE transactions ADD COLUMN`s plus the index; no rebuild and no backfill
    - `INSERT OR IGNORE` the Cash on hand row
    - swallow only "duplicate column name", as `addColumnWithBackfill` does
  - Bump `DATABASE_VERSION` and wire it after [databaseService.ts:62](../../src/services/database/databaseService.ts:62).
  - [Time Deposits](TIME_DEPOSITS.md) ships after this and takes v19.
- [transactionService.ts](../../src/services/domain/transactionService.ts): add the new columns to both INSERTs (lines 17, 26), `prepareTransactionValues` (line 41) and the row mapper (line 258).
- [types/index.ts](../../src/types/index.ts): `accountId?`, `originalAmount?: BigNumber`, `exchangeRate?: BigNumber` on `Transaction`; `Account`, `AccountKind`. `RecurrenceRule.transactionTemplate` picks up `accountId` automatically, since it's `Omit<Transaction, …>`.

### Domain service & metrics
- `src/services/domain/accountService.ts` (new), mirroring [savingsGoalService.ts](../../src/services/domain/savingsGoalService.ts): `save`, `getAll` (decrypt, sort by `sortOrder`), `bulkSave`, `archive`, `delete`. Actions, each writing its rows in **one DB transaction**:
  - `transferBetweenAccounts({ fromId, toId, amount, fee?, date, note })`: writes the OUT leg, the IN leg and (if `fee > 0`) the `TRANSFER_FEE` expense from the source. Both children link to OUT.
  - `updateAccountTransfer(outTxn, changes)`: updates every leg together. Setting the fee to 0 deletes the fee row; adding one creates it.
  - `openAccount(account, openingAmount, cashFlowOn)`: an `ACCOUNT_TRANSFER` from Cash on hand (on) or an `OPENING_BALANCE` (off). No row when the amount is 0.
  - `adjustBalance(account, actualBalance, mode)`: writes the difference per the chosen mode. It writes nothing when the difference is 0.
  - `deleteAccount(account)`, which:
    - sets `accountId = NULL` and bumps `updatedAt` on its transactions, so sync sends them
    - deletes `ACCOUNT_TRANSFER` pairs that now go Cash on hand → Cash on hand, but keeps their fee expenses (unlinking them) — they net to zero and would only show as clutter
    - nulls `accountId` in recurrence templates
    - deletes the row and tombstones it
- [transactionService.ts:297](../../src/services/domain/transactionService.ts:297) `deleteTransaction`, two fixes:
  - **The cascade only runs parent → child.** Deleting an IN or fee leg directly (reachable from search) would orphan the OUT leg and make cash drift. For `ACCOUNT_TRANSFER` / `TRANSFER_FEE` rows, resolve to the parent and delete the whole group. Mirror this in [dataCache.ts:108](../../src/services/core/dataCache.ts:108).
  - Every linked child is already tombstoned (fixed separately for debt payments with both interest and fee legs), so a transfer with a fee needs no extra work there.
- `src/utils/accountMetrics.ts` (new):
  - `resolveAccountId(t, accounts)`.
  - `calculateAccountBalances(transactions, accounts, asOf?)` returns a balance per account in the account's own currency, reusing `calculateBalance`'s sign rules.
  - `getAccountBalanceHistory(account, transactions, months)` returns month-end points for the detail chart.
  - `getSpendableCash(...)`: the sum of spendable accounts, for Runway.
- `financialMetrics.ts`: `isAccountTransfer(t)`, the Phase 0 exclusions, and the spendable rule (footnotes ⁴ and ⁵). `calculateMonthSafeToSpend` and Runway take the account list so they can tell which rows are spendable. Pass the accounts in rather than reading storage inside the metric function.

### UI — Accounts tab
- New `HomeTab` `'accounts'`, placed after Snapshot in `TABS` ([HomeScreen.tsx:44](../../src/screens/HomeScreen.tsx:44)). **Check that six tabs fit at phone width** without the underline tabs clipping. If they don't, follow DESIGN.md's guidance or raise it.
- `src/components/home/AccountsTab.tsx` (new):
  - a hero showing total cash, with a "Spendable ₱X" subline when any account isn't spendable
  - one row per account: icon, name, kind, balance in its own currency, plus "≈ ₱X" for foreign accounts
  - "Add account", and a collapsed "Archived" list
  - with only Cash on hand: an empty-state card under its row explaining accounts, with an "Add account" primary button
  - match `GoalsTab` / `HoldingsTab` spacing and hero treatment (CLAUDE.md sibling rule)
  - respects Discreet mode via `usePrivacyFormat`
### UI — Snapshot Cash row
- **While the user has accounts besides Cash on hand**, tapping the Cash row ([SnapshotView.tsx:75](../../src/components/home/SnapshotView.tsx:75)) expands or collapses a nested list of accounts instead of navigating via `ROW_DESTINATION.cash`. A chevron shows the state. With only Cash on hand there's nothing to expand, so the row keeps today's tap → Ledger.
- **Expanded or collapsed state persists** across app restarts, saved with the other Home settings in `storageService` (AsyncStorage, device-local, not synced). Default collapsed. It's one value for the row, shared by Overall and Monthly. Reads and writes are wrapped so a storage failure just falls back to collapsed.
- **Each child row follows the period switch:**
  - **Overall:** the account's balance; foreign accounts add "≈ ₱X".
  - **Monthly:** the account's net change this month (every row in that account, account transfers included), with "In ₱X · Out ₱Y" as the subtitle.
  - In both periods the children add up to the parent's value. The pairs cancel across accounts, so the Monthly children sum to Monthly net. The Overall sum includes FX revaluation.
- **Discreet mode:** in Overall, each child shows its share of total cash ("32%"); in Monthly, its change as a percent of its start-of-month balance. This mirrors the parent switching to percentages.
- Order follows `sortOrder`. Archived accounts are listed only while their balance isn't zero. Non-spendable accounts carry a small marker so the parent's Runway context is explainable.
- Tapping a child opens that account's detail page. The Accounts tab stays reachable from the tab bar.
- Nested rows inside a Snapshot row aren't covered by [DESIGN.md](../DESIGN.md) today. **Propose the indent, type size and divider treatment there before building**, rather than inventing them in the component.

### UI — Account management
- `src/components/accounts/AccountForm.tsx` (new):
  - Name, kind chip (Bank / E-Wallet / Cash), currency (defaults to the profile currency; reuse the currency picker from the investment/profile forms), icon and colour, "Count as spendable money" `Switch` (default on, with a one-line explanation), and notes.
  - **Opening balance** with a **Cash flow** section copying [InvestmentForm.tsx:713](../../src/components/investments/InvestmentForm.tsx:713) exactly: a "Cash flow" `SectionHeader` and a "Move from Cash on hand" `Row` with an info icon and a `Switch`.
    - Subtitle: "Will transfer ₱X from Cash on hand" when on, "Adds ₱X as new money (not income)" when off.
    - **Default on.** For a foreign-currency account it defaults off, and when on it asks for the peso amount that left Cash on hand (the rate is prefilled; see Phase 3).
    - When on and the amount is more than Cash on hand holds: warn and allow.
    - The info icon opens a sheet explaining the two choices, including "turn it off if you already recorded this money as an E-Wallet/Account transfer before".
  - When editing: everything except currency and opening balance. Currency is locked once the account has transactions.
- `src/components/accounts/AccountDetail.tsx` (new), opened from a row:
  - a balance `Hero` with sparkline, plus a balance-over-time chart
  - **Before writing either, check whether the `ds` `Hero` and [NetWorthGrowthChart.tsx](../../src/components/insights/NetWorthGrowthChart.tsx) take generic series**, and reuse them if so (CLAUDE.md component rule)
  - month range options match the Net Worth chart's
  - below the chart: that account's transactions using the Ledger list components, filtered by account
  - a gear menu (`AccountOptionsModal`) with Edit, Transfer to…, Adjust balance, Archive, Delete
- **Adjust balance sheet:** "Actual balance" input, prefilled with the current balance, and a live line showing "Difference: −₱60". Then a two-choice selector that follows the sign:
  - **Lower:** **Expense** ("Counts as spending") or **Transfer out** ("Not spending, just gone")
  - **Higher:** **Income** ("Counts as income") or **Transfer in** ("Not income, just appears")

  Date defaults to today.

### UI — Transaction & Transfer forms
- **Account picker** (`src/components/accounts/AccountPicker.tsx`): a compact chip row (icon + name), with Cash on hand first and pre-selected, and archived accounts hidden. **Check `components/ds` for an existing chip/segmented picker to reuse first.** It shows only when the user has at least one account besides Cash on hand; until then every form behaves exactly as today.
- [TransactionForm.tsx](../../src/components/transaction/TransactionForm.tsx): "Paid from" (expense) or "Received into" (income). For a foreign account, the amount is entered in that account's currency (Phase 3). The goal-spend pair ([TransactionForm.tsx:189](../../src/components/transaction/TransactionForm.tsx:189)) stamps the **same** `accountId` on both rows.
- [TransferForm.tsx](../../src/components/transaction/TransferForm.tsx) is rebuilt around two modes on a `SegmentedControl`:
  - **"Between my accounts"** (default): From → To pickers, amount, optional **Fee**, date, note. Same From and To is blocked.
  - **"Send / Receive":** a direction switch, one account picker ("From" / "Into"), amount, date and note. It writes a plain `TRANSFER_OUT` / `TRANSFER_IN` with `transferAccount: 'OTHER_ACCOUNT'`. The helper line reads "Money leaving or entering your accounts that isn't spending or income".
  - **The destination chips are removed** from the form (`DEST_CONFIG`, [TransferForm.tsx:28](../../src/components/transaction/TransferForm.tsx:28)). The `TransferAccount` enum and the DB CHECK stay, because old rows still use those values.
  - Until the user has a second account, "Between my accounts" is disabled with a hint ("Add an account to move money between them"), and the form opens in Send / Receive.
- **Editing an old chip-based transfer** (e.g. `DIGITAL_WALLET`) opens Send / Receive, showing a read-only "Recorded as: E-Wallet" line. Saving keeps its original `transferAccount`, so old rows never change meaning just because they were opened. The label map moves out of the form into `src/constants/accounts.ts` so History can still name old rows.
- **Record menu:** check what [RecordMenuModal.tsx](../../src/components/record/RecordMenuModal.tsx) currently shows for Transfer, and relabel it "Transfer" with the two modes. No new entry is needed.
- Editing an account transfer opens the Transfer form in Between mode with every leg loaded, and saves through `updateAccountTransfer`.

### Ledger & History display
- `isMergedIntoSibling` already folds IN and fee legs (both link to OUT, same day). Verify in the Ledger and the Home Recent list ([historyFeed.ts:126](../../src/utils/historyFeed.ts:126)).
- The visible OUT row shows **"BDO → GCash"** and the amount in a neutral colour with no −/+ sign. With a fee it shows "· fee ₱15" as the subtitle; the debt-leg carry at [historyFeed.ts:120](../../src/utils/historyFeed.ts:120) is the pattern to follow. Day totals already net the pair to zero, and the fee shows as spending.
- Every other row gets an account subtitle ("· GCash"), only while the user has more than one account.
- History gets an account filter next to the type filter.

**Phase 1 done when:**
- Upgrading changes no number anywhere: cash, Net Worth, Safe-to-Spend, Runway, Cash kept, and every chart. The Accounts tab shows only Cash on hand with the full total.
- Adding "BDO" with ₱50,000 and Cash flow on: BDO = ₱50,000, Cash on hand drops by ₱50,000, total cash and Net Worth unchanged, one Ledger row.
- With Cash flow off: cash and Net Worth rise by ₱50,000; income, Savings Rate and Safe-to-Spend don't change.
- BDO → GCash ₱5,000 with a ₱15 fee: BDO −₱5,015, GCash +₱5,000. Cash and Net Worth drop by ₱15 only, the ₱15 shows as a `Fees` expense, and there's one Ledger row.
- Deleting any leg removes the whole group, with every row tombstoned. Editing the transfer updates every leg.
- Adjust balance down ₱60 as Expense: spending +₱60. As Transfer out: spending unchanged, Net Worth −₱60.
- Deleting BDO moves its rows to Cash on hand, total cash is unchanged, and Cash on hand → Cash on hand pairs are removed.
- The account detail chart's last point equals the account's balance.
- With no accounts created, every form looks exactly as it does today.

---

## Phase 2 — Funding source on every other write path

Each form below gets the `AccountPicker`, pre-selecting Cash on hand. A rule with no `accountId` stays in Cash on hand.

| Write path | Picker label | Notes |
|---|---|---|
| [InvestmentForm.tsx:366](../../src/components/investments/InvestmentForm.tsx:366) (cash leg) | "Funding source" (buy) / "Proceeds to" (sell) | Hidden when the Cash flow switch is off (no cash row). The P&L leg (line 392) has no cash effect, so it gets no account. Dividends get "Received into". |
| [DebtForm.tsx:231](../../src/components/debts/DebtForm.tsx:231) (initial borrowing / lending) | "Into" / "From" | Fee row (line 251) uses the same account. |
| [LoansTab.tsx:458](../../src/components/home/LoansTab.tsx:458) (debt payment legs) | "Paid from" / "Received into" | All legs share one account. |
| [savingsGoalService.ts:181](../../src/services/domain/savingsGoalService.ts:181) contribution, `:230` withdrawal, `:256` sweep | "From" / "To" | Goal balance is unchanged; only which account pays changes. |
| [recurrenceService.ts:138](../../src/services/domain/recurrenceService.ts:138) (generated rows) | set on the rule's form | `accountId` rides inside `transactionTemplate`. If the account is archived, generated rows still use it; if deleted, they fall back to Cash on hand. |
| AI receipt ([ReceiptReviewForm.tsx](../../src/components/ai/ReceiptReviewForm.tsx)) | "Paid from" | |
| [CsvImportFlow.tsx:162](../../src/components/data/CsvImportFlow.tsx:162) | one "Import into" picker for the whole file | The CSV header format stays the same. A foreign account converts each row at its date's rate (Phase 3). |
| [dummyDataService.ts](../../src/services/integrations/dummyDataService.ts) | — | Seed 2–3 accounts (one non-spendable, one USD) and spread the mock rows across them. |
| Time deposits | "Funded from" / "Withdraw to" | Built after Accounts, with these pickers from the start; see [TIME_DEPOSITS.md](TIME_DEPOSITS.md). |

For v1, debts, goals and investments are tracked in the profile currency. Paying any of them from a foreign account converts at that day's rate, the same as an expense (Phase 3).

**Phase 2 done when:** every cash-moving form can pick an account, recurring rows land in the rule's account, and a deleted account's rule falls back to Cash on hand without crashing.

---

## Phase 3 — Foreign-currency accounts

### Storage rule

**`amount` stays in the profile currency on every row**, so no existing metric changes. Rows in a foreign account also store:
- `originalAmount`: the amount in the account's currency
- `exchangeRate`: profile currency per 1 unit, as of the transaction date

Investments already store `currency` + `exchangeRate` the same way.

- **Entering:** the user types the amount in the account's currency. The rate is prefilled from `fetchExchangeRate(accountCurrency, profileCurrency, date)` ([currencyService.ts:20](../../src/services/integrations/currencyService.ts:20)) and stays editable. It falls back to the last rate used for that currency when offline, and to manual entry if there's none.
- **Account balance** (in its own currency) = the sum of `originalAmount`.
- **Spending, income, budgets, Savings Rate, Burn Rate:** use `amount`. An expense from a USD account counts at that day's rate and never changes afterwards.
- **Cash Balance and Net Worth** add an **FX revaluation**: for each foreign account, `balance × latest rate − Σ amount`. This makes the converted balance follow the current rate. It also captures the gain or loss from converting back: $100 bought at ₱58 and sold at ₱60 leaves +₱200. The revaluation is display-only. It never becomes an `INCOME` row, the same as unrealized investment gains.
- **Past month-end points** (sparklines, the account chart) use each month-end's rate. Cache fetched rates per currency and date; the price-history table may already fit.

### Cross-currency transfers
- PHP → USD: the user enters both sides ("₱5,800 → $100"), the "To" side prefilled from the rate. The OUT leg `amount` = ₱5,800; the IN leg `amount` = ₱5,800, with `originalAmount` = $100. The pair still nets to zero.
- USD → PHP: the OUT leg `originalAmount` = $100; both legs' `amount` = the pesos received. Any difference against what the dollars cost shows up through the revaluation rule above.
- Fees are entered in the source account's currency.

### Display
- Foreign balances show in their own currency, with "≈ ₱X" underneath, on the Accounts tab, the detail page and pickers.
- Ledger rows from a foreign account show "$12.50 (≈ ₱725)".

**Phase 3 done when:**
- A $100 USD account opened with Cash flow off raises Net Worth by $100 × today's rate.
- A $10 expense on a day the rate was 58 adds ₱580 to spending, permanently.
- When the rate moves, Net Worth moves by balance × change, and spending doesn't.
- PHP → USD → PHP at a better rate leaves Net Worth up by the difference.
- Going offline uses the last known rate without crashing.

---

## Phase 4 — Monthly Summary & AI context

- [monthlySummaryBuilder.ts](../../src/utils/monthlySummaryBuilder.ts): exclude `ACCOUNT_TRANSFER` from the Transfers list. Add a short `--- Accounts ---` block with each account's month-end balance (own currency, plus the converted value). Finished months only change via Reprocess; mention it in the release notes.
- [financialSnapshotBuilder.ts](../../src/utils/financialSnapshotBuilder.ts): an `accounts` list (name, kind, currency, balance, converted balance, spendable). Add one explanatory line: account transfers aren't spending or income, an opening balance isn't income, and non-spendable accounts are excluded from Safe-to-Spend and Runway.

**Phase 4 done when:** Chat answers "how much is in my GCash?" and "how much is my USD account worth in pesos?", and doesn't call a BDO → GCash transfer spending.

---

## Phase 5 — Backup / Export / Sync / Clear-data

- [backupEntities.ts](../../src/services/integrations/backupEntities.ts):
  - an `accounts` entry, placed **before** `transactions`, with `{ field: 'accountId', refEntity: 'accounts' }` in the transactions `fkFields`
  - the Cash on hand row's fixed id must be kept as-is during remapping (never given a new id)
  - `remapRecurrenceTemplateFks` ([backupService.ts:247](../../src/services/integrations/backupService.ts:247)) only remaps investment, debt and goal ids inside templates; add `accountId`
- [syncEntities.ts](../../src/services/integrations/syncEntities.ts): a `SYNC_ENTITY_REGISTRY` entry. An account deleted on one device while the other adds rows to it is covered by the "unknown id → Cash on hand" rule.
- [exportService.ts](../../src/services/integrations/exportService.ts): an "Accounts" sheet. On the transactions sheet, add "Account", "Original amount" and "Rate" columns.
- [storageService.ts](../../src/services/core/storageService.ts) `clearAllData`: delete accounts, then re-insert the Cash on hand row.

**Phase 5 done when:** Backup → Clear Data → Restore brings back accounts (including a renamed Cash on hand), every row's account and FX fields, and recurring rules' accounts. A pre-v18 backup restores into Cash on hand. Export shows the new columns.

---

## Phase 6 — Docs & explanations (same change as the code, per PROJECT.md)

- [METRICS.md](../METRICS.md):
  - the Phase 0 rows and footnote ⁴, plus the Accounts shared rule
  - the spendable rule (footnotes ⁴ and ⁵) in the Safe-to-Spend and Runway sections
  - the FX revaluation in the Cash Balance and Net Worth formulas
  - `accounts` in "Where the numbers come from"
  - a history row on every metric whose code changed (Safe-to-Spend, Runway, Cash kept, Cash Balance, Net Worth)
- [helpContent.ts](../../src/constants/helpContent.ts):
  - an Accounts guide covering Cash on hand, the Cash flow switch, transfers and fees, Adjust balance, spendable accounts and foreign currency
  - Cash, Runway and Safe-to-Spend wording in Math & Formulas
  - grep the `*InfoModal` / `*HelpModal` / "How is this calculated?" sheets for "Cash", "Runway" and "transfer"
- [CAPABILITIES.md](../CAPABILITIES.md), [MODULES.md](../MODULES.md) (new `src/components/accounts/`, `AccountsTab.tsx`, service, metrics and constants files), and release notes per the versioning doc.

---

## Edge cases

**Creating & editing accounts**
- **Duplicate names:** allowed, with a warning.
- **Opening balance 0:** no row.
- **Opening balance negative:** blocked in v1. Credit cards will handle owing money.
- **Cash flow on, Cash on hand smaller than the amount:** warn and allow. A negative Cash on hand shows in the danger colour, which tells the user their tracked cash was off.
- **Opening balance with a past date:** with Cash flow on, it changes past account balances but not past totals. With Cash flow off, past Net Worth from that date rises. Default to today.
- **Changing an account's kind:** allowed between Bank, E-Wallet and Cash.
- **Changing currency:** locked once the account has transactions.
- **Turning "spendable" off on an account with money in it:** Runway and Safe-to-Spend drop immediately. Show that in the switch's subtitle ("Runway will drop to N days").

**Transfers**
- **Same From and To:** blocked.
- **From balance would go negative:** warn and allow.
- **Fee bigger than the amount, or negative:** blocked.
- **Legs on different dates** (the bank posts the next day): not supported. All legs share one date, so they fold into the same day group.
- **Deleting any leg** deletes the whole group (Phase 1 fix).
- **Sync merge deleting one leg:** `deleteTransactionForMerge` deliberately doesn't cascade. The other legs arrive as their own tombstones, which the tombstone-every-child fix guarantees.

**Adjust balance**
- **Difference of 0:** nothing written.
- **Adjusting a foreign account:** the difference is entered in the account's currency and converted at today's rate.
- **Adjusting Cash on hand:** allowed. It's the most common place to lose track of money.

**Archive & delete**
- **Archive:** hidden from pickers and the main list, and shown under "Archived". Its balance **still counts** in total cash. Archiving an account with a non-zero balance warns "₱X is still in this account" and offers "Transfer it to…" first.
- **Delete:** confirm modal stating "N transactions will move to Cash on hand". Total cash is unchanged. Each moved row shows "Cash on hand" from then on.
- **Deleting a foreign-currency account:** its rows move to Cash on hand with their `amount` (profile currency) and lose the revaluation. Warn: "The ≈ ₱X value at today's rate becomes ₱Y at the rates you recorded." Recommend transferring the balance out first.
- **Deleting a non-spendable account** with a balance: that money becomes spendable in Cash on hand. Say so in the confirm modal.
- **Deleted account referenced by a recurring rule:** generated rows fall back to Cash on hand.
- **Cash on hand:** can't be archived, deleted or made non-spendable.

**Interplay with existing features**
- **Old chip-based transfers** (Account, E-Wallet, ATM/Cash, Invest, Crypto, Lent…): untouched, still named by their old label in History, and editable through Send / Receive without changing their `transferAccount`. The Cash flow-off guidance covers users fixing their own totals.
- **Send / Receive vs Adjust balance:** they write the same kind of row. Send / Receive is for a known movement ("gave ₱2,000 to Mom from GCash" when the user doesn't want it as an expense). Adjust balance is for an unexplained gap. Both are fine; the help guide says which to use when.
- **Goal-funded purchase:** both rows share one account, so that account nets to zero.
- **Investment buy with Cash flow off:** no cash row, so no account.
- **Debt payments with interest/fee legs:** all legs use the payment's account.
- **Budgets, Burn Rate, Savings Rate:** account-agnostic, using `amount`.
- **Discreet mode:** every account balance and the detail chart go through `usePrivacyFormat` / `HiddenChart`.
- **Split payment** (half cash, half GCash): not supported. Record two expenses.
- **Users who never create an account:** see Cash on hand on the new tab and nothing else new. Pickers and subtitles stay hidden.

**Data, sync, metrics**
- **Pre-v18 backup / CSV import:** rows land in Cash on hand.
- **v18 backup restored on an older app:** the unknown `accounts` key is ignored and the extra transaction fields are dropped. Verify this is the existing behaviour.
- **Monthly Summary for finished months:** not recomputed until Reprocess.
- **Exchange-rate fetch quota and offline use:** cache rates per currency and date. Never block saving on a fetch.

---

## Later — Credit cards

Planned after Bank/E-Wallet ships. Recorded here so v1 doesn't block it.

- New `AccountKind` `'CREDIT_CARD'`, plus `creditLimit`, `statementDay` and `dueDay` on `Account` (nullable columns, added when this phase lands).
- **The card's balance is what you owe**: charges minus payments, derived like any account. It's a liability, so total cash **skips card accounts**, and Net Worth subtracts the outstanding balance.
- The credit limit is shown only as "available credit" (limit − owed). It's never an asset.

| Action | Cash | Spending / Budgets | Card balance | Net Worth |
|---|---|---|---|---|
| Expense paid by card (`EXPENSE`, `accountId` = card) | no change | ✓ counted when you swipe | ↑ | − |
| Paying the card from BDO (`ACCOUNT_TRANSFER` BDO → card) | − | ✗ (already counted when you swiped) | ↓ | no change |

- This mirrors Goals: two steps, and only one counts as spending.
- The due-date reminder uses the existing reminders system.
- Existing `CREDIT_CARD` **debts** keep working. A "Convert to card account" action can come later.
- Card interest and fees are normal `EXPENSE` rows on the card.

---

## Verification

- After each phase: `npx tsc --noEmit` and the lint command.
- Before and after upgrading a real data set: compare cash, Net Worth, Safe-to-Spend, Runway, Cash kept and the sparkline. All must be identical until the user creates an account.
- Visually verify the Snapshot Cash row expanded in Overall and Monthly (children add up to the parent, Discreet percentages), the Transfer form's two modes, the Accounts tab (six tabs at phone width), AccountForm, AccountDetail chart, pickers, Adjust balance sheet and the "BDO → GCash · fee ₱15" Ledger row on a phone-width emulator, in light and dark mode and in Discreet mode. Typecheck alone isn't enough for UI.
- Two-device sync: create an account on A, add a GCash expense on B after syncing, then delete the account on A. B's expense must fall back to Cash on hand with the same total cash. Renaming Cash on hand on A must show on B.
- FX: test with the device offline, and with a rate the user edited by hand.
- Flag anything not device-tested in TODO.md until it gets a real pass.
