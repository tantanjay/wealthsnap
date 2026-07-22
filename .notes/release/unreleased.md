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

## 💳 Debt Strategy
Three fixes to the Debt Strategy screen's math and payment tracking, found during a review of the new Help Center guide.

- **Interest Leak now respects interest type**: it was computing every debt's hourly interest off its current shrinking balance, even Flat-rate debts — which contradicts how Flat interest actually works elsewhere in the app (always charged on the original principal, never the paid-down balance). Flat-rate debts were showing an ever-decreasing "leak" as you paid them off, when the true interest cost stays constant until payoff. Now branches by interest type, matching the Next Payment Breakdown and payoff simulation.
- **Due date no longer rolls forward on a partial payment**: previously, any principal payment at all — even a small extra payment early in the month — marked the month as "paid" and silently advanced the due date to next month, hiding the fact that the rest of the minimum was still owed (and suppressing the Due Soon/Overdue flag with it). It now sums everything paid toward that debt this month (principal, interest, fees) and only advances once that total meets the minimum payment.
- **Warning for debts that can't be paid off at their minimum**: if a debt's minimum payment doesn't even cover its own interest, the balance never shrinks — the payoff simulation would previously just run out its 100-year cap and quietly show a distant "debt-free" date built on runaway interest, no different from every other debt. A red warning banner now names any debt in this state, so it's obvious the minimum needs to go up rather than looking like a routine slow payoff.

---

## 📈 Investments
Two fixes to how gain/loss percentages are calculated, the second found during a review of the new Help Center guide.

- **Accurate Realized P/L %**: the percentage under Realized P/L was hardcoded to always display "0.00%" no matter your actual gains or losses. It now reflects your real return — realized profit/loss divided by the original cost basis of the shares you actually sold (not your remaining holdings), computed the same way Unrealized P/L's percentage already was.
- **"N/A" instead of a misleading 0% for free shares**: if you record shares with a $0 cost basis (a stock grant, airdrop, or gift), any resulting gain has no defined percentage to divide by — showing "0%" made a real profit look like a flat break-even. Unrealized P/L, Realized P/L, the Holdings List's per-holding percentage, and the Allocation Chart now all show "N/A" in that specific case instead, while a position with genuinely zero cost basis *and* zero value (i.e. nothing held) still correctly shows 0%.

---

## 💬 Chat
Lower cost per message, plus a fix for a way the AI could misread your data.

- **Lower cost per message**: the financial context block (spending history, portfolio, debts) was being resent — and re-billed — in full on every single message in a conversation. It's now cached once per session via Gemini's context caching and reused for the rest of the conversation, with cached tokens billed at a fraction of the normal rate. Falls back to sending it inline as before if a cache can't be created or expires mid-session, so nothing breaks if caching isn't available.
- **AI now knows what day it is**: the context previously gave no sense of today's date, so an almost-empty current month could get compared against a full prior month as if they were equivalent (e.g. "your spending is down 80% this month"). The context now states today's date, and the current month's summary is explicitly labeled as in progress with a reminder not to compare it directly against a complete month.

---

## 🎨 App Icon
- **Refreshed app icon**: new icon design, also applied to the Android adaptive icon and web favicon.

---

## 📦 Auto Backup
- **Folder picker no longer left the app locked**: choosing a backup destination folder on Android backgrounds the app to show the system folder picker, same as the manual backup/restore file pickers. Unlike those, it wasn't exempted from the security lock, so returning to WealthSnap could drop you on the PIN/biometric screen. Picking or canceling a folder now temporarily disables the lock the same way the file pickers already do.

---

## 🎉 Supporter Screen
Fixed a dark mode legibility bug on the Supporter (Thank You) screen.

- **Readable in dark mode**: several donor name styles (Ninja, Shadow, Demon, and others that lean on near-black strokes and gradients) rely on a drop shadow behind the text for contrast. That shadow was hardcoded black, which only helps against a light background — in dark mode it blended into the background and made those names hard to read. The shadow now flips to a light backlight when the app is in dark mode, so every style stays legible regardless of theme.

---

## 🗂️ Record Menu
- **Chat moved into the Record menu**: previously only reachable via the Floating Quick Actions gear, Chat is now the third AI Assistant option in the Record menu, alongside Scan and Upload.
- **Renamed the Record menu header**: "New Record" / "Choose what you want to record" is now "Quick Actions" / "Choose what you want to do", since the menu covers more than just adding records now.

---

## 🏷️ Categories
- **Two new Tech categories**: added Electronics and Gadgets & Devices to the Communication & Tech group, alongside Tech Gear.

---

**Previous Version:** 1.15.0
**Package:** `com.christian.soyosa.WealthSnap`
