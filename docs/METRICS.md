# Metric Definitions

This is the single source of truth for what each number in the app includes and excludes, and where it's shown. To change how a metric works, change its rule here first, then update every place listed in its row. Also update its user-facing explanations (see `PROJECT.md` → Calculation explanations).

## Shared rules

These apply to every metric unless its row says otherwise.

- **Goal-funded purchase** (an `EXPENSE` tagged `savingsGoalId`, paired with a `GOAL_SPEND` `TRANSFER_IN`). Its cash left when it was contributed to the goal, so it's left out of spending totals, rates, averages and budgets. It stays visible in category breakdowns and as a separate "+ from goals" line. *(v1.18.0; display rule 2026-09-27)*
- **Goal contribution** (a `TRANSFER_OUT` tagged `savingsGoalId`). It's a transfer, not an expense. Burn-rate metrics add each goal's monthly contribution from its settings instead of scanning history.
- **Debt principal repaid** (a `TRANSFER_OUT` with a `debtId` and subCategory `PRINCIPAL`). Counts as spent for Savings Rate only. *(chart since v1.10.0; card and summary since 2026-09-27)*
- **Debt interest** (an `EXPENSE` with a `debtId`). A normal expense, except that burn-rate metrics leave it out, because they add each debt's minimum payment, which already includes interest.
- **RECEIVABLE debts** (money owed to you). Never a liability.
- **Investment amounts** are stored in your profile currency. To show the original currency, divide by `exchangeRate` for any rate other than 1. Never multiply by the rate again.

## Metrics

| Metric | Formula | Shown on | Notes |
|---|---|---|---|
| Cash Balance | (Income + Transfer In) − (Expense + Transfer Out), all-time | Home Cash Balance, Insights, Financial Health, AI snapshot | Goal purchases cancel out to ₱0 through their matching transfer |
| Monthly Balance / Net Cash Flow | Same formula, one month | Home Monthly Balance, Insights Net Cash Flow, Savings Rate Trend "Cash Flow" view, Monthly Summary | Goal purchases included; they cancel out |
| Total Expense (monthly) | Expenses excluding goal purchases; goal purchases shown as "+ ₱X from goals" | Insights Total Expense, History Expenses, Home Monthly Net, Monthly Summary (no separate line) | |
| Monthly Net | Income − Total Expense | Home | |
| Savings Rate | (Income − Total Expense − Debt Principal Repaid) ÷ Income × 100 | Insights card, Savings Rate Trend ("Rate" and "Saved" views), Monthly Summary, AI | **Known gap:** the Month-End Projection popup leaves out principal |
| Category breakdown / Top Category | All expenses, including goal purchases; each row also carries `goalFundedAmount` | Insights pie, Top Spending list, All Categories, Top Category tile | |
| Budget spent | Category spending excluding goal purchases | Budget Health, Home budget %, budget bars in the spending breakdown, Smart Suggestions, Monthly Summary budget alerts, AI budgets, over-budget alerts | The goal was the budget for its own purchases |
| Burn Rate | Average of prior months' spending, excluding goal- and debt-tagged transactions (6-month → 3-month → this-month fallback) + debt minimum payments + goal monthly contributions | Home, Insights Burn Rate and Annualized Expense, Financial Health, AI snapshot | The Comparison Chart's 3M/6M/1Y averages leave out goal purchases and skip the debt/goal add-on, since they're compared against plain monthly spending |
| Runway | Cash Balance ÷ Burn Rate | Same places as Burn Rate | |
| Daily Average | Total Expense this month ÷ days elapsed | Insights | |
| Safe-to-Spend | Allowance from your 90-day non-recurring spending (excluding goal- and debt-tagged) − spending so far this period − remaining debt and goal obligations | History | |
| Net Worth (Projected) | Cash + investment market value + goal balances − (principal + projected future interest on active debts you owe) | Home "Projected Net Worth" card and its info popup | Includes future interest on purpose, and is labeled "Projected" *(relabeled 2026-09-27)* |
| Total Debt | Current principal on active debts you owe | Home Debts card, Financial Health, AI snapshot | No future interest |
| Debts Drag | Runway without debt payments − runway with them (living costs include goal contributions) | Home, Financial Health | |
