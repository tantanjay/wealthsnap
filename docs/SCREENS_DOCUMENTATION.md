# WealthSnap Screens Documentation

This document gives an overview of the screens in the WealthSnap application: where each one lives in the navigation, its layout, and its key parts. Visual rules are in [DESIGN.md](DESIGN.md); the clickable reference is [the redesign prototype](mockups/navigation-redesign/navigation-redesign.html).

## Navigation

Bottom tab bar (`src/navigation/BottomTabBar.tsx`): **Home · Insights · Record · Profile · Learn**. Record is the raised center action. Other screens (Chat, Live Sync, Auto backup, Import / export, Thank You, Terms) are full-screen stack routes on top of the tabs.

## 1. Home Screen (`HomeScreen.tsx`)

The main dashboard. A greeting top bar with the privacy chip and the Home Settings button, then sticky underline tabs:

- **Snapshot**: projected net worth hero, Cash / Investments / Loans / Goals overview rows (Overall / This month switch), and the 3 most recent transactions. "Details" opens the Insights tab.
- **Ledger** (`LedgerTab`): every transaction by day, with search, filters and a calendar view.
- **Holdings** (`HoldingsTab`): portfolio, return, allocation and each holding.
- **Goals** (`GoalsTab`): savings goals, contributions and progress.
- **Loans** (`LoansTab`): You owe / Owed to you, payoff plan and each loan.

**Home Settings sheet**: privacy mode (Open / Discreet / Hidden) and Snapshot row order.

## 2. Insights Screen (`InsightScreen.tsx`)

Tab: Insights. A month selector, then:

- **Financial Health grid**: the 4 numbers picked in Insights Settings (from a pool of 13); Runway, Spending pace, Debt drag and Investment boost open detail sheets. "Show all" lists every number.
- **Sections** (reorderable in Insights Settings): budgets, comparison chart, cumulative spending, expense and income analysis, savings rate trend, smart alerts, and "Ask about your money" (AI chat).

## 3. Record Screen (`RecordScreen.tsx`)

Tab: Record. Opens the Record menu, then the matching form:

- **TransactionForm**: income and expenses.
- **TransferForm**: moving money in or out.
- **InvestmentForm**: buying/selling assets.
- **DebtForm**: new loans or IOUs, including debt-linked transaction handling (principal/interest split, and confirming whether money actually moved).
- **ReceiptReviewForm (AI)**: receipt scanning and review.

## 4. Profile Screen (`ProfileScreen.tsx`)

Tab: Profile. Account and app settings only, as hairline rows:

- **Header** (`ProfileHeader`): avatar initial, name, currency and member-since month.
- **Money setup** (`QuickActionsCard`): Budgets, Recurring rules, Reminders, Asset dictionary.
- **Data**: Auto backup and Import / export, each a stack screen (below).
- **Security and intelligence** (`SecurityCard`): App lock, Auto-lock timeout, Google Gemini, Usage statistics.
- **Appearance** (`AppearanceCard`): Theme (Light / Dark / System sheet).
- **Developer options** (`DeveloperToolsCard`): only in developer mode.

## 5. Learn Screen (`LearnScreen.tsx`)

Tab: Learn.

- **Guides**: a horizontal shelf of Help Center topics (Getting Started, Home Snapshot, What Runway Tells You, Privacy Modes, Saving with Goals, Financial Insights, Debt Strategy, Investments).
- **Help center**: Math and formulas, FAQ, Contact the developer, Provide feedback, Terms of use and privacy.
- **About WealthSnap**: Why it's free, Manifesto, A message from the developer, Supporter wall, Support the developer, Rate WealthSnap, Version (opens the change log). Tapping the section header 7 times turns on developer options.

## 6. Additional Screens

- **AutoBackupScreen (`AutoBackupScreen.tsx`)**: Profile → Data → Auto backup. On/off, frequency, folder (Android) and password.
- **ImportExportScreen (`ImportExportScreen.tsx`)**: Profile → Data → Import / export. Backup and restore files, CSV import, Excel export, device sync, and Clear all data.
- **LiveSyncScreen (`LiveSyncScreen.tsx`)**: device-to-device sync over local WiFi using expiring QR codes (no cloud required).
- **ChatScreen (`ChatScreen.tsx`)**: AI financial assistant (from Insights and the Record menu).
- **ThankYouScreen (`ThankYouScreen.tsx`)**: the supporter wall.
- **Onboarding Screens (`screens/onboarding/`)**: `WelcomeScreen`, `SetupScreen`, `TermsAndPrivacyScreen`, `LegalAcceptanceScreen`, `HelpCenterScreen`, `OnboardingGuideScreen`. Initial setup, currency selection and privacy agreements; `HelpCenterScreen` is also what Learn opens.
