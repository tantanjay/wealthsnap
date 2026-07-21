# WealthSnap Unreleased – Release Notes

**Status:** Unreleased
**Build:** TBD

---

## 📖 Help Center
Two new guides, plus a refresh of two that had drifted out of sync with the app.

- **New: Debt Strategy guide** — explains Payable vs Receivable debts, the Estimated Debt-Free Date/Interest Leak/Time Cost cards, the Avalanche vs Snowball payoff strategies (and that the strategy toggle currently reorders your Priority Payoff list rather than changing the projected payoff date, since extra-payment simulation isn't wired to a UI control yet), how a recorded payment splits into Principal/Interest/Fee, the four interest types, and the underlying formulas (balance reduction, interest accrual, payoff simulation, progress %).
- **New: Investments guide** — explains the four Portfolio Stats cards, the Holdings List, the Allocation Chart (Stocks/Sector/Type treemap), the Dividend Chart (Actual/Calendar/Projected), and Smart Advisor's four alert types (Crash, Dip, Dividend, Balance) with their actual thresholds, plus formulas for cost basis, unrealized P/L, and dividend yield.
- **Financial Insights guide**: updated to reflect month browsing (tap the month label or use the chevrons to view any past month), the debt-adjusted Financial Runway and Burn Rate cards, the redesigned Savings Rate Trend chart (now three switchable views — Rate, Saved, Cash Flow), and the Comparison Chart's Trend/Compare modes. Smart Alerts now lists its actual three alert types (Budget Exceeded, Spending Spike, Runway Drop) instead of a vague description.
- **Math & Formulas guide**: formulas updated to match, including the debt-obligation addition to Burn Rate/Runway, the per-view Savings Rate Trend formulas, and the correct Spending Spike thresholds (previously showed a hardcoded "$1,000" absolute-difference threshold that didn't match the code or this app's currency).

---

## 📈 Investments
Fixed the Realized P/L stat card showing a meaningless percentage.

- **Accurate Realized P/L %**: the percentage under Realized P/L was hardcoded to always display "0.00%" no matter your actual gains or losses. It now reflects your real return — realized profit/loss divided by the original cost basis of the shares you actually sold (not your remaining holdings), computed the same way Unrealized P/L's percentage already was.

---

## 🎉 Supporter Screen
Fixed a dark mode legibility bug on the Supporter (Thank You) screen.

- **Readable in dark mode**: several donor name styles (Ninja, Shadow, Demon, and others that lean on near-black strokes and gradients) rely on a drop shadow behind the text for contrast. That shadow was hardcoded black, which only helps against a light background — in dark mode it blended into the background and made those names hard to read. The shadow now flips to a light backlight when the app is in dark mode, so every style stays legible regardless of theme.

---

**Previous Version:** 1.15.0
**Package:** `com.christian.soyosa.WealthSnap`
