# WealthSnap – Developer Technical README

> Private • Offline-First • High-Precision • Encrypted Finance Engine

WealthSnap is a privacy-first personal finance application built with React Native (Expo) using a fully local, encrypted SQLite architecture. This document explains the internal architecture, storage model, financial engine, background services, and development guidelines.

---

# 🏗 Architecture Overview

## Core Principles

- Offline-first (no mandatory backend)
- Zero-knowledge design
- Encrypted-by-default sensitive data
- Deterministic financial computation
- Optimistic UI with concurrency safety
- Modular service-based architecture

---

# 📦 Tech Stack

### Core
- React Native (Expo)
- TypeScript
- `expo-sqlite`
- `expo-secure-store`
- `react-native-gifted-charts`
- Headless JS (background tasks)

### Financial Engine
- `BigNumber.js` for arbitrary precision arithmetic

### AI (Optional)
- Google Gemini API (BYOK – user supplied key)

---

# 🗄 Storage Architecture

## Database Engine

- SQLite (via `expo-sqlite`)
- Encrypted sensitive fields (AES-256)
- Metadata stored raw when safe (hybrid encryption model)
- Strict local-only persistence

### Database Policy (v1.8.0+)

- Enforces latest schema on startup
- Legacy waterfall migration system removed
- Treats DB as fresh installation for outdated schemas (V1–V6 dropped)

---

## Encryption Model

### Strategy
- AES-256 encryption for sensitive fields:
  - Transactions
  - Budgets
  - Investments
  - Debt records
  - API keys
- Encryption key stored via SecureStore
- Key cached in memory after first fetch (performance optimization)
- Sequential encryption ensured during migrations

### Hybrid Encryption

Sensitive financial values: encrypted  
Metadata & non-sensitive fields: plaintext (for performance and indexing)

---

# 💎 Financial Computation Engine

Introduced in v1.6.0:

- Replaced native JS float math with `BigNumber.js`
- Arbitrary precision decimal math
- Eliminates floating-point rounding drift
- Ensures consistent long-term aggregation accuracy

### Computation Patterns

- All sums use BigNumber accumulation
- Ratios use deterministic rounding rules
- Derived metrics recomputed dynamically (not stored)
- Historical recalculations allowed after engine upgrade

---

# ⚡ Performance Optimizations

## Background Decryption

- Chunked loading (500 records per batch)
- Uses `setTimeout(0)` yielding to prevent UI blocking
- Fully interactive UI during decryption

## Optimistic Cache System

Implements:

- `addTransactionToCache`
- `updateTransactionInCache`
- `deleteTransactionFromCache`

Prevents full reloads after CRUD.

## Encryption Key Caching

- SecureStore I/O reduced dramatically
- Eliminated thousands of redundant reads

## Portfolio Computation

- O(N) grouping algorithm
- Eliminated nested recalculation loops

---

# 🔄 Concurrency Safety

Addressed race conditions between:

- Background decryption
- Optimistic updates
- Investment computation
- Exchange rate updates

Fix:
- Isolation of mutation operations
- Deferred state reconciliation
- Controlled cache invalidation

---

# 📊 Financial Logic Systems

## Safe-to-Spend (v1.8.1 overhaul)

```
(Current Cash + Future Income)
- (Future Bills + Burn Rate)
= Safe-to-Spend
```

Where:

- Future Income: recurring income before period end
- Burn Rate: average non-recurring spend (last 3 months)
- Transfers Out treated as expenses (strict policy)

---

## Financial Runway

```
Tracked Liquid Balance / Monthly Burn Rate
```

Includes:
- Transfers
- Debt minimum payments
- Mandatory obligations

Runway Drop Alert triggered at ≥25% decline MoM.

---

## Savings Rate

Accounts for:
- Income
- Expenses
- Debt principal
- Avoids double-counting interest

---

# 💳 Debt Engine

## Supported Interest Types

- Fixed
- Variable
- Flat
- None

## Features

- Auto minimum payment computation
- Amortization schedule generator
- Principal vs Interest split logic
- Linked transactions
- Cascade deletion

---

# 📈 Investment Engine

## Investment Types

- Stocks
- Funds
- Crypto
- Custom Assets (via Asset Dictionary)

## Core Capabilities

- Buy / Sell / Dividend / Interest tracking
- Realized & Unrealized P/L
- Native currency recording
- FX conversion to profile currency
- Allocation heatmap
- Dividend projections

## Exchange Rate Handling

- Background service caching
- Rate reuse to reduce API load
- Historical conversion normalization

---

# 🤖 AI Integration (Optional)

## Architecture

- User provides Gemini API key
- Key encrypted locally
- No global database transmission
- Only selected data sent

## AI Modules

- Receipt Analyzer
- Market Data Researcher (step 1)
- Market Data Accountant (step 2 formatting)

Two-stage AI model:
1. Researcher (data gathering)
2. Accountant (structured output)

---

# 🔔 Reminder & Notification System

## Background Support

- Headless JS task registration
- Notification parsing (object/string safe)
- Serialized action handling

## Interactive Actions

- Complete (background mark)
- Snooze (15m + extended)
- Catch-up modal on open

## Cleanup Logic

`clearAllData()` invokes:
```
notificationService.cancelAllNotifications()
```

---

# 🧠 Smart Alerts Engine

Triggers for:

- Budget breaches
- Spending spikes
- Runway drop ≥25%
- Category-level anomaly detection

Immediate anomaly detection after transaction save (v1.8.1 fix).

---

# 🛡 Error Handling

## Global Error Boundary

- Prevents app crash
- Shows fallback UI
- Stores crash logs locally
- Developer export option
- Crash simulation toggle

---

# 📁 Project Structure

```text
/src
    /components      # UI components (atoms, molecules, organisms)
    /screens         # Screen-level components
    /services        # Business logic and data management
        /core        # Security, storage, and caching
        /domain      # Domain-specific logic (investments, debt, etc.)
        /integrations # External APIs (Gemini, currency, backup)
        /background  # Background tasks and notifications
        /database    # SQLite schema and service
    /context         # React context providers
    /hooks           # Custom React hooks
    /navigation      # App navigation configuration
    /utils           # Helper functions and metrics
    /constants       # Configuration and static data
    /types           # TypeScript interfaces and types
    /styles          # Global styles and themes
```

---

# 🔑 Centralized Storage Keys (v1.5.0)

Refactored to unified `KEYS` configuration object:

Benefits:
- Prevents key drift
- Easier migrations
- Maintainable storage logic

---

# 🧪 Testing Focus Areas

- Encryption integrity
- Migration consistency
- Background task reliability
- Debt amortization correctness
- FX conversion accuracy
- High-volume transaction performance (2000+ records)
- Concurrency during decrypt + create
- Safe-to-Spend formula edge cases

---

# 🔐 Legal & Compliance

- Local-only architecture
- BYOK AI controller model
- Data minimization enforced
- Screenshot protection (conditional)
- Versioned Terms acceptance tracking
- Removed legacy storage permissions

---

# 🚀 Development Guidelines

- Never use JS float math for financial computation
- Always wrap arithmetic in BigNumber
- Encrypt before persist
- Avoid blocking the main thread
- Ensure optimistic updates reconcile with background loaders
- Treat Transfers Out conservatively
- Maintain deterministic derived metrics

---

# 📱 Package

```
com.christian.soyosa.WealthSnap
```

---

# 🧭 Philosophy for Developers

WealthSnap is not built as a cloud SaaS.
It is a **local financial engine**.

The priority order is:

1. Deterministic accuracy
2. Privacy
3. Performance
4. UX polish
5. Feature expansion

---

If contributing:

- Maintain modular service separation
- Avoid cross-service tight coupling
- Preserve offline-first guarantees
- Do not introduce server dependencies

---

**WealthSnap is a Personal Financial Operating System — built entirely on-device.**
