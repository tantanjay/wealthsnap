# Metric Definitions

This is the single source of truth for what each number in the app includes and excludes, and where it's shown. To change how a metric works, change its rule here first, then update every place listed in its row. Also update its user-facing explanations (see `PROJECT.md` → Calculation explanations).

## Shared rules

These apply to every metric unless its row says otherwise.

- **Goal-funded purchase** (an `EXPENSE` tagged `savingsGoalId`, paired with a `GOAL_SPEND` `TRANSFER_IN`). Its cash left when it was contributed to the goal, so it's left out of spending totals, rates, averages and budgets. It stays visible in category breakdowns and as a separate "+ from goals" line. *(v1.18.0; display rule 2026-09-27)*
- **Goal contribution** (a `TRANSFER_OUT` tagged `savingsGoalId`). It's a transfer, not an expense. Burn-rate metrics add each goal's monthly contribution from its settings instead of scanning history.
- **Debt principal repaid** (a `TRANSFER_OUT` with a `debtId` and subCategory `PRINCIPAL`). Counts as spent for Savings Rate only. *(chart since v1.10.0; card and summary since 2026-09-27)*
- **Debt interest** (an `EXPENSE` with a `debtId`, subCategory `INTEREST`). A normal expense, except that burn-rate metrics leave it out, because they add each debt's minimum payment, which already includes interest.
- **Debt fees** (an `EXPENSE` with a `debtId` and category `Fees`). A normal expense everywhere, burn-rate metrics included, because minimum payments don't cover fees. *(2026-09-28)*
- **RECEIVABLE debts** (money owed to you). Never a liability, and never an asset until repaid: lending money out lowers Net Worth, and each repayment raises it back. *(2026-09-28)*
- **Future-dated transactions** count as soon as they're recorded. Only period metrics (a month's cash flow, balance as of last month) cut off by date. *(2026-09-28)*
- **Investment amounts** are stored in your profile currency. To show the original currency, divide by `exchangeRate` for any rate other than 1. Never multiply by the rate again.

## Metrics

| Metric | Formula | Shown on | Notes |
|---|---|---|---|
| Cash Balance | (Income + Transfer In) − (Expense + Transfer Out), every recorded transaction | Home Cash Balance, Insights, Financial Health, History, AI snapshot | `calculateBalance`. Goal purchases cancel out to ₱0 through their matching transfer |
| Monthly Balance / Net Cash Flow | Same formula, one month | Home Monthly Balance, Insights Net Cash Flow, Savings Rate Trend "Cash Flow" view, Monthly Summary | Goal purchases included; they cancel out |
| Total Expense (monthly) | Expenses excluding goal purchases; goal purchases shown as "+ ₱X from goals" | Insights Total Expense, History Expenses, Home Monthly Net, Monthly Summary (no separate line) | |
| Monthly Net | Income − Total Expense | Home | |
| Savings Rate | (Income − Total Expense − Debt Principal Repaid) ÷ Income × 100 | Insights card, Savings Rate Trend ("Rate" and "Saved" views), Monthly Summary, Month-End Projection popup, AI | Month-End Projection uses principal actually repaid so far this month, not a projection *(2026-09-28)* |
| Category breakdown / Top Category | All expenses, including goal purchases; each row also carries `goalFundedAmount` | Insights pie, Top Spending list, All Categories, Top Category tile | |
| Budget spent | Category spending excluding goal purchases | Budget Health, Home budget %, budget bars in the spending breakdown, Smart Suggestions, Monthly Summary budget alerts, AI budgets, over-budget alerts | The goal was the budget for its own purchases |
| Burn Rate | Average of prior months' spending, excluding goal-tagged transactions and debt principal/interest (6-month → 3-month → this-month fallback) + debt minimum payments + goal monthly contributions | Home, Insights Burn Rate and Annualized Expense, Financial Health, Debts Time Cost, AI snapshot | Base is `getBurnRateBase`; debt fees stay in *(2026-09-28)*. The Comparison Chart's 3M/6M/1Y averages leave out goal purchases and skip the debt/goal add-on, since they're compared against plain monthly spending |
| Runway | Cash Balance ÷ Burn Rate | Same places as Burn Rate | |
| Daily Average | Total Expense this month ÷ days elapsed | Insights | |
| Safe-to-Spend (Daily / Weekly) | Allowance from your 90-day non-recurring spending (same base as Burn Rate, so debt fees count) − spending so far this period − the day's or week's share of remaining debt and goal obligations | History | |
| Safe-to-Spend (Monthly / Yearly / Calendar) | Income + upcoming recurring income − spending so far − **all** transfers out − upcoming recurring bills − projected living costs (90-day allowance × days left) − remaining debt and goal obligations | History | Investment buys, plain transfers and money lent out lower this view but not Daily/Weekly *(documented 2026-09-28)* |
| Net Worth (Projected) | Cash + investment market value + goal balances − (principal + projected future interest on active debts you owe) | Home "Projected Net Worth" card and its info popup | Includes future interest on purpose, and is labeled "Projected" *(relabeled 2026-09-27)*. Money owed to you isn't an asset until repaid |
| Total Debt | Current principal on active debts you owe | Home Debts card, Financial Health, AI snapshot | No future interest |
| Debts Drag | Runway without debt payments − runway with them (living costs include goal contributions) | Home, Financial Health | |

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
