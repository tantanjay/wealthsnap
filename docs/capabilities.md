# WealthSnap – Features & Capabilities

## ⭐ Highlight Features

These represent the most impactful and differentiated capabilities of the app.

- **Safe to Spend Algorithm (v1.8.1)**
  Calculates "True Discretionary Income" by subtracting fixed bills, debt obligations, *and* a dynamic **Life Burnrate** (90-day average of daily costs).

- **Financial Runway Metric**
  Converts net liquid balance into time (e.g., **“11.0 months”**) to show how long funds will last without income.
  - **Debt Aware**: Now explicitly subtracts **Minimum Debt Payments** from your monthly burn rate, showing a realistic survival timeline.

- **Debt & Loan Management (v1.10.0)**
  Comprehensive tracking for Loans, Credit Cards, and Mortgages with full amortization schedules and "True Cost" integration into financial health metrics.
  - **Safe-to-Spend**: Deducts debt obligations before calculating discretionary income.
  - **Savings Rate**: Treats debt repayments as expenses to show true net savings.

- **Global Currency & Native Assets (v1.9.0)**
  Support for **150+ world currencies**. Invest in assets using their native currency (e.g., USD stocks while living in EUR zone) with auto-converted portfolio valuation.

- **Local-First, Zero-Knowledge Architecture**
  All data stays on the device. No cloud sync, no external servers, no data collection.

- **BYO AI (Gemini API)**
  AI features are unlocked by supplying a personal Google Gemini API key—no bundled subscription required.

- **Investment Allocation Treemap (v1.7.0)**
  Heatmap-style visualization showing portfolio size and performance using green/red blocks.

- **Smart Financial Alerts**
  Automatic detection of **spending spikes (>50%)**, **significant runway drops (>25%)**, and **budget overruns**.

---

## 💸 Debt & Loan Management (New in v1.10.0)

- **Comprehensive Debt Form**
  Track Loans, Credit Cards, Mortgages, and IOUs with specialized fields.
  
- **Amortization Schedules**
  View full payment breakdowns (Principal vs Interest) for every month of the loan term.

- **Smart Minimum Payments**
  Auto-calculated based on interest rates and terms. These mandatory payments are automatically deducted from your Safe-to-Spend.

- **Interest Types**
  Support for Fixed, Variable, Flat, and No Interest loans.

- **Payoff Projections**
  Accurate forecast of when you will be debt-free based on current payment plans.

---

## 🌍 Global Currency & Assets

- **Multi-Currency Support**
  Select from over 150 currencies for your primary profile.

- **Native Currency Investments**
  Record stocks and crypto in their original trading currency (e.g., AAPL in USD).

- **Auto-Conversion**
  Real-time exchange rates (via Frankfurter API) convert foreign assets to your home currency for total net worth calculation.

---

## 📈 Investments & Assets

- **Native Crypto Support**
  Track cryptocurrency holdings alongside traditional stocks.

- **"Double AI" Market Research (v1.8.0)**
  Two-step AI agent system ("Researcher" & "Accountant") to fetch and format historical price/dividend data.

- **Enhanced History**
  Dedicated tabs for **Position History**, **Price History**, and **Dividend History**.

- **Investment Insights**
  - **Drop/Dip Detection:** Alerts for significant market moves.
  - **Portfolio Drift:** Visual bars showing asset weight vs target.
  - **Dividend Projector:** Monthly forecast of passive income.

- **Stock & Sector Treemaps**
  Interactive heatmaps to visualize portfolio performance at a glance.

---

## 🏥 Financial Health & Analytics

- **Financial Health Card (v1.10.0)**
  Top-of-dashboard view tracking Runway, Budget Health, and Net Worth.

- **Net Worth Card**
  Tracks Total Assets minus Total Liabilities (including projected interest for true cost awareness).

- **Monthly Pulse**
  Visualizes spending velocity against your 3-month average to detect early overspending.

- **Interactive Charts**
  Tap-and-drag to inspect precise values on Savings Rate, Income, and Spending charts.

- **Time Range Filters**
  Analyze data across 6M, 1Y, 3Y, or All Time ranges.

---

## ⚡ User Experience & Workflow

- **Dedicated Transfers System**
  Distinct "Money In" and "Money Out" transaction types that don't mess up your income/expense reports.

- **Smart Document Scanner**
  Google ML Kit-powered scanner for receipts with auto-edge detection.

- **Smart History Calendar**
  Daily view of finances with "Guilt Filter" heatmaps and "Ghost Forecast" for upcoming bills.

- **Optimistic UI**
  Instant interaction for adding/editing transactions with background data processing.

- **Swipeable Dashboard**
  Toggle between Total and Monthly views on key metric cards.

- **System-Level Help Center**
  Built-in guides for onboarding, financial math, and feature explanations.

---

## ⚙️ Core Technology

- **High-Precision Math Engine (v1.6.0)**
  Powered by `BigNumber.js` for localized, arbitrary-precision financial calculations.

- **Encrypted SQLite Storage**
  AES-256 encrypted database for maximum security and performance.

- **Background Processing**
  Non-blocking data decryption and exchange rate syncing.

---

## 🛡️ Privacy & Security

- **Global Privacy Mode**
  One-tap toggle in the header to hide all sensitive values (replaced with `****`).

- **Conditional Screenshot Protection**
  Prevents screen capture when privacy mode is off (can be toggled).

- **Biometric App Lock**
  PIN and biometric protection with auto-lock timeout.

- **Crash Safety**
  Global error boundaries with local crash logging for debugging without data sharing.

---

## 💾 Data Portability

- **CSV / TSV Import**
  Bulk import transactions with smart validation and duplicate detection.

- **Encrypted Backups**
  Secure export and restore of local data.
