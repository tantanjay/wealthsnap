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

## ⚙️ Performance & Build
- **Smoother scrolling on the History list**: rows previously each rendered a drop shadow, which is expensive to draw repeatedly on Android and could make a long transaction history feel sluggish while scrolling. Rows now use a thin border instead, keeping the same visual separation without the per-row rendering cost.
- **Dependency updates**: bumped Expo SDK 57 dependencies (`expo`, `expo-updates`, `expo-sqlite`, and other `expo-*` modules) to their latest patch versions for stability and security fixes.

---

**Previous Version:** 1.17.0
**Package:** `com.christian.soyosa.WealthSnap`
