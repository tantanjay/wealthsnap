# WealthSnap — Private Budget & Expense Tracker

**WealthSnap** is a privacy-first, offline personal finance app built for people who want **full control over their money and their data**—without subscriptions, ads, cloud accounts, or hidden trade-offs.

It combines **bank-grade security**, **high-precision financial computation**, and **clear, educational insights** in a way that’s powerful for advanced users, yet understandable for non-technical users.

---

## 🌍 What WealthSnap Is (In Plain Terms)

WealthSnap helps you:

* Track income, expenses, and budgets
* Understand where your money goes
* Plan ahead with projections and alerts
* Do all of this **entirely on your device**

There are **no servers**, **no accounts**, and **no tracking**.
Your financial data never leaves your phone unless *you* explicitly export it.

---

## 🔐 Privacy & Security by Design

Privacy is not a feature — it’s the foundation.

### Offline-First Architecture

* All data is stored locally using **SQLite**
* No cloud sync, no remote servers
* Works fully offline

### Hybrid Encryption Model

* **AES-256 encryption** for sensitive data (amounts, notes, private fields)
* Non-sensitive metadata remains searchable for performance
* Encryption keys are stored securely using the device’s secure hardware enclave

### App-Level Protection

* Biometric security (Face ID / Fingerprint)
* App-specific PIN
* Screenshot & app-switcher protection
* Global **Privacy Mode** to instantly hide all values

> Even the developer cannot see or collect your data — because it never leaves your device.

---

## 🧮 Financial Accuracy You Can Trust

### High-Precision Computation Engine

Starting **v1.6.0**, WealthSnap uses a **BigNumber-based computation engine**:

* Eliminates floating-point rounding errors
* Ensures accuracy for long histories and large totals
* Critical for projections, savings rate, and lifetime metrics

This means:

* Charts stay mathematically consistent
* Monthly and lifetime totals always reconcile
* No “off by a few cents” drift over time

---

## 📊 Smart Insights (Without Paywalls)

WealthSnap provides **advanced financial analytics** usually locked behind subscriptions.

### Core Insights

* Net Cash Flow
* Savings Rate (with trend analysis)
* Burn Rate
* Financial Runway
* Budget Health
* Daily Average Spending
* Annualized Expense Projection
* Top Spending Category

### Predictive Analytics

* **Monthly Pulse** with historical-based projections
* Pro-rated income & expense comparisons
* Fair month-to-month comparisons even mid-month

### Educational by Default

* Every major metric includes an **info modal**
* Plain-language explanations
* Visual examples
* Clear disclosure of assumptions and limitations

No finance background required.

---

## 🤖 AI Receipt Scanning (User-Controlled by Design)

WealthSnap includes optional AI-powered receipt scanning, designed to **preserve privacy and architectural integrity**.

* Uses **Google ML Kit** for on-device document detection
* AI extracts amount, category, date, and line items
* Supports discounts and item consolidation
* Receipt images are **not permanently stored**

### 🔑 About the AI API Key (Important Clarification)

You provide **your own Google Gemini API key**. This is **not a marketing feature** — it is a direct consequence of WealthSnap’s architecture.

* WealthSnap has **no backend servers** to proxy AI requests
* The app does **not store, manage, or rotate API keys**
* AI requests are executed **directly from your device**
* All AI usage runs under **your own contract with Google**

This approach is sometimes described as **BYOK (Bring Your Own Key)**, but in WealthSnap:

* BYOK is **not optional**
* BYOK is **not positioned as innovation**
* BYOK is the **only viable design** for a zero-backend, offline-first app

AI is treated as a **user-initiated extension**, not a platform service.

---

## ⚡ Performance at Scale

Designed to remain fast even with **thousands of transactions**:

* Chunked background decryption
* Optimistic cache updates for instant UI feedback
* Skeleton loading states for smooth transitions
* Cached encryption keys to reduce I/O overhead

> Large datasets load quickly without freezing the app.

---

## 🔔 Smart Reminders & Background Tasks

* Recurring reminders for bills, habits, and budgets
* Background notification actions (Complete / Snooze)
* Catch-up mode for missed reminders
* Intelligent alert throttling (no spam)

All reminder logic runs **locally on-device**.

---

## 📥 Data Ownership & Portability

* CSV / TSV bulk import with validation & duplicate detection
* Encrypted local backups
* Restore with automatic reminder rescheduling
* No proprietary lock-in

Your data is yours — always.

---

## 🧱 Technical Architecture (High-Level)

| Layer            | Technology                             |
| ---------------- | -------------------------------------- |
| UI               | React Native + Expo (New Architecture) |
| Storage          | SQLite (local-only)                    |
| Encryption       | AES-256 + SecureStore                  |
| Computation      | BigNumber.js (arbitrary precision)     |
| AI               | Google Gemini API (user-provided key)  |
| Background Tasks | Headless JS (Android)                  |

The architecture favors:

* Deterministic logic
* Explicit state transitions
* Crash safety and graceful failure
* Long-term maintainability

---

## 🧪 Stability & Transparency

* Waterfall database migrations (safe version skipping)
* Global error boundary with local crash logs
* Clear release notes for every version
* Mandatory legal versioning for Terms & Privacy updates

If something breaks, it’s documented — and fixed fast.

---

## 📱 Project Status

* Currently in **Google Play Closed Testing**
* Actively used daily by the developer
* Rapid iteration based on real-world usage
* No monetization pressure influencing design decisions

---

## 💡 Why This App Is Free

WealthSnap was built out of necessity.

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
