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

## 💹 Fetch Price List: Crypto, a Progress Banner and a Much Faster Fetch
- **Crypto too**: Fetch price list now fetches prices for your crypto holdings along with your stocks. A coin with no exchange set is looked up as crypto, priced in USD and converted to your currency, with a price for every calendar day, since crypto trades around the clock.
- **See it working**: Fetching prices can take a few minutes. Before, on Android you saw a brief "Fetching prices…" toast and then nothing until the result; on iPhone there was no message at all. Now a banner sits just above the bottom bar for as long as the fetch runs, with how many holdings it covers. It follows you to every screen, so you can keep using the app. When the fetch finishes, it shows the result for a few seconds: how many prices were updated, that there was nothing new, or that it failed.
- **Out of your way**: On Home, Insights, Record, Profile and Learn, pages end above the banner, so you can still scroll everything into view. Tap the banner to hide it until the fetch finishes; the result still shows.
- **One at a time**: Starting Fetch price list again while one is running tells you it's already running instead of starting a second fetch. If you'd hidden its banner, it comes back, so you can see it's still going.
- **Failures say so**: If every request in a fetch fails, for example because your Gemini key stopped working or you ran out of quota, the banner now says the fetch failed. Before, it said there was nothing new, which hid the problem.
- **Crypto from its own history too**: Fetching prices from a crypto holding's own history now looks it up as crypto as well, so it gets the same daily USD prices as Fetch price list.
- **Much faster**: Fetch price list used to send every holding to the AI in one big request, then send its answer back a second time to be turned into prices. Now each holding gets its own request, which looks up its prices and returns them in one go, and up to six run at the same time. A fetch for 7 holdings took about 100 seconds in testing instead of 260, for about the same cost. If one holding can't be fetched, the others are still saved.
- **Dividends the same way**: Fetching dividends from a holding's history (its Dividends tab) also makes one request that looks up the dividends and returns them in one go, instead of two requests one after the other.
- **Every stock's dividends in one tap**: A new Fetch dividend list sits under Fetch price list, both in the Holdings tab's Tools and in Holdings settings. Pick This year, or start one or two years back, and it fetches dividends for every stock you hold, the same way Fetch price list does for prices, instead of opening each stock's history one by one. It shows in the same banner while it runs and when it finishes, and it can run alongside a price fetch; the banner shows "+1 more" while both are going.
- **One entry in Gemini usage**: Each holding's request is recorded in Gemini usage as soon as it finishes, but a whole price or dividend fetch shows as one row: the total cost and tokens, how long the whole fetch took, and how many requests it made (and how many failed, if any). The list now keeps your latest 300 entries instead of 50, so one large fetch doesn't push older entries off it.
- **Also in Holdings settings**: Fetch price list and Fetch dividend list now have their own Prices section at the bottom of Holdings settings, as well as their place at the bottom of the Holdings tab.

---

## 🧮 Projected Dividends: Fixes and Pro-rated Assets
- **No more double-counted dividends**: The Projected view of the Holdings Dividends chart filled each month with this year's dividend, or last year's if this year's hadn't come yet. When a company paid a few days later than the year before and the date crossed into the next month, like Apr 30 one year and May 4 the next, the same dividend was counted in both months, so the yearly total came out too high. Projected now takes each holding's dividends from the past 12 months and places each one in its own month, so every payout counts once.
- **Special and non-cash dividends left out**: One-off special dividends were projected as if they'd come again every year, and dividends paid in shares or property were added to the projected cash as if they were money. Both are now left out of Projected, so it only shows the regular cash dividends you can expect. Specials still count in your dividend yield, since they were really paid in cash. Stock and property dividends now stay out of the yield too: their amount is shares or property, not cash per share, so adding it to the yield made it look higher than it was.
- **Declared dividends move the year forward**: If a holding already has an upcoming dividend on record, the 12 months end at that date instead of today, so it replaces the matching payout from a year earlier instead of adding to it. A holding that hasn't paid anything in over a year no longer projects a dividend.
- **Pro-rated assets like Pag-IBIG MP2**: Some assets don't pay like stocks. A stock pays its dividend on every share you hold on the ex-date, however recently you bought it. MP2 pays each peso only for the part of the year it was in, so a contribution made in July earns about half the year's rate. Projected used to treat MP2 like a stock and apply the full rate to your whole current balance, which overstated it, especially if you add to it every month. Each asset now has a Dividends setting in its edit form: **Per share** (the default, and how every asset worked before) or **Pro-rated by time held**. For a pro-rated asset, Projected uses the average units you held over the year the next payout covers, assuming you don't add or withdraw more.
- **Monthly or daily**: Pro-rated assets also get a Pro-rate by setting. **Monthly** averages your balance at the end of each of the 12 months, so a March contribution counts for 10 of 12 months. **Daily** averages your balance on every day of the year, for assets that count it to the day. Dividends are still entered and shown per unit, exactly the amount you were given, so nothing changes in how you record them. To use it for MP2, open Profile → Asset dictionary, edit MP2, set Paid to Pro-rated by time held and pick Monthly or Daily.

---

## ⏳ Loading Placeholders
- **The page's shape, not a spinner**: While Home loads, or while you open its Ledger, Holdings, Goals or Loans tab, you now see softly pulsing grey shapes laid out like the page that's coming: the summary panel, section titles and rows, with progress bars on Goals and day groups on the Ledger. When your data arrives it takes the same places, so nothing jumps around. This mostly shows on slower phones, which used to see a small spinner on an empty page.

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
- **Prices and dividends in a holding's history**: Opening a holding from the Holdings tab, the Prices and Dividends tabs used to show `****` in Discreet mode. They now show each day's closing price and each dividend per share, since these are the same for anyone who owns that stock and don't reveal how much you hold. The Positions tab stays masked, because its share counts next to each price would give your amounts away. In Hidden mode, a price's high and low used to still show under its date; they're now hidden along with the price.
- **Screenshots in Discreet**: Discreet mode used to block screenshots like Open does. It now allows them, like Hidden, so you can capture your percentages and charts without any extra steps. Amounts Discreet still shows, such as single transactions and budgets, can be captured too. Discreet also no longer covers the app in your recent apps. Open still blocks screenshots, and Reveal for screenshot in Profile → Security now only appears there, since it's the only mode that needs it.

---

## 🧭 Tidier Chart Explanations
- **One info icon per chart**: Spending comparison and Income analytics used to show a calculator icon and an info icon side by side. The calculator is gone: its explanation of the insight line now sits at the bottom of the chart's "Understanding your chart" sheet, and the info icon sits at the end of the insight line, the same spot as on Monthly pulse.
- **Formulas always shown**: "How is this calculated?" sections, in the Financial Health sheets, Safe to spend and chart guides, are now always open, so the formulas are there without an extra tap.
- **More room for long ranges**: Savings trend and Monthly pulse now run edge to edge across their card, with slimmer amount labels sitting right next to the line, so long ranges like All time have more space for their points. Savings trend now fits every month on screen instead of running off the right edge, so there's nothing to scroll. In Discreet mode, where the amount labels are hidden, the line uses that space instead of leaving a gap.
- **Touch to see a month**: Savings trend and a category's trend now show their tooltip as soon as you touch the line, like Monthly pulse, instead of needing a long press. Drag along the line to move between months. Month labels along the bottom are spaced out so the last one no longer crowds the one before it.

---

## 🗒️ Change Logs: Jump to a Version
- **Pick a release, go straight there**: Change Logs lists every release from the newest down, so reading about an older one meant a long scroll. A version menu now sits in the top right of Change Logs. Tap it and pick a release, like 1.11.0 · Mar 9, 2026, and the page scrolls to it. The menu shows the version you're reading and keeps up as you scroll.
- **Links you can tap**: Links in Change Logs used to show as raw text, square brackets and web address included. They now show as tappable text that opens in your browser.
- **No empty heading**: Each release left an empty Unreleased heading at the top of Change Logs. It now only shows when there's something under it.

---

## 📱 Small Phone Fixes
- **Nothing pushed off the edge on narrow screens**: On phones around 360dp wide, a few one-line rows ran out of room and pushed their last item off the screen. In Discreet, the Snapshot's "Runway · Savings rate · Details" line hid the Details link, and in Open the Ledger's "In · Out" line could hide Calendar once both amounts were large. These lines now wrap onto a second line instead, so every link stays visible and tappable. Along the same lines, the big number at the top of each tab shrinks to fit instead of breaking over two lines, the Savings trend stats shrink to fit their card, section titles wrap onto a second line before they'd crowd their "Show all" link, all five Home tabs fit without scrolling, and your name in the greeting shrinks slightly before it gets cut off.
- **No more "…" on your information**: Anywhere a line of information used to stop at "…" or get cut off, it now wraps onto the next line, including chart summaries, budget names, transaction details, skin names, guide titles and goal names. Single amounts shrink slightly to fit instead of splitting. Wider screens still show everything on one line.
- **Tooltips stay on the chart**: Touching a point near the edge of Savings trend, Monthly pulse or a category trend could push its tooltip half off the chart, and pressing the first or last bar in Spending comparison, Income analytics or Dividends could clip its tooltip at the card's edge. Tooltips now stay inside the chart, with the arrow still pointing at the bar you pressed.

---

## 🔄 Live Sync Fix
- **Deleted debt payments stay deleted everywhere**: A debt payment that included both interest and a fee is saved as three linked parts. Deleting it removed all three on the phone you used, but only told your other synced devices about two of them, so the interest or the fee stayed behind there as a lone expense. Deleting a payment now removes every part on every device. Payments deleted before this update aren't fixed automatically; delete the leftover interest or fee line on the other device.

## ⚙️ Leaner Android Build
- **Expo SDK 58 and R8 optimisation**: The app now runs on Expo SDK 58, with React Native 0.88 and React 19.3, and Android builds use Android Gradle Plugin 9, which Google Play had asked for. Release builds already removed unused code and resources; now R8 also optimises the code that is left and uses optimised resource shrinking, for better memory use and performance. Google Play had flagged both as missing. Nothing changes in how the app looks or works.

---

**Previous Version:** 2.0.0
**Package:** `com.christian.soyosa.WealthSnap`
