# WealthSnap – Module Map

Per-feature file listing for scoping code reviews. Find the module below, copy its file list, and paste alongside your review prompt (e.g. "Review these files for X: ...").

Shared/core files are listed in their own module at the bottom — include them too if a feature module touches data, encryption, theming, or navigation.

---

## Home Dashboard
Tab: `Home`. Sticky top tabs: Snapshot (net worth hero, Cash / Investments / Loans / Goals overview rows, Recent), Ledger, Holdings, Goals, Loans. Home Settings sheet holds the privacy mode and row order. The Ledger, Holdings, Goals and Loans tabs reuse the History, Investments, Savings Goals and Debts modules' modals and services listed below.

- `src/screens/HomeScreen.tsx`
- `src/components/home/SnapshotView.tsx`
- `src/components/home/LedgerTab.tsx`
- `src/components/home/HoldingsTab.tsx`
- `src/components/home/GoalsTab.tsx`
- `src/components/home/LoansTab.tsx`
- `src/components/home/HomeSettingsSheet.tsx`
- `src/components/home/SnapshotOrderList.tsx`
- `src/utils/snapshotMetrics.ts`

## Record / Add Transaction
Tab: `Record` (raised center button). Entry point for logging transactions, transfers, and recurring rules.

- `src/screens/RecordScreen.tsx`
- `src/components/record/CalculatorModal.tsx`
- `src/components/record/CategorySelectModal.tsx`
- `src/components/record/RecordMenuModal.tsx`
- `src/components/transaction/TransactionForm.tsx`
- `src/components/transaction/TransactionOptionsModal.tsx`
- `src/components/transaction/TransferForm.tsx`
- `src/components/transaction/RecurringOptions.tsx`
- `src/services/domain/transactionService.ts`
- `src/services/domain/recurrenceService.ts`
- `src/services/domain/categoryService.ts`
- `src/constants/categories.ts`

## History
Home → Ledger tab (`src/components/home/LedgerTab.tsx`). Calendar and list views of past transactions.

- `src/hooks/useHistoryData.ts`
- `src/utils/historyFeed.ts`
- `src/components/history/HistoryCalendar.tsx`
- `src/components/history/HistoryListItem.tsx`
- `src/services/domain/transactionService.ts`

## Insights
Tab: `Insights`. Financial Health grid and detail sheets, spending/income analysis, trends, budgets, and monthly summaries.

- `src/screens/InsightScreen.tsx`
- `src/components/insights/BudgetsSection.tsx`
- `src/components/insights/ComparisonChart.tsx`
- `src/components/insights/CumulativeSpendingChart.tsx`
- `src/components/insights/ExpenseAnalysis.tsx`
- `src/components/insights/IncomeAnalysis.tsx`
- `src/components/insights/InsightsSettingsSheet.tsx`
- `src/components/insights/SavingsRateTrend.tsx`
- `src/components/insights/SmartAlerts.tsx`
- `src/components/insights/modals/AllExpensesModal.tsx`
- `src/components/insights/modals/CategoryTrendModal.tsx`
- `src/components/insights/modals/MonthEndProjectionModal.tsx`
- `src/components/insights/modals/MonthlySummaryModal.tsx`
- `src/components/insights/modals/RecurringExpensesSummaryModal.tsx`
- `src/services/domain/monthlySummaryService.ts`
- `src/utils/insightMetrics.ts`
- `src/utils/monthlySummaryBuilder.ts`

## Investments
Home → Holdings tab (`src/components/home/HoldingsTab.tsx`). Holdings, price/dividend history, allocation, AI advisor.

- `src/components/investments/AllocationChart.tsx`
- `src/components/investments/DividendChart.tsx`
- `src/components/investments/InvestmentForm.tsx`
- `src/components/investments/SmartAdvisor.tsx`
- `src/components/investments/modals/DividendHistoryFormModal.tsx`
- `src/components/investments/modals/InvestmentHistoryModal.tsx`
- `src/components/investments/modals/InvestmentOptionsModal.tsx`
- `src/components/investments/modals/InvestmentSettingsModal.tsx`
- `src/components/investments/modals/PriceHistoryFormModal.tsx`
- `src/services/domain/investmentService.ts`
- `src/services/domain/priceHistoryService.ts`
- `src/services/domain/dividendHistoryService.ts`
- `src/services/domain/marketDataService.ts`
- `src/services/domain/smartAdvisorService.ts`
- `src/utils/investmentMetrics.ts`

## Debts
Home → Loans tab (`src/components/home/LoansTab.tsx`). Debt tracking, payments, payoff plan and templates.

- `src/components/debts/DebtForm.tsx`
- `src/components/debts/DebtOptionsModal.tsx`
- `src/components/debts/DebtStatusModal.tsx`
- `src/services/domain/debtService.ts`
- `src/utils/debtMetrics.ts`
- `src/constants/debtTemplates.ts`

## Savings Goals
Home → Goals tab (`src/components/home/GoalsTab.tsx`). Set aside cash for a purpose (Travel Fund, Annual Insurance, etc.) and spend it down over time.

- `src/components/savingsGoals/SavingsGoalForm.tsx`
- `src/components/savingsGoals/SavingsGoalOptionsModal.tsx`
- `src/components/savingsGoals/SavingsGoalAmountModal.tsx`
- `src/components/savingsGoals/SavingsGoalsInfoModal.tsx`
- `src/hooks/useConfirmDeleteSavingsGoal.ts`
- `src/services/domain/savingsGoalService.ts`
- `src/utils/savingsGoalMetrics.ts`

## Financial Health
Insights → Financial Health grid (2×2 of 13 numbers) and their detail sheets: Runway, Spending pace, Debt drag (extra-payment stepper), Investment boost.

- `src/components/insights/financialHealthPool.ts`
- `src/components/insights/FinancialHealthGrid.tsx`
- `src/components/insights/FinancialHealthSheet.tsx`
- `src/components/insights/FinancialHealthDetails.tsx`
- `src/hooks/useFinancialHealth.ts`
- `src/utils/financialMetrics.ts`
- `src/utils/financialSnapshotBuilder.ts`

## Profile & Settings
Tab: `Profile`. Account and app settings only: Money setup (budgets, recurring rules, reminders, asset dictionary), Data, Security and intelligence, Appearance.

- `src/screens/ProfileScreen.tsx`
- `src/components/profile/AppearanceCard.tsx`
- `src/components/profile/BudgetManagementModal.tsx`
- `src/components/profile/DeveloperToolsCard.tsx`
- `src/components/profile/ProfileHeader.tsx`
- `src/components/profile/QuickActionsCard.tsx`
- `src/components/profile/RecurringRulesListModal.tsx`
- `src/components/profile/SecurityCard.tsx`
- `src/components/profile/SmartSuggestionsModal.tsx`
- `src/components/profile/assets/AssetForm.tsx`
- `src/components/profile/assets/AssetsListModal.tsx`
- `src/components/profile/settings/GeminiSettingsModal.tsx`
- `src/components/profile/settings/GeminiUsageModal.tsx`
- `src/services/domain/budgetService.ts`
- `src/services/domain/assetService.ts`

## Learn
Tab: `Learn`. Guides shelf (Help Center topics), Help center (Math and formulas, FAQ, contact, feedback, terms) and About WealthSnap (why it's free, manifesto, developer message, supporter wall, support, rate, version / what's new). Guides open `HelpCenterScreen` (Onboarding) with `helpContent.ts` (Shared Core).

- `src/screens/LearnScreen.tsx`
- `src/components/profile/settings/ContactDeveloperModal.tsx`
- `src/components/profile/settings/SupportModal.tsx`

## Data Management (Backup / Restore / Import / Export)
Profile → Data → Auto backup / Import / export (stack screens). Local backups, CSV import, Excel export, sample data.

- `src/screens/AutoBackupScreen.tsx`
- `src/screens/ImportExportScreen.tsx`
- `src/components/data/AutoBackupCard.tsx`
- `src/components/data/BackupReminderModal.tsx`
- `src/components/data/BackupRestoreModal.tsx`
- `src/components/data/CsvImportFlow.tsx`
- `src/components/data/DataManagementCard.tsx`
- `src/components/data/ImportDataModal.tsx`
- `src/components/data/ImportProcessScreen.tsx`
- `src/services/integrations/backupService.ts`
- `src/services/integrations/autoBackupService.ts`
- `src/services/integrations/backupEntities.ts`
- `src/services/integrations/importService.ts`
- `src/services/integrations/exportService.ts`
- `src/services/integrations/dummyDataService.ts`

## Multi-Device Sync
Profile → Data → Import / export. QR/WiFi pairing and two-way merge engine.

- `src/screens/LiveSyncScreen.tsx`
- `src/services/integrations/syncService.ts`
- `src/services/integrations/syncEntities.ts`
- `src/services/integrations/liveSyncTransport.ts`
- `src/services/domain/tombstoneService.ts`

## AI (Gemini Chat & Receipt Scan)
Reached from Home/Record. BYOK Gemini integration.

- `src/screens/ChatScreen.tsx`
- `src/components/ai/ReceiptReviewForm.tsx`
- `src/components/profile/settings/GeminiSettingsModal.tsx`
- `src/components/profile/settings/GeminiUsageModal.tsx`
- `src/components/common/MarkdownMessage.tsx`
- `src/services/integrations/geminiService.ts`
- `src/services/integrations/geminiChatService.ts`
- `src/services/domain/chatContextService.ts`
- `src/services/core/AIConsentService.ts`
- `src/hooks/useAIConsent.ts`
- `src/utils/chatMarkdown.ts`
- `src/utils/markdownParser.ts`

## Reminders & Notifications
Recurring bill/payment reminders and background notification delivery.

- `src/components/reminders/ReminderCatchupModal.tsx`
- `src/components/reminders/ReminderForm.tsx`
- `src/components/reminders/ReminderList.tsx`
- `src/components/reminders/ReminderManager.tsx`
- `src/services/domain/reminderService.ts`
- `src/services/background/backgroundService.ts`
- `src/services/background/backgroundTasks.ts`
- `src/services/background/notificationService.ts`
- `src/services/background/index.ts`
- `src/constants/reminders.ts`

## Security & Privacy
PIN lock, encryption, screenshot protection, privacy blur.

- `src/screens/security/PinCreationScreen.tsx`
- `src/screens/security/PinEntryScreen.tsx`
- `src/context/SecurityContext.tsx`
- `src/context/PrivacyContext.tsx`
- `src/hooks/usePrivacyFormat.ts`
- `src/components/common/PrivacyGuard.tsx`
- `src/services/core/securityService.ts`
- `src/services/core/encryptionService.ts`
- `src/hooks/useScreenshotProtection.ts`

## Onboarding
First-run setup, legal acceptance, guided tour.

- `src/screens/onboarding/WelcomeScreen.tsx`
- `src/screens/onboarding/SetupScreen.tsx`
- `src/screens/onboarding/OnboardingGuideScreen.tsx`
- `src/screens/onboarding/TermsAndPrivacyScreen.tsx`
- `src/screens/onboarding/LegalAcceptanceScreen.tsx`
- `src/screens/onboarding/HelpCenterScreen.tsx`
- `src/components/onboarding/TermsContent.tsx`

## Thank You / Donor Wall
Post-purchase/support acknowledgement screen.

- `src/screens/ThankYouScreen.tsx`
- `src/components/thankyou/StyledDonorName.tsx`
- `src/constants/thankyou.ts`

---

## Shared Core (cross-cutting — include when relevant)
Not a user-facing feature; app shell, data layer, and utilities used across modules.

**Navigation & App Shell**
- `src/navigation/AppNavigator.tsx`
- `src/navigation/navigationRef.ts`
- `src/navigation/BottomTabBar.tsx`
- `src/context/ThemeContext.tsx`
- `src/context/AlertContext.tsx`
- `src/components/common/ScreenWrapper.tsx`
- `src/components/common/GlobalErrorBoundary.tsx`
- `src/components/common/CustomAlert.tsx`
- `src/components/common/BottomModal.tsx`
- `src/components/common/Skeleton.tsx`
- `src/components/common/TimeRangeSelector.tsx`
- `src/components/common/ReorderList.tsx`
- `src/components/common/ReviewAppModal.tsx`
- `src/hooks/useReviewPrompt.ts`
- `src/styles/theme.ts`

**Design System Primitives (Refined Minimal, see `docs/DESIGN.md`)**
- `src/styles/theme.ts` (`ds` colors, `elevation`, `type`, `space`, `radius`, `fontFamily`)
- `src/components/ds/index.ts`
- `src/components/ds/tone.ts`
- `src/components/ds/ChangeLine.tsx`
- `src/components/ds/Hero.tsx`
- `src/components/ds/ProgressBar.tsx`
- `src/components/ds/Row.tsx`
- `src/components/ds/SectionHeader.tsx`
- `src/components/ds/SegmentedControl.tsx`
- `src/components/ds/Sheet.tsx`
- `src/components/ds/Tile.tsx`
- `src/components/ds/UnderlineTabs.tsx`

**Database & Storage**
- `src/services/database/databaseSchema.ts`
- `src/services/database/databaseService.ts`
- `src/services/core/storageService.ts`
- `src/services/core/dataCache.ts`
- `src/services/core/logService.ts`

**Utilities & Types**
- `src/types/index.ts`
- `src/utils/currencyUtils.ts`
- `src/utils/currencyData.ts`
- `src/utils/uuid.ts`
- `src/utils/scenarioUtils.ts`
- `src/constants/config.ts`
- `src/constants/changelog.ts`
- `src/constants/helpContent.ts`

---

## Notes
- Some services are cross-referenced by multiple feature modules (e.g. `categoryService.ts` used by both Record and Insights) — listed once under the module it most belongs to.
- If a module is missing a file it should have, or you split/rename files, update this list to keep it copy-paste accurate.
