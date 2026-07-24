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
- **More resilient deletes**: deleting a transaction, budget, debt, recurring rule, reminder, or investment now records that deletion atomically with the delete itself, so an interrupted sync can't leave a deletion that never makes it to the other device.
- **Partial sync results are now visible**: if one part of a sync fails (an unexpected or corrupted record) while the rest succeeds, you'll see a summary of what did and didn't go through instead of a blanket "Sync Failed" screen.

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
- **Due date no longer skips ahead for debts with no minimum payment**: a debt with its minimum payment left at $0 (an informal, interest-free loan, for example) was treated as if that $0 minimum had already been met the instant the month began, so its due date always showed one month ahead of the real one and never flagged as overdue or due soon.
- **Receivable debts no longer counted as liabilities on the Debt screen**: Home and Financial Health already correctly exclude money owed *to* you (Receivable debts) from what you owe — the Debt screen's own Total Debt, Interest Leak, and payoff simulation didn't get the same treatment, so a receivable could inflate your total debt and even show up as interest you're "losing" instead of earning. Receivables still appear in Priority Payoff so you can track and record repayments on them — they just aren't counted as debt anymore.

---

## 📈 Investments
Fixes to gain/loss percentages, the Dividend Dashboard, and Smart Advisor, found across the Help Center review and a deep code review of previously shipped features.

- **Accurate Realized P/L %**: the percentage under Realized P/L was hardcoded to always display "0.00%" no matter your actual gains or losses. It now reflects your real return — realized profit/loss divided by the original cost basis of the shares you actually sold (not your remaining holdings), computed the same way Unrealized P/L's percentage already was.
- **"N/A" instead of a misleading 0% for free shares**: if you record shares with a $0 cost basis (a stock grant, airdrop, or gift), any resulting gain has no defined percentage to divide by — showing "0%" made a real profit look like a flat break-even. Unrealized P/L, Realized P/L, the Holdings List's per-holding percentage, and the Allocation Chart now all show "N/A" in that specific case instead, while a position with genuinely zero cost basis *and* zero value (i.e. nothing held) still correctly shows 0%.
- **Deleting an investment now cleans up its linked Realized P/L entry**: deleting a sold position previously left its Capital Gain/Loss transaction behind with no matching cost basis, silently skewing the Realized P/L% shown elsewhere in the portfolio. Deleting an investment now removes that linked entry too.
- **Dividends paid twice in one month are no longer dropped**: the Dividend Dashboard's Projected and Calendar views only kept one dividend event per month per holding — if a stock paid both a regular and a special dividend in the same month (or an AI-fetched history refresh produced a duplicate entry), one of them was silently discarded instead of both being counted.
- **AI-fetched dividend dates no longer land in the wrong month**: dividends fetched via the AI historical lookup are stored as a plain date (no time zone), but were being read back through your device's local time zone, which could shift the date into the previous (or, for January 1st, the previous year's) month depending on where you are. Manually-entered dividends were never affected.
- **Smart Advisor alerts no longer go stale after navigating away**: Crash/Dip/Dividend/Balance suggestions only refreshed when the screen first loaded or when you changed the priority filter — leaving Investments and coming back (e.g. after checking a stock's detail) wouldn't pick up any change in your holdings until you pulled to refresh. They now refresh every time you return to the screen.
- **Price history entries on a range boundary were sometimes skipped**: AI-fetched price data is stored as a plain date while other lookups compare full timestamps, so a price recorded exactly on the edge of a date range (like Smart Advisor's 30-day lookback) could be silently excluded, understating the real 30-day high used for Crash/Dip detection.
- **A failed exchange-rate fetch during a price refresh could silently save the wrong value**: if the exchange rate lookup failed while refreshing a foreign-currency holding's price (a network hiccup, a rate-limited API), the raw un-converted price was still saved and labeled as your profile currency instead of being skipped, understating that holding's value until the next successful refresh corrected it.
- **Refreshing prices for the same stock at the same time could create duplicate entries**: tapping "Fetch Today's Prices" twice in quick succession, or triggering a refresh from two different screens at once, could create two price-history rows for the same stock on the same day, with no guarantee which one showed as the "latest" price.
- **Smart Advisor's dividend alert could miss the actual ex-dividend date**: the "📅 DIV SOON" badge for AI-fetched dividend dates compared a date parsed in UTC against your local time, which could make the alert disappear on the ex-dividend date itself for part or all of the day, depending on your timezone — the exact day the reminder matters most.
- **Balance alerts could never point you toward a sector you don't own at all**: Smart Advisor's Balance suggestion only ever considered sectors you already held at least one stock in, so it could suggest adding to an underweight sector but never flag a sector you had zero exposure to — even though that's what its own description promises.
- **Balance and Crash alerts no longer merge into one confusing line**: if the stock Smart Advisor picked for a Balance suggestion was also flagging as a Crash, the two used to combine into a single line like "🔥 CRASH(-22%) + ⚖️ BAL" — reading as a contradictory "buy more" and "this is dropping" message at once. They now always show as separate suggestions.
- **Smart Advisor help text corrected**: the "How Smart Alerts Work" guide said Crash alerts trigger on a >10% drop; the actual threshold (and the one used elsewhere in the same guide) is >15%.

---

## 📊 Insights
Three fixes found during a deep code review of previously shipped features.

- **Month navigation no longer skips or gets stuck near month-end**: the back/forward chevrons and month picker used JavaScript's default date-arithmetic, which doesn't handle short months correctly when the currently browsed day doesn't exist in the target month — browsing to January 31st and tapping "forward" could jump straight to March, skipping February entirely, and tapping "back" from certain end-of-month dates could silently fail to move at all.
- **A fast tap right after opening a chart no longer gets silently undone**: Savings Rate Trend, Comparison Chart, Income Analysis, and Monthly Pulse each restore your last-selected tab/range from your previous visit. If you tapped a different tab before that restore finished loading, your tap could be immediately reverted back to the old selection with no indication anything happened. Tapping now always sticks, regardless of timing.
- **Category trend drill-down now respects the month you're browsing**: tapping a category to see its trend showed data for the current calendar month even while you were browsing a different month via the month picker at the top of Insights.

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
- **No more corrupted backups from an interrupted write**: a scheduled backup writes straight to disk in the background, where the OS can suspend or kill the app mid-write with no warning. Previously that could leave a truncated, unreadable file sitting under the real backup's filename with no indication anything was wrong. It now writes to a temporary file first and only moves it into place once the write finishes, so an interruption never corrupts the file you'd actually try to restore from later.

---

## 💾 Restore
- **A failed restore no longer costs you your data**: restoring wipes your existing data before writing the backup's data back in its place. If something went wrong partway through that second step (a corrupted entity in the backup file, a storage error), you'd previously be left with neither the old data nor a complete new one. Restore now snapshots your current data first, and automatically rolls back to it if anything fails partway through — you'll see a clear "your previous data has been restored, nothing was lost" message instead.
- **Backups with investment price history could fail to restore, or silently corrupt price data**: a parameter-count bug in the bulk price-history write meant a backup that included investment price history could fail the entire restore outright, or store the currency code in place of the exchange rate instead, corrupting later portfolio calculations. Found during a deep code review of previously shipped code.

---

## 📅 Monthly Summary
Several fixes found during a deep code review of previously shipped features, covering both the in-app Monthly Summary view and the copy of it sent to Chat.

- **Notes and debt names are now encrypted at rest**: Monthly Summary caches a narrative + structured snapshot per month, including transaction notes and debt names — the same fields that are encrypted everywhere else they're stored. That cache was being written in plain text, running automatically in the background regardless of whether you'd consented to AI features at all. It's now encrypted the same way, and existing cached summaries are cleared once so they regenerate correctly.
- **Amounts now show your real currency**: every amount in Monthly Summary (and the copy sent to Chat) was labeled "PHP" regardless of your profile's actual currency setting.
- **Transactions near a month boundary now land in the right month**: dates are stored as UTC timestamps, and Monthly Summary was comparing them as UTC calendar dates against a month boundary computed from your local time — for timezones ahead of UTC, a transaction logged late at night could get filed under the previous month instead of the one it actually happened in.
- **A $0 budget no longer shows "Infinity%"**: a budget category with its amount set to zero could show up as an impossible over-budget percentage instead of being skipped.
- **Transaction notes are now sanitized before reaching the AI**: notes (including ones transcribed by receipt scanning) were spliced directly into the text sent to Gemini with no escaping. A note containing quotes or line breaks could distort the surrounding context; it's now stripped of anything that could do that first.

---

## 🎯 Floating Quick Actions Gear
Two UI fixes found during a deep code review of previously shipped features.

- **Manual repositioning now survives rotation**: after dragging the floating bubble to a preferred spot, rotating the device used to snap it back to wherever it first landed when detached, discarding the manual placement. It now remembers where you last dropped it for the rest of the session.
- **No more stray border on the last menu row**: depending on which optional rows were showing, the actual last row in the Quick Actions menu could show a leftover default-colored border instead of no border at all.

---

## 🎯 Smart Suggestions
Three fixes found during a deep code review of previously shipped features.

- **Occasional expenses are now labeled, not suggested as a recurring cost**: a one-off expense (a single car repair, say) was averaged the same way as a genuinely monthly one, suggesting a budget that implied it happens every month. Categories active in only a few months are now footnoted as occasional instead.
- **Applying suggestions now reports partial success accurately**: if one budget failed to save while others succeeded, you'd previously just see a generic failure with no indication anything had gone through. It now reports exactly how many succeeded and which ones failed, and only removes the successful ones from the list.
- **New users no longer see a false "already matches" message**: with no prior-month spending history yet, the empty suggestions list said your budgets already matched your spending — there was simply no data to compare against. It now says so.

---

## 📥 CSV Import
- **Income no longer falsely flagged as a duplicate expense**: a few categories (Insurance, Interest, Others, Uncategorized) are valid for both income and expenses. Duplicate detection didn't check which type a row was, so a legitimate income transaction could be rejected as a duplicate of an unrelated expense sharing the same date, amount, and category.

---

## 🎉 Supporter Screen
Fixed a legibility bug on the Supporter (Thank You) screen affecting both light and dark mode.

- **Readable in both themes**: every donor name style previously used one fixed stroke/gradient palette, so it only ever looked right in whichever theme it happened to be tuned for — near-black styles (Ninja, Shadow, Demon, Emerald, Magma, and others) faded into the dark background, while pale styles (Angelic, Crystal, Anime, and others) washed out against the light background. Each style now defines separate colors for light and dark mode, so it stays clearly legible regardless of theme.

---

## 🗂️ Record Menu
- **Chat moved into the Record menu**: previously only reachable via the Floating Quick Actions gear, Chat is now the third AI Assistant option in the Record menu, alongside Scan and Upload.
- **Renamed the Record menu header**: "New Record" / "Choose what you want to record" is now "Quick Actions" / "Choose what you want to do", since the menu covers more than just adding records now.
- **Bottom tab renamed from "Record" to "Actions"**: matches the Record menu's own "Quick Actions" rename above.

---

## 🏷️ Categories
- **Two new Tech categories**: added Electronics and Gadgets & Devices to the Communication & Tech group, alongside Tech Gear.

---

## 🛠️ Reliability Fixes
- **Home's "Net Worth" display mode now persists**: choosing Net Worth as the Financial Health card's view previously wasn't recognized when the app reloaded the saved preference, so it silently fell back to the default view instead of staying selected.
- **Clearing app data now fully resets Monthly Summaries**: the data-wipe step (used by Restore and other resets) skipped the Monthly Summary table, so old AI-generated month narratives could still show up in Insights after a reset. Also fixed a related edge case where a transaction change made right as the app was starting up could resurface later after a full reset.
- **Semi-Weekly reminders now appear in Catch-up**: reminders set to repeat every 3 days were silently excluded from the missed-reminders catch-up list and would never prompt you.
- **Background tasks now actually run after updating**: a past migration to a newer background-scheduling library reused the same internal task name, so any device that had the app installed before that update silently kept its *old* registration and never picked up the new one — with no error, no crash, nothing. Recurring transactions, Monthly Summary syncing, and Auto Backup could all quietly stop running in the background for existing users (fresh installs were unaffected). Background tasks now register under a new identifier so every device re-registers correctly.
- **Prior-month debt obligations no longer skewed by later edits**: Home and Financial Health's runway-change trend estimates how much you owed as of last month using a debt's last-edited timestamp as a stand-in for when it was paid off — so editing a paid-off debt's name or notes well after payoff could make it look like it was still active during a month it wasn't. This now reconstructs the debt's actual balance as of that date from your transaction history instead.

---

## 🔒 Security
- **Debt name and interest rate are now encrypted**: every other debt field (amount, payments, fees, notes) was already encrypted at rest — name and interest rate were the two exceptions. Existing debts are re-encrypted automatically the next time the app starts, no action needed.
- **PIN is now hashed, with a lockout after repeated wrong attempts**: your PIN was previously stored as-is in the device's secure storage; it's now stored as a one-way hash instead, so it can't be read back even if that storage were somehow compromised. Entering the wrong PIN 5 times in a row now locks PIN entry for 30 seconds before another attempt is allowed (Face ID/Touch ID unlock isn't affected by this). Existing PINs are upgraded to a hash automatically the next time you unlock successfully — no need to reset it.

---

**Previous Version:** 1.15.0
**Package:** `com.christian.soyosa.WealthSnap`
