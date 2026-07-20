# WealthSnap

**Private. Intelligent. Offline-First.**  
WealthSnap is a powerful personal finance app designed to help you track money, analyze trends, manage investments, monitor debt, and understand your true financial health — all while keeping your data fully encrypted and stored locally on your device.

---

## 🔐 Privacy-First Architecture

WealthSnap is built with a **zero-knowledge, offline-first philosophy**.

- 🔒 **AES-256 Encryption** for sensitive data  
- 📱 **Local Storage Only** (SQLite database)  
- 🚫 No forced cloud sync  
- 🧠 AI features are strictly **opt-in**  
- 🔑 BYOK (Bring Your Own Key) for AI services  
- 📦 Secure Backup & Restore support  

Your financial data never leaves your device unless you explicitly choose to use optional AI features.

---

## 💰 Core Features

### 📊 Smart Financial Dashboard
- Interactive **Financial Health Card**
- Track:
  - Stability Runway (months you can survive without income)
  - Liquidity Date projection
  - Net Flow & Spending Trend
  - Debt Pressure & Interest Drag
  - Wealth Growth Acceleration
- Swipe between **Health Metrics**, **Net Worth**, and **Total Assets**

---

### 🧾 Transactions & Budgeting
- Income & Expense tracking
- Recurring transactions & reminders
- Budget monitoring with smart color thresholds:
  - 🟢 <70% Healthy
  - 🟠 70–90% Warning
  - 🔴 >90% Danger
- Smart category suggestions
- CSV/TSV bulk import
- Calendar-based history view with:
  - Safe-to-Spend calculation
  - Ghost Forecast (upcoming bills)
  - Discretionary heatmap

---

### 📈 Investments & Portfolio Management
Track and analyze:
- Stocks
- Funds
- Crypto
- Custom assets (via Asset Dictionary)

Features include:
- Buy / Sell / Dividends / Interest tracking
- Unrealized & Realized P/L
- Allocation Heatmap (Stock & Sector views)
- Dividend projection chart
- Price & dividend history management
- Native currency recording (multi-currency support)
- Automatic exchange rate conversion
- AI-assisted price & dividend fetching

---

### 💳 Debt & Loan Management
Comprehensive liability tracking:

- Loans, Mortgages, Credit Cards, IOUs
- Full amortization schedule
- Fixed, Variable, Flat, or No interest types
- Auto minimum payment calculation
- Principal vs Interest split
- Debt-integrated:
  - Savings Rate
  - Runway
  - Safe-to-Spend
- Monthly vs Lifetime debt tracking
- One-tap payment recording

---

### 🤖 AI-Powered Tools (Optional)

WealthSnap integrates optional AI tools, powered by your own Gemini API key.

Features include:
- Smart receipt analysis (amount, category, notes extraction)
- AI-assisted stock price research
- **Chat**: ask questions about your own finances in plain language, grounded in a live snapshot of your data (cash, investments, P/L, dividends, debt, runway) plus your Monthly Summaries — with streaming replies and per-message cost/token transparency

**Privacy Controls:**
- You provide your own API key
- A consent dialog itemizes exactly what each AI feature sends — receipt images, stock/asset symbols, or your financial summary — before it's ever used
- Images are not permanently stored
- Chat conversations are not saved — each session starts fresh
- Local database is never shared

---

### 🔔 Smart Alerts & Reminders
- Budget breach alerts
- Spending spike detection
- Runway drop detection (≥25%)
- Background reminder completion & snooze
- Catch-up mode for missed reminders
- Interactive notification actions

---

### 🌍 Global Currency Support
- 150+ world currencies
- Smart localization (decimal formats, symbols)
- Native-currency investment tracking
- Real-time FX conversion

---

### 📊 Advanced Insights
- Savings Rate Trend (interactive)
- Income Analysis with projections
- Spending Comparison (pro-rated)
- Monthly Pulse Forecast
- 10+ Financial Insight Cards
- Customizable Insights dashboard
- Reorderable cards & sections
- Tap-to-inspect charts

---

### 🗓️ Monthly Summary
Your month at a glance, written in plain language instead of raw numbers.

- Narrative breakdown of income, expenses, savings rate, net cash flow, investment activity, debt payments, transfers, budget alerts, and unusual spending
- Generated automatically in the background for every month you have data for, with a one-time catch-up of past months
- Current month stays up to date; the previous month finalizes automatically once it closes
- Manual "Reprocess All Months" option for regenerating summaries after editing older data
- Pure local computation — no AI calls or cost involved

---

## ⚡ Performance & Architecture

WealthSnap is engineered for speed and reliability:

- SQLite-based encrypted storage
- High-precision financial engine
- Background transaction decryption (chunked loading)
- Optimistic UI cache updates
- Exchange rate & market data caching
- Global Error Boundary with crash logging
- Safe-area optimized UI
- Headless JS background task support

---

## 🛡 Security

- Secure PIN protection
- Intelligent app lock behavior
- Conditional screenshot blocking
- Encrypted sensitive fields
- Strict transfer handling (Transfer Out treated conservatively)
- Versioned Terms & Privacy acceptance tracking

---

## 📦 Backup & Restore

- Manual encrypted backup
- Multi-MIME restore support
- Backup reminder (every 7 days)
- Automatic reminder rescheduling after restore

---

## 📚 Built-In Help Center

WealthSnap includes a full in-app documentation system:

- Getting Started Guide
- Financial Insights Education
- Full Mathematical Formulas
- Change Logs
- Terms of Use & Privacy
- Vision, Philosophy & Goals

Complete transparency on how every metric is calculated.

---

## 🎯 Philosophy

WealthSnap is designed around three principles:

1. **Clarity over complexity**
2. **Privacy over convenience**
3. **Education over guesswork**

You don't just see numbers — you understand them.

---

## 🛠 Tech Stack (High Level)

- React Native (Expo)
- SQLite (expo-sqlite)
- AES Encryption
- BigNumber.js computation engine
- React Native Gifted Charts
- Headless JS background services

---

## 🚀 Vision

WealthSnap is not just an expense tracker.  
It’s a **Personal Financial Operating System** built to help you:

- Survive
- Stabilize
- Grow
- Self-sustain

All while keeping your financial life completely private.
