# Metric History

How each metric's rule changed over time, one timeline per metric. [METRICS.md](METRICS.md) says what's true now; this file says how it got there.

**Before changing a metric, read its timeline.** If the change undoes part of an earlier one, mark it **↩** and name that version, both here and in the release notes.

`master`'s git history was rewritten before 1.15.0, so `git log` on `master` stops there. The older code is still in the tags `v1.0.0`–`v1.14.0`: run `git fetch --tags`, then `git show v1.X.0:<path>`.

---

## Cash Balance / Runway

| Version | Rule after this change | What changed |
|---|---|---|
| 1.3.1 | Runway = (lifetime Income − Expenses) ÷ Burn Rate | Runway card introduced |
| 1.4.0 | Same | Info popup now says it's your *tracked* balance, not your bank balance |
| 1.8.1 | Balance = (Income + Transfer In) − (Expense + Transfer Out) | Transfers now counted in the balance |
| 1.8.1 | Same | Runway-drop alert added (fires on a ≥25% drop vs last month) |
| 1.10.0 | Runway = Balance ÷ (Burn Rate + debt minimum payments) | Debt obligations added |
| 1.13.0 | Same | Money owed to you no longer counted as your obligation |
| 1.18.0 | Same | Last day of the month no longer dropped from Runway Change and the runway-drop alert |
| Unreleased | Same | Chat uses the same new-user fallback as the screens |
| Unreleased | Balance counts every recorded transaction, future-dated included | Runway-drop alert and Financial Health net flow stopped cutting off at today; five separate copies merged into `calculateBalance` |

## Net Cash Flow (monthly)

| Version | Rule after this change | What changed |
|---|---|---|
| 1.1.0 | Income − Expense for the month | Overview card on Insights |
| 1.10.1 | (Income + Transfer In) − (Expense + Transfer Out) | Financial Health's Net Flow counts transfers, so investing isn't counted twice |
| 1.14.0 | Same | Savings Trend gets a "Cash Flow" view using this formula |
| 1.18.0 | Same, for Insights too | Insights switched to the transfer-inclusive formula so goal contributions and goal purchases net out |
| 1.18.0 | Same | Last day of the month no longer dropped |

## Total Expense / Monthly Net / Daily Average

| Version | Rule after this change | What changed |
|---|---|---|
| 1.1.0 | All expenses | Total Expense card on Insights |
| 1.3.1 | Same | Daily Average card added |
| 1.7.0 | Monthly Net = Income − Expense, no transfers | Monthly Net card on Home |
| 1.18.0 | Insights Total Expense and Daily Average leave out goal-funded purchases | Savings Goals added |
| Unreleased | Goal-funded purchases left out everywhere, shown as "+ from goals" | Home Monthly Net stopped subtracting them; History Expenses matches |

## Savings Rate

| Version | Rule after this change | What changed |
|---|---|---|
| 1.1.0 | (Income − Expense) ÷ Income | Card on Insights |
| 1.10.0 | Trend chart: (Income − Expense − Debt Principal Repaid) ÷ Income | Chart counts principal as spent; **the card doesn't** |
| 1.13.0 | Same | Lending money out no longer counted as a repayment |
| 1.14.0 | Same | Chart gets Rate / Saved / Cash Flow views |
| 1.18.0 | Expense leaves out goal-funded purchases | Savings Goals added |
| 1.18.0 | Same | Chart no longer mixes up months' repayments on the 29th-31st |
| Unreleased | (Income − Expense − Debt Principal Repaid) ÷ Income, everywhere | Card, Monthly Summary and Month-End Projection now count principal as spent, matching the chart |

## Burn Rate

| Version | Rule after this change | What changed |
|---|---|---|
| 1.1.0 | Average monthly expense over the last 6 months, this month included | Card on Insights; skips empty past months |
| 1.3.1 | Same | Averages over no more months than the account is old |
| 1.7.0 | Average of prior months' expenses | Leaves out the current, in-progress month |
| 1.10.0 | Average + debt minimum payments (Runway) | Debt obligations added. **Interest now counted twice**: as spending and inside the minimum payment |
| 1.13.0 | Same | Money owed to you no longer counted as your obligation |
| 1.17.0 | Leaves out every debt-tagged transaction + minimum payments | Financial Health, Chat, Monthly Summary: fixed the interest double-count. **Also dropped fees**, which the minimum payment doesn't cover |
| 1.18.0 | Same, plus goal contributions from each goal's settings; goal-funded purchases left out | Same fix on Home, Insights, Debt vs Life; Savings Goals added |
| Unreleased | Same | Chat uses the same new-user fallback as the screens |
| Unreleased | Leaves out debt principal/interest only; fees stay in | **↩ Reverses the fees half of 1.17.0/1.18.0.** One shared base (`getBurnRateBase`) replaces six copies |

## Debts Drag

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Runway without debt payments − Runway with them | Introduced with Financial Health |
| 1.17.0 | Same | Financial Health: interest no longer counted twice (fees dropped too, see Burn Rate) |
| 1.18.0 | Same | Same fix on Home |
| Unreleased | Living costs include goal contributions | Now measured against the real Runway |
| Unreleased | Same | Fees count as living costs again (↩ see Burn Rate) |

## Safe-to-Spend

| Version | Rule after this change | What changed |
|---|---|---|
| 1.7.0 | Balance − upcoming recurring bills | Introduced on the History calendar |
| 1.8.1 | (Cash + future income) − (future bills + daily living cost × days left) | Living cost = average daily non-recurring spending |
| 1.10.0 | Same − debt minimum payments | Debt obligations added |
| 1.18.0 | Same − goal contributions; debt-tagged and goal-funded spending left out of the allowance | Lent money no longer treated as a payment; interest counted once (fees dropped too, see Burn Rate) |
| Unreleased | Daily/Weekly and Monthly formulas documented separately | Docs only; the code already had two formulas |
| Unreleased | Allowance keeps debt fees | ↩ See Burn Rate |

## Budget Health

| Version | Rule after this change | What changed |
|---|---|---|
| 1.3.1 | Spent in budgeted categories ÷ total budgets | Introduced |
| 1.4.0 | Same | Colors: green <70%, orange 70–90%, red >90% |
| Unreleased | Leaves out goal-funded purchases | Also Home budget %, spending-breakdown bars, Smart Suggestions |

## Net Worth / Total Debt

| Version | Rule after this change | What changed |
|---|---|---|
| 1.10.0 | Cash + investments − (debt principal + projected future interest) | Introduced; Total Debt = principal only |
| 1.13.0 | Same | Financial Health: money owed to you no longer a liability |
| 1.16.0 | Same | Debt screen: same fix |
| 1.17.0 | Same | Home: same fix |
| 1.18.0 | + goal balances | Money in a goal still counts as yours |
| Unreleased | Same | Relabeled "Projected Net Worth" and "Debt + Interest" |
| Unreleased | Same | Documented: money owed to you isn't an asset until repaid (code already worked this way) |
