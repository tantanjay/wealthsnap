# WealthSnap Unreleased – Release Notes

**Status:** Unreleased
**Build:** TBD

---

## 🔄 Sync from Device
A new way to keep two phones in sync without a cloud account — WealthSnap has no server, so this works directly between your devices over WiFi.

- **Pair with a QR code**: from Profile → Data Management → Sync from Device, one phone shows a QR code and the other scans it. Scanning is the only thing that authorizes the connection — there's no password to type, and nothing is broadcast on the network for another device to see or impersonate.
- **Two-way merge, not a one-way restore**: unlike Restore (which wipes and replaces everything), syncing merges — new entries from either device end up on both, and if the same entry was edited on both sides, the newer edit wins. Deletes are tracked too, so removing something on one device removes it from the other the next time they sync.
- **Self-expiring, one-time codes**: a shown QR code stops working after 60 seconds, and immediately after the first successful sync, so an old code can't be scanned again later.
- **Same WiFi network required**: both devices need to be on the same WiFi to connect directly — there's no internet or cloud relay involved.

---

## 📊 Export to Excel
A new way to get your data out of WealthSnap as a plain file you can open directly in Excel or Google Sheets — for personal analysis, taxes, or sharing with an accountant. This is separate from Backup, which stays password-encrypted and is meant for restoring into the app, not for reading.

- **One file, four sheets**: from Profile → Data Management → Export to Excel, generates a single .xlsx with your full Transactions ledger, every Investment record (buys, sells, dividends, and interest), your Debts, and a dedicated Debt Payments sheet listing every payment, fee, and initial draw linked to a debt, joined to that debt's name for readability.
- **Debt payments appear in both places**: rather than pulling debt-linked transactions out of the main ledger, they stay in the Transactions sheet too so your cashflow totals stay complete, and are also broken out in Debt Payments for a focused view per debt.
- **Unencrypted by design**: unlike Backup, this writes plain, human-readable values with no password — treat the resulting file like any other sensitive financial document once it leaves the app.

---

## ⚡ Performance
- **Smoother History screen**: list rows now skip re-rendering when nothing about them actually changed — typing in search, switching a filter, or opening a transaction's details no longer re-renders every visible row. Most noticeable with a large transaction history.
- **Faster recurring transaction catch-up**: generating missed recurring transactions after being away for a while now happens as a couple of batched writes instead of one database write per transaction, so a long gap since your last visit catches up much faster.

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
Fixed a legibility bug on the Supporter (Thank You) screen affecting both light and dark mode.

- **Readable in both themes**: every donor name style previously used one fixed stroke/gradient palette, so it only ever looked right in whichever theme it happened to be tuned for — near-black styles (Ninja, Shadow, Demon, Emerald, Magma, and others) faded into the dark background, while pale styles (Angelic, Crystal, Anime, and others) washed out against the light background. Each style now defines separate colors for light and dark mode, so it stays clearly legible regardless of theme.

---

## 🗂️ Record Menu
- **Chat moved into the Record menu**: previously only reachable via the Floating Quick Actions gear, Chat is now the third AI Assistant option in the Record menu, alongside Scan and Upload.
- **Renamed the Record menu header**: "New Record" / "Choose what you want to record" is now "Quick Actions" / "Choose what you want to do", since the menu covers more than just adding records now.

---

## 🏷️ Categories
- **Two new Tech categories**: added Electronics and Gadgets & Devices to the Communication & Tech group, alongside Tech Gear.

---

## 🛠️ Reliability Fixes
- **Home's "Net Worth" display mode now persists**: choosing Net Worth as the Financial Health card's view previously wasn't recognized when the app reloaded the saved preference, so it silently fell back to the default view instead of staying selected.
- **Clearing app data now fully resets Monthly Summaries**: the data-wipe step (used by Restore and other resets) skipped the Monthly Summary table, so old AI-generated month narratives could still show up in Insights after a reset. Also fixed a related edge case where a transaction change made right as the app was starting up could resurface later after a full reset.
- **Semi-Weekly reminders now appear in Catch-up**: reminders set to repeat every 3 days were silently excluded from the missed-reminders catch-up list and would never prompt you.

---

## 🔒 Security
- **Debt name and interest rate are now encrypted**: every other debt field (amount, payments, fees, notes) was already encrypted at rest — name and interest rate were the two exceptions. Existing debts are re-encrypted automatically the next time the app starts, no action needed.
- **PIN is now hashed, with a lockout after repeated wrong attempts**: your PIN was previously stored as-is in the device's secure storage; it's now stored as a one-way hash instead, so it can't be read back even if that storage were somehow compromised. Entering the wrong PIN 5 times in a row now locks PIN entry for 30 seconds before another attempt is allowed (Face ID/Touch ID unlock isn't affected by this). Existing PINs are upgraded to a hash automatically the next time you unlock successfully — no need to reset it.

---

**Previous Version:** 1.15.0
**Package:** `com.christian.soyosa.WealthSnap`
