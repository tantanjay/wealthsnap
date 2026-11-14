# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Improvements & Bug Fixes)

---

## 📈 Net Worth Growth: Browse by Year
- **A calendar year on 1Y**: The 1Y range of the Net worth growth chart in Insights now shows one calendar year, January to December, like the 1Y view of Income analytics and Monthly spending. It starts from your net worth at the end of the year before, so each of the 12 months gets its own growth. For the current year, it runs to today.
- **Step through your years**: Arrows above the chart move to the previous or next year. They start on the year of the month picked at the top of Insights, and go back as far as your first transaction. A year with no transactions still has a chart, since your investments and loans keep changing your net worth.
- **Headers name the year**: The figures above the chart say "in 2025" instead of "over 1 year", so you can tell which year you're looking at.

---

## 🗓️ Same Year Arrows Everywhere
- The year arrows on the Actual tab of the Holdings Dividends chart now look the same as the ones on the Insights charts. When all your dividends are from this year, they're hidden, as on Insights.

---

## 💯 Percentages in Open Mode
- **Amount and share together**: In Financial health, amounts like Total expense, Burn rate and Net cash flow now show their percentage underneath in Open mode, the same one Discreet mode shows instead of the amount. For example, Total expense reads "62% of income" and Net cash flow "18% kept", so you see how big a number is next to what it means.
- **Daily average is colored**: Its line says how today's pace compares with your 3-month daily average, green when lower and red when higher.
- **Show all keeps it on your cards**: The 4 numbers on your grid show their "Card" badge next to the percentage instead of in place of it.
- Hidden mode is unchanged.

---

## 🔁 Recurring Transactions & Sync Fixes
- **No more doubled recurring transactions**: If the app was closed while it was catching up on recurring transactions, the next catch-up could add the same ones again. And with Live Sync on two phones, both phones created their own copy of each one, so your rent or salary counted twice after syncing. Each occurrence of a rule is now the same transaction on every device, so it's only ever added once. One you deleted stays deleted. This applies to occurrences from now on, once both phones are updated; existing duplicates aren't removed.
- **Rule edits survive a sync**: Moving a rule to its next due date counted as an edit to the rule, so the other phone's real change to it (a new amount, say) could lose the next sync. Moving the due date no longer counts.
- **A failed sync can't lose a record**: If you deleted something on one phone and then edited it on the other, syncing brings it back. If that sync failed partway, the record could end up gone on both. Now it stays deleted until the next sync brings it back properly.

---

## 💱 Dividends Offline
- When the latest exchange rate couldn't be fetched, Holdings counted foreign-currency dividends as if they were already in your currency, so $100 showed as ₱100. It now uses the last rate it fetched. If it has never fetched one for that currency, that stock's dividends are left out until it can.

---

**Previous Version:** 2.1.0
**Package:** `com.christian.soyosa.WealthSnap`
