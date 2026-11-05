# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Improvements & Bug Fixes)

---

## 🧩 Allocation Map: Assets View and Tap Details
- **See every holding at once**: The Holdings Allocation map has a new first view, Assets. It draws one box for every holding you own, whatever its type, so funds, crypto, bonds and commodities sit next to your stocks and you can see your whole portfolio at a glance.
- **Stocks is still there**: The Stocks view keeps showing your stocks only, with each one's share measured against your stock total. In Assets, Sector and Type, a holding's share is measured against your whole portfolio.
- Your chosen view is remembered, as before. If you had Stocks selected, it stays on Stocks; new installs start on Assets.
- **Tap a box for details**: Tapping a box opens a tooltip with its full name (even when the box is too small to show it), its share of your portfolio, its Price return, and its value in Open mode. Sector and Type boxes also show how many holdings they contain. The tapped box dims; tap it again, or anywhere else on the page, to close.
- **Returns that count dividends**: The tooltip adds a Total return line whenever dividends or sales make it differ from the price return. It's the same Total return as at the top of the Holdings tab, just for one box. A holding like MP2, whose price never moves but pays dividends, used to read 0.0% and now shows what it actually earned. A fees-hit holding that dividends pushed back into profit shows both: a negative price return and a positive total return.
- A return that rounds to zero now reads 0.0% instead of "-0.0%".

---

## 📚 Six New Guides in Learn
- **More of the app explained**: Learn has six new guides: Safe to Spend, Budgets, Recurring & Reminders, Monthly Summary, AI Assistant, and Backup, Sync & Export. Each one covers where to find the feature, how its numbers are worked out and what affects them, in the same style as the existing guides.
- **Safe to Spend gets its own guide**: The formula, what gets set aside for the rest of the month and what a red number means now live in one place. The Home Snapshot guide points to it instead of repeating the formula.
- **Two-row shelf**: The Guides shelf now shows two rows, so twice as many guides are visible before you scroll sideways. It reads down each column, then across.
- **Guide notes now show**: Some guides end a section with a short note, like how a number looks in Discreet mode or a warning before clearing your data. These notes were never drawn, so they were missing from the Home Snapshot, Runway, Privacy Modes and Goals guides. They now show with an info or warning icon.

---

## 📈 Net Worth Growth in Insights
- **Watch your net worth over time**: A new Net worth growth chart in Insights shows how your Projected Net Worth, the same figure as on Home, has moved over 6 months, 1 year, 3 years or all time. Pick the range from the dropdown under the title.
- **Three views**: Cumulative draws your net worth at the end of each month, ending with today. Percentage shows how much it grew or shrank each month, as a % of where it started that month, around a 0% line and a dashed line at your weighted average, so you can spot the months that beat it. Growth draws one bar per month: green when your net worth grew, red when it shrank. Press a bar to see that month's amount and its % of the month before.
- **A fair number for long ranges**: Over 3 years or all time, a % change from a small early balance can look enormous, like +6,794%. On those ranges the header shows your weighted average growth per month instead, where bigger months count more, so one early jump doesn't swamp it.
- **Private when you need it**: In Discreet mode the chart drops its amount axis and shows % changes instead; Hidden shows the usual placeholder. The info icon explains each view, with the formulas behind them.
- Your view and range are remembered. New installs see the chart at the top of Insights; if you've set your own section order, it's added at the bottom, where you can move it from Insights settings.

---

## 🛡️ More to See in Discreet Mode
- **A number instead of a dash**: In Discreet mode the Ledger's Safe to spend row used to show "—". It now shows how many days of your usual spending are left over this month, like +9 days, in green, or −4 days in red when you're on track to overspend. It's your Safe to spend amount divided by your daily living costs, so it tells you how much room you have without revealing how much money that is.
- **The sheet too**: Tapping the row shows the same days figure, plus debt and goal payments still due in days. It shows "—" until you have some spending in the last 90 days to measure against.
- **Budgets and Recurring show their amounts**: In Profile, Manage budgets and Recurring transactions used to show `****` in Discreet mode. They now show each budget's monthly limit, the total across your budgets, and each recurring transaction's amount. Hidden mode still masks everything.

---

## 🧭 Tidier Chart Explanations
- **One info icon per chart**: Spending comparison and Income analytics used to show a calculator icon and an info icon side by side. The calculator is gone: its explanation of the insight line now sits at the bottom of the chart's "Understanding your chart" sheet, and the info icon sits at the end of the insight line, the same spot as on Monthly pulse.
- **Formulas always shown**: "How is this calculated?" sections, in the Financial Health sheets, Safe to spend and chart guides, are now always open, so the formulas are there without an extra tap.
- **More room for long ranges**: Savings trend and Monthly pulse now run edge to edge across their card, with slimmer amount labels sitting right next to the line, so long ranges like All time have more space for their points. Savings trend now fits every month on screen instead of running off the right edge, so there's nothing to scroll. In Discreet mode, where the amount labels are hidden, the line uses that space instead of leaving a gap.
- **Touch to see a month**: Savings trend and a category's trend now show their tooltip as soon as you touch the line, like Monthly pulse, instead of needing a long press. Drag along the line to move between months. Month labels along the bottom are spaced out so the last one no longer crowds the one before it.

---

## 📱 Small Phone Fixes
- **Nothing pushed off the edge on narrow screens**: On phones around 360dp wide, a few one-line rows ran out of room and pushed their last item off the screen. In Discreet, the Snapshot's "Runway · Savings rate · Details" line hid the Details link, and in Open the Ledger's "In · Out" line could hide Calendar once both amounts were large. These lines now wrap onto a second line instead, so every link stays visible and tappable. Along the same lines, the big number at the top of each tab shrinks to fit instead of breaking over two lines, the Savings trend stats shrink to fit their card, section titles wrap onto a second line before they'd crowd their "Show all" link, all five Home tabs fit without scrolling, and your name in the greeting shrinks slightly before it gets cut off.
- **No more "…" on your information**: Anywhere a line of information used to stop at "…" or get cut off, it now wraps onto the next line, including chart summaries, budget names, transaction details, skin names, guide titles and goal names. Single amounts shrink slightly to fit instead of splitting. Wider screens still show everything on one line.
- **Tooltips stay on the chart**: Touching a point near the edge of Savings trend, Monthly pulse or a category trend could push its tooltip half off the chart, and pressing the first or last bar in Spending comparison, Income analytics or Dividends could clip its tooltip at the card's edge. Tooltips now stay inside the chart, with the arrow still pointing at the bar you pressed.

---

## 🔄 Live Sync Fix
- **Deleted debt payments stay deleted everywhere**: A debt payment that included both interest and a fee is saved as three linked parts. Deleting it removed all three on the phone you used, but only told your other synced devices about two of them, so the interest or the fee stayed behind there as a lone expense. Deleting a payment now removes every part on every device. Payments deleted before this update aren't fixed automatically; delete the leftover interest or fee line on the other device.

---

**Previous Version:** 2.0.0
**Package:** `com.christian.soyosa.WealthSnap`
