# Redesign Branch — Audit Report

**Branch:** `redesign` vs `master` (20 commits, `ce6f097` … `78e522d`: Phases 0–4 plus follow-ups)
**References:** `PROJECT.md`, `docs/DESIGN.md`, `docs/METRICS.md`, `docs/mockups/navigation-redesign/navigation-redesign.md`, `docs/dev/versioning-and-release-process.md`
**Date:** 2026-10-28
**Status:** Fixes applied 2026-10-29 (uncommitted), per the user's choices: H1 restore on the Ledger, H2 drop resolved loans from their update date, M2 start the stepper at 0 in Discreet, L2 keep as is.

## Fix status

| # | Outcome |
|---|---|
| H1 | Fixed. `calculateMonthSafeToSpend` (financialMetrics) + `sumUpcomingRecurring` (recurrenceService), shown as a Ledger row with a breakdown sheet; Discreet "—". Daily / Weekly / Yearly views stay removed and are logged under Removed |
| H2 | Fixed. `isOwedAsOf` in snapshotMetrics; METRICS Formula line and history row updated |
| M1 | Fixed. New `repaidPointsChange` on loans that existed at last month-end |
| M2 | Fixed. `useFinancialHealth(discreet)` starts at 0 and drops a tapped amount on a mode change |
| M3 | Fixed. Budgets, Recurring rules and Smart suggestions mask amounts; Monthly summary is withheld outside Open. Smart suggestions' editable amount fields still show values |
| M4 | Fixed. Investments guide rewritten for the Holdings tab |
| M5 | Fixed. Obligations cap moved to Fixed; relabel, Runway, Budget Health under Changed; Insights pull-to-refresh and History views under Removed; new Fixed bullet for the privacy fallbacks |
| M6 | Fixed. Every listed "Shown on" updated, with history rows |
| M7 | Fixed |
| M8 | Fixed. Year added for other years' day headers |
| L1 | Fixed. `isDebtFee` and `getTransactionsByMonth` reused |
| L2 | No change (user's choice) |
| L3 | No change needed: the payment sheet's input fields already show the amounts being typed, so masking the total hides nothing |
| L4 | Fixed (the Safe-to-Spend mentions are accurate again now that it's back) |
| L5 | Fixed. Peer Added bullets; removed tabs and screens named in the Home tabs bullet |
| L6 | Fixed |
| L7 | Fixed. MODULES now lists exactly the files under `src/` |
| L8 | Runway minus fixed. Not changed: chip padding 6 / gap 6 / padding 3 match the prototype's own literals (`navigation-redesign.html:85`); HistoryCalendar's 7px ghost text has no on-scale size that fits a calendar cell, so it needs a DESIGN.md exception if it stays. The new-user "Add an investment" row opens Record's type menu, where Investment is one tap; preselecting it would need a new Record parameter |

Checks: `npx tsc --noEmit` exit 0 · `npm run lint` exit 0 (no warnings printed) · `npm run verify-changelog` **MATCH**.
`git diff v1.19.0 master -- src` is empty, so `master` code = the v1.19.0 release; every "shipped" claim below was checked against the `v1.19.0` tag.

---

## 1. Formulas and metrics

### H1 · High — Safe-to-Spend and History's period summaries were removed without a word
- **Where:** `src/components/history/HistorySummary.tsx` and `HistorySafeToSpendHelpModal.tsx` deleted (Phase 4); `src/components/home/LedgerTab.tsx` has no replacement. No code in `src/` computes Safe-to-Spend any more.
- **Wrong behavior:** a shipped headline feature (History's "Projected Safe to Spend" with burn/day and living costs, plus Daily / Weekly / Monthly / Yearly period totals with prev/next navigation) is gone. The Ledger shows only all-time days and this month's In / Out. Nothing in `CHANGELOG.md`, `docs/release/unreleased.md` or the spec says so. Docs still promise it: `docs/CAPABILITIES.md:10` (the first "Core Highlight"), `:144`, `:349`; `docs/METRICS.md:260-266` (Safe-to-Spend, "Shown on: History"); user-facing text in `src/components/savingsGoals/SavingsGoalsInfoModal.tsx:54,61` and `src/components/onboarding/TermsContent.tsx:97`.
- **Fix (decide first):** either bring Safe-to-Spend back into the Ledger (e.g. a row under In / Out, with its "How is this calculated?") or accept the removal and record it: a `### Removed` bullet, a METRICS history row, and cleanup of CAPABILITIES, the goals info modal and the Terms text.

### H2 · High — Net worth "this month" shows a phantom jump for any loan resolved by status alone
- **Where:** `src/utils/snapshotMetrics.ts:86-91`, following `docs/METRICS.md:307` ("…debts you owe that had started by then, whatever their status today").
- **Wrong behavior:** "now" counts only `ACTIVE` debts, but every past month-end counts every started debt at its transaction-based principal. A ₱100k loan marked Paid off or Forgiven in March with no payment transactions (the settled-outside-the-app case that `calculatePrevDebtObligations` in `debtMetrics.ts:140-144` already guards against) stays in *every* past month-end. Every month the hero says "▲ ₱100k+interest this month", the sparkline sits ₱100k lower throughout, and Discreet's % is inflated the same way.
- **Fix (formula change, so the user's call):** for a past month-end, drop non-active debts whose status changed (`updatedAt`) on or before that date, or treat their principal as 0 from then on. Then update METRICS' Formula line and history.

### M1 · Medium — Loans' "repaid" change line compares two different sets of loans
- **Where:** `src/utils/snapshotMetrics.ts:313,319,344-345`; `docs/METRICS.md:360` says "points vs the **same debts**' principal at the end of last month".
- **Wrong behavior:** now = all active loans; last month = only the loans that existed then. Taking a new loan this month shows as "−N pts" repaid in Discreet (Snapshot Loans row), as if you'd gone backwards on the old ones.
- **Fix:** compute both from `existedPrev`, or both from `active` with last month's principal (0 borrowed for a loan that didn't exist yet). Align the METRICS wording with whichever you pick.

### L1 · Low — Debt-fee rule re-implemented instead of using `isDebtFee`
- **Where:** `src/utils/snapshotMetrics.ts:330` (`t.category !== 'Fees'`) duplicates `financialMetrics.ts:76`. `LedgerTab.tsx:85-92` hand-filters the calendar month instead of calling `getTransactionsByMonth`.
- **Wrong behavior:** none today. It's a second copy of the rule, so a future change to it would be a two-place edit (PROJECT.md rule).
- **Fix:** use `!isDebtFee(t)` and `getTransactionsByMonth`.

**Verified OK:** Net worth (`calculateNetWorth`) matches v1.19.0 Home's formula (cash + market value + goals − principal + projected interest, payable + ACTIVE). Snapshot Runway and Insights Runway both use `calculateRunwayTrend`. Savings rate (Home, Insights) = `(Income − Total Expense − principal repaid) ÷ Income` via `calculateSavingsRate`. Cash kept, Money In / Out, Goals %/on-track/on-plan and Investment total return (`investmentService.ts:328-337`) match their METRICS Formula lines. `useFinancialHealth` is a faithful port of v1.19.0 `FinancialHealthScreen.loadData`; the only difference is Infinity instead of 999 for no spending. Insights' 9 overview figures are unchanged from v1.19.0 apart from the additions. Spending pace and Daily average keep excluding goal-funded purchases. No NaN/Infinity paths found: every division is guarded (`percentOf`, `ratio`, `formatPercent` → "—", `formatMonths` → "∞").

## 2. Discreet / Hidden privacy

### M2 · Medium — Discreet's Debt-drag stepper "step count" gives away the amount and income
- **Where:** `src/hooks/useFinancialHealth.ts:93-101,189,224`; `src/components/insights/FinancialHealthDetails.tsx:275`.
- **Wrong behavior:** the step ladder is fixed per amount (100s to 1,000, then 500s, 1,000s, 5,000s), so each step count maps back to one amount. The starting amount is 10% of average income (`getSmartScenarioAmount`). A ₱80k/month earner opens the sheet at ₱8,000, shown as "25 steps", which anyone who knows the ladder reads straight back. The spec asks for steps, but this undercuts Discreet's "never reveals how much money" promise.
- **Fix:** in Discreet, start the stepper at 0 (ignore the smart default), or show the extra as a % of current minimum payments.

### M3 · Medium (pre-existing) — Some screens still show raw amounts in Discreet and Hidden
- **Where:** `src/components/insights/modals/MonthlySummaryModal.tsx` (now one tap away at Profile → Data, `ProfileScreen.tsx:203-210`), `profile/BudgetManagementModal.tsx:167,187`, `profile/RecurringRulesListModal.tsx`, `profile/SmartSuggestionsModal.tsx`. None reads the privacy mode.
- **Wrong behavior:** spec §3 says "Screens without a Discreet version fall back to Hidden", and the Privacy Modes guide repeats it (`helpContent.ts:109`). These show every amount, and Hidden allows screenshots. This was already true at v1.19.0, so it's not a regression, but the promise is new. (Month-end projection and Recurring expenses are correctly gated to Open: `IncomeAnalysis.tsx:441`, `ExpenseAnalysis.tsx:245`.)
- **Fix:** mask through `usePrivacyFormat(...).money`, or gate the entry rows to Open like the two Insights sheets.

### L2 · Low (decision) — The "single record" rule also reveals loan principals and trade totals
- **Where:** `src/components/home/LedgerTab.tsx:125,133` ("No cash entry" rows use `recordMoney`), loan-disbursement transfers in the Ledger and Recent.
- **Wrong behavior:** a ₱3M mortgage row reads as plainly as a coffee in Discreet, which reveals far more scale than one purchase does.
- **Fix:** your call. Either keep it, or treat debt- and investment-linked rows as totals (`money` instead of `recordMoney`).

### L3 · Low — Hidden: the Record-payment sheet's "Total payment" ignores the mode
- **Where:** `src/components/home/LoansTab.tsx:536` (`formatCurrencyAmount` directly).
- **Fix:** `f.recordMoney(total)`, consistent with the other single-record amounts.

**Verified OK:** `PRIVACY_ENABLED` migrates true → Hidden, false → Open, is written once and then deleted (`PrivacyContext.tsx:42-55`). Old Home card order maps to cash/investments/loans/goals, dropping `financial-health` and `transactions`, and the display-mode keys are removed (`storageService.ts:186-221`). The old Insights card order is ignored and deleted, and the grid starts from the default 4 (`:318-323`). Insights section order is kept, with new sections appended (`InsightsSettingsSheet.tsx:26-29`). Hidden keeps a leading sign (`usePrivacyFormat.ts:93,98`). Every Snapshot, Ledger, Holdings, Goals, Loans and Insights-grid amount goes through `money` / `recordMoney` / `show`. Investment boost is "—" in Discreet (`financialHealthPool.ts:129`). Ledger day totals and In / Out stay out of Discreet. Screenshots are blocked in Open and Discreet and allowed in Hidden (`useScreenshotProtection.ts`). Every Discreet formula on the Snapshot, the tabs and the grid matches METRICS (Financial Health grid table, Loan Payoff Plan, Money In / Out).

## 3. Explanations

### M4 · Medium — The Investments guide still describes the deleted Investments screen
- **Where:** `src/constants/helpContent.ts:584` ("…on the Investments screen"), `:588-605` (Total Equity / Realized / Unrealized stat cards from the deleted `InvestmentStats`), `:609` ("One card per asset").
- **Wrong behavior:** Holdings now opens on Portfolio + total return, with Realized and Dividends underneath and hairline rows. The guide never mentions total return (only the Home Snapshot guide does, `:57`).
- **Fix:** rewrite the guide's top half for the Holdings tab (hero, total return formula, Realized/Dividends %, rows with weight).

### L4 · Low — Smaller explanation leftovers
- `SavingsGoalsInfoModal.tsx:54,61`: Safe-to-Spend (see H1).
- `helpContent.ts:504` "The Cards" heading in the Debt Strategy guide: the Loans tab has rows, not cards.
- `src/constants/config.ts:47`: "Pre-1.19 Home cards". They shipped *in* 1.19.0, so it should say pre-redesign / pre-1.20.

**Verified OK:** the Snapshot, Runway, Privacy Modes and Goals guides and the Financial Health sheet formulas (`FinancialHealthSheet.tsx:16-51`, `FinancialHealthDetails.tsx`) match their METRICS formulas. Self-sustain delay in the sheet matches Math & Formulas (`helpContent.ts:312`). Every "How is this calculated?" is a collapsible inside its sheet, with no modal on top of a sheet (`InsightScreen.tsx:444-467` switches one sheet's content).

## 4. Navigation

**Verified OK, no findings.** Every `navigate('…')` target in `src/` is one of AutoBackup, Chat, ImportExport, Insights, Profile, Record, Setup, TermsAndPrivacy, ThankYou or LiveSync, and each is registered in `AppNavigator.tsx:30-67`. There are no `Investment`, `History`, `Debts`, `SavingsGoals`, `FinancialHealth`, `HomeMain` or `Actions` references, no `linking` config, and no notification response handler routing to a screen. The floating gear is deleted. Chat is reached from Record menu and Insights.

## 5. Changelog and release notes

### M5 · Medium — Behavior changes to shipped features are filed under `Added` or missing entirely
Verified against `v1.19.0`:
- **`CHANGELOG.md:15`**, "Loans' due this month counts each loan only up to its own minimum payment", is nested under Added. In v1.19.0 Home's Debts card summed raw payments (`git show v1.19.0:src/screens/HomeScreen.tsx`, lines 479-501), so this changes shipped behavior. It belongs under `### Fixed` (METRICS.md:372 already frames it as a fix).
- **Missing** "Investment boost: '12-Month Return' relabeled 'Dividend yield' / 'Assumed return'". It shipped on the Financial Health screen. It's in `unreleased.md` and METRICS.md:457 but not in CHANGELOG (`Changed` or `Fixed`).
- **Missing `Removed`**: Insights pull-to-refresh (`63129e6`; v1.19.0 `InsightScreen` had a `RefreshControl`), and Safe-to-Spend / History time frames (H1).
- **Missing `Changed`**: the Insights Runway figure now goes negative below zero cash instead of "0.0 months" (METRICS.md:87). Budget health shows 0% "under budget" instead of "N/A / No Budgets Set" when budgets exist but nothing was spent (v1.19.0 `InsightsOverviewCards.tsx:77-78` vs `financialHealthPool.ts:141-147`).
- **Fix:** move the obligations bullet to Fixed, add the four items, regen and verify.

### L5 · Low — How the Added section is organized
- **Where:** `CHANGELOG.md:12-24`.
- **Wrong behavior:** Home tabs, the Insights grid, the bottom bar and Profile / Learn sit as sub-bullets of "Home Snapshot", though they're separate features. The shipped screens and tabs that are gone (Investment and History tabs; Debt Strategy, Savings Goals and Financial Health screens) appear only as "replacing …" inside Added text. The process doc maps deleted features to `### Removed` (`versioning-and-release-process.md` §3).
- **Fix:** split them into peer Added bullets and add one Removed line for the five screens and tabs. Keep it terse.

**Verified OK:** `Removed: Floating gear` (it shipped in v1.19.0) and `Fixed: detail sheets showed real amounts while privacy was on` (v1.19.0 Transaction, Investment and Debt options modals had no privacy handling) are correctly categorized. Bottom sheet restyle, X close, time-range dropdown, Fetch price list and Getting Started full screen are all changes to shipped UI, so `Changed` is right. `unreleased.md` matches the code on placement (Monthly summary → Profile → Data, Reveal → Profile → Security in Open and Discreet). The `[Unreleased]` compare link is `v1.19.0...HEAD`. `package.json` and `app.json` are both 1.19.0, which is correct while the release is uncut. When cut, this is **1.20.0** (MINOR: Added content plus a silent migration).

## 6. Docs consistency

### M6 · Medium — METRICS "Shown on" lists still name removed screens
`docs/METRICS.md:54` Cash Balance "History" · `:93` Runway Change "Home" (the Snapshot shows Runway months only, not the change) · `:112` Net Cash Flow "Home (Monthly Balance)" · `:139` "History (Expenses) · Home (Monthly Net)" · `:159` "Home (Top Transactions)" (`TopTransactions.tsx` deleted) · `:201` Budget Health "Home (budget %)" (and the new Insights Budgets section is missing) · `:266` Safe-to-Spend "History" · `:347` "Investments (Unrealized P/L %)".
**Fix:** rewrite each list to the current screens. Add a history row where a display was dropped (Safe-to-Spend, Runway Change on Home).

### M7 · Medium — CAPABILITIES.md advertises removed features
`docs/CAPABILITIES.md:10-27` and `:144` (Safe-to-Spend), `:170-172` ("Debt Analytics Card — Swipe between Lifetime and Monthly"), `:349-351` (calendar "Safe-to-Spend for period", "Interactive learning modal": `HistoryCalendarHelpModal` was deleted), `:389` ("Ledger filters (… date range)": the Ledger has no date-range filter), `:390-391` ("Floating Quick Actions (draggable menu bubble)", "Swipeable balance cards").
**Fix:** remove or reword them to match what shipped.

### L6 · Low — The spec has drifted from what was built and approved
`navigation-redesign.md:80,83` still say Discreet shows "name, category and date only" and drops "individual transaction amounts". DESIGN.md §5, METRICS.md:501 and the code show them (`2e7c7e9`). `:77` says the Investments row shows total return in Discreet, but the Snapshot row deliberately stays unrealized (METRICS.md:356). `:153` "1.19.0 from 1.18.0" should be 1.20.0 from 1.19.0. `:155-161` "Open questions before implementation" is still listed although Status says Implemented.

### L7 · Low — MODULES.md and DESIGN.md gaps
- `docs/MODULES.md` lacks the new `src/components/ds/DropdownMenu.tsx`. The Home blurb (`:10`) omits the graph range and Holdings order settings. Pre-existing: `src/services/core/logService.ts` is listed but the file is `services/domain/logService.ts`, and `common/Disclaimer.tsx`, `common/EmptyState.tsx`, `context/DataStatusContext.tsx`, `hooks/useConfirmDeleteDebt.ts`, `utils/severity.ts`, `integrations/currencyService.ts` are unlisted.
- `docs/DESIGN.md` §8 says components read tokens "through `useTheme()`" but never names the `ds` namespace (`const { ds, elevation } = useTheme()`). Now that `78e522d` removed the legacy `colors`, add one line.

## 7. Correctness and design rules

### M8 · Medium — Ledger day headers have no year
- **Where:** `src/utils/historyFeed.ts:87` (`{ month: 'short', day: 'numeric' }`).
- **Wrong behavior:** History filtered to a single period, but the Ledger lists every transaction ever, so 5 Oct 2025 and 5 Oct 2026 both read "Oct 5".
- **Fix:** add `year: 'numeric'` when the day isn't in the current year.

### L8 · Low — Small rule violations
- `SnapshotView.tsx:231`: a negative Runway renders with an ASCII hyphen (`toFixed`). DESIGN §4 wants U+2212; Insights already uses `formatMonths`, so reuse that.
- Off-scale values: `HistoryCalendar.tsx:288,290` fontSize 7 (DESIGN: "Nothing else goes outside the scale"); `LedgerTab.tsx:400` chip paddingVertical 6; `HomeScreen.tsx:305,308` gap 6 / padding 3.
- `HomeScreen.tsx:197`: the new-user "Add an investment" row opens Record exactly like "Add a transaction" (no investment preselected).

**Verified OK:** no hex values in components, screens or navigation. No `Alert.alert` / `confirm` / `prompt`. The only mock data is `generateDummyData`, behind `CONFIG.ENABLE_DUMMY_DATA` and a user tap. `text3` is used only for placeholders, chevrons, disabled states, radio rings and record IDs. `bg` isn't used as a fill on `inset` (`components/index.tsx:95` `flat` cards are on the page). Empty states exist for every Home tab and the grid (`FinancialHealthGrid.tsx:26-29`). The grid checklist ordering follows spec §4 (`InsightsSettingsSheet.tsx:32-35`). Sparkline thinning stays at about 36 points for "All time".

---

## Summary

| # | Sev | Area | Item |
|---|---|---|---|
| H1 | High | Metrics/Docs | Safe-to-Spend and History period summaries silently removed |
| H2 | High | Metrics | Net worth change phantom jump for status-resolved loans |
| M1 | Med | Metrics | Loans repaid change compares different loan sets |
| M2 | Med | Privacy | Discreet stepper step count leaks the amount and income |
| M3 | Med | Privacy | Monthly summary, budgets, recurring and suggestions ignore the mode (pre-existing) |
| M4 | Med | Explanations | Investments guide describes the deleted screen |
| M5 | Med | Changelog | Fix to shipped obligations filed as Added; four shipped changes missing |
| M6 | Med | Docs | METRICS "Shown on" names removed screens |
| M7 | Med | Docs | CAPABILITIES advertises removed features |
| M8 | Med | Correctness | Ledger day headers lack a year |
| L1–L8 | Low | Various | Duplicate fee rule; single-record scope; Hidden payment total; leftover wording; Added nesting; spec drift; MODULES/DESIGN gaps; hyphen, off-scale values, new-user row |
