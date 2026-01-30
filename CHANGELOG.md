# Changelog

All notable changes to **WealthSnap** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),  
and this project adheres to [Semantic Versioning](https://semver.org/).

---

## [1.6.1] — 2026-01-28
### Fixed
- Fixed app-wide crashes on Android caused by incompatible UUID generation.
- Removed usage of `crypto.randomUUID`.
- Replaced ID generation with a platform-safe implementation.
- Restored stability for:
  - Profile creation
  - Transactions
  - Budgets
  - Any feature requiring new internal IDs
- Existing user data remains safe and unaffected.

---

## [1.6.0] — 2026-01-28
### Changed
- Introduced a new high-precision financial computation engine using `BigNumber.js`.
- Recalculated historical and derived metrics using arbitrary precision math.

### Added
- Background transaction decryption in non-blocking batches (500 items per chunk).
- New **Provide Feedback** menu in Profile settings (Google Forms).
- Expanded snooze options in Catch-up reminders (15m, 1h, 4h, 8h, 1d, 3d).

### Improved
- Reminder auto-rescheduling after backup restore.
- Full notification cleanup when clearing app data.

### Known Issues
- Some charts or derived values may appear inconsistent due to recalculation changes.
- Visual discrepancies may occur in certain analytics views.

---

## [1.5.0] — 2026-01-25
### ⚠️ Breaking Changes
- Security PIN reset required.
- Encryption key alias changed; previously encrypted sensitive data may be unreadable.
- Gemini AI API key must be reconfigured.

### Added
- True background reminder actions (Complete / Snooze) without opening the app.
- Swipeable Balance Card (Total ↔ Monthly).
- Persistent Income/Expense view preference.
- Global Privacy toggle in the top header.
- Global Error Boundary with local crash log storage.
- Developer tools for crash simulation and log export.

### Changed
- Refactored internal storage architecture to centralized `KEYS` configuration.
- Improved safe-area handling for headers and modals.

### Fixed
- Android background notification parsing crashes.
- Notifications not dismissing after action.

---

## [1.4.0] — 2026-01-25
### Changed
- Updated Budget Health thresholds:
  - Green: <70%
  - Orange: 70–90%
  - Red: >90%
- Added projection footnote to Spending Comparison insights.

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

### Fixed
- Misleading Budget Health color at 99% usage.
- Startup crash caused by `NativeDatabase.prepareAsync` race condition.

---

## [1.3.1] — 2026-01-23
### Added
- Time range filters for Savings and Income charts (6M / 1Y / 3Y / ALL).
- Expanded Overview section to 10 insight cards.
- Manual paging system with visual indicators.
- Insights layout customization with persistent settings.

### Improved
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

### Improved
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

### Improved
- Record flow UX and Android back button handling.
- Dynamic modal resizing for calculators and recurring forms.

### Fixed
- Duplicate recurring transaction creation.
- Double success alerts during PIN setup.
- Circular dependency in storage layer.

---

## [1.1.0] — 2026-01-20
### Changed
- Migrated persistence layer from JSON files to SQLite.
- Introduced automatic, lossless data migration.

### Added
- Encrypted SQLite storage.
- Conditional screenshot and app switcher protection.
- Enhanced caching for faster data access.

---

## [1.0.1] — 2026-01-19
### Added
- Interactive onboarding guide explaining security and core features.
- Help & Guide access from Profile settings.
- Support Developer section with donation option.

### Improved
- Profile screen layout and visual consistency.
- Gemini AI settings UX.

### Fixed
- Profile nested card layout issues.
- SetupScreen syntax and onboarding flow scoping bugs.

---

## [1.0.0] — Initial Release
### Added
- Offline-first personal finance tracking.
- AES-256 encrypted local storage.
- No accounts, no ads, no cloud dependency.
