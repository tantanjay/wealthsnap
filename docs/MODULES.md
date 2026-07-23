# WealthSnap – Module Map

Per-feature file listing for scoping code reviews. Find the module below, copy its file list, and paste alongside your review prompt (e.g. "Review these files for X: ...").

Shared/core files are listed in their own module at the bottom — include them too if a feature module touches data, encryption, theming, or navigation.

---

## Home Dashboard
Tab: `Home`. Aggregated summary cards linking out to other modules.

- `src/screens/HomeScreen.tsx`
- `src/components/home/HomeCashFlowCard.tsx`
- `src/components/home/HomeDebtCard.tsx`
- `src/components/home/HomeFinancialHealthCard.tsx`
- `src/components/home/HomeInvestmentCard.tsx`
- `src/components/home/HomeSettingsModal.tsx`
- `src/components/home/HomeTransactionsCard.tsx`
- `src/components/home/TopTransactions.tsx`

## Record / Add Transaction
Tab: `Actions`. Entry point for logging transactions, transfers, and recurring rules.

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
Tab: `History`. Calendar and list views of past transactions.

- `src/screens/HistoryScreen.tsx`
- `src/components/history/HistoryCalendar.tsx`
- `src/components/history/HistoryCalendarHelpModal.tsx`
- `src/components/history/HistoryListItem.tsx`
- `src/components/history/HistorySafeToSpendHelpModal.tsx`
- `src/components/history/HistorySectionHeader.tsx`
- `src/components/history/HistorySummary.tsx`
- `src/services/domain/transactionService.ts`

## Insights
Reached from Home. Spending/income analysis, trends, and monthly summaries.

- `src/screens/InsightScreen.tsx`
- `src/components/insights/ComparisonChart.tsx`
- `src/components/insights/CumulativeSpendingChart.tsx`
- `src/components/insights/ExpenseAnalysis.tsx`
- `src/components/insights/IncomeAnalysis.tsx`
- `src/components/insights/InsightsOverviewCards.tsx`
- `src/components/insights/SavingsRateTrend.tsx`
- `src/components/insights/SmartAlerts.tsx`
- `src/components/insights/modals/AllExpensesModal.tsx`
- `src/components/insights/modals/CategoryTrendModal.tsx`
- `src/components/insights/modals/InsightsSettingsModal.tsx`
- `src/components/insights/modals/MonthEndProjectionModal.tsx`
- `src/components/insights/modals/MonthlySummaryModal.tsx`
- `src/components/insights/modals/RecurringExpensesSummaryModal.tsx`
- `src/services/domain/monthlySummaryService.ts`
- `src/utils/insightMetrics.ts`
- `src/utils/monthlySummaryBuilder.ts`

## Investments
Tab: `Investment`. Holdings, price/dividend history, allocation, AI advisor.

- `src/screens/InvestmentScreen.tsx`
- `src/components/investments/AllocationChart.tsx`
- `src/components/investments/DividendChart.tsx`
- `src/components/investments/HoldingsList.tsx`
- `src/components/investments/InvestmentForm.tsx`
- `src/components/investments/InvestmentStats.tsx`
- `src/components/investments/SmartAdvisor.tsx`
- `src/components/investments/modals/DividendHistoryFormModal.tsx`
- `src/components/investments/modals/InvestmentEquityHelpModal.tsx`
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
Reached from Home. Debt tracking and payoff templates.

- `src/screens/DebtScreen.tsx`
- `src/components/debts/DebtForm.tsx`
- `src/components/debts/DebtOptionsModal.tsx`
- `src/services/domain/debtService.ts`
- `src/utils/debtMetrics.ts`
- `src/constants/debtTemplates.ts`

## Financial Health
Reached from Home. Composite score, cash flow, wealth growth, debt pressure.

- `src/screens/FinancialHealthScreen.tsx`
- `src/components/financialHealth/DebtPressureCard.tsx`
- `src/components/financialHealth/FinancialHealthHelpModal.tsx`
- `src/components/financialHealth/FinancialStateCard.tsx`
- `src/components/financialHealth/SpendingCashFlowCard.tsx`
- `src/components/financialHealth/WealthGrowthCard.tsx`
- `src/utils/financialMetrics.ts`
- `src/utils/financialSnapshotBuilder.ts`

## Profile & Settings
Tab: `Profile`. Account settings, budgets, assets, appearance, help.

- `src/screens/ProfileScreen.tsx`
- `src/components/profile/AboutCard.tsx`
- `src/components/profile/AppearanceCard.tsx`
- `src/components/profile/BudgetManagementModal.tsx`
- `src/components/profile/DeveloperToolsCard.tsx`
- `src/components/profile/HelpSectionCard.tsx`
- `src/components/profile/ProfileHeader.tsx`
- `src/components/profile/QuickActionsCard.tsx`
- `src/components/profile/RecurringRulesListModal.tsx`
- `src/components/profile/SecurityCard.tsx`
- `src/components/profile/SmartSuggestionsModal.tsx`
- `src/components/profile/assets/AssetForm.tsx`
- `src/components/profile/assets/AssetsListModal.tsx`
- `src/components/profile/settings/ContactDeveloperModal.tsx`
- `src/components/profile/settings/GeminiSettingsModal.tsx`
- `src/components/profile/settings/GeminiUsageModal.tsx`
- `src/components/profile/settings/SupportModal.tsx`
- `src/services/domain/budgetService.ts`
- `src/services/domain/assetService.ts`

## Data Management (Backup / Restore / Import / Export)
Reached from Profile. Local backups, CSV import, sample data.

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
- `src/services/integrations/dummyDataService.ts`

## Multi-Device Sync
Reached from Profile. QR/WiFi pairing and two-way merge engine.

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
- `src/context/ThemeContext.tsx`
- `src/context/FloatingGearContext.tsx`
- `src/context/AlertContext.tsx`
- `src/components/common/ScreenWrapper.tsx`
- `src/components/common/GlobalErrorBoundary.tsx`
- `src/components/common/FloatingGearBubble.tsx`
- `src/components/common/DraggableIconButton.tsx`
- `src/components/common/CustomAlert.tsx`
- `src/components/common/BottomModal.tsx`
- `src/components/common/SettingItem.tsx`
- `src/components/common/Skeleton.tsx`
- `src/components/common/TimeRangeSelector.tsx`
- `src/components/common/ReorderList.tsx`
- `src/components/common/ReviewAppModal.tsx`
- `src/hooks/useReviewPrompt.ts`
- `src/styles/theme.ts`

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
