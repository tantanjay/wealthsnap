# CPU Performance Analysis & Bottlenecks

This document outlines the identified CPU-intensive areas in WealthSnap and provides a roadmap for optimization based on the analysis performed on Feb 16, 2026.

## 1. Primary Bottlenecks

### `src/utils/financialMetrics.ts` (The Calculation Engine)
*   **Issue**: High redundancy and nested filtering.
*   **Specifics**:
    *   `detectAnomalies`: Currently O(Categories * Transactions). It filters the entire transaction list for every category.
    *   `getCumulativeSpendingCurve` & `getMonthlyTrends`: These create multiple monthly buckets, each time performing a full list filter (`getTransactionsByMonth`).
    *   **Complexity**: As transaction history grows, these O(N) or O(N^2) operations will cause visible lag when opening screens.

### `src/screens/HomeScreen.tsx` & `src/screens/InsightScreen.tsx`
*   **Issue**: Redundant data aggregation in `loadData`.
*   **Specifics**:
    *   The `loadData` function iterates over the transaction array 5-10 times consecutively (to calculate Income, Expense, Transfer, P/L, Debt, etc.).
    *   Debt balance calculations perform a full `.filter()` on all transactions for *every active debt*.
*   **Impact**: These screens feel "heavy" when loading because they recompute the universe on every focus.

### `src/utils/investmentMetrics.ts`
*   **Issue**: Historical Replay.
*   **Specifics**: `calculatePortfolioMetrics` sorts and iterates through all history to maintain a valid weighted average cost.
*   **Impact**: CPU time increases linearly with the number of investment transactions.

### `src/services/domain/transactionService.ts`
*   **Issue**: Cryptographic Load.
*   **Specifics**: Decrypting thousands of transactions using `BigNumber` for amount parsing is CPU heavy.
*   **Note**: Already uses chunking/timeouts to prevent freezing, but still contributes to high CPU usage peaks.

## 2. Recommended Optimization Roadmap

### Phase 1: Quick Wins (Single-Pass Aggregation)
*   [ ] Refactor `HomeScreen.tsx` `loadData` to use a single `forEach` loop over transactions to aggregate all core metrics (Income, Expense, Transfers, Debt Payments, Realized P/L).
*   [ ] Replace multiple `.filter()` calls with a single reducer where possible.

### Phase 2: Indexing & Caching
*   [ ] **Pre-grouping**: At the start of metrics calculation, group transactions by `month` or `category` into a `Map`/`Object`. This turns O(N) filters into O(1) lookups.
*   [ ] **Memoization**: Implement `useMemo` for derived data in screen components to prevent re-calculations during non-data-related re-renders.

### Phase 3: Architecture Refinement
*   [ ] **Partial Recalculation**: Only recalculate metrics for the current month if older data is already cached.
*   [ ] **Web Workers (Optional)**: Move heavy cryptographic and aggregation logic to a Web Worker (if supported/needed for background processing) to keep the Main Thread idle.

## 3. Resolution Guide (Fix Patterns)

### Resolution for Single-Pass Aggregation (Home Screen)
Instead of filtering multiple times, process the list once:

```typescript
// BEFORE:
const incomes = transactions.filter(t => t.type === 'INCOME');
const expenses = transactions.filter(t => t.type === 'EXPENSE');

// AFTER (Resolution):
let totalIncome = new BigNumber(0);
let totalExpense = new BigNumber(0);
let debtPayments = new BigNumber(0);

transactions.forEach(t => {
    const amount = t.amount.abs();
    switch(t.type) {
        case 'INCOME': totalIncome = totalIncome.plus(amount); break;
        case 'EXPENSE': 
            totalExpense = totalExpense.plus(amount);
            if (t.debtId) debtPayments = debtPayments.plus(amount); // Multi-purpose pass
            break;
        case 'TRANSFER_OUT':
            if (t.debtId) debtPayments = debtPayments.plus(amount);
            break;
    }
});
```

### Resolution for O(N^2) Metrics (Anomaly Detection)
Group by category first to avoid nested filtering:

```typescript
// Resolution: Create an Index
const categoryMap: Record<string, Transaction[]> = {};
allTransactions.forEach(t => {
    if (!categoryMap[t.category]) categoryMap[t.category] = [];
    categoryMap[t.category].push(t);
});

// Now iterate over keys instead of filtering the whole list N times
Object.keys(categoryMap).forEach(catName => {
    const catHistory = categoryMap[catName]; // O(1) lookup
    // ... run logic on catHistory
});
```

### Resolution for Screen Lag (Memoization)
Use `useMemo` to protect against unnecessary re-renders:

```typescript
// Resolution (HomeScreen / InsightScreen):
const processedMetrics = useMemo(() => {
    return calculateEverything(transactions, debts);
}, [transactions, debts]); // Only runs if data actually changes
```

---
*Created by Antigravity Performance Subagent*
