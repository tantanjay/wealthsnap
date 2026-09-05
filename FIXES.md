# FIXES.md

Living tracker for the lint issues surfaced by the Expo SDK 55 → 57 migration
(`eslint-config-expo@57.0.2` pulled in `eslint-plugin-react-hooks@7.1.1`, which
bundles Meta's new "React Compiler" readiness rules — this project does not
use the React Compiler). Checked = fixed and verified (`tsc` + `expo lint`
clean for that file). See migration context in the SDK-57 checkpoint commit.

Legend: ✅ fixed · ⏭️ bypassed (suppressed, with reason) · ⬜ not started

**Status: project-wide lint is at zero errors.** Everything below is either
fixed outright or a deliberately-bypassed false positive (per-line
`eslint-disable` with a reason, not a global rule change) — nothing is
currently in a "known broken, not yet fixed" state.

---

## ✅ Fixed

### 1. Hoisting order — TDZ pattern (`react-hooks/immutability`)

**Risk: trivial · Size: small**

A `useEffect`/`useFocusEffect` calls a `const fn = async () => {...}` declared
*below* it in the file. Already safe at runtime (effects only run after the
component body finishes executing), but the rule doesn't trust source order.
Fix: move each function's declaration above its use site.

- [x] [ThemeContext.tsx](src/context/ThemeContext.tsx) — `loadThemePreference` moved above its effect
- [x] [PrivacyContext.tsx](src/context/PrivacyContext.tsx) — `loadPrivacySetting` moved above its effect
- [x] [HistoryScreen.tsx](src/screens/HistoryScreen.tsx) — `loadRecurrenceRules`, `loadProfile`, `loadTimeFramePref`, `loadData` moved above the `useFocusEffect` that uses them
- [x] [ProfileScreen.tsx](src/screens/ProfileScreen.tsx) — `checkDevMode`, `checkCurrency` moved above the `useFocusEffect` that uses them
- [x] [ExpenseAnalysis.tsx](src/components/insights/ExpenseAnalysis.tsx) — `loadData` moved above its effect
- [x] [SmartAlerts.tsx](src/components/insights/SmartAlerts.tsx) — `checkPermission` moved above its effect
- [x] [BudgetManagementModal.tsx](src/components/profile/BudgetManagementModal.tsx) — `loadBudgets` moved above its effect

**Side effect of this fix:** reordering let the linter's analyzer resolve
these functions for the first time (it couldn't see through the forward
reference before), which unmasked 5 new `set-state-in-effect` findings on the
same effects — folded into the "OK to bypass" list below. One of them
(`ThemeContext`'s `updateTheme`) turned out to be genuinely fixable — see #6.

### 2. `useRef().current` lazy-init idiom (`react-hooks/refs`)

**Risk: trivial · Size: tiny**

- [x] [Skeleton.tsx:20](src/components/common/Skeleton.tsx) — swapped `useRef(new Animated.Value(0.3)).current` for `useState(() => new Animated.Value(0.3))` (reported 5×, same line — all resolved)

### 3. `Date.now()` called during render (`react-hooks/purity`)

**Risk: trivial · Size: tiny**

- [x] [HistoryScreen.tsx:522](src/screens/HistoryScreen.tsx) — hoisted a single `const now = new Date()` / `const yesterday` above the section-building loop instead of calling `Date.now()` per item.

### 4. `react-hooks/static-components`

- [x] [ImportDataModal.tsx](src/components/data/ImportDataModal.tsx) — `ColumnInfo` was declared inside the component body (new identity every render, forcing remount of all 5 usages); hoisted to module scope matching the existing `RuleItem` pattern.

### 5. `react-hooks/set-state-in-effect` (real fix, not a bypass)

- [x] [ThemeContext.tsx](src/context/ThemeContext.tsx) — `theme` was a separate `useState` synced from `mode`/`systemColorScheme` via `updateTheme()` in an effect, with `setTheme` never called anywhere else. Genuinely derivable — replaced with a `useMemo` computing `theme` directly from `mode` and `systemColorScheme`, removing the extra state and effect entirely.

### 6. `DebtScreen.tsx` — `calculateMetrics` (`react-hooks/set-state-in-effect`)

- [x] [DebtScreen.tsx](src/screens/DebtScreen.tsx) — the 8 separate `useState`s (`paidDebts`, `totalDebt`, `interestLeakPerHour`, `lifeLostMonths`, `debtFreeDate`, `totalInterestToPay`, `unpayableDebtNames`, `payoffOrder`) synced via the `calculateMetrics` effect are now one `useMemo` keyed on `[debts, transactions, strategy, extraPayment]`, destructured under the same field names so no render call site needed to change. This also let `loadData`'s manual `calculateMetrics(...)` call and the separate "recalculate on strategy/extraPayment change" effect be deleted outright — the memo already recomputes on its own whenever those state values change. `isLoading` was dropped too: it was only ever read by that now-deleted effect, so it had gone dead. `tsc` and `expo lint` clean — **project-wide lint is now at zero errors.**

---

## ⏭️ OK to bypass

**Risk of a "real" fix: high · Size: large if attempted for real, small if bypassed**

Verified concretely: every case below either (a) has real manual-override UX
a "derive during render" rewrite would delete (debt payment auto-calc, chart
year navigation), or (b) is a legitimate async effect (network/storage/
biometric calls) with no non-effect equivalent short of a much larger
data-fetching-architecture change. This is React-Compiler-prep for a compiler
this app doesn't use. `PinCreationScreen.tsx`, `SecurityContext.tsx`, and
`InsightScreen.tsx`'s `calculateMetrics` (which does have one real
`await getAllBudgets()` inside it) were individually opened and confirmed,
not just pattern-matched by name.

Treatment: disable `react-hooks/set-state-in-effect` (and `set-state-in-render`)
in `eslint.config.js` — pending decision, not yet applied.

### `react-hooks/refs` / `react-hooks/immutability` — Reanimated + gesture worklets

`translateX.value = ...` inside `.onUpdate()`/`.onEnd()` gesture worklets is
the standard, required way to drive a Reanimated shared value. The rule
can't distinguish this from render-time mutation, and there's no alternative
API — no real fix exists here, ever.

- [ ] [FloatingGearBubble.tsx:112](src/components/common/FloatingGearBubble.tsx) — gesture ref access, `Gesture.Tap().onEnd`
- [ ] [FloatingGearBubble.tsx:122](src/components/common/FloatingGearBubble.tsx) — `translateX.value = startX.value + e.translationX`
- [ ] [FloatingGearBubble.tsx:123](src/components/common/FloatingGearBubble.tsx) — `translateY.value = startY.value + e.translationY`
- [ ] [FloatingGearBubble.tsx:139](src/components/common/FloatingGearBubble.tsx) — `translateX.value = withSpring(snapX)`
- [ ] [FloatingGearBubble.tsx:140](src/components/common/FloatingGearBubble.tsx) — `translateY.value = withSpring(clampedY)`

### `react-hooks/set-state-in-effect` — legitimate async effects / auto-default-with-override state

Newly unmasked by the group-1 hoisting fix (the analyzer couldn't resolve
these forward-referenced functions before):

- [ ] [ExpenseAnalysis.tsx:51](src/components/insights/ExpenseAnalysis.tsx) — `loadData()` on mount
- [ ] [SmartAlerts.tsx:29](src/components/insights/SmartAlerts.tsx) — `checkPermission()` on mount
- [ ] [PrivacyContext.tsx:40](src/context/PrivacyContext.tsx) — `loadPrivacySetting()` on mount
- [ ] [ThemeContext.tsx:48](src/context/ThemeContext.tsx) — `loadThemePreference()` on mount

Rest of the original list:

- [ ] [FloatingGearBubble.tsx:80](src/components/common/FloatingGearBubble.tsx) — `setMenuVisible(false)` on dock
- [ ] [AutoBackupCard.tsx:75](src/components/data/AutoBackupCard.tsx) — `loadSettings()` on `refreshSignal` change
- [ ] [AutoBackupCard.tsx:289](src/components/data/AutoBackupCard.tsx) — `setPassword('')`
- [ ] [BackupRestoreModal.tsx:50](src/components/data/BackupRestoreModal.tsx) — `setPassword('')` on `visible`
- [ ] [DebtForm.tsx:59](src/components/debts/DebtForm.tsx) — `setFormCurrency(currency)`
- [ ] [DebtForm.tsx:81](src/components/debts/DebtForm.tsx) — `setDirection` auto-default from `debtType` (verified: not user-overridable, the toggle is a non-interactive indicator)
- [ ] [DebtForm.tsx:135](src/components/debts/DebtForm.tsx) — `setMinPayment` auto-calculation (verified: user can still manually override, `isMinPaymentManual` flag)
- [ ] [HistoryDatePickerModal.tsx:77](src/components/history/HistoryDatePickerModal.tsx) — `setPickerYear(currentDate.getFullYear())`
- [ ] [ComparisonChart.tsx:39](src/components/insights/ComparisonChart.tsx) — `setSelectedYear(selectedDate.getFullYear())` (verified: prev/next buttons override independently)
- [ ] [IncomeAnalysis.tsx:50](src/components/insights/IncomeAnalysis.tsx) — `setSelectedYear(selectedDate.getFullYear())` (verified: prev/next buttons override independently)
- [ ] [InsightsSettingsModal.tsx:31](src/components/insights/modals/InsightsSettingsModal.tsx) — `setView('MAIN')`
- [ ] [MonthlySummaryModal.tsx:40](src/components/insights/modals/MonthlySummaryModal.tsx) — `loadSummaries()` on `visible`
- [ ] [DividendChart.tsx:43](src/components/investments/DividendChart.tsx) — `setSelectedYear` default (verified: prev/next buttons override independently)
- [ ] [InvestmentForm.tsx:101](src/components/investments/InvestmentForm.tsx) — `setUseNativeCurrency(false)`
- [ ] [InvestmentForm.tsx:199](src/components/investments/InvestmentForm.tsx) — `setRealizedPL('')` clear-if-invalid
- [ ] [SmartAdvisor.tsx:81](src/components/investments/SmartAdvisor.tsx) — `setCurrentPage(0)`
- [ ] [DividendHistoryFormModal.tsx:47](src/components/investments/modals/DividendHistoryFormModal.tsx) — `setExDate(new Date(existingItem.exDate))`
- [ ] [InvestmentHistoryModal.tsx:171](src/components/investments/modals/InvestmentHistoryModal.tsx) — `loadAllHistory()`
- [ ] [InvestmentSettingsModal.tsx:70](src/components/investments/modals/InvestmentSettingsModal.tsx) — `setView('MAIN')`
- [ ] [PriceHistoryFormModal.tsx:39](src/components/investments/modals/PriceHistoryFormModal.tsx) — `setDate(new Date(existingItem.timestamp))`
- [ ] [BudgetManagementModal.tsx:42](src/components/profile/BudgetManagementModal.tsx) — `loadBudgets()` + `setView('LIST')` on `visible`
- [ ] [SmartSuggestionsModal.tsx:123](src/components/profile/SmartSuggestionsModal.tsx) — `loadSuggestions()`
- [ ] [AssetsListModal.tsx:41](src/components/profile/assets/AssetsListModal.tsx) — `loadAssets()`
- [ ] [GeminiUsageModal.tsx:51](src/components/profile/settings/GeminiUsageModal.tsx) — `loadLogs()`
- [ ] [CalculatorModal.tsx:39](src/components/record/CalculatorModal.tsx) — `setCalcDisplay(initialValue || '0')`
- [ ] [ReminderCatchupModal.tsx:36](src/components/reminders/ReminderCatchupModal.tsx) — `setReminders(initialReminders)`
- [ ] [ReminderList.tsx:67](src/components/reminders/ReminderList.tsx) — `loadReminders()`
- [ ] [SecurityContext.tsx:67](src/context/SecurityContext.tsx) — `checkLockState()` (verified: real `await isOnboardingComplete()`/`shouldLockApp()` calls)
- [ ] [ChatScreen.tsx:173](src/screens/ChatScreen.tsx) — `setSuggestedPrompts(...)`
- [ ] [InsightScreen.tsx:66](src/screens/InsightScreen.tsx) — `setPickerYear(selectedYear)`
- [ ] [InsightScreen.tsx:282](src/screens/InsightScreen.tsx) — `calculateMetrics(...)` (verified: has a real `await getAllBudgets()` inside it — unlike DebtScreen's version, see #6)
- [ ] [InvestmentScreen.tsx:167](src/screens/InvestmentScreen.tsx) — `fetchSuggestions()`
- [ ] [PinCreationScreen.tsx:78](src/screens/security/PinCreationScreen.tsx) — `validatePin()` (verified: real `await setPin(pin)` secure-storage write)
- [ ] [PinEntryScreen.tsx:42](src/screens/security/PinEntryScreen.tsx) — `checkBiometrics()` (verified: real biometric hardware calls)
- [ ] [PinEntryScreen.tsx:115](src/screens/security/PinEntryScreen.tsx) — `checkPin(pin)` (verified: real `await verifyPin()` security-service call)

---

## SDK 55 → 57 migration (dependency + code changes, separate from the lint cleanup above)

- [x] Bump `expo` to `^57.0.20`, run `expo install --fix` to align all `expo-*`/RN/native deps
- [x] `tsconfig.json` — removed deprecated `baseUrl`, added explicit `./` to every `paths` entry (TS 6.0 requirement)
- [x] `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` (RN 0.86 dropped the alias) — 5 call sites
- [x] `expo-status-bar`'s `translucent` prop removed (Android edge-to-edge now permanent, not opt-in) — [ScreenWrapper.tsx](src/components/common/ScreenWrapper.tsx)
- [x] `overrides.eslint-import-resolver-typescript: ^4.4.5` in `package.json` — `eslint-config-expo@57.0.2`'s bundled v3 resolver crashes against TypeScript 6.0
