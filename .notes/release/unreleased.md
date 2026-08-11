# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Bug Fixes)

---

## 🛠️ Reliability Fixes
- **Financial Health's Debt Pressure no longer falsely capped at 99 years**: the Debt Pressure metric on the Financial Health screen shows how many years your debt is delaying your self-sustainability, based on your current cash flow surplus. Previously, this calculation inadvertently deducted any money you transferred out to investments or savings accounts, causing your available "surplus" to look like $0 if you aggressively saved. It now correctly uses your true investable surplus (Income minus living expenses and debt minimums), giving a much more accurate timeline.
- **Accurate Burn Rate and Debt Drag computations**: fixed an issue where the interest and fee portions of your debt payments were being accidentally double-counted. These amounts were previously being included in both your "Living Expenses" and your "Debt Obligations." The app now strictly filters them out of your living expenses so your total cash burn rate and Debt Drag numbers are fully accurate.
- **Help Modal transparency**: the Financial Health Help Modal now displays the actual numbers and the calculated effective monthly interest rate used in the "Interest Cost (Dead Money)" formula, rather than generic placeholder text.
## ✨ Polish & UI
- **Refined informational banners**: the "Beta Feature" banners in the Debt and Financial Health screens have been updated to a neutral "Disclaimer" style, removing the warning colors to ensure a calmer, more informative user experience.

---

**Previous Version:** 1.16.0
**Package:** `com.christian.soyosa.WealthSnap`
