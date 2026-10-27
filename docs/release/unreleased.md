# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Feature Update)

---

## 🏠 Home Snapshot
- **One calm overview instead of five loud cards**: Home used to stack five full-color cards (Financial Health, Cash Flow, Portfolio, Debts, Savings Goals), each with its own big number, button and two or three swipe pages, which pushed your recent transactions far down the screen. Home now opens on a Snapshot: your Projected Net Worth as the one big number, how much it moved this month ("▲ ₱15,100 · 3.2% this month"), a small line showing the last six months, and your Runway and Total Assets underneath. "Details" opens Insights.
- **Four rows, one switch**: Cash, Investments, Loans and Goals each get one row with a short context line (money in and out, unrealized gain, what's due this month, % of target) and how it changed since last month. One "Overall / This month" switch above them replaces every card's swipe pages: in This month, Cash shows Income − Expense with transfers on the line below, and Loans shows how much of this month's minimum payments you've made. Tap a row to jump to its tab.
- **Recent transactions up front**: Your three latest transactions sit right under the rows, with "See all" opening the Ledger tab.
- **Home settings**: The sliders button opens a sheet to pick a privacy mode and drag the rows into your preferred order (net worth stays on top). Your old card order carries over automatically.
- **Everything else is one tab away**: A row of tabs under the greeting (Snapshot · Ledger · Holdings · Goals · Loans) stays in place while you scroll and opens the full view of each:
  - **Ledger**: search, All / Income / Expense / Transfers filters, this month's money in (income + transfers in) and out (expenses + transfers out), and every transaction grouped by day with the day's total. Tap the calendar link (or the floating gear's "Switch to Calendar View") for the month calendar. Tapping a transaction opens the same edit and delete options as History.
  - **Holdings**: your portfolio value and total return (unrealized gains, realized gains and dividends over everything you ever invested), with realized and dividends underneath, a bar showing how it splits across stocks, funds, crypto and other types, and each holding with its value, weight and return. Tap a holding for its trades, price and dividend history. Smart Advisor, dividends, the allocation treemap and "Fetch price list" sit under Tools.
  - **Goals**: what you've saved in goals, this month's contributions, and one progress row per goal with whether it's on track. "New goal" and tapping a goal (add funds, withdraw, pause, edit, delete) work as before. This replaces the Savings Goals screen.
  - **Loans**: switch between "You owe" and "Owed to you", see what's outstanding and still due (or still expected) this month, and one progress row per loan with its next due date. Tap a loan to record a payment, edit it or mark it paid off. Your payoff plan (debt-free date, Avalanche / Snowball, interest still to pay) and paid-off loans sit below. This replaces the Debt Strategy screen.
- **Obligations count each loan separately**: "₱3.1k of ₱4.5k due this month" now counts each loan's payment only up to its own minimum, so paying extra on one loan no longer makes another loan's unpaid minimum look covered.

## 🕶️ Privacy Modes: Open, Discreet, Hidden
- **Discreet keeps Home useful in public**: The old privacy toggle replaced every amount with `****`, which left Home blank and still told anyone looking over your shoulder there was something worth hiding. Discreet shows only numbers that reveal no amounts: your net worth's % change this month, savings rate, Runway in months, cash kept as a % of everything you've earned, investment return %, % of loans repaid and payments made, % to your goals and how many are on track, with progress bars. Transaction amounts are simply left out.
- **Hidden is today's privacy mode**: Every amount shows as `****`, keeping a leading + or − sign. If you had privacy turned on, you're in Hidden after the update; if it was off, you're in Open.
- **Every Home tab has a Discreet version**: Ledger hides transaction amounts and day totals and shows this month's Out as a % of In; Holdings shows total return, realized and dividend %, top holding, and each holding's weight and return; Goals shows % to target and how many goals got a contribution this month; Loans shows % repaid (or % collected for money owed to you), how many of this month's payments were made, and the payoff plan's interest as a % of what you owe.
- **Applies everywhere**: Screens that don't have a Discreet design yet (History, Investments, Insights, and others) show Hidden while Discreet is on. History's and Investments' eye buttons are gone, since privacy now lives in Home settings; Insights' eye button and the floating gear's privacy item still switch between Open and Hidden.
- **New Help Center guide**: "Home Snapshot" explains every number on the Snapshot and what each privacy mode shows.

---

**Previous Version:** 1.19.0
**Package:** `com.christian.soyosa.WealthSnap`
