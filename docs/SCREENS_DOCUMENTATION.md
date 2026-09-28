# WealthSnap Screens Documentation

This document provides a comprehensive overview of all the screens in the WealthSnap application, including their visual layout, components, and key features.

## 1. Insights Screen (`InsightScreen.tsx`)

The Insights Screen is designed to provide deep analytical views into the user's finances. It is fully customizable and scrollable.

**Key Features:**
- **Month Selector**: A sticky header allowing the user to switch the context month.
- **Dynamic Ordering**: The user can switch the position of the overview cards and the charts below via a Settings Modal.

**Components:**
- **InsightsOverviewCards**: Contains 10 cards (visible 2 cards, scrollable horizontally). These cards are switchable in position and include metrics like:
  - Financial Runway (Burn Rate)
  - Budget Performance
  - Net Cash Flow
  - Savings Rate
  - Total Income / Total Expense
- **6 Charts / Sections (Switchable Positions, take up most of the screen view for small phones)**:
  - **Comparison Chart**: Compares current spending with past averages (Trend and Compare with smart suggestions).
  - **Cumulative Spending Chart**: Tracks spending pace over the month.
  - **Expense Analysis**: Grouped or itemized breakdown of expenses.
  - **Income Analysis**: Breakdown and trends of income streams.
  - **Savings Rate Trend**: Visualizes savings over time.
  - **Smart Alerts (Anomalies)**: "Monthly Pulse" providing smart insights, anomaly detection, and notifications on unusual spending behaviors.

## 2. Home Screen (`HomeScreen.tsx`)

The Home Screen acts as the main dashboard, giving a high-level summary of the user's entire financial situation.

**Key Features:**
- **Swipeable Display Modes**: Users can swipe cards to toggle between "Overall" (All-time) and "This Month" views.
- **Customizable Layout**: Card positions can be reordered via the Home Settings Modal.
- **Information Modals**: Tapping on metrics opens detailed modals explaining the formulas (e.g., Cash Balance, Net Worth).

**Components (Cards):**
- **HomeFinancialHealthCard**: Displays Net Worth, Total Assets, Projected Liabilities, and Runway.
- **HomeCashFlowCard**: Shows Income, Expenses, and Monthly Net.
- **HomeInvestmentCard**: Summarizes total investment value, Realized/Unrealized P/L.
- **HomeDebtCard**: Summarizes total borrowed, repaid, and current debt balance.
- **HomeTransactionsCard**: A quick glance at recent transactions.

## 3. Investment Screen (`InvestmentScreen.tsx`)

Dedicated to tracking portfolio performance and asset allocation.

**Components:**
- **InvestmentStats**: Shows Total Market Value, Total Invested, and overall returns.
- **AllocationChart**: Visual pie/donut chart representing asset diversification (e.g., Stocks, Crypto, Real Estate).
- **HoldingsList**: A detailed list of individual assets, their current price, quantity held, and P/L.
- **SmartAdvisor**: Provides AI-driven smart suggestions and alerts regarding portfolio balance and market trends.

## 4. History Screen (`HistoryScreen.tsx`)

A detailed ledger of all financial activities.

**Components:**
- **HistoryCalendar**: A visual calendar view highlighting days with transactions (Safe to spend, high expense days).
- **HistorySummary**: Quick stats for the selected period (Total In / Total Out).
- **HistoryListItem**: Scrollable list of individual records. Handles mixed types:
  - Standard Transactions (Income/Expense)
  - Investments (Buy/Sell)
  - Debts (Borrow/Repay)
- **Options Modals**: Tapping an item opens specific modals to edit or delete the record.

## 5. Debt Screen (`DebtScreen.tsx`)

Focuses on liability management and payoff strategies.

**Components:**
- **Debt Summary Metrics**: Total Debt balance, Interest Leak Per Hour, and "Debt vs Life" (Months of life lost to debt based on burn rate).
- **Payoff Strategy Engine**: Users can toggle between `SNOWBALL` and `AVALANCHE` strategies. Calculates the exact `Debt Free Date` and total interest to pay.
- **Debt List**: Ordered actively based on the chosen payoff strategy and overdue status.
- **Payment Modal**: Allows users to record principal and interest payments directly against specific debts.

## 6. Financial Health Screen (`FinancialHealthScreen.tsx`)

A holistic diagnostic view of the user's financial stability. Provides a detailed deep-dive breakdown of the metrics summarized in the Home Screen's `HomeFinancialHealthCard`.

**Components:**
- **FinancialStateCard**: Analyzes Runway and overall asset-to-burn-rate ratios.
- **SpendingCashFlowCard**: Analyzes budget pacing and spending velocity.
- **DebtPressureCard**: Measures Debt Drag and obligation weight against cash flow.
- **WealthGrowthCard**: Measures Investment Boost and compound growth pacing.
- **Help Modals**: Educational content explaining health scores.

## 7. Profile Screen (`ProfileScreen.tsx`)

The central hub for user settings, data management, and app preferences.

**Components:**
- **ProfileHeader**: User details and currency preferences.
- **SecurityCard**: Privacy mode toggles, biometric authentication settings.
- **DataManagementCard & AutoBackupCard**: Options for manual/auto backups, exporting to multi-sheet XLSX, and managing local storage.
- **QuickActionsCard**: Managing Budgets, Recurring Rules, and Reminders.
- **AppearanceCard**: Theme toggles (Dark/Light mode).
- **HelpSectionCard & AboutCard**: Support links and developer contact modals.

## 8. Record Screen (`RecordScreen.tsx`)

The main input hub for adding new financial data.

**Components:**
- **TransactionForm**: For standard income/expenses.
- **TransferForm**: For moving money between accounts.
- **InvestmentForm**: For buying/selling assets.
- **DebtForm**: For logging new loans or IOUs. Includes advanced debt-linked transaction handling (e.g., auto-splitting principal/interest payments, and prompts confirming if money actually entered/left the account).
- **ReceiptReviewForm (AI)**: Smart receipt scanning and parsing interface.

## 9. Additional Auxiliary Screens

- **LiveSyncScreen (`LiveSyncScreen.tsx`)**: Manages real-time, privacy-first device-to-device data synchronization over local WiFi using expiring QR codes (no cloud required).
- **ChatScreen (`ChatScreen.tsx`)**: An AI-powered financial assistant interface where users can ask questions about their spending habits and get contextual advice (accessible via the Record menu).
- **ThankYouScreen (`ThankYouScreen.tsx`)**: A dedicated screen recognizing donors or premium supporters.
- **Onboarding Screens (`screens/onboarding/`)**: 
  - `WelcomeScreen`, `SetupScreen`, `TermsAndPrivacyScreen`, `LegalAcceptanceScreen`, `HelpCenterScreen`, `OnboardingGuideScreen` - Guide the user through initial app setup, currency selection, and privacy agreements.
