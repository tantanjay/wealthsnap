# WealthSnap Product Vision & Core Architecture

```text
                        WEALTHSNAP
                            │
          ┌─────────────────┼─────────────────┐
          │                 │                 │
          ▼                 ▼                 ▼
       EXPENSE          INVESTMENT           DEBT
     Financial flow     Financial assets   Liabilities
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
                            ▼
                        INSIGHTS
                     "What's happening?"
                            │
                            ▼
                    FINANCIAL HEALTH
                     "How am I doing?"
                            │
                            ▼
                        EDUCATION
                    "Why does it matter?"
```

## "What changed?"

Every time the user opens the app, we want to immediately tell them:
**"Your financial health changed this month."**

**For example:**

> **Financial Health: 82 → 77**
> 
> **Why?**
> - Spending +8%
> - Runway −1.3 months
> - Credit-card interest +₱1,800
> - Investment portfolio −2.1%
> - Savings rate −4.8%
> 
> **What matters most?**
> Your spending increase is currently having 3× more impact than your investment losses.
> 
> **Recommended action:**
> Reduce discretionary spending by ₱6,000/month.
> 
> **Expected impact:**
> Runway +1.1 months over 12 months.

*That is far more compelling than another pie chart.*

---

## Monthly Summary: "Financial Doctor"

Not literally medical, but conceptually. Every month, the user receives a check-up:

- **Diagnosis**: Financial health improved moderately.
- **Causes**: Savings increased 8.2%.
- **Risks**: Debt interest increased 14%.
- **Opportunities**: Your investment contribution is below your 12-month average.
- **Action**: Increasing investment contributions by ₱5,000/month would accelerate your projected self-sustain date.

*That becomes a recurring habit loop.*

---

## Everything Else is Derived

The three core pillars collect the raw data:

### 1. Expense tells you:
- cash flow
- spending
- income
- savings
- recurring obligations
- budgets
- spending behavior

### 2. Investment tells you:
- assets
- holdings
- cost basis
- market value
- P/L
  - dividends
- allocation
- growth

### 3. Debt tells you:
- liabilities
- principal
- interest
- payments
- amortization
- obligations
- debt pressure

**Then:**

### Insights
Asks: *"What can we learn from all of this?"*

**And:**

### Financial Health
Asks: *"Given everything we know, what is my overall financial position?"*

---

## Feature Evaluation Framework

*"Does this make one of the three financial domains substantially better, or does it improve the intelligence derived from them?"*

**For example:**

**Expense (Potentially):**
- better recurring transaction handling
- better categorization
- better budget mechanics
- cash-flow analysis
- import
- receipt scanning
- forecasting
- transaction search
- reconciliation

**Investment (Potentially):**
- better portfolio accounting
- corporate actions
- dividends
- cost basis
- asset allocation
- performance attribution
- multi-currency
- tax lots
- price history
- portfolio projections

**Debt (Potentially):**
- more debt types
- better amortization
- payoff strategies
- interest analysis
- payment schedules
- debt consolidation modeling
- debt-vs-investing comparisons

**And then:**

**Insights:**
- anomaly detection
- trends
- comparisons
- explanations
- historical narratives

**Financial Health:**
- runway
- liquidity
- debt pressure
- savings capacity
- wealth growth
- self-sustainability