# Metrics

The single source of truth for every number the app computes: its formula, where it's shown, which data it reads, and how its rule changed over time.

**To change a metric:** read its section first, history included. Change its **Formula** line, add a row to its history table, then update every place under **Shown on** and its user-facing explanations (see `PROJECT.md` → Calculation explanations). If the change undoes part of an earlier one, mark the row **↩** and name that version, both here and in the release notes.

`master`'s history was rewritten after 1.15.0. Its log still covers every version, but under different commit IDs, so tags `v1.0.0`–`v1.15.0` aren't ancestors of `master` and ranges like `v1.14.0..master` don't work. To read old code, run `git fetch --tags`, then `git show v1.X.0:<path>`. The `v1.0.0` tag holds only the project scaffold; the code that shipped as 1.0.0 is at `v1.0.1`.

## Overview

- **Cash:** [Cash Balance](#cash-balance) · [Runway](#runway) · [Runway Change](#runway-change) · [Net Cash Flow](#net-cash-flow-monthly)
- **Spending:** [Total Expense / Monthly Net / Daily Average](#total-expense--monthly-net--daily-average) · [Category Breakdown / Top Category](#category-breakdown--top-category) · [Savings Rate](#savings-rate) · [Budget Health](#budget-health)
- **Obligations:** [Burn Rate](#burn-rate) · [Debts Drag](#debts-drag) · [Safe-to-Spend](#safe-to-spend)
- **Wealth:** [Net Worth / Total Debt](#net-worth--total-debt)
- **By transaction kind:** [What each transaction counts toward](#what-each-transaction-counts-toward)

## Where the numbers come from

Not everything is computed from `transactions`. Metrics that look forward (Burn Rate, Runway, Safe-to-Spend, Net Worth) also read *settings* stored on other tables: a debt's scheduled minimum payment, a goal's recurring amount, a recurring bill. Those settings aren't transactions, so changing how a transaction kind is filtered never touches them.

| Table | What metrics read from it |
|---|---|
| `transactions` | Every recorded money movement: cash, income, spending, debt payments made, goal contributions and purchases. A goal's balance and a debt's remaining principal are both summed from here |
| `debts` | Each debt's settings: `minPayment`, `status`, `direction`, start date, and `initialAmount`, `interestRate`, `interestType`, `termMonths` for projected interest |
| `savings_goals` | Each goal's settings: `recurringAmount`, `frequency`, `isPaused`, `targetAmount` |
| `recurrence_rules` | Scheduled future income and bills |
| `budgets` | Budget amount per category |
| `investments`, `price_history` | Holdings and latest prices, for investment market value |
| `monthly_summary` | A stored copy of each month's Monthly Summary, which Chat also reads. Finished months are **not** recomputed when a formula changes, only by the manual Reprocess action |

## Shared rules

These apply to every metric unless its section says otherwise.

- **Goal-funded purchase** (an `EXPENSE` tagged `savingsGoalId`, paired with a `GOAL_SPEND` `TRANSFER_IN`). Its cash left when it was contributed to the goal, so it's left out of spending totals, rates, averages and budgets. It stays visible in category breakdowns and as a separate "+ from goals" line. *(v1.18.0; display rule 2026-09-27)*
- **Goal contribution** (a `TRANSFER_OUT` tagged `savingsGoalId`). It's a transfer, not an expense. Burn-rate metrics add each goal's monthly contribution from its settings instead of scanning history.
- **Debt principal repaid** (a `TRANSFER_OUT` with a `debtId` and subCategory `PRINCIPAL`). Counts as spent for Savings Rate only. *(chart since v1.10.0; card and summary since 2026-09-27)*
- **Debt interest** (an `EXPENSE` with a `debtId`, subCategory `INTEREST`). A normal expense, except that burn-rate metrics leave it out, because they add each debt's minimum payment, which already includes interest.
- **Debt fees** (an `EXPENSE` with a `debtId` and category `Fees`). A normal expense everywhere, burn-rate metrics included, because minimum payments don't cover fees. *(2026-09-28)*
- **RECEIVABLE debts** (money owed to you). Never a liability, and never an asset until repaid: lending money out lowers Net Worth, and each repayment raises it back. *(2026-09-28)*
- **Future-dated transactions** count as soon as they're recorded. Only period metrics (a month's cash flow, balance as of last month) cut off by date. *(2026-09-28)*
- **Investment amounts** are stored in your profile currency. To show the original currency, divide by `exchangeRate` for any rate other than 1. Never multiply by the rate again.

---

## Cash Balance

**Formula:** (Income + Transfer In) − (Expense + Transfer Out), every recorded transaction, future-dated included

**Shown on:** Home · Insights · Financial Health · History · Chat

**Computed from:** `transactions`

**Notes:** `calculateBalance`. Goal purchases cancel out to ₱0 through their matching transfer.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | Lifetime Income − Expense | Home Total Balance |
| 1.7.0 | (Income + Transfer In) − (Expense + Transfer Out) | Home Cash Balance and History count transfers, introduced this version |
| 1.8.1 | Same, for Insights too | Insights Runway's balance now counts transfers |
| Unreleased | Every recorded transaction, future-dated included | Runway-drop alert stopped cutting off at today; hand-rolled copies in five files merged into `calculateBalance` |

## Runway

**Formula:** Cash Balance ÷ [Burn Rate](#burn-rate). The runway-drop alert fires when it falls ≥25% below Runway Change's last-month figure. While Cash Balance is ₱0 or below, the out-of-cash alert fires instead, every month

**Shown on:** Home · Insights · Financial Health · Chat · runway-drop alert · out-of-cash alert

**Computed from:** `transactions` (balance, spending) · `debts` (`minPayment`) · `savings_goals` (recurring contribution)

**Notes:** `calculateRunwayTrend`. Changes to the divisor are in Burn Rate's history; this one covers where Runway is shown and the runway-drop alert.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.3.1 | Balance ÷ Burn Rate | Runway card on Insights |
| 1.4.0 | Same | Runway popup now says it's your *tracked* balance, not your bank balance |
| 1.8.1 | Alert: Balance ÷ plain 6-month expense average | Runway-drop alert added (fires on a ≥25% drop vs last month). Until Unreleased it picked up no later Burn Rate change: no debt payments, goal contributions or debt/goal filtering |
| 1.10.0 | Same | Runway added to the new Financial Health screen and Home card |
| 1.15.0 | Same | Chat gets its own Runway |
| 1.18.0 | Same | Runway-drop alert no longer drops the last day of last month |
| Unreleased | Alert uses the screens' Runway | Runway-drop alert now compares the same Runway and last-month figure as Runway Change (`calculateRunwayTrend`) |
| Unreleased | Out-of-cash alert while Cash Balance ≤ 0, in place of the runway-drop alert | The runway-drop alert skipped a drop to zero or below (since 1.8.1). The new alert repeats every month cash stays there, with its own once-a-month notification |

## Runway Change

**Formula:** Runway now − Runway at the end of last month. Last month's Runway = Cash Balance as of then ÷ (Burn Rate base as of then, same fallback + minimum payments of debts you owe that are active today and had a balance then + today's goal contributions)

**Shown on:** Home · Financial Health · runway-drop alert

**Computed from:** `transactions` (balance and spending as of last month's end; debt payments, to tell whether a debt was still open) · `debts` (`minPayment`, `status`, `direction`, start date) · `savings_goals` (today's recurring contribution)

**Notes:** `calculateRunwayTrend`. 0 until you have a transaction before this month, or when either runway is infinite. Last month's divisor follows Burn Rate's base changes (1.17.0, 1.18.0, Unreleased); this history covers the rest.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Last month's debt payments = debts active today that had started by then | Introduced. Financial Health dropped last month's final day |
| 1.13.0 | Debts you owe that were open last month | Money owed to you left out; a paid-off debt still counts for the months before its payoff, guessed from when it was last edited |
| 1.16.0 | Same | Whether a debt was open last month is worked out from its transactions, so editing a paid-off debt no longer skews it |
| 1.17.0 | Debts you owe, active today, that were open last month | **↩ Partly undoes 1.13.0/1.16.0.** A debt paid off or forgiven is left out of last month too, so paying one off doesn't show as a runway gain |
| 1.18.0 | + goal contributions | Today's contributions, since goals keep no history. Financial Health no longer drops last month's final day |
| Unreleased | Last month's balance = balance at last month's end; base uses Burn Rate's fallback as of then | Home and Financial Health share one calculation (`calculateRunwayTrend`), also used by the runway-drop alert. Home stopped counting later-dated transactions in last month's balance; Financial Health stopped overstating last month's runway for someone who started last month |

## Net Cash Flow (monthly)

**Formula:** (Income + Transfer In) − (Expense + Transfer Out) for one month

**Shown on:** Home (Monthly Balance) · Insights (Net Cash Flow, Savings Rate Trend "Cash Flow" view) · Financial Health (Net Flow) · Monthly Summary

**Computed from:** `transactions`. Monthly Summary shows its stored copy in `monthly_summary`

**Notes:** `calculateBalance` with the month's end. Goal purchases are included; they cancel out.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | Income − Expense for the month | Net Cash Flow card on Insights |
| 1.5.0 | Same | Home Monthly Balance card |
| 1.7.0 | (Income + Transfer In) − (Expense + Transfer Out) | Home Monthly Balance counts transfers, introduced this version. Insights stays Income − Expense |
| 1.10.0 | Income − Expense | Financial Health Net Flow introduced |
| 1.10.1 | Transfer-inclusive, for Financial Health too | Financial Health's Net Flow counts transfers, so investing isn't counted twice. Its average net flow drops the last day of each month |
| 1.14.0 | Same | Savings Trend gets a "Cash Flow" view using this formula (same last-day bug) |
| 1.15.0 | Same | Monthly Summary, transfer-inclusive from the start |
| 1.18.0 | Same, for Insights too | Insights switched to the transfer-inclusive formula so goal contributions and goal purchases net out |
| 1.18.0 | Same | Savings Trend Cash Flow view and Financial Health's average net flow no longer drop the last day (bug since 1.10.1) |
| Unreleased | Same | Financial Health's Net Flow includes this month's future-dated transactions |

## Total Expense / Monthly Net / Daily Average

**Formula (Total Expense):** the month's expenses excluding goal-funded purchases, which show as "+ ₱X from goals"

**Formula (Monthly Net):** Income − Total Expense

**Formula (Daily Average):** Total Expense ÷ days elapsed this month; a past month ÷ its length

**Shown on:** Insights (Total Expense, Daily Average) · History (Expenses) · Home (Monthly Net) · Monthly Summary

**Computed from:** `transactions`. Monthly Summary shows its stored copy in `monthly_summary`

**Notes:** Monthly Summary uses Total Expense without a separate "from goals" line.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | All expenses | Total Expense card on Insights |
| 1.3.1 | Daily Average = month's expenses ÷ days in the month | Daily Average card added |
| 1.7.0 | Monthly Net = Income − Expense, no transfers | Monthly Net card on Home |
| 1.8.1 | Daily Average = month's expenses ÷ days elapsed | Was ÷ days in the month. The in-app help kept the old wording until 1.16.0 |
| 1.12.0 | Same; a past month ÷ its full length | Insights month picker added; its cards follow the browsed month |
| 1.18.0 | Expenses leave out goal-funded purchases | Insights Total Expense and Daily Average, History Expenses, Monthly Summary, Month-End Projection and spending charts. Savings Goals added |
| Unreleased | Same; goal-funded purchases shown as "+ from goals" | Line added under Insights Total Expense, History Expenses and Home Expense; Home Monthly Net stopped subtracting them |

## Category Breakdown / Top Category

**Formula:** the month's expenses summed per item (`category`) or per category group, each with its share of the total. Goal-funded purchases are included, and each row carries its `goalFundedAmount`. Top Category = the largest item

**Shown on:** Insights (spending pie, Top Spending list, All Categories, Top Category tile, category trend popup) · Home (Top Transactions)

**Computed from:** `transactions` (the month's expenses by `category`; groups come from the built-in category list)

**Notes:** `getCategoryBreakdown`. The Group/Item toggle changes the pie and lists; Top Category always uses items. The category trend popup (`getCategoryTrend`) applies the same rule to each of the past months. Home's Top Transactions (`getTopExpenses`) lists the month's five largest single expenses. Both include goal-funded purchases.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | Month's expenses per group, or per item (`subCategory`, else `category`), with % of total | Spending breakdown on Insights |
| 1.3.1 | Same | Top Category tile added (largest item) |
| 1.10.0 | Items grouped by `category` only | `subCategory` no longer splits items; it now holds tags such as debt `INTEREST` |
| 1.18.0 | Same, goal-funded purchases included | Savings Goals added; their purchases show here in full |
| Unreleased | Each row also carries `goalFundedAmount` | The spending breakdown marks each category's goal-funded share |

## Savings Rate

**Formula:** (Income − Total Expense − Debt Principal Repaid) ÷ Income × 100

**Shown on:** Insights (card, Savings Rate Trend, Month-End Projection) · Monthly Summary · Chat

**Computed from:** `transactions`. Monthly Summary and Chat show the stored copy in `monthly_summary`

**Notes:** `calculateDebtPrincipalRepaid`. Month-End Projection uses principal actually repaid so far this month, not a projection.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | (Income − Expense) ÷ Income | Insights card, trend chart and Month-End Projection |
| 1.10.0 | Chart: (Income − Expense − debt-linked Transfer Out) ÷ Income | Chart counts debt payments as spent, but also money you lent out and repayments you received. **The card doesn't** |
| 1.13.0 | Chart: (Income − Expense − Debt Principal Repaid) ÷ Income | Lending money out no longer counted; repayments you receive are recorded as money in. Chart follows the browsed month |
| 1.14.0 | Same | Chart gets Rate / Saved / Cash Flow views |
| 1.15.0 | Same | Monthly Summary and Chat added, using the card's formula (no principal) |
| 1.18.0 | Expense leaves out goal-funded purchases | Savings Goals added. Card and chart still differ on principal |
| 1.18.0 | Same | Chart no longer mixes up months' repayments on the 29th-31st |
| Unreleased | (Income − Expense − Debt Principal Repaid) ÷ Income, everywhere | Card, Monthly Summary, Chat and Month-End Projection now count principal as spent, matching the chart. Month-End uses principal repaid so far |

## Budget Health

**Formula (Budget spent):** a category's spending this month, excluding goal-funded purchases

**Formula (Budget Health):** Budget spent in budgeted categories ÷ total budgets. Green ≤70%, orange ≤90%, red >90%

**Shown on:** Insights (Budget Health, spending-breakdown bars) · Home (budget %) · Smart Suggestions · Monthly Summary · over-budget alerts · Chat

**Computed from:** `transactions` (spending per category) · `budgets`

**Notes:** The goal was the budget for its own purchases. The colors apply only to the Budget Health total. Per-category statuses in Monthly Summary and Chat use their own thresholds: a warning at ≥80% of that category's budget, over budget above 100%.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.3.1 | Spent in budgeted categories ÷ total budgets | Introduced. Colors: green ≤80%, orange ≤100%, red >100% |
| 1.4.0 | Same | Colors: green ≤70%, orange ≤90%, red >90% |
| 1.18.0 | Same | Monthly Summary budget alerts, over-budget alerts and Chat budgets leave out goal-funded purchases; this card doesn't |
| Unreleased | Leaves out goal-funded purchases | Also Home budget %, spending-breakdown bars, Smart Suggestions |

## Burn Rate

**Formula:** average of up to 6 prior full months' spending (the first month counts only if it began on the 1st), excluding goal-tagged transactions and debt principal/interest; with no full month yet, daily spending since the first transaction × 30.44. Then + debt minimum payments + goal monthly contributions

**Shown on:** Home (inside Runway, Debts Drag and Investment Boost; no Burn Rate figure of its own) · Insights (Burn Rate, Annualized Expense) · Financial Health · Debt Strategy (Time Cost) · Chat

**Computed from:** `transactions` (spending base) · `debts` (`minPayment` of active debts you owe) · `savings_goals` (`recurringAmount` ÷ `frequency`, unless paused or at `targetAmount`)

**Notes:** `calculateMonthlyBurnRate`, built on `getBurnRateBase`. Debt fees stay in, since minimum payments don't cover them. Debt Strategy's Time Cost uses the 6-month base alone, with no fallback, minimum payments or goals. The Comparison Chart's 3M/6M/1Y averages leave out goal purchases and skip the debt/goal add-on, since they're compared against plain monthly spending. They count full months only, with no fallback.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | Average monthly expense over the last 6 months, this month included | Card on Insights; skips past months with no transactions |
| 1.2.0 | Same | Averages over no more months than the account is old; empty months count as 0 instead of being skipped |
| 1.5.0 | Same | New-user fallback 6M → 3M → last month → this month. Little effect yet, since the 6-month average already included this month |
| 1.7.0 | Average of prior months' expenses | Leaves out the current, in-progress month (0 in your first month); fallback now 6M → 3M → this month |
| 1.10.0 | Average + debt minimum payments | Insights Burn Rate, Annualized Expense and Runway; new Financial Health and Home card. **Interest now counted twice**: as spending and inside the minimum payment |
| 1.13.0 | Same | Money owed to you no longer counted as your obligation |
| 1.15.0 | Same | Chat gets its own Burn Rate, with no new-user fallback |
| 1.17.0 | Leaves out every debt-tagged transaction + minimum payments | Financial Health and Chat: fixed the interest double-count. **Also dropped fees**, which the minimum payment doesn't cover |
| 1.18.0 | Same, plus goal contributions from each goal's settings; goal-funded purchases left out | Same fix on Home, Insights, Debt vs Life (base only) and Safe-to-Spend; Savings Goals added |
| Unreleased | Same | Chat uses the same new-user fallback as the screens |
| Unreleased | Base leaves out goal-tagged transactions and debt principal/interest (fees stay in) + minimum payments + goal contributions | **↩ Reverses the fees half of 1.17.0/1.18.0.** One shared base (`getBurnRateBase`) replaces copies in six places |
| Unreleased | Same | Home, Insights, Financial Health and Chat share one calculation (`calculateMonthlyBurnRate`); the runway-drop alert uses it too |
| Unreleased | Up to 6 prior full months; with none yet, daily spending since the first transaction × 30.44 | A partly tracked first month no longer counts as a full one. The 3-month step, which never changed the result, is gone, and the this-month fallback is pro-rated instead of treating a partial month as a whole one. Also changes Runway Change's last month, Debt Strategy's Time Cost and the Comparison Chart's averages |

## Debts Drag

**Formula:** Runway without debt payments − Runway with them; living costs include goal contributions

**Shown on:** Home · Financial Health

**Computed from:** `transactions` (cash, spending base) · `debts` (`minPayment`) · `savings_goals` (recurring contribution)

**Notes:** `calculateDebtDrag`.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Runway without debt payments − Runway with them | Introduced on Financial Health and Home. Living costs count interest twice (see Burn Rate) |
| 1.13.0 | Same | Money owed to you no longer counted as a debt payment |
| 1.17.0 | Same | Financial Health: interest no longer counted twice (fees dropped too, see Burn Rate) |
| 1.18.0 | Same | Same fix on Home; goal-funded purchases left out of living costs. Goal contributions were added to Runway but not here |
| Unreleased | Living costs include goal contributions | Now measured against the real Runway |
| Unreleased | Same | Fees count as living costs again (↩ see Burn Rate) |

## Safe-to-Spend

**Formula (Daily / Weekly):** allowance from your 90-day non-recurring spending (same base as Burn Rate, so debt fees count) − spending so far this period − the day's or week's share of remaining debt and goal obligations

**Formula (Monthly / Yearly / Calendar):** Income + upcoming recurring income − spending so far − **all** transfers out − upcoming recurring bills − projected living costs (90-day allowance × days left) − remaining debt and goal obligations

**Shown on:** History

**Computed from:** `transactions` (spending so far, 90-day allowance) · `recurrence_rules` (upcoming income and bills) · `debts` (`minPayment`) · `savings_goals` (recurring contribution)

**Notes:** Investment buys, plain transfers and money lent out lower the Monthly view but not Daily/Weekly. Safe-to-Spend never adds any `TRANSFER_IN`.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.7.0 | This period's Income − Expense − upcoming recurring bills | Introduced on History (list and calendar) |
| 1.8.1 | Monthly: period income + upcoming recurring income − spending − transfers out − upcoming bills − daily living cost × days left. Daily/Weekly: living-cost allowance − spending so far | Living cost = average daily non-recurring spending over 90 days. Two formulas from here on |
| 1.10.0 | Same − remaining debt minimum payments | Debt obligations added |
| 1.13.0 | Same | Money owed to you no longer reserved as a payment |
| 1.18.0 | Same − remaining goal contributions; debt-tagged and goal-funded spending left out of the allowance | Lent money no longer treated as a payment; interest counted once (fees dropped too, see Burn Rate). Goal-funded purchases left out of spending so far; recurring goal contributions not counted as bills; bills on the 29th-31st keep their day |
| Unreleased | Same | Docs only: Daily/Weekly and Monthly formulas documented separately |
| Unreleased | Allowance keeps debt fees | ↩ See Burn Rate |

## Net Worth / Total Debt

**Formula (Net Worth, Projected):** Cash + investment market value + goal balances − (principal + projected future interest on active debts you owe)

**Formula (Total Debt):** current principal on active debts you owe; no future interest

**Shown on:** Home (Projected Net Worth, Debts card) · Financial Health (Total Debt, inside Self-sustain Impact) · Debt Strategy (Total Debt) · Chat (Total Debt)

**Computed from:** `transactions` (cash, goal balances, principal repaid) · `investments` + `price_history` (market value) · `debts` (`initialAmount`, and `interestRate`, `interestType`, `termMonths`, `minPayment` for projected interest)

**Notes:** Net Worth includes future interest on purpose, hence "Projected". Money owed to you isn't an asset until repaid.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Cash + investments − (debt principal + projected future interest) | Introduced on Home; Total Debt = principal only. Money owed to you counts as a liability in both |
| 1.13.0 | Same | Home: repayments on money owed to you now lower its balance. Financial Health's Total Debt drops money owed to you |
| 1.16.0 | Same | Debt screen: Total Debt, Interest Leak and payoff plan drop money owed to you |
| 1.17.0 | Cash + investments − (principal + projected interest) on debts you owe | Home Net Worth and Total Debt: money owed to you no longer a liability |
| 1.18.0 | + goal balances | Money in a goal still counts as yours |
| Unreleased | Same | Relabeled "Projected Net Worth" and "Debt + Interest" |
| Unreleased | Same | Documented: money owed to you isn't an asset until repaid (code already worked this way) |

---

## What each transaction counts toward

One row per kind of transaction the app records. When a feature adds a new kind, add its row and fill every column before writing code.

Key: `+`/`−` raises or lowers cash · ✓ counted · ✗ not counted · — not applicable. Safe-to-Spend shows the Monthly view.

| Transaction kind (how it's stored) | Cash Bal | Total Expense | Savings Rate | Budget | Burn Rate | Safe-to-Spend | Category | Net Worth |
|---|---|---|---|---|---|---|---|---|
| **Income** `INCOME` | + | — | ✓ income | — | — | + | ✓ income | + |
| **Normal expense** `EXPENSE` | − | ✓ | ✓ spent | ✓ | ✓ 6M avg | ✓ spent + allowance | ✓ | − |
| **Recurring expense** `EXPENSE`, `isRecurring` | − | ✓ | ✓ | ✓ | ✓ | ✓ spent, ✗ allowance, future ones set aside as bills | ✓ | − |
| **Goal contribution** `TRANSFER_OUT`+goal (`CONTRIBUTION`/`INITIAL_FUNDING`) | − | ✗ | ✗ counts as saved | ✗ | via goal setting¹ | via obligation | ✗ | 0 (cash moves into the goal) |
| **Goal-funded purchase** `EXPENSE`+goal, plus its `GOAL_SPEND` `TRANSFER_IN` | 0 (the two cancel) | ✗ (shown as "+ from goals") | ✗ | ✗ | ✗ | ✗ | ✓ `goalFundedAmount` | − (goal balance drops) |
| **Goal withdrawal / sweep** `TRANSFER_IN`+goal | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | 0 |
| **Debt principal paid** `TRANSFER_OUT`+debt, `PRINCIPAL` | − | ✗ | ✓ spent | ✗ | via min payment | via obligation | ✗ | ≈0³ |
| **Debt interest paid** `EXPENSE`+debt, `INTEREST` | − | ✓ | ✓ | ✓ | ✗ (inside min payment) | ✓ spent, ✗ allowance | ✓ | − |
| **Debt fee** `EXPENSE`+debt, category `Fees` | − | ✓ | ✓ | ✓ | ✓ | ✓ spent + allowance | ✓ | − |
| **Borrowing** `TRANSFER_IN`+debt, `INITIAL_TRANSACTION` | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | − projected interest |
| **Lending out** `TRANSFER_OUT`+debt, `INITIAL_TRANSACTION` (receivable) | − | ✗ | ✗ | ✗ | ✗ | − | ✗ | − (not an asset until repaid) |
| **Repayment received** `TRANSFER_IN`+debt, `PRINCIPAL` (receivable) | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | + |
| **Interest earned** `INCOME`+debt (receivable) | + | — | ✓ income | — | — | + | ✓ income | + |
| **Investment buy** `TRANSFER_OUT`+investment | − | ✗ | ✗ counts as saved | ✗ | ✗ | − | ✗ | 0 (cash becomes market value) |
| **Investment sell** `TRANSFER_IN`+investment (full proceeds) | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | 0 |
| **Dividend** `INCOME`+investment | + | — | ✓ income | — | — | + | ✓ income | + |
| **Realized gain/loss** `CAPITAL_GAIN`/`CAPITAL_LOSS` | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ (display only) |
| **Plain transfer out** `TRANSFER_OUT` (ATM, other account) | − | ✗ | ✗ counts as saved | ✗ | ✗ | − | ✗ | − |
| **Plain transfer in** `TRANSFER_IN` | + | ✗ | ✗ | ✗ | ✗ | ✗² | ✗ | + |

¹ Burn Rate drops goal-tagged transactions and debt principal/interest from history, then adds each active payable debt's `minPayment` and the monthly equivalent of `recurringAmount` for each goal that is active, not paused and still under target.
² Safe-to-Spend never adds any `TRANSFER_IN`.
³ Cash and principal both drop; the projected future interest also shrinks.
