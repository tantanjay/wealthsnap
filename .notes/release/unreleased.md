# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Feature Update)

---

## 🎯 Savings Goals
- **Set aside cash for something specific**: a new Savings Goals feature lets you set aside money for a recurring-but-spendable purpose — a Travel Fund, Annual Insurance, Car Maintenance — instead of it just blending into your general cash. Set a target amount, an optional recurring contribution (any frequency, daily through yearly), and a category; the app tracks the running balance for you.
- **Contributing is a transfer, not an expense**: putting money into a goal (recurring or a one-time manual top-up) lowers your cash on hand immediately, but it never shows up as spending on your Monthly Summary or category charts — it's money moved, not money gone.
- **Spending from a goal doesn't double-count**: buy something using goal money and the app logs it as a real expense (so your category breakdown and budgets still work normally) while automatically crediting the goal back by the same amount, so your cash balance is never deducted twice for the same purchase.
- **Split Funding for when a goal falls short**: if what you're buying costs more than what's left in the goal, the app automatically covers the shortfall from your general funds as a separate expense — before it saves, you get a clear confirmation explaining exactly how much comes from the goal and how much comes from general cash.
- **No interruption for a normal goal-funded purchase**: spending from a goal used to show a "Goal Spend Recorded" popup after every save — since the amount and goal are already visible on the form before you save, that added friction without new information. It's gone now; you'll still get an explicit confirmation for the Split Funding case above, where part of the purchase draws from general cash.
- **An in-app guide explains the numbers**: an info button on the Savings Goals screen walks through, in plain language, why a contribution counts toward your Burn Rate/Runway/Safe-to-Spend/Avg Daily Spending while a goal-funded purchase doesn't add anything extra there or spike your month-over-month spending trends — with a worked example.
- **Net Worth stays accurate**: money sitting in a goal still counts as an asset, so moving cash into a goal never makes your Net Worth look lower than it really is.
- **New Home dashboard widget**: shows your total saved across all goals, how many goals you have, and your combined Target and Spent totals at a glance, tapping through to a dedicated Savings Goals screen.
- **Full lifecycle management**: pause or resume a goal's auto-contribution at any time (manual top-ups always still work, even while paused), withdraw to cash for an emergency, or delete a goal — any leftover balance automatically sweeps back to your general cash first, so nothing is ever silently lost.
- **A one-time notification** fires the moment a contribution pushes a goal's balance to or past its target.
- **Everywhere else in the app knows about it too**: History shows which goal a transfer belongs to, Monthly Summary gets its own Savings Goals section (contributed/spent/balance per goal), Chat can answer questions about your goals and correctly explains the accounting to itself so it doesn't misread a purchase as double spending, and goals are fully covered by Backup & Restore, Excel export, and multi-device Sync.
- **One card per goal-funded purchase**: a purchase paid from a goal used to show as two separate rows in History (the expense, and the behind-the-scenes transfer crediting the goal back). It's now a single card naming which goal covered it, and every goal-related row gets its own dedicated color accent — no separate icon needed, that accent alone marks it as goal-related.

## 🗂️ History Screen
- **Far fewer duplicate cards**: an investment Buy, Sell, or Dividend used to show as two or three separate rows — one for the investment itself, one for the cash it moved, and (for a Sell) another for the realized gain/loss. These now collapse into a single card, so a month with several investment actions no longer floods History with lookalike entries.
- **Debt payments merge too**: paying down a debt's Principal, Interest, and Fees in one go used to leave a separate card for each. They now combine into one card titled by the payment's own note (e.g. "Debt Payment: Car Loan"), showing the true combined total on the right with a breakdown of principal/interest/fees underneath, and the same colored accent the Debt screen already uses.
- **Clearer badges**: an investment card's badge now shows its actual type (Stocks, Crypto, Funds, etc.) instead of just repeating the word "Investment"; a debt card's badge now reads "I Owe" or "Owed to Me" instead of just "Debt", and its amount is colored to match.
- **No more filler labels**: a row used to fall back to showing its raw category word (e.g. "Expense", "Income") or a generic "To Other Account" title when there was nothing more specific to say. Rows now prefer their own note as the title when one exists, and simply skip a line that would have added no real information.

## 🚀 Onboarding & Welcome Screen
- **A shorter, more focused first-run tour**: the walkthrough you see on first launch is now four slides instead of six, each built around a reason to actually use the app — your data staying private and local, everything (spending, debts, investments, goals, budgets) tracked in one place, adding a transaction in seconds, and a quick recap before you start. The step-by-step mechanics it used to cover (backups, recurring rules, budget limits) are gone from the tour; you'll see those explained right when you first open those screens instead.
- **Swipe through it**: slides now respond to a swipe left/right, with a sliding animation, in addition to the existing Back/Next buttons.
- **The welcome screen finally says "WealthSnap"**: the very first screen you see now shows the app's name, and leads with the same three points as the onboarding tour instead of a different, more generic pitch.
- **Fits small phones properly**: icons, spacing, and text on both the welcome screen and the onboarding tour now scale down on shorter or narrower phones, and the Next/Get Started button no longer ends up partly hidden behind the phone's status or navigation bar.
- **Replay from Help Center now matches**: the "Getting Started" guide in the Help Center now replays the actual onboarding tour instead of a separate copy that had fallen out of date.

## ✨ Friendlier Empty States
- **No more zero-value dashboards**: opening Home, History, or the Investment tab for the first time (or right after clearing your data) used to show a full layout of cards and charts all reading ₱0.00. Each now shows a short explanation of what will appear there and a button to add your first record instead.
- **Debt-free gets a congratulations, not a form**: the Debt Strategy screen doesn't nag you to add a debt when you don't have one — it tells you "Congrats, you have no debts!" and encourages you to keep it that way, with no button in the way.
- **A nudge to start investing**: the Investment tab's empty state now reads "Start growing your wealth" instead of a plain "No investments yet," with a reminder that every portfolio starts with one investment.
- **The Home dashboard cards catch up too**: the Investment and Debts widgets on Home used to keep their swipeable Total/Monthly views even with nothing to show, so swiping just moved between two blank ₱0.00 pages. They now show the same encouraging or congratulatory message as their full screens instead, with no slider to swipe.
- **Savings Goals widget**: shows a prominent "No Goals Yet" message with a short description of what the feature is for, instead of a "Total Saved: ₱0.00" that reads like a bug.
- **Financial Health calibrates instead of dead-ending**: when there's not yet enough history to compute Runway, Spending pace, Investment Boost, and Debt Drag all at once, the card now shows a single "Calibrating your Financial Health" message instead of four separate stats that all say "nothing here." Runway alone showing a bare "∞" is also gone — it now reads "No expenses tracked" — and the Spending row no longer claims you have a "(0% budget)" when you simply haven't set one; it says "(no budget set)" instead.
- **Smoother first load**: Home, History, Investment, and Debt Strategy no longer briefly flash their full skeleton layout every time you switch back to them — that loading flash now only happens once, the very first time you open the app, since all four screens now share a single check for whether you have any data yet instead of each re-checking on its own.

## 🎨 UI Overhaul for Consistency
- **A design pass across the whole app**: alert and dialog icons, modal action buttons, category/status colors, number formatting, and a handful of reused icons all got tightened up so the same kind of thing looks and behaves the same way everywhere, instead of each screen having quietly drifted its own way over time.

## 🧮 Calculation Accuracy Fixes
- **Money you lent out no longer hides your real debt obligations**: History's Safe-to-Spend treated lending money to someone (a debt owed *to* you) as if you'd made a payment on your own debts, which shrank the amount it reserved for your real obligations and made Safe-to-Spend look higher than it should. Only payments toward debts you actually owe count now.
- **Debt interest is counted once, everywhere**: a debt's minimum payment already includes its interest, but the Home dashboard's Runway and Debts Drag, Insights' Runway and Burn Rate, and History's Safe-to-Spend also counted the interest (and fees) you paid as regular spending on top of it, making things look tighter than they were. They now work the same way Financial Health already did — your everyday spending, plus each debt's minimum payment, with no overlap. Debt Strategy's "Debt vs Life" now also compares your debt against your real living costs, without interest and fees mixed in.
- **Fees no longer count as your minimum payment**: Home's Obligations Paid counted a fee or insurance payment toward your debt's monthly minimum — the same rule the Debt screen's due date already followed, now applied on Home too.
- **Month-end dates behave**: anything set for the 29th, 30th, or 31st now lands on the last day of shorter months instead of spilling into the next one, then goes back to its original day once the month is long enough:
  - A debt due on the 31st shows as due Feb 28 in February, not Mar 3 (which also made February payments count toward the wrong month).
  - A recurring transaction set for the 31st used to slide to the 3rd after February and stay there. It now goes Jan 31 → Feb 28 → Mar 31, and rules that had already drifted return to their original day from their next occurrence. The Calendar's upcoming-bill forecast and Safe-to-Spend's upcoming bills follow the same rule.
  - History's previous/next month buttons no longer skip a month when used from the 29th-31st, matching the fix Insights got in 1.16.0, and Insights' Savings Rate Trend no longer mixes up months' debt repayments on those days.
- **The last day of the month counts again**: Net Cash Flow (Insights chart and Financial Health), Financial Health's Runway Change, the runway-drop alert, and Smart Suggestions' spending averages all cut off at midnight at the *start* of a month's last day, quietly leaving that day's transactions out.
- **Money repaid to you reads correctly in Chat**: the Monthly Summary sent to Chat listed a repayment you *received* as a debt payment you *made*. It's now labeled as collected, with how much is still owed to you.
- **Export and import keep your dates**: the Excel export wrote each date in UTC, so anything logged early in the morning could show up as the previous day — or the previous month, on the 1st. Exports now use your local date, and CSV import reads dates as local days to match.
- **Help Center explains the corrected math**: the Math & Formulas guide now notes that Burn Rate and Runway leave out debt interest and fee payments (they're already covered by each debt's minimum payment), and the Debt Strategy guide now explains that Time Cost measures against your everyday living costs, that fees don't count toward a debt's minimum when deciding its next due date, and that a due day on the 29th-31st falls on the last day of shorter months.
- **"How is this calculated?" explanations catch up**: several of these had fallen behind the actual math over time.
  - Home: Net Worth and Total Assets now list Savings Goals alongside cash and investments, and label projected interest as interest rather than "fees". The Financial Health explanation now covers all four rows (Runway, Spending, Investment Boost, Debts Drag) instead of just two.
  - History: Safe-to-Spend's Weekly view never mentioned that debt payments were being set aside at all. Every view now also shows the savings-goal contributions it reserves.
  - Financial Health: now says what goes into Monthly Burn Rate, and correctly says living costs use a 6-month average, not 3.
  - Insights: the income insight was described as including projections when it only uses income actually recorded; the spending insight now shows its projection formula, and Savings Rate explains that debt principal payments count as spending while savings-goal contributions count as kept.

## ⚙️ Performance & Build
- **Smoother scrolling on the History list**: rows previously each rendered a drop shadow, which is expensive to draw repeatedly on Android and could make a long transaction history feel sluggish while scrolling. Rows now use a thin border instead, keeping the same visual separation without the per-row rendering cost.
- **Dependency updates**: bumped Expo SDK 57 dependencies (`expo`, `expo-updates`, `expo-sqlite`, and other `expo-*` modules) to their latest patch versions for stability and security fixes.

---

**Previous Version:** 1.17.0
**Package:** `com.christian.soyosa.WealthSnap`
