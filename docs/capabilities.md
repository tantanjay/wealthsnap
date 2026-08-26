
# WealthSnap – Features & Capabilities

WealthSnap is a privacy-first, computation-driven financial system designed to give you deterministic clarity over your money. Below is a complete breakdown of its major capabilities.

---

# ⭐ Core Highlight Features

## 💰 Safe-to-Spend Algorithm (True Discretionary Income)

WealthSnap calculates what you can *actually* spend without hurting your future.

**Formula:**

```
(Current Cash + Future Income)
- (Future Bills + Mandatory Debt Payments + Life Burnrate)
= Safe-to-Spend
```

Where:

- **Future Income** includes recurring income before period end  
- **Mandatory Debt Payments** are treated as non-optional  
- **Life Burnrate** is a rolling 90-day average of non-recurring daily spending  

This ensures your “Guilt-Free Money” is conservative, survival-aware, and debt-adjusted.

---

## 🏃 Financial Runway & Freedom Timeline

Transforms your liquid balance into survival time.

- Displays: `11.0 months`, etc.
- Projects a **Liquidity / Freedom Date**
- Fully debt-aware
- Shows how behavior changes (spending, saving, investing) move freedom earlier or later

Includes:

- Impact on Self-Sustain (months gained/lost per year)
- Debt Delay in years
- Investment Acceleration effect

---

## 🏥 Financial Health Intelligence System

A top-level diagnostic engine that evaluates:

- **Stability Runway**
- **Net Cash Flow**
- **Spending Trend Baseline**
- **Debt Pressure**
- **Interest Drag**
- **Freedom Acceleration**

Designed to show not just your numbers — but your trajectory.

---

## 🌍 Global Currency & Native Assets

- 150+ world currencies
- Native-currency investment recording
- Automatic home-currency conversion
- Smart localization (decimal formats, symbols)
- FX caching for performance efficiency

---

## 🔐 Local-First, Zero-Knowledge Architecture

- Fully offline-first
- Encrypted SQLite storage
- AES-256 encryption for sensitive data
- No forced cloud sync
- No analytics tracking
- No server dependency

Your data stays on your device.

---

## 🤖 Bring-Your-Own AI (Optional)

AI features are fully optional and user-controlled.

- Uses your personal Gemini API key
- No subscription lock-in
- No bundled AI cost
- Only selected data is transmitted
- Entire database is never shared
- **Chat**: Ask questions about your own finances in plain language, grounded in a live snapshot of your data plus your Monthly Summaries. Includes streaming replies, per-message token/cost transparency, and context caching.
- **Smart Scanning**: Extract amounts, categories, and notes from receipts.
- **Privacy Controls**: A consent dialog itemizes exactly what is sent before any feature is used. You can explicitly exclude sensitive categories from Chat.

---

# 💸 Debt & Loan Management

A complete liability tracking system deeply integrated into financial health metrics.

## 📋 Comprehensive Debt Profiles

Supports:

- Loans
- Credit Cards
- Mortgages
- IOUs

---

## 📊 Full Amortization Engine

Generates a complete month-by-month breakdown:

- Principal
- Interest
- Remaining balance

Supports:

- Fixed interest
- Variable interest
- Flat rate
- No interest

---

## 💳 Smart Minimum Payment Engine

Automatically calculates required payments based on:

- Interest rate
- Term length
- Interest type

These payments are treated as **mandatory obligations** across:

- Safe-to-Spend
- Financial Runway
- Net Worth
- Savings Rate

---

## 🧮 True Cost Accounting

- Debt repayments count toward expenses correctly
- Savings Rate avoids double-counting principal
- Net Worth includes projected future interest (conservative valuation)
- Interest explicitly measured as “Freedom Delay”

---

## 🔄 Intelligent Debt Transactions

- Detects whether funds entered your account
- Prevents inflated cash balances
- Principal and interest are auto-split
- Linked transactions stay synchronized
- Cascade deletion maintains data integrity

---

## 📊 Debt Analytics Card

- Swipe between **Lifetime** and **Monthly** views
- See:
  - Required Payments
  - Paid Principal
  - Interest Cost
- Clear separation of obligations vs activity

---

# 📈 Investments & Asset Management

## 📊 Investment Tracking

Supports:

- Stocks
- Funds
- Crypto
- Custom Assets (Asset Dictionary)

---

## 💹 Portfolio Intelligence

- Realized P/L
- Unrealized P/L
- Allocation heatmap (Stock / Sector views)
- Holdings list with sorting
- Native currency support
- Monthly vs Total portfolio view

---

## 📈 Dividend & Income Projections

- Dividend tracking
- Dividend projection chart
- Price history
- Dividend history
- Manual and AI-assisted updates

---

## 🤖 AI-Assisted Market Research (Optional)

- Historical price research
- Dividend date and amount fetching
- Powered by your own Gemini API key for higher reliability and structured output

---

# 🏥 Financial Health & Analytics

## 🧾 Financial Health Card

Top-of-dashboard summary with swipeable views:

- Health Metrics
- Net Worth
- Total Assets

---

## 📊 Advanced Net Worth Tracking

- Assets minus liabilities
- Liabilities include projected interest
- Conservative projection model
- Clear separation of mandatory vs discretionary cash flow

---

## 📉 Interactive Trend Analytics

- Savings Rate Trend
- Income Analysis
- Spending Comparison
- Monthly Pulse Projection

Features:

- Tap-to-inspect
- Press-and-hold detail popups
- Multi-range filters (6M, 1Y, 3Y, ALL)
- Pro-rated projections
- Dynamic scaling & split-color trends

---

## 🗓️ Monthly Summary

Your month at a glance, written in plain language instead of raw numbers.

- Narrative breakdown of income, expenses, savings rate, net cash flow, investment activity, debt payments, transfers, budget alerts, and unusual spending
- Generated automatically in the background for every month you have data for
- Manual "Reprocess All Months" option
- Pure local computation — no AI calls or cost involved

---

# 📅 Planning & Projections

## 🗓 Loan Start-Date Awareness

- Accurate forward projections
- Payoff timeline calculation
- Amortization forecasting

---

## 📋 Exportable Schedules

- Copy full amortization table
- Ready for spreadsheet analysis

---

# 📆 Smart History Calendar

A powerful alternate history view featuring:

- Income / Expense / Transfer bars per day
- Safe-to-Spend for period
- Ghost Forecast (upcoming recurring bills)
- Discretionary spending heatmap
- Investment BUY/SELL signal markers
- Interactive learning modal

---

# 🔔 Smart Alerts & Reminders

## 📢 Real-Time Alerts

- Budget breach detection
- Category-level anomaly detection
- Spending spike detection
- Runway Drop Detection (≥25%)

Alerts run immediately after saving transactions.

---

## ⏰ Reminder System

- Recurring reminders
- Background completion
- Snooze options (15m → 3d)
- Catch-up modal
- Proper notification cleanup

---

# ⚡ User Experience & Workflow

- Dedicated Transfers system
- Smart Budget Suggestions (realistic amounts based on last 12 months)
- Smart category suggestions (last 30 days)
- Horizontal quick-select categories
- Rapid entry mode (auto “Add More”)
- Smart Document Scanner
- History Screen Filters (by type, keyword, date range)
- Floating Quick Actions (draggable menu bubble)
- Swipeable balance cards
- Persistent display preferences
- Reorderable dashboard sections
- Integrated Change Logs in Help Center

---

# 📚 Built-In Education & Transparency

- Full Help Center (Getting Started, Financial Insights, Debt Strategy, Investments)
- Financial Insights explanations
- Math & Formula documentation
- Vision & Philosophy modal
- Terms & Privacy version tracking

No black-box calculations.

---

# ⚙️ Core Technology

- High-Precision BigNumber financial engine
- Encrypted SQLite storage
- Hybrid encryption model
- Background decryption batching
- Optimistic cache updates
- Concurrency-safe transaction handling
- Headless JS background tasks
- Global error boundary with crash logs

---

# 🛡 Privacy & Security

- Secure PIN lock
- Intelligent auto-lock logic
- Conditional screenshot blocking
- Reveal for Screenshot (temporarily bypass protection with confirmation)
- Encrypted sensitive fields
- Versioned Terms acceptance
- Local crash telemetry only
- No external storage permissions

---

# 💾 Backup, Sync & Export

- **Multi-Device Sync**: Merge data directly between devices over WiFi via QR code (no cloud)
- CSV / TSV bulk import
- Duplicate detection & strict validation engine
- **Export to Excel**: Save transactions, investments, and debts to a multi-sheet `.xlsx` file
- Encrypted local manual backup
- **Auto Backup**: Scheduled automatic encrypted backups (weekly or bi-weekly)
- Multi-format restore support
- Smart 7-day backup reminder (if Auto Backup is off)
- Reminder auto-rescheduling after restore

---

# 🎯 Philosophy

WealthSnap is built as a:

> Personal Financial Operating System

It does not just track expenses.  
It models survival, obligation, acceleration, and freedom — locally, privately, and deterministically.
````
