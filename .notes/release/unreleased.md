# WealthSnap v[Unreleased] – Release Notes

**Release Date:** TBD
**Build:** Version [Unreleased] (Bug Fixes)

---

## 🧮 Calculation Accuracy Fixes
- **Debts Drag now matches your Runway**: Debts Drag shows how many months of runway your debt payments cost you. It compared two runways that both left out your savings goal contributions, so it measured against a runway you never actually see — and overstated the cost for anyone with an active goal (e.g. showing 1.0 months when the real figure was 0.7). It now counts goal contributions as part of your regular outflows, so the number lines up with the Runway on Home and Financial Health, and with the step-by-step math in Financial Health's explanation.
- **AI Runway matches your screens for new users**: When you had less than a full month of history, Home and Financial Health fell back to this month's spending to estimate your Runway, but the AI assistant had no fallback and left your everyday spending out entirely — so it could report a much longer Runway than the one you see. It now uses the same fallback, so Chat and your screens agree.

## 🐛 Bug Fixes
- **Gemini API key field no longer hidden while typing**: On small phones, opening the keyboard in Gemini AI Settings squeezed the modal so much that its three buttons covered the API key field, so you couldn't see what you were pasting. Modals with text fields now get more room while the keyboard is open, and "How to get an API key?" moved from the footer to a link right under the field, leaving just Save and Cancel at the bottom.
- **Correct amounts for lower-value foreign currencies**: Investments entered in a foreign currency are stored in your own currency and converted back for display. That conversion was skipped whenever the asset's currency was worth less than yours (e.g. Japanese yen for a peso profile), so the investment options and history screens showed your peso amount with a ¥ sign. They now convert back correctly for any currency.

## 🎨 UI Polish
- **Disclaimers moved to the bottom**: On Debt Strategy and Financial Health, the disclaimer used to be the first thing you saw, pushing your actual numbers down the screen. It now sits at the end, after all the cards, so your debt-free date and runway are front and center. All disclaimers across the app now share one design, including the cost-estimate note in Gemini API Usage and the PIN setup warning, which keeps its warning color but matches the others' layout and icon.
- **Net Worth card says what it measures**: Home's Net Worth includes the interest you're projected to pay over the rest of each loan, not just what you owe today — which is why its Liabilities figure was higher than Total Debt on the Debts card right beside it. The card now reads "Projected Net Worth", with "Debt + Interest" instead of "Liabilities", matching the explanation you get when you tap its info icon.

---

**Previous Version:** 1.18.0
**Package:** `com.christian.soyosa.WealthSnap`
