# WealthSnap — Private Budget, Expense & Investment Tracker

**README Version:** v1.7.0  
**Last Updated:** February 1, 2026  
**App Version Covered:** WealthSnap v1.7.0+

---

**WealthSnap** is a privacy-first, offline personal finance app built for people who want **full control over their money and their data** — without subscriptions, ads, cloud accounts, or hidden trade-offs.

It combines **bank-grade security**, **high-precision financial computation**, and **clear, educational insights** in a way that’s powerful for advanced users, yet understandable for non-technical users.

---

## 🌍 What WealthSnap Is (In Plain Terms)

WealthSnap helps you:

- Track income, expenses, transfers, and investments
- Understand where your money goes
- Monitor budgets and receive intelligent alerts
- Plan ahead with projections, reminders, and forecasts
- Do all of this **entirely on your device**

There are **no servers**, **no accounts**, and **no tracking**.  
Your financial data never leaves your phone unless *you* explicitly export it.

---

## 🔐 Privacy & Security by Design

Privacy is not a feature — it’s the foundation.

### Offline-First Architecture

- All data is stored locally using **SQLite**
- No cloud sync, no remote servers
- Works fully offline

### Hybrid Encryption Model

- **AES-256 encryption** for sensitive data (amounts, notes, private fields)
- Non-sensitive metadata remains searchable for performance
- Encryption keys are stored securely using the device’s secure hardware enclave

### App-Level Protection

- Biometric security (Face ID / Fingerprint)
- App-specific PIN
- Screenshot & app-switcher protection
- Global **Privacy Mode** to instantly hide all values

> Even the developer cannot see or collect your data — because it never leaves your device.

---

## 🧮 Financial Accuracy You Can Trust

### High-Precision Computation Engine

Starting **v1.6.0**, WealthSnap uses a **BigNumber-based computation engine**:

- Eliminates floating-point rounding errors
- Ensures accuracy for long histories and large totals
- Critical for projections, savings rate, and lifetime metrics

This means:

- Charts stay mathematically consistent
- Monthly and lifetime totals always reconcile
- No “off by a few cents” drift over time

---

## 📊 Smart Insights (Without Paywalls)

WealthSnap provides **advanced financial analytics** usually locked behind subscriptions.

### Core Insights

- Net Cash Flow
- Savings Rate (with trend analysis)
- Burn Rate
- Financial Runway
- Budget Health
- Daily Average Spending
- Annualized Expense Projection
- Top Spending Category

### Predictive Analytics

- **Monthly Pulse** with historical-based projections
- Pro-rated income & expense comparisons
- Fair month-to-month comparisons even mid-month

### Smart Alerts (Budget-Aware)

- Budget breach detection even without historical data
- Category-item level precision (e.g., “Water”, “Groceries”)
- Instant notifications when limits are exceeded
- Fully local evaluation logic

### Educational by Default

- Every major metric includes an **info modal**
- Plain-language explanations
- Visual examples
- Clear disclosure of assumptions and limitations

No finance background required.

---

## 📅 Smart History & Calendar Analytics

Starting **v1.7.0**, WealthSnap introduces a powerful **Calendar View**:

- Daily breakdown of Income, Expense, and Transfers
- Color-coded visual bars per date
- **Safe-to-Spend** calculation (balance minus upcoming bills)
- **Guilt Filter** heatmap highlighting discretionary spending
- **Ghost Forecast** badges for future recurring bills
- Visual BUY / SELL investment signals
- Interactive guides explaining each smart stat

All analytics run **entirely on-device**.

---

## 📈 Investments & Portfolio Tracking

WealthSnap includes a fully integrated **offline investment tracker**.

### Supported Records

- Stock BUY / SELL transactions
- Dividends
- Interest income
- Fees and cost basis tracking

### Portfolio Computation

- Total Portfolio Value (based on latest known prices)
- Unrealized Profit / Loss
- Realized Capital Gains & Losses
- Per-transaction P/L visibility in history

### Investment Insights

- Market Drop Detection (>10% from 30-day peak)
- Short-term Dip Detection
- Dividend Event Alerts
- Portfolio Balance & Allocation Checks

### Allocation Heatmap

- Interactive Treemap visualization
- Size = portfolio value
- Color = performance (Green / Red)
- Toggle between **Stock View** and **Sector View**

---

## 🤖 AI Price Fetch & Receipt Scanning (User-Controlled)

WealthSnap includes optional AI-powered tools, designed to **preserve privacy and architectural integrity**.

### AI Price Fetch (Investments)

- Fetch historical stock prices and dividend data
- Smart estimation when live APIs are unavailable
- Background syncing without blocking the UI
- Flexible fetch ranges (Today, 3D, 7D, 30D)

### AI Receipt Scanning

- Uses **Google ML Kit** for on-device document detection
- Extracts amount, date, category, and line items
- Supports discounts and item consolidation
- Receipt images are **not permanently stored**

### 🔑 About the AI API Key (BYOK)

You provide **your own Google Gemini API key**.

- No backend servers
- No key storage or rotation
- Requests run directly from your device
- You operate under your own Google API contract

BYOK is not a feature — it is a **technical necessity** of a zero-backend, offline-first architecture.

---

## ⚡ Performance at Scale

Designed to remain fast even with **thousands of records**:

- Chunked background decryption
- Optimistic UI updates with race-condition safety
- O(N) investment grouping for fast portfolio loads
- Skeleton loading states for smooth transitions
- Cached encryption keys to reduce I/O overhead

---

## 🔔 Reminders & Background Tasks

- Recurring reminders for bills, habits, and budgets
- Background notification actions (Complete / Snooze)
- Catch-up mode for missed reminders
- Intelligent alert throttling

All logic runs **locally on-device**.

---

## 📥 Data Ownership & Portability

- CSV / TSV bulk import with validation
- Duplicate detection
- Encrypted local backups
- Restore with automatic reminder rescheduling
- No proprietary lock-in

Your data is yours — always.

---

## 🧱 Technical Architecture (High-Level)

| Layer            | Technology                             |
|------------------|----------------------------------------|
| UI               | React Native + Expo (New Architecture) |
| Storage          | SQLite (local-only)                    |
| Encryption       | AES-256 + SecureStore                  |
| Computation      | BigNumber.js (arbitrary precision)     |
| AI               | Google Gemini API (user-provided key)  |
| Background Tasks | Headless JS (Android)                  |

---

## 🧪 Stability & Transparency

- Waterfall database migrations
- Concurrency-safe optimistic updates
- Global error boundary with local crash logs
- Clear release notes per version
- Mandatory legal versioning for Terms & Privacy updates

---

## 📱 Project Status

- Google Play Closed Testing
- Actively used daily by the developer
- Rapid iteration from real-world usage
- No monetization pressure influencing design

---

## 💡 Why This App Is Free

No servers → no operating costs  
No data collection → nothing to sell  
No subscriptions → no dark patterns  

> Build the finance app the developer personally wanted to use — and share it.

---

## 📌 Philosophy

> **Your money is private.**  
> **Your data is yours.**  
> **Accuracy matters.**  
> **Transparency builds trust.**

WealthSnap is not just a budgeting app —  
it’s a statement against data exploitation in personal finance software.
