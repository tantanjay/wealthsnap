# WealthSnap Unreleased – Release Notes

**Status:** In progress, not yet released
**Build:** Version TBD (Feature Update)

---

## 🗓️ Monthly Summary
A new way to see your month at a glance, written in plain language instead of raw numbers.

- **Narrative breakdown**: for any month, see income and expenses by category, savings rate, net cash flow, investment activity (buys, sells, dividends, realized P/L), debt payments and remaining balances, transfers, budget alerts, and unusual spending — all rendered as a readable summary block, not a spreadsheet.
- **Budget alerts show the full picture**: a flagged category now shows what the budget was actually set to alongside the overage, not just the percentage used.
- **Notes surface in top expenses**: if a transaction has a written note, it now shows next to that expense in the "Top Expenses" line — the note is often the thing that explains why it happened.
- **Automatic generation**: summaries are built in the background for every month you have data for, including a one-time catch-up of past months the first time this runs after updating. Already-closed months are cached, so this stays fast even with years of history.
- **Always up to date**: the current month keeps refreshing as you add transactions; a daily background check finalizes the previous month once it closes.
- **New Quick Actions entry**: accessible from the floating gear bubble's Quick Actions menu — pick a month from the chip selector to view its summary.
- **Manual Reprocess**: a "Reprocess All Months" button regenerates every summary on demand, useful after editing older transactions or debts.

This lays the groundwork for future AI-assisted insights — the generation itself is pure local computation with no AI calls or cost involved.

---

## 💬 Chat
Ask questions about your own finances in plain language, answered by Gemini.

- **Grounded in your data**: before starting, pick how much history to include — 1, 2, 3, 5 years, or ALL — with each option showing an estimated token count up front. Chat is grounded in a live financial snapshot (total cash, investment value, realized/unrealized P/L, dividends received, debt, runway, and your current-month budgets) plus the Monthly Summaries for whichever range you pick.
- **Keep sensitive categories private**: before picking a range, choose any transaction categories you'd rather not send at all (e.g. Remittance). Excluded categories are folded into a single "Private Categories" lifetime total instead of being broken out by category or by month — Gemini sees that the amount exists and is told what "Private" means, but never which category or transaction it came from. Every other total (Total Cash, burn rate, income/expense figures) is still computed from your complete data, so hiding a category never throws off the real numbers. Your choice is remembered for next time.
- **Try it with a tap**: three example questions are suggested each time you start a conversation, drawn at random from a larger pool geared toward things no single dashboard screen already answers — trends, trade-offs, and "what's actually holding me back" rather than a number that's already sitting on a card.
- **Streaming replies**: answers stream in as Gemini generates them instead of waiting for the full response, and render with proper formatting (headings, bold, bullet/numbered lists) instead of raw markdown.
- **Cost transparency**: every reply shows its token count and USD cost, plus a running total for the whole session. A "View Context" button lets you see exactly what was sent to Gemini, with a "Copy Context" action and a privacy reminder to only paste it somewhere you trust if you copy it elsewhere.
- **Nothing saved**: conversations live only for that sitting — closing Chat and reopening it starts fresh with a new range selection.
- **New Quick Actions entry**: reachable from the floating gear bubble, right alongside Monthly Summary.

Uses the same Bring-Your-Own-Key Gemini setup as receipt scanning and price lookups, gated behind the existing API key and consent flow.

---

## 💰 Budget Management
Two additions to make budgets easier to keep accurate over time.

- **Total across budgets**: the budget list now shows a summed total next to the category count, so you can see your overall monthly budget commitment at a glance.
- **Smart Suggestions**: tap the sparkles icon in Manage Budgets to compare your last 12 months of actual spending against your set budgets. It flags two kinds of gaps — a budget that's drifted out of sync with reality, and a category with real spending but no budget at all — and suggests a rounded, realistic number for each (nearest 10 or 100, scaled to the amount, so it reads naturally regardless of currency). Edit any suggested amount, or skip it with the trash icon — nothing is saved until you tap Update. Categories with an active recurring rule (Rent, Insurance, etc.) are excluded, since their amount is already fixed.

---

## 📦 Backup & Restore
Behind-the-scenes work to make backups more reliable, plus a small visible improvement.

- **Real progress feedback**: Backup and Restore now show what's actually happening — "Encrypting Investments…", "Restoring Transactions…", and so on — instead of a static "Creating…" / "Restoring…" label. Applies everywhere you can back up or restore: Profile's Data Management, the onboarding restore flow, and the 7-day backup reminder.
- **More reliable restores**: fixed an edge case where a transaction's link to its investment, debt, or recurring rule could break during restore if that record's ID needed to be regenerated. Reminder notifications rescheduled after a restore now also correctly reference the reminder as it was actually saved, instead of a stale ID from the backup file.
- **New backup file format**: new backups now encrypt each type of data (transactions, investments, and so on) separately instead of one combined block, improving reliability. Backups made by older app versions still restore exactly as before.

---

## 🔐 Updated AI Data Usage Consent
Chat sends a much broader financial summary to Gemini than the app's existing AI features did, so the disclosure needed to catch up.

- The "AI Data Usage Consent" dialog (shown before any AI feature is first used) now explicitly lists what's sent per feature — receipt images, stock/asset symbols, and, new for Chat, your financial summary — instead of a general one-line description.
- If you already consented under the old wording, you'll see the updated disclosure once, the next time an AI feature runs, since it now covers a new category of data.

---

## 📖 More Accurate In-App Guides
A pass through the "Understanding" guides on Insights and Investments to make sure they match how things actually work.

- **Savings Trend**: The "Understanding Your Chart" guide now shows how its three views relate to each other with a visual income breakdown, instead of just listing them. A new diagram shows your monthly income splitting into Expenses, Invested, and Cash Left, with **Rate & Saved** bracketing the invested-plus-cash-left portion and **Cash Flow** bracketing cash left only — highlighted based on whichever tab you're viewing.
- **Smart Alerts**: The "Alert Hierarchy" explanation now correctly describes the actual 4-tier priority order (Crash → Dividend → Dip → Balance) and clarifies that only Balance notes merge onto an existing alert — Crash, Dividend, and Dip alerts each still show as their own entry.

---

**Previous Version:** 1.14.0
**Package:** `com.christian.soyosa.WealthSnap`
