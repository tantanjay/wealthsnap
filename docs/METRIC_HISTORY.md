# Metric History

How each metric's rule changed over time, one timeline per metric. [METRICS.md](METRICS.md) says what's true now; this file says how it got there.

**Before changing a metric, read its timeline.** If the change undoes part of an earlier one, mark it **↩** and name that version, both here and in the release notes.

`master`'s history was rewritten after 1.15.0. Its log still covers every version, but under different commit IDs, so tags `v1.0.0`–`v1.15.0` aren't ancestors of `master` and ranges like `v1.14.0..master` don't work. To read old code, run `git fetch --tags`, then `git show v1.X.0:<path>`. The `v1.0.0` tag holds only the project scaffold; the code that shipped as 1.0.0 is at `v1.0.1`.

---

## Cash Balance

**Shown on:** Home · Insights · Financial Health · History · Chat

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | Lifetime Income − Expense | Home Total Balance |
| 1.7.0 | (Income + Transfer In) − (Expense + Transfer Out) | Home Cash Balance and History count transfers, introduced this version |
| 1.8.1 | Same, for Insights too | Insights Runway's balance now counts transfers |
| Unreleased | Every recorded transaction, future-dated included | Runway-drop alert stopped cutting off at today; hand-rolled copies in five files merged into `calculateBalance` |

## Runway

**Shown on:** Home · Insights · Financial Health · Chat · runway-drop alert

Runway = Cash Balance ÷ Burn Rate. Changes to the divisor are in [Burn Rate](#burn-rate); this table covers where Runway is shown and the runway-drop alert.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.3.1 | Balance ÷ Burn Rate | Runway card on Insights |
| 1.4.0 | Same | Runway popup now says it's your *tracked* balance, not your bank balance |
| 1.8.1 | Alert: Balance ÷ plain 6-month expense average | Runway-drop alert added (fires on a ≥25% drop vs last month). Until Unreleased it picked up no later Burn Rate change: no debt payments, goal contributions or debt/goal filtering |
| 1.10.0 | Same | Runway added to the new Financial Health screen and Home card |
| 1.15.0 | Same | Chat gets its own Runway |
| 1.18.0 | Same | Runway-drop alert no longer drops the last day of last month |
| Unreleased | Alert uses the screens' Runway | Runway-drop alert now compares the same Runway and last-month figure as Runway Change (`calculateRunwayTrend`) |

## Runway Change

**Shown on:** Home · Financial Health · runway-drop alert

Runway now − Runway at the end of last month, on Home and Financial Health. Last month's divisor follows Burn Rate's base changes (1.17.0, 1.18.0, Unreleased); this table covers the rest.

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Last month's debt payments = debts active today that had started by then | Introduced. Financial Health dropped last month's final day |
| 1.13.0 | Debts you owe that were open last month | Money owed to you left out; a paid-off debt still counts for the months before its payoff, guessed from when it was last edited |
| 1.16.0 | Same | Whether a debt was open last month is worked out from its transactions, so editing a paid-off debt no longer skews it |
| 1.17.0 | Debts you owe, active today, that were open last month | **↩ Partly undoes 1.13.0/1.16.0.** A debt paid off or forgiven is left out of last month too, so paying one off doesn't show as a runway gain |
| 1.18.0 | + goal contributions | Today's contributions, since goals keep no history. Financial Health no longer drops last month's final day |
| Unreleased | Last month's balance = balance at last month's end; base uses Burn Rate's fallback as of then | Home and Financial Health share one calculation (`calculateRunwayTrend`), also used by the runway-drop alert. Home stopped counting later-dated transactions in last month's balance; Financial Health stopped overstating last month's runway for someone who started last month |

## Net Cash Flow (monthly)

**Shown on:** Home (Monthly Balance) · Insights (Net Cash Flow, Savings Rate Trend "Cash Flow" view) · Financial Health (Net Flow) · Monthly Summary

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

**Shown on:** Insights (Total Expense, Daily Average) · History (Expenses) · Home (Monthly Net) · Monthly Summary

| Version | Rule after this change | What changed |
|---|---|---|
| 1.0.0 | All expenses | Total Expense card on Insights |
| 1.3.1 | Daily Average = month's expenses ÷ days in the month | Daily Average card added |
| 1.7.0 | Monthly Net = Income − Expense, no transfers | Monthly Net card on Home |
| 1.8.1 | Daily Average = month's expenses ÷ days elapsed | Was ÷ days in the month. The in-app help kept the old wording until 1.16.0 |
| 1.12.0 | Same; a past month ÷ its full length | Insights month picker added; its cards follow the browsed month |
| 1.18.0 | Expenses leave out goal-funded purchases | Insights Total Expense and Daily Average, History Expenses, Monthly Summary, Month-End Projection and spending charts. Savings Goals added |
| Unreleased | Same; goal-funded purchases shown as "+ from goals" | Line added under Insights Total Expense, History Expenses and Home Expense; Home Monthly Net stopped subtracting them |

## Savings Rate

**Shown on:** Insights (card, Savings Rate Trend, Month-End Projection) · Monthly Summary · Chat

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

## Burn Rate

**Shown on:** Home · Insights (Burn Rate, Annualized Expense) · Financial Health · Debt Strategy (Time Cost) · Chat

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

## Debts Drag

**Shown on:** Home · Financial Health

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Runway without debt payments − Runway with them | Introduced on Financial Health and Home. Living costs count interest twice (see Burn Rate) |
| 1.13.0 | Same | Money owed to you no longer counted as a debt payment |
| 1.17.0 | Same | Financial Health: interest no longer counted twice (fees dropped too, see Burn Rate) |
| 1.18.0 | Same | Same fix on Home; goal-funded purchases left out of living costs. Goal contributions were added to Runway but not here |
| Unreleased | Living costs include goal contributions | Now measured against the real Runway |
| Unreleased | Same | Fees count as living costs again (↩ see Burn Rate) |

## Safe-to-Spend

**Shown on:** History

| Version | Rule after this change | What changed |
|---|---|---|
| 1.7.0 | This period's Income − Expense − upcoming recurring bills | Introduced on History (list and calendar) |
| 1.8.1 | Monthly: period income + upcoming recurring income − spending − transfers out − upcoming bills − daily living cost × days left. Daily/Weekly: living-cost allowance − spending so far | Living cost = average daily non-recurring spending over 90 days. Two formulas from here on |
| 1.10.0 | Same − remaining debt minimum payments | Debt obligations added |
| 1.13.0 | Same | Money owed to you no longer reserved as a payment |
| 1.18.0 | Same − remaining goal contributions; debt-tagged and goal-funded spending left out of the allowance | Lent money no longer treated as a payment; interest counted once (fees dropped too, see Burn Rate). Goal-funded purchases left out of spending so far; recurring goal contributions not counted as bills; bills on the 29th-31st keep their day |
| Unreleased | Same | Docs only: Daily/Weekly and Monthly formulas documented separately |
| Unreleased | Allowance keeps debt fees | ↩ See Burn Rate |

## Budget Health

**Shown on:** Insights (Budget Health, spending-breakdown bars) · Home (budget %) · Smart Suggestions · Monthly Summary · over-budget alerts · Chat

| Version | Rule after this change | What changed |
|---|---|---|
| 1.3.1 | Spent in budgeted categories ÷ total budgets | Introduced. Colors: green ≤80%, orange ≤100%, red >100% |
| 1.4.0 | Same | Colors: green ≤70%, orange ≤90%, red >90% |
| 1.18.0 | Same | Monthly Summary budget alerts, over-budget alerts and Chat budgets leave out goal-funded purchases; this card doesn't |
| Unreleased | Leaves out goal-funded purchases | Also Home budget %, spending-breakdown bars, Smart Suggestions |

## Net Worth / Total Debt

**Shown on:** Home (Projected Net Worth, Debts card) · Financial Health · Debt Strategy (Total Debt) · Chat

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Cash + investments − (debt principal + projected future interest) | Introduced on Home; Total Debt = principal only. Money owed to you counts as a liability in both |
| 1.13.0 | Same | Home: repayments on money owed to you now lower its balance. Financial Health's Total Debt drops money owed to you |
| 1.16.0 | Same | Debt screen: Total Debt, Interest Leak and payoff plan drop money owed to you |
| 1.17.0 | Cash + investments − (principal + projected interest) on debts you owe | Home Net Worth and Total Debt: money owed to you no longer a liability |
| 1.18.0 | + goal balances | Money in a goal still counts as yours |
| Unreleased | Same | Relabeled "Projected Net Worth" and "Debt + Interest" |
| Unreleased | Same | Documented: money owed to you isn't an asset until repaid (code already worked this way) |
