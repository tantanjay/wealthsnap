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

**Previous Version:** 1.14.0
**Package:** `com.christian.soyosa.WealthSnap`
