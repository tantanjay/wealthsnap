# FIXES.md

Living tracker for the lint issues surfaced by the Expo SDK 55 → 57 migration
(`eslint-config-expo@57.0.2` pulled in `eslint-plugin-react-hooks@7.1.1`, which
bundles Meta's new "React Compiler" readiness rules — this project does not
use the React Compiler). Checked = fixed and verified (`tsc` + `expo lint`
clean for that file). See migration context in the SDK-57 checkpoint commit.

Legend: ✅ fixed · ⏭️ bypassed (suppressed, with reason) · ⬜ not started

---

## 1. Hoisting order — TDZ pattern (`react-hooks/immutability`)

**Risk: trivial · Size: small · Recommendation: fix**

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
same effects — now folded into group 5's list below. One of them
(`ThemeContext`'s `updateTheme`) turned out to be genuinely fixable and is
listed under "Already done" instead.

## 2. Reanimated shared-value mutation + gesture worklet ref access (`react-hooks/refs`, `react-hooks/immutability`)

**Risk: N/A (no real fix exists) · Size: N/A · Recommendation: bypass**

`translateX.value = ...` inside `.onUpdate()`/`.onEnd()` gesture worklets is
the standard, required way to drive a Reanimated shared value. The rule can't
distinguish this from render-time mutation, and there's no alternative API.

- [ ] [FloatingGearBubble.tsx:112](src/components/common/FloatingGearBubble.tsx) — gesture ref access, `Gesture.Tap().onEnd`
- [ ] [FloatingGearBubble.tsx:122](src/components/common/FloatingGearBubble.tsx) — `translateX.value = startX.value + e.translationX`
- [ ] [FloatingGearBubble.tsx:123](src/components/common/FloatingGearBubble.tsx) — `translateY.value = startY.value + e.translationY`
- [ ] [FloatingGearBubble.tsx:139](src/components/common/FloatingGearBubble.tsx) — `translateX.value = withSpring(snapX)`
- [ ] [FloatingGearBubble.tsx:140](src/components/common/FloatingGearBubble.tsx) — `translateY.value = withSpring(clampedY)`

Treatment: one scoped suppression for this file/block with a comment
explaining why (Reanimated worklet convention, not a real purity violation).

## 3. `useRef().current` lazy-init idiom (`react-hooks/refs`)

**Risk: trivial · Size: tiny · Recommendation: fix**

- [x] [Skeleton.tsx:20](src/components/common/Skeleton.tsx) — swapped `useRef(new Animated.Value(0.3)).current` for `useState(() => new Animated.Value(0.3))` (reported 5×, same line — all resolved)

## 4. `Date.now()` called during render (`react-hooks/purity`)

**Risk: trivial · Size: tiny · Recommendation: fix**

- [x] [HistoryScreen.tsx:522](src/screens/HistoryScreen.tsx) — hoisted a single `const now = new Date()` / `const yesterday` above the section-building loop instead of calling `Date.now()` per item.

## 5. `set-state-in-effect` — async effects / auto-default-with-override state (`react-hooks/set-state-in-effect`)

**Risk of a "real" fix: high · Size: large · Recommendation: bypass**

Verified concretely: every case inspected either (a) has real manual-override
UX a "derive during render" rewrite would delete (debt payment auto-calc,
chart year navigation), or (b) is a legitimate async effect (network/storage/
biometric calls) with no non-effect equivalent short of a much larger
data-fetching-architecture change. This is React-Compiler-prep for a compiler
this app doesn't use.

Treatment: disable `react-hooks/set-state-in-effect` (and `set-state-in-render`)
in `eslint.config.js` — pending decision, not yet applied.

**Newly unmasked by the group-1 hoisting fix** (the analyzer couldn't resolve
these forward-referenced functions before; now that they're properly ordered,
it can see they call setState — same "legitimate async effect" category as
the rest of this group):

- [ ] [ExpenseAnalysis.tsx:51](src/components/insights/ExpenseAnalysis.tsx) — `loadData()` on mount
- [ ] [SmartAlerts.tsx:29](src/components/insights/SmartAlerts.tsx) — `checkPermission()` on mount
- [ ] [PrivacyContext.tsx:40](src/context/PrivacyContext.tsx) — `loadPrivacySetting()` on mount
- [ ] [ThemeContext.tsx:48](src/context/ThemeContext.tsx) — `loadThemePreference()` on mount

(`ThemeContext`'s other newly-unmasked one, `updateTheme`, turned out to be
genuinely fixable — see "Already done" below.)

- [ ] [FloatingGearBubble.tsx:80](src/components/common/FloatingGearBubble.tsx) — `setMenuVisible(false)` on dock
- [ ] [AutoBackupCard.tsx:75](src/components/data/AutoBackupCard.tsx) — `loadSettings()` on `refreshSignal` change
- [ ] [AutoBackupCard.tsx:289](src/components/data/AutoBackupCard.tsx) — `setPassword('')`
- [ ] [BackupRestoreModal.tsx:50](src/components/data/BackupRestoreModal.tsx) — `setPassword('')` on `visible`
- [ ] [DebtForm.tsx:59](src/components/debts/DebtForm.tsx) — `setFormCurrency(currency)`
- [ ] [DebtForm.tsx:81](src/components/debts/DebtForm.tsx) — `setDirection` auto-default from `debtType`
- [ ] [DebtForm.tsx:135](src/components/debts/DebtForm.tsx) — `setMinPayment` auto-calculation
- [ ] [HistoryDatePickerModal.tsx:77](src/components/history/HistoryDatePickerModal.tsx) — `setPickerYear(currentDate.getFullYear())`
- [ ] [ComparisonChart.tsx:39](src/components/insights/ComparisonChart.tsx) — `setSelectedYear(selectedDate.getFullYear())`
- [ ] [IncomeAnalysis.tsx:50](src/components/insights/IncomeAnalysis.tsx) — `setSelectedYear(selectedDate.getFullYear())`
- [ ] [InsightsSettingsModal.tsx:31](src/components/insights/modals/InsightsSettingsModal.tsx) — `setView('MAIN')`
- [ ] [MonthlySummaryModal.tsx:40](src/components/insights/modals/MonthlySummaryModal.tsx) — `loadSummaries()` on `visible`
- [ ] [DividendChart.tsx:43](src/components/investments/DividendChart.tsx) — `setSelectedYear` default
- [ ] [InvestmentForm.tsx:101](src/components/investments/InvestmentForm.tsx) — `setUseNativeCurrency(false)`
- [ ] [InvestmentForm.tsx:199](src/components/investments/InvestmentForm.tsx) — `setRealizedPL('')` clear-if-invalid
- [ ] [SmartAdvisor.tsx:81](src/components/investments/SmartAdvisor.tsx) — `setCurrentPage(0)`
- [ ] [DividendHistoryFormModal.tsx:47](src/components/investments/modals/DividendHistoryFormModal.tsx) — `setExDate(new Date(existingItem.exDate))`
- [ ] [InvestmentHistoryModal.tsx:171](src/components/investments/modals/InvestmentHistoryModal.tsx) — `loadAllHistory()`
- [ ] [InvestmentSettingsModal.tsx:70](src/components/investments/modals/InvestmentSettingsModal.tsx) — `setView('MAIN')`
- [ ] [PriceHistoryFormModal.tsx:39](src/components/investments/modals/PriceHistoryFormModal.tsx) — `setDate(new Date(existingItem.timestamp))`
- [ ] [BudgetManagementModal.tsx:42](src/components/profile/BudgetManagementModal.tsx) — `loadBudgets()` + `setView('LIST')` on `visible` (line shifted after group-1 reorder)
- [ ] [SmartSuggestionsModal.tsx:123](src/components/profile/SmartSuggestionsModal.tsx) — `loadSuggestions()`
- [ ] [AssetsListModal.tsx:41](src/components/profile/assets/AssetsListModal.tsx) — `loadAssets()`
- [ ] [GeminiUsageModal.tsx:51](src/components/profile/settings/GeminiUsageModal.tsx) — `loadLogs()`
- [ ] [CalculatorModal.tsx:39](src/components/record/CalculatorModal.tsx) — `setCalcDisplay(initialValue || '0')`
- [ ] [ReminderCatchupModal.tsx:36](src/components/reminders/ReminderCatchupModal.tsx) — `setReminders(initialReminders)`
- [ ] [ReminderList.tsx:67](src/components/reminders/ReminderList.tsx) — `loadReminders()`
- [ ] [SecurityContext.tsx:67](src/context/SecurityContext.tsx) — `checkLockState()`
- [ ] [ChatScreen.tsx:173](src/screens/ChatScreen.tsx) — `setSuggestedPrompts(...)`
- [ ] [DebtScreen.tsx:347](src/screens/DebtScreen.tsx) — `calculateMetrics(...)`
- [ ] [InsightScreen.tsx:66](src/screens/InsightScreen.tsx) — `setPickerYear(selectedYear)`
- [ ] [InsightScreen.tsx:282](src/screens/InsightScreen.tsx) — `calculateMetrics(...)`
- [ ] [InvestmentScreen.tsx:167](src/screens/InvestmentScreen.tsx) — `fetchSuggestions()`
- [ ] [PinCreationScreen.tsx:78](src/screens/security/PinCreationScreen.tsx) — `validatePin()`
- [ ] [PinEntryScreen.tsx:42](src/screens/security/PinEntryScreen.tsx) — `checkBiometrics()`
- [ ] [PinEntryScreen.tsx:115](src/screens/security/PinEntryScreen.tsx) — `checkPin(pin)`

---

## Already done

- [x] `react-hooks/static-components` — [ImportDataModal.tsx](src/components/data/ImportDataModal.tsx) — `ColumnInfo` was declared inside the component body (new identity every render, forcing remount of all 5 usages); hoisted to module scope matching the existing `RuleItem` pattern.
- [x] `react-hooks/set-state-in-effect` (real fix, not a bypass) — [ThemeContext.tsx](src/context/ThemeContext.tsx) — `theme` was a separate `useState` synced from `mode`/`systemColorScheme` via `updateTheme()` in an effect, with `setTheme` never called anywhere else. Genuinely derivable — replaced with a `useMemo` computing `theme` directly from `mode` and `systemColorScheme`, removing the extra state and effect entirely.

## SDK 55 → 57 migration (dependency + code changes, separate from the lint cleanup above)

- [x] Bump `expo` to `^57.0.20`, run `expo install --fix` to align all `expo-*`/RN/native deps
- [x] `tsconfig.json` — removed deprecated `baseUrl`, added explicit `./` to every `paths` entry (TS 6.0 requirement)
- [x] `StyleSheet.absoluteFillObject` → `StyleSheet.absoluteFill` (RN 0.86 dropped the alias) — 5 call sites
- [x] `expo-status-bar`'s `translucent` prop removed (Android edge-to-edge now permanent, not opt-in) — [ScreenWrapper.tsx](src/components/common/ScreenWrapper.tsx)
- [x] `overrides.eslint-import-resolver-typescript: ^4.4.5` in `package.json` — `eslint-config-expo@57.0.2`'s bundled v3 resolver crashes against TypeScript 6.0
