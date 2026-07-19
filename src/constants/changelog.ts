export const CHANGELOG_MARKDOWN = `
# Changelog

All notable changes to **WealthSnap** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.14.0] — 2026-07-19

### Added
- Savings Trend chart now has three views: Rate, Saved, and Cash Flow.
- Chart tabs, time ranges, and toggles across Insights, Investments, Debt, and Home now persist between sessions.
- Floating Quick Actions gear: drag the Eye/Settings header buttons out to detach them into a draggable bubble with a quick-actions menu (Home, Investments, Insights, History).
- Floating Quick Actions gear now remembers whether it was docked or floating between app launches, instead of always resetting to docked.
- "Reveal for Screenshot" quick action to temporarily bypass screenshot protection with confirmation; not persisted.

### Changed
- Time range selector redesigned as a compact dropdown across Insights charts.
- Simplified Home Settings; swiping a card now saves its display mode directly.
- Upgraded the built-in AI model powering receipt scanning and historical price/dividend fetching to Gemini 3.5 Flash.
- AI requests now scale their reasoning depth to the task, keeping simple extractions fast and research-heavy lookups more thorough.
- Bumped Expo SDK 55 dependencies to their latest patch versions for stability and performance.

### Fixed
- Dividend Calendar tab sizing and portrait height issues.
- AI usage cost estimates in the Usage Log now accurately reflect Gemini's actual token billing, including reasoning ("thinking") tokens that were previously undercounted.

---

## [1.13.0] — 2026-07-05

### Fixed
- Debt Tracker accuracy for Receivable debt payments, duplicate fees, Flat-interest payoff, and Savings Rate miscounts.
- Dividend Yield and Projected Dividends now correctly convert foreign-currency amounts.
- Financial Insights charts now reflect the browsed month instead of always comparing against today.
- Financial Health no longer counts Receivable debts as liabilities; fixed Years to Independence and Runway Change accuracy.

### Security
- Updated dependencies and patched known security vulnerabilities.

---

## [1.12.0] — 2026-05-11

### Added
- Historical Monthly Insights: month/year selector with calendar picker and "Back to Today" shortcut.
- Redesigned Dividend Dashboard with Actual/Calendar/Projected tabs.
- Comparison chart Trend/Compare toggle and yearly browsing for the 1Y trend view.

### Changed
- Smart Advisor alerts merged/prioritized, fixed carousel pagination, added Alert Hierarchy explanation.
- Updated all dependencies to their latest versions.

---

## [1.11.2] — 2026-03-24

### Changed
- Bumped multiple core Expo libraries to their latest stable patch versions for stability and performance.

---

## [1.11.1] — 2026-03-11

### Added
- **Over-the-Air (OTA) Updates**
  - Enabled EAS Update infrastructure to deliver bug fixes without a Play Store download.
  - \`bsdiff\` patch support for smaller, faster update downloads.

### Changed
- Migrated background synchronization from the deprecated \`expo-background-fetch\` to \`expo-background-task\`.
- App now automatically respects the device's system theme; "System" appearance syncs with OS Dark/Light mode.

---

## [1.11.0] — 2026-03-09

### Added
- **Supporter Screen**
  - Introduced a dedicated supporter recognition screen.
  - Displays supporter names with dynamic animated styles.

### Changed
- **Platform Upgrade: Expo 55**
  - Migrated core dependencies to Expo 55, React 19, and React Native 0.83.
  - Resolved \`react-hooks/exhaustive-deps\` warnings in \`ThankYouScreen\`.
  - Refined internal build configuration and dependency trees.

---

## [1.10.2] — 2026-03-04

### Added
- **Bi-Annual Recurrence**
  - Added support for every-6-months frequency for both transactions and reminders.
  - Implemented bi-annual pattern matching logic in the recurrence and notification services.

### Changed
- **Transaction Categories**
  - Added smart horizontal scrolling when selecting a category via search.
  - Refined scroll offset to maintain "Search" button visibility.
  - Stabilized selection behavior to avoid unwanted jumps during direct taps.
- General performance refinements and platform compatibility checks.

### Security
- Internal security audit and dependency updates.

---

## [1.10.1] — 2026-02-19

### Added
- **Debt Backup & Restore**
  - Full support for Debt records in app backups.
  - Secure encryption and restoration of liabilities.
- **History Screen Filters**
  - New single-tap filters for Income, Expenses, Investments, Debts, and Cash Flow.
  - Keyword search for notes, categories, and asset symbols.

### Changed
- **Debt Management**
  - Added ability to record associated fees as an expense when using direct vendor payments.
- **Wealth Growth Analytics**
  - Projected paths now strictly use verified cash flow data for higher accuracy.
  - "Potential Investment" logic now excludes partial-month income to prevent inflation.
  - Refined Cash Flow aggregation to prevent double-counting transfers in growth stats.

### Fixed
- **Security**
  - Resolved PIN conflict where reminder modals could appear over the security screen.
- **Persistence**
  - Fixed a bug where Home Screen dashboard card preferences were not correctly saved between sessions.

---

## [1.10.0] — 2026-02-16

### Added
- **Financial Health Card**
  - New top-level Home Screen dashboard card for tracking core financial vitals.
  - Swipeable views for Health Metrics, Net Worth, and Total Assets.
  - Dedicated Financial Health details screen with deep-dive analytics:
    - Stability Runway (months survivable without income).
    - Projected Liquidity Date.
    - Net Flow and Spending Trend baseline.
    - Impact on Self-Sustain (months gained/lost per year).
    - Debt Pressure analysis including Mandatory Payments and Interest Cost drag.
    - Wealth Growth visualization via Self-Sustain Acceleration.

- **Advanced Net Worth Tracking**
  - Conservative projections including future interest for a “True Cost” view.
  - Clear liabilities breakdown separating mandatory obligations from discretionary cash flow.

- **Debt & Loan Management**
  - Comprehensive debt tracking for Loans, Credit Cards, Mortgages, and IOUs.
  - Full amortization schedule table (Principal, Interest, Remaining Balance).
  - Auto-calculated minimum payments based on rate, term, and interest type.
  - Support for Fixed, Variable, Flat, and No-Interest loans.
  - Dedicated Debt Screen with:
    - Active debts overview.
    - One-tap payment recording.
    - Automatic principal (Transfer) and interest (Expense) splitting.
    - Linked transaction cleanup on delete.

- **Debt-Aware Financial Metrics**
  - Safe-to-Spend and Financial Runway now include mandatory debt obligations.
  - Savings Rate trend accurately reflects debt repayments as expenses (no double counting).

- **Improved Debt Cards**
  - Swipeable Monthly vs Total views.
  - Clear comparison of required minimum payments vs actual payments.
  - Separate tracking for principal repaid and interest cost.

- **Planning & Projections**
  - Loan start date support for accurate future schedules and payoff projections.
  - Copy-to-clipboard support for full amortization tables.

- **Support & Community**
  - Direct “Contact Developer” link via Twitter added to Profile → About WealthSnap.

### Changed
- Transaction flow enhancement for debts:
  - Prompt asks whether money actually entered the account to prevent cash balance inflation.
- Financial Health calculations integrated across Home, Insights, and Debt systems.
- More conservative and realistic financial projections across Health, Runway, and Savings metrics.
- Clearer separation between cash flow, liabilities, and long-term obligations.

---

## [1.9.0] — 2026-02-12

### Added
- **Interactive Insights**
  - Savings Rate Trend chart now supports tap-to-inspect for exact monthly values.
  - Long-press support on Income Analysis and Spending Comparison bars to view precise actual vs. projected amounts.

- **Native Currency Investments**
  - Investments can now be recorded in their native currency (USD, EUR, JPY, etc.).
  - Automatic exchange rate fetching via Frankfurter API.
  - Historical prices are converted to profile currency for accurate portfolio valuation.
  - History view preserves original currency context for each transaction.

- **Crypto Investments**
  - Added **Crypto** as a first-class investment type.

### Changed
- Portfolio valuation logic updated to support multi-currency investment aggregation.
- Background services enhanced to cache exchange rates and market data more efficiently.
- Faster Insights rendering due to optimized background data synchronization.
- Reduced external API usage through intelligent rate caching.

### Fixed
- Monthly Unrealized P/L calculation no longer includes sold investments.
- Unrealized gains/losses are now correctly capped based on current holdings only.

---

## [1.8.2] — 2026-02-09

### Added
- **Monthly Pulse Interactions**
  - Tap-and-drag inspection for actual spend, projections, and historical averages.

- **Backup Safety**
  - Smart reminder to prompt backups if none detected in the last 7 days.
  - Added “Remind me later” snooze option for backup prompts.

- **Community**
  - In-app app review and rating prompt.

### Changed
- Replaced legacy charting library with \`react-native-gifted-charts\` for improved stability and interaction quality.

### Fixed
- Investment asset selector now correctly filters assets by selected type (Stocks vs. Funds).
- Resolved a critical Android native crash caused by dropdown selection components.

---

## [1.8.1] — 2026-02-05

### Added
- **Runway Drop Smart Alert**
  - Notification triggers when financial runway drops ≥25% month-over-month.

- **Global Currency Support**
  - Support for 150+ currencies with real-time search.
  - Automatic localization for number formatting based on selected currency.

- **Investment Management Enhancements**
  - Edit and delete investments directly from History.
  - Automatic sync between investment records and linked transactions.
  - Cascading deletes for investment-linked transactions.
  - Locked linked transactions to prevent inconsistencies.

- **Portfolio Customization**
  - Reorder Investment stats cards and dashboard sections.
  - Persistent sorter preferences for Holdings list.

- **Allocation Insights**
  - Type-based filtering (Stocks, Funds, Crypto, etc.).
  - Refined equity-only Stocks view with full-asset Sector overview.

- **Profile Transparency**
  - Vision, Philosophy & Goals modal.
  - Updated Developer Message explaining long-term commitment.

- **Help Center**
  - Integrated in-app changelog and version history viewer.

### Changed
- **Safe-to-Spend Algorithm**
  - Introduced True Discretionary Income model.
  - Includes future recurring income, future bills, and dynamic burn rate.
  - Transfers treated strictly to prevent false discretionary inflation.
- **Financial Runway**
  - Now accounts for both Transfer In and Transfer Out for accurate liquidity.
- Header and navigation layout standardized across core screens.
- Smart Alerts now run immediately after transaction save.
- Reminder list sorted by upcoming schedule with active indicators.
- Budget modal redesigned for clarity and smoother interaction.
- Smart Advisor suggestions limited to active portfolio assets only.
- Simplified and clarified Terms & Privacy regarding:
  - Local-only architecture
  - AI usage
  - Encryption
  - Data deletion
  - Governing law
- Major internal refactoring and modularization for long-term maintainability.

### Removed
- Removed unused storage and media permissions for Play Store compliance.

### Fixed
- Investment Portfolio screen now refreshes instantly after adding investments.

---

## [1.8.0] — 2026-02-03

### Added
- **Asset Dictionary**
  - Centralized asset manager in Profile settings.
  - Custom asset symbols and types (Real Estate, Crypto, etc.).
  - Fully supported in Backup & Restore.

- **Enhanced Investment History**
  - Position History (Buy, Sell, Dividend).
  - Dedicated Price History and Dividend History tabs.
  - Manual add/edit/delete for price and dividend entries.
  - Per-asset AI-powered fetch for historical prices and dividends.
  - Tools to clear and rebuild fetched history.

### Changed
- **Database Architecture**
  - Complete rewrite of database initialization.
  - Removed legacy waterfall migration system.
  - Enforced latest schema (V7) on startup.
  - Legacy versions (V1–V6) no longer auto-migrated to improve stability.
- **Transaction Flow**
  - Removed post-save alert popup.
  - Defaulted save action to rapid “Add More” mode.
- Faster cold start by eliminating migration logic during splash.
- Reduced app bundle size by removing unused migration artifacts.

### Fixed
- Resolved Android modal input jumping caused by keyboard conflicts.

---

## [1.7.0] — 2026-02-01

### Added
- **Budget-Aware Smart Alerts**
  - Alerts now integrate directly with Budgets and trigger immediately when limits are exceeded.
  - Category-item–level detection (e.g., *Water*, *Groceries*) for higher precision.

- **Transfers System**
  - Dedicated Transfer recording UI.
  - Explicit Incoming / Outgoing transfer handling.
  - Transfers are visually distinguished in History and correctly excluded/included in summaries.

- **Investment Tracking**
  - Stock Buy/Sell transactions with Quantity, Price, and Fees.
  - Dividend and Interest income recording.
  - Integrated calculator for investment inputs.
  - Automatic transaction total computation.
  - Realized and Unrealized Profit/Loss tracking.
  - Per-transaction SELL profit/loss visibility in History.

- **Investment Insights**
  - Market monitoring with:
    - Drop detection (>10% from 30-day peak)
    - Dip detection
    - Upcoming dividend alerts
    - Portfolio balance checks
  - Portfolio Allocation Heatmap (Treemap) with Stock and Sector views.
  - Holdings list with live prices and daily change.
  - AI-powered historical price & dividend fetching (Gemini).
  - Dividend projection chart with monthly breakdown.

- **Smart History Calendar**
  - Calendar-based transaction view with daily income/expense visualization.
  - Safe-to-Spend calculation accounting for upcoming recurring bills.
  - Spending heatmap (Guilt Filter) excluding fixed recurring expenses.
  - Ghost Forecast for upcoming recurring charges.
  - BUY / SELL investment signals on calendar dates.

- **Home Screen Enhancements**
  - New **Monthly Net** card (Income vs Expense excluding transfers).
  - Clarified “Money In / Money Out” balance labels.
  - Formula transparency via “How is this calculated?” info panels.

- **Category Selection UX**
  - Recent category suggestions (last 30 days).
  - Horizontal quick-select bar with integrated search.

### Changed
- Record Menu redesigned with a modern grid layout.
- Improved tablet and landscape responsiveness.
- Investment calculation engine optimized to O(N) grouping.
- Automated database migrations for investment price history.
- Concurrency-safe transaction loading during background decryption.
- Faster portfolio loading for large investment histories.
- Clearer visual separation of transfers across analytics.
- Added AI data transparency clauses (Section 2.4).
- Clarified BYOK responsibility for Gemini API usage.
- Added disclaimer for automated insights and projections.

### Fixed
- Historical anomaly detection now calculates averages per month instead of per transaction.
- Fixed infinite loop caused by Semi-Weekly reminder date calculations.
- Resolved race condition where optimistic UI updates could be overwritten.

---

## [1.6.1] — 2026-01-28

### Fixed
- Fixed app-wide crashes on Android caused by incompatible UUID generation.
- Removed usage of \`crypto.randomUUID\`.
- Replaced ID generation with a platform-safe implementation.
- Restored stability for:
  - Profile creation
  - Transactions
  - Budgets
  - Any feature requiring new internal IDs
- Existing user data remains safe and unaffected.

---

## [1.6.0] — 2026-01-28

### Added
- Background transaction decryption in non-blocking batches (500 items per chunk).
- New **Provide Feedback** menu in Profile settings (Google Forms).
- Expanded snooze options in Catch-up reminders (15m, 1h, 4h, 8h, 1d, 3d).

### Changed
- Introduced a new high-precision financial computation engine using \`BigNumber.js\`.
- Recalculated historical and derived metrics using arbitrary precision math.
- Reminder auto-rescheduling after backup restore.
- Full notification cleanup when clearing app data.
- *(Known issue)* Some charts or derived values may appear inconsistent due to recalculation changes.
- *(Known issue)* Visual discrepancies may occur in certain analytics views.

---

## [1.5.0] — 2026-01-25

### Added
- True background reminder actions (Complete / Snooze) without opening the app.
- Swipeable Balance Card (Total ↔ Monthly).
- Persistent Income/Expense view preference.
- Global Privacy toggle in the top header.
- Global Error Boundary with local crash log storage.
- Developer tools for crash simulation and log export.

### Changed
- **BREAKING:** Security PIN reset required.
- **BREAKING:** Encryption key alias changed; previously encrypted sensitive data may be unreadable.
- **BREAKING:** Gemini AI API key must be reconfigured.
- Refactored internal storage architecture to centralized \`KEYS\` configuration.
- Improved safe-area handling for headers and modals.

### Fixed
- Android background notification parsing crashes.
- Notifications not dismissing after action.

---

## [1.4.0] — 2026-01-25

### Added
- System-level Help Center with:
  - Getting Started
  - Financial Insights
  - Math & Formulas
- Educational info modals for:
  - Financial Runway
  - Budget Health
  - Daily Average
- Mandatory Terms & Privacy versioning system.
- Standalone Terms & Privacy reference screen.
- Improved legal UI with safe-area fixes and synced documents.

### Changed
- Updated Budget Health thresholds:
  - Green: <70%
  - Orange: 70–90%
  - Red: >90%
- Added projection footnote to Spending Comparison insights.

### Fixed
- Misleading Budget Health color at 99% usage.
- Startup crash caused by \`NativeDatabase.prepareAsync\` race condition.

---

## [1.3.1] — 2026-01-23

### Added
- Time range filters for Savings and Income charts (6M / 1Y / 3Y / ALL).
- Expanded Overview section to 10 insight cards.
- Manual paging system with visual indicators.
- Insights layout customization with persistent settings.

### Changed
- Smart scaling and label density for large datasets.
- Color-coded Savings Trend visuals.
- Income projection consistency across all filters.

### Fixed
- Chart clutter in long history views.
- Misaligned 0% grid line and savings trend offsets.
- X-axis label overlap issues.

---

## [1.3.0] — 2026-01-22

### Added
- Optimistic cache system for instant transaction CRUD operations.
- Skeleton loading states across Home, History, and Insights.
- CSV / TSV bulk transaction import with validation and duplicate detection.
- Smart document scanner powered by Google ML Kit.
- Monthly spending projection and pro-rated comparisons.
- Local background smart alerts for spending deviations.

### Changed
- Initial transaction load time reduced by ~3× for large datasets.
- Data migration system upgraded to a robust waterfall pattern.

### Fixed
- Blank Insights graphs during calculations.
- Security issue where modals remained visible above PIN lock.
- Recurring transaction duplication bug.
- Migration freezes during splash screen.

---

## [1.2.0] — 2026-01-21

### Added
- AI-powered receipt analysis with Gemini AI.
- API key acquisition guide and usage history.
- Custom alert system replacing native alerts.
- Modern bottom modals for transaction actions.
- Unified PIN entry UI.

### Changed
- Record flow UX and Android back button handling.
- Dynamic modal resizing for calculators and recurring forms.

### Fixed
- Duplicate recurring transaction creation.
- Double success alerts during PIN setup.
- Circular dependency in storage layer.

---

## [1.1.0] — 2026-01-20

### Added
- Encrypted SQLite storage.
- Conditional screenshot and app switcher protection.
- Enhanced caching for faster data access.

### Changed
- Migrated persistence layer from JSON files to SQLite.
- Introduced automatic, lossless data migration.

---

## [1.0.1] — 2026-01-19

### Added
- Interactive onboarding guide explaining security and core features.
- Help & Guide access from Profile settings.
- Support Developer section with donation option.

### Changed
- Profile screen layout and visual consistency.
- Gemini AI settings UX.

### Fixed
- Profile nested card layout issues.
- SetupScreen syntax and onboarding flow scoping bugs.

---

## [1.0.0] — 2026-01-18

### Added
- Offline-first personal finance tracking.
- AES-256 encrypted local storage.
- No accounts, no ads, no cloud dependency.

`
