# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Bug Fixes)

---

## 🛠️ Reliability Fixes
- **Financial Health's Debt Pressure no longer falsely capped at 99 years**: the Debt Pressure metric on the Financial Health screen shows how many years your debt is delaying your self-sustainability, based on your current cash flow surplus. Previously, this calculation inadvertently deducted any money you transferred out to investments or savings accounts, causing your available "surplus" to look like $0 if you aggressively saved. It now correctly uses your true investable surplus (Income minus living expenses and debt minimums), giving a much more accurate timeline.
- **Accurate Burn Rate and Debt Drag computations**: fixed an issue where the interest and fee portions of your debt payments were being accidentally double-counted. These amounts were previously being included in both your "Living Expenses" and your "Debt Obligations." The app now strictly filters them out of your living expenses so your total cash burn rate and Debt Drag numbers are fully accurate.
- **Help Modal transparency**: the Financial Health Help Modal now displays the actual numbers and the calculated effective monthly interest rate used in the "Interest Cost (Dead Money)" formula, rather than generic placeholder text.
- **Import Data guide stability**: the required-format reference list in the Import Data guide was being recreated on every render instead of staying stable, causing it to unnecessarily unmount and remount each time. It now renders as a stable component like the rest of the guide.

## 💳 Debt Tracking Overhaul
- **Mark debts as Paid Off or Forgiven**: sometimes a debt gets resolved without a matching transaction ever landing in WealthSnap — someone pays it off on your behalf, or the debt is forgiven outright. You can now mark a debt as Paid Off or Forgiven right from the Debt screen, with a Reactivate option if you need to undo it. Works in both directions — a debt someone forgave you, or one you forgave someone else.
- **New "Owed to You" section**: debts where someone owes you money now live in their own dedicated list on the Debt screen, separate from Priority Payoff Order — that list is specifically about paying down what you owe, and mixing in what's owed to you never quite made sense there.
- **One gear icon for everything on a debt**: each debt card's gear icon now opens Edit, Delete, and the Mark Paid Off/Forgiven/Reactivate actions all in one place, so you don't have to go hunting through History to manage a debt. The icon itself also moved — from crowding the Pay Now button at the bottom of the card to a clearer spot at the top, next to the amount.
- **Fixed a real discoverability bug**: a debt with a start date outside whatever month you happened to be browsing in History could become effectively invisible — and since History was the only way to reach Edit/Delete, unreachable too. Debts are now always visible in History's Debts tab regardless of the browsed period.
- **Choosing a debt type from Quick Actions actually applies now**: picking "Credit Card" or "I Owe You" (etc.) from the Quick Actions menu used to be ignored — the form always opened defaulted to Loan regardless.
- **The "Syncing Your Cash Flow" prompt is now direction-aware**: it used to ask whether money entered your account even for a debt owed to you, where the real question is whether money left your account.
- **Debt due dates no longer roll forward too early**: a fee payment could previously push a month's total over the minimum payment even when the real minimum (principal + interest) wasn't actually met.
- **Home screen's Total Debt, Borrowed, Repaid, and Net Worth** no longer count debts owed to you as if they were a liability you owe.
- **Financial Health's Debt Pressure info modal** no longer contradicts its own card — it previously ran its own separate "years to payoff" calculation that could claim you'd never pay off a debt due to low savings, even when your savings were fine and the debt was just large.
- **Chat and Monthly Summary's Monthly Burn Rate** no longer double-counts debt interest and fees — the same fix already shipped for the Financial Health screen, now applied to Chat's own context builder.
- **Chat now knows your full debt history**: paid off, forgiven, and active debts are all included in what's sent to the AI, not just current active liabilities, so it can meaningfully answer questions about your debt-handling behavior over time.
- **Choose whether Chat sees your debt names**: before starting a conversation, decide whether to include real debt names or keep them anonymized ("Debt 1", "Debt 2", etc.) — amounts, types, and status are always included either way.
- **Debt Pressure's "what if" scenario is now a real payoff simulation**: the "if you add extra per month" projection on the Financial Health screen now has a +/- stepper — previously this section never actually appeared, since the underlying calculation was never wired up. It now runs the same payoff math as the Debt screen's own Priority Payoff Order: the extra amount is applied directly against your debts, and you see live how many months sooner they'd actually reach zero balance, not an abstract savings-rate estimate.
  - The stepper's starting amount is also always a clean, currency-appropriate number now (e.g. ₱43,000, not ₱43,221.30).

## ✨ Polish & UI
- **Refined informational banners**: the "Beta Feature" banners in the Debt and Financial Health screens have been updated to a neutral "Disclaimer" style, removing the warning colors to ensure a calmer, more informative user experience.
- **Smarter Wealth Growth scenarios**: the Wealth Growth card and its Help Modal now dynamically adapt their messaging if you are already investing your full available surplus. Instead of displaying a confusing "0.0 Years" acceleration, they proudly confirm that you are "Maxing out Surplus!" and hide redundant scenario comparisons.

## ⚙️ Performance & Build
- **Reduced App Size**: Enabled code minification and resource shrinking for Android release builds (\`enableMinifyInReleaseBuilds\` and \`enableShrinkResourcesInReleaseBuilds\`), resulting in a smaller download size and faster performance.
- **Upgraded to Expo SDK 57**: migrated the app's core platform to Expo SDK 57, bringing React Native 0.86, React 19.2, and TypeScript 6.0, along with updates to other dependencies to their latest compatible versions for continued stability and performance.

## 🔒 Security
- **Patched a known Excel export vulnerability**: updated the \`xlsx\` dependency used for the Export to Excel feature to a patched version, closing a known vulnerability in the library.

---

**Previous Version:** 1.16.0
**Package:** `com.christian.soyosa.WealthSnap`
