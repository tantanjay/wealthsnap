import { Transaction, TransactionType } from '../types';
import { getCategoryGroup } from '../constants/categories';

export const getTransactionsByMonth = (transactions: Transaction[], date: Date = new Date()) => {
    return transactions.filter(t => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === date.getMonth() && tDate.getFullYear() === date.getFullYear();
    });
};

export const calculateTotals = (transactions: Transaction[]) => {
    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        if (t.type === 'INCOME') {
            income += t.amount;
        } else if (t.type === 'EXPENSE') {
            expense += t.amount;
        }
    });

    return { income, expense, net: income - expense };
};

export const calculateSavingsRate = (income: number, expense: number) => {
    if (income === 0) return 0;
    const savings = income - expense;
    return (savings / income) * 100;
};

export const getSavingsRateTrend = (transactions: Transaction[], months: number = 6) => {
    const trends = getMonthlyTrends(transactions, months);

    return trends.labels.map((month, index) => {
        const income = trends.incomeData[index];
        const expense = trends.expenseData[index];
        const savingsRate = calculateSavingsRate(income, expense);

        return {
            month,
            rate: Math.round(savingsRate * 10) / 10, // Round to 1 decimal
            income,
            expense,
            savings: income - expense
        };
    });
};

export const getTopTransactions = (transactions: Transaction[], limit: number = 5) => {
    const currentMonth = new Date();
    const currentMonthTransactions = getTransactionsByMonth(transactions, currentMonth);

    return currentMonthTransactions
        //.filter(t => t.type !== 'TRANSFER') // Exclude transfers - TRANSFER type does not exist yet
        .sort((a, b) => b.amount - a.amount) // Sort by amount descending
        .slice(0, limit);
};

export const getCategoryTrend = (transactions: Transaction[], category: string, months: number = 6, grouping: 'CATEGORY' | 'SUB_CATEGORY' = 'CATEGORY') => {
    const result = {
        labels: [] as string[],
        data: [] as number[]
    };

    // const { getCategoryGroup } = require('../constants/categories');

    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        result.labels.push(d.toLocaleString('default', { month: 'short' }));

        const monthlyTransactions = getTransactionsByMonth(transactions, d);
        const categoryTotal = monthlyTransactions
            .filter(t => {
                if (grouping === 'CATEGORY') {
                    // Group mode: check against category group
                    const group = getCategoryGroup(t.category, t.type);
                    return group === category;
                } else {
                    // Item mode (SUB_CATEGORY): check against subCategory (or category if sub is missing)
                    const key = (t.subCategory && t.subCategory !== 'undefined') ? t.subCategory : t.category;
                    return key === category;
                }
            })
            .reduce((sum, t) => sum + t.amount, 0);

        result.data.push(categoryTotal);
    }

    return result;
};

export const getMonthEndProjection = (transactions: Transaction[]) => {
    const today = new Date();
    const currentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthlyTransactions = getTransactionsByMonth(transactions, currentMonth);

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const daysRemaining = daysInMonth - currentDay;

    const { income, expense } = calculateTotals(monthlyTransactions);

    // --- SMART PROJECTION LOGIC ---
    // 1. Calculate Linear Projection (Fallback)
    const linearProjectedIncome = income + ((income / currentDay) * daysRemaining);
    const linearProjectedExpense = expense + ((expense / currentDay) * daysRemaining);

    // 2. Calculate Historical Pace (Smart)
    let smartProjectedIncome = linearProjectedIncome;
    let smartProjectedExpense = linearProjectedExpense;

    // Get previous months (go back up to 6 months)
    let historyMonthsCount = 0;
    let totalHistoricalExpenseEnd = 0;
    let totalHistoricalExpenseToDate = 0;

    // We only care about Expense for "Smart" usually, as Income is often irregular (bi-weekly)
    // making daily-pace less useful, but we can try basic pacing for income too.

    for (let i = 1; i <= 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const histTrans = getTransactionsByMonth(transactions, d);
        if (histTrans.length === 0) continue; // Skip empty months

        const histTotals = calculateTotals(histTrans);

        // Calculate how much was spent by this day in that month
        const histToDate = histTrans.filter(t => new Date(t.date).getDate() <= currentDay)
            .reduce((sum, t) => sum + (t.type === 'EXPENSE' ? t.amount : 0), 0);

        totalHistoricalExpenseEnd += histTotals.expense;
        totalHistoricalExpenseToDate += histToDate;
        historyMonthsCount++;
    }

    // Apply Smart Logic if we have enough history and non-zero pacing
    if (historyMonthsCount >= 1 && totalHistoricalExpenseToDate > 0) {
        // Average spend by "Today's Date" across history
        const avgExpenseToDate = totalHistoricalExpenseToDate / historyMonthsCount;
        // Average total spend per month across history
        const avgExpenseEnd = totalHistoricalExpenseEnd / historyMonthsCount;

        // Multiplier: "Am I spending faster or slower than usual?"
        // Example: Usually spend $1000 by Day 15. Today spent $1200. Multiplier = 1.2
        const paceMultiplier = expense / avgExpenseToDate;

        // Project: Normal Month Total * Multiplier
        smartProjectedExpense = avgExpenseEnd * paceMultiplier;
    }

    // 3. Final Calculation
    // For income, linear is usually "okay" or we should stick to linear for safety unless we do cycle detection.
    // Let's stick to linear for Income, and use Smart for Expense.

    return {
        currentIncome: income,
        currentExpense: expense,
        projectedIncome: linearProjectedIncome,
        projectedExpense: smartProjectedExpense,
        projectedSavings: linearProjectedIncome - smartProjectedExpense,
        daysRemaining,
        progress: (currentDay / daysInMonth) * 100
    };
};




export const calculateBurnRate = (allTransactions: Transaction[], monthsBack: number = 6) => {
    if (allTransactions.length === 0) return 0;

    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);

    // Find the earliest transaction date to determine account age
    // We treat the "start" as the 1st of the month of the first transaction
    const firstTxDate = allTransactions.reduce((earliest, t) => {
        const tDate = new Date(t.date);
        return tDate < earliest ? tDate : earliest;
    }, new Date());

    const firstTxMonthStart = new Date(firstTxDate.getFullYear(), firstTxDate.getMonth(), 1);

    // Calculate months since start (inclusive of current month)
    const monthDiff = (currentMonthStart.getFullYear() - firstTxMonthStart.getFullYear()) * 12 +
        (currentMonthStart.getMonth() - firstTxMonthStart.getMonth()) + 1;

    // The effective window is the smaller of: requested history OR actual history depth
    // We ensure it's at least 1 month
    const effectiveMonths = Math.max(1, Math.min(monthsBack, monthDiff));

    let totalExpense = 0;

    // Sum expenses for the effective window
    for (let i = 0; i < effectiveMonths; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);
        const { expense } = calculateTotals(monthlyTransactions);
        totalExpense += expense;
    }

    return totalExpense / effectiveMonths;
};

export const getCategoryBreakdown = (transactions: Transaction[], type: TransactionType, groupBy: 'CATEGORY' | 'SUB_CATEGORY' = 'CATEGORY') => {
    const breakdown: { [key: string]: number } = {};
    let total = 0;

    const filteredTransactions = transactions.filter(t => t.type === type);

    filteredTransactions.forEach(t => {
        let key: string;

        if (groupBy === 'CATEGORY') {
            // Group mode: Group by category group (e.g., "Family & Home", "Food & Lifestyle")
            // We need to get the group for this category
            // Import getCategoryGroup from categories.ts
            // const { getCategoryGroup } = require('../constants/categories');
            key = getCategoryGroup(t.category, t.type);
        } else {
            // Item mode (SUB_CATEGORY): Group by individual category/item (e.g., "Groceries", "Food")
            // If subCategory exists and is valid, use it; otherwise use category
            if (t.subCategory && t.subCategory !== 'undefined') {
                key = t.subCategory;
            } else {
                key = t.category;
            }
        }

        breakdown[key] = (breakdown[key] || 0) + t.amount;
        total += t.amount;
    });

    return Object.entries(breakdown)
        .map(([name, amount]) => ({
            name,
            amount,
            percentage: total > 0 ? (amount / total) * 100 : 0
        }))
        .sort((a, b) => b.amount - a.amount);
};

export const getMonthlyTrends = (allTransactions: Transaction[], monthsBack: number = 6) => {
    const result = {
        labels: [] as string[],
        incomeData: [] as number[],
        expenseData: [] as number[]
    };

    const today = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        result.labels.push(d.toLocaleString('default', { month: 'short' }));

        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);
        const { income, expense } = calculateTotals(monthlyTransactions);
        result.incomeData.push(income);
        result.expenseData.push(expense);
    }
    return result;
};

export interface Anomaly {
    type: 'SPIKE' | 'NEW_CATEGORY' | 'HIGH_SPENDING';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const detectAnomalies = (currentMonthTransactions: Transaction[], allTransactions: Transaction[]): Anomaly[] => {
    const anomalies: Anomaly[] = [];

    // Only detect anomalies if we have enough historical data
    if (allTransactions.length < 10) {
        return anomalies; // Not enough data to detect meaningful patterns
    }

    const historyTransactions = allTransactions.filter(t => !currentMonthTransactions.includes(t));

    // Check for significant spending spikes (50%+ increase vs historical average)
    const currentBreakdown = getCategoryBreakdown(currentMonthTransactions, 'EXPENSE');

    currentBreakdown.forEach(item => {
        // Only check categories that exist in history
        const catHistory = historyTransactions.filter(t => t.category === item.name && t.type === 'EXPENSE');
        if (catHistory.length < 3) return; // Need at least 3 historical transactions

        // Calculate historical average
        const historicalTotal = catHistory.reduce((sum, t) => sum + t.amount, 0);

        // Prevent division by zero if historicalTotal is 0
        if (historicalTotal === 0) return;

        const historicalAverage = historicalTotal / catHistory.length;

        // Flag if current month is 50% higher than average AND the difference is significant
        const percentIncrease = ((item.amount - historicalAverage) / historicalAverage) * 100;
        const difference = item.amount - historicalAverage;

        if (percentIncrease > 50 && difference > 1000) { // 50% increase AND at least 1000 difference
            anomalies.push({
                type: 'SPIKE',
                message: `${item.name} spending is ${percentIncrease.toFixed(0)}% higher than usual`,
                severity: percentIncrease > 100 ? 'HIGH' : 'MEDIUM'
            });
        }
    });

    return anomalies;
};

export const getCategoryAverages = (allTransactions: Transaction[], monthsBack: number = 3) => {
    const today = new Date();
    const totalsByCategory: { [key: string]: number } = {};

    // Filter for last N months excluding current
    const startHistory = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const endHistory = new Date(today.getFullYear(), today.getMonth(), 0); // End of last month

    const historyParams = allTransactions.filter(
        t => {
            const d = new Date(t.date);
            return d >= startHistory && d <= endHistory && t.type === 'EXPENSE';
        }
    );

    historyParams.forEach(t => {
        totalsByCategory[t.category] = (totalsByCategory[t.category] || 0) + t.amount;
    });

    const averages: { [key: string]: number } = {};
    Object.keys(totalsByCategory).forEach(key => {
        averages[key] = totalsByCategory[key] / monthsBack;
    });

    return averages;
};
