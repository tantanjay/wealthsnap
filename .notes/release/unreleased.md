# WealthSnap Unreleased – Release Notes

**Status:** In progress, not yet released
**Build:** Version TBD (Feature Update)

---

## 🗓️ Monthly Summary
A new way to see your month at a glance, written in plain language instead of raw numbers.

- **Narrative breakdown**: for any month, see income and expenses by category, savings rate, net cash flow, investment activity (buys, sells, dividends, realized P/L), debt payments and remaining balances, transfers, budget alerts, and unusual spending — all rendered as a readable summary block, not a spreadsheet.
- **Automatic generation**: summaries are built in the background for every month you have data for, including a one-time catch-up of past months the first time this runs after updating. Already-closed months are cached, so this stays fast even with years of history.
- **Always up to date**: the current month keeps refreshing as you add transactions; a daily background check finalizes the previous month once it closes.
- **New Quick Actions entry**: accessible from the floating gear bubble's Quick Actions menu — pick a month from the chip selector to view its summary.
- **Manual Reprocess**: a "Reprocess All Months" button regenerates every summary on demand, useful after editing older transactions or debts.

This lays the groundwork for future AI-assisted insights — the generation itself is pure local computation with no AI calls or cost involved.

---

## 💬 Chat
Ask questions about your own finances in plain language, answered by Gemini.

- **Grounded in your data**: before starting, pick how much history to include — 1, 2, 3, 5 years, or ALL — with each option showing an estimated token count up front. Chat is grounded in a live financial snapshot (total cash, investment value, realized/unrealized P/L, dividends received, debt, and runway) plus the Monthly Summaries for whichever range you pick.
- **Streaming replies**: answers stream in as Gemini generates them instead of waiting for the full response, and render with proper formatting (headings, bold, bullet/numbered lists) instead of raw markdown.
- **Cost transparency**: every reply shows its token count and USD cost, plus a running total for the whole session. A "View Context" button lets you see exactly what was sent to Gemini.
- **Nothing saved**: conversations live only for that sitting — closing Chat and reopening it starts fresh with a new range selection.
- **New Quick Actions entry**: reachable from the floating gear bubble, right alongside Monthly Summary.

Uses the same Bring-Your-Own-Key Gemini setup as receipt scanning and price lookups, gated behind the existing API key and consent flow.

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
