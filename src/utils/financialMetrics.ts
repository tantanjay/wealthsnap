import { Transaction, TransactionType } from '../types';
import { getCategoryGroup } from '../constants/categories';

export interface ProcessedTransaction extends Transaction {
    timestamp: number;
    monthKey: string; // YYYY-MM
}

export interface ProcessedData {
    all: ProcessedTransaction[];
    byMonth: Map<string, ProcessedTransaction[]>;
}

export const processTransactions = (transactions: Transaction[]): ProcessedData => {
    const byMonth = new Map<string, ProcessedTransaction[]>();
    const all = transactions.map(t => {
        const date = new Date(t.date);
        const timestamp = date.getTime();
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

        const pt: ProcessedTransaction = { ...t, timestamp, monthKey };

        if (!byMonth.has(monthKey)) {
            byMonth.set(monthKey, []);
        }
        byMonth.get(monthKey)!.push(pt);

        return pt;
    });

    return { all, byMonth };
};

export const getTransactionsByMonthKey = (data: ProcessedData, monthKey: string) => {
    return data.byMonth.get(monthKey) || [];
};

export const getTransactionsByMonth = (transactions: Transaction[], date: Date = new Date()) => {
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    return transactions.filter(t => {
        const tDate = new Date(t.date);
        const tKey = `${tDate.getFullYear()}-${String(tDate.getMonth() + 1).padStart(2, '0')}`;
        return tKey === monthKey;
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

export const getSavingsRateTrend = (data: ProcessedData, months: number = 6) => {
    const trends = getMonthlyTrends(data, months);

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

export const getCategoryTrend = (data: ProcessedData, category: string, months: number = 6, grouping: 'CATEGORY' | 'SUB_CATEGORY' = 'CATEGORY') => {
    const result = {
        labels: [] as string[],
        data: [] as number[]
    };

    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        result.labels.push(d.toLocaleString('default', { month: 'short' }));

        const monthlyTransactions = data.byMonth.get(monthKey) || [];
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

export const getMonthEndProjection = (data: ProcessedData) => {
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthlyTransactions = data.byMonth.get(currentMonthKey) || [];

    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const currentDay = today.getDate();
    const daysRemaining = daysInMonth - currentDay;

    const { income, expense } = calculateTotals(monthlyTransactions);

    // --- SMART PROJECTION LOGIC ---
    // 1. Calculate Linear Projection (Fallback)
    const linearProjectedIncome = income + ((income / currentDay) * daysRemaining);
    const linearProjectedExpense = expense + ((expense / currentDay) * daysRemaining);

    // 2. Calculate Historical Pace (Smart)
    let smartProjectedExpense = linearProjectedExpense;

    // Get previous months (go back up to 6 months)
    let historyMonthsCount = 0;
    let totalHistoricalExpenseEnd = 0;
    let totalHistoricalExpenseToDate = 0;

    for (let i = 1; i <= 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const histTrans = data.byMonth.get(monthKey) || [];
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




export const calculateBurnRate = (data: ProcessedData, monthsBack: number = 6) => {
    if (data.all.length === 0) return 0;

    const today = new Date();
    let totalExpense = 0;
    let monthsFound = 0;

    for (let i = 0; i < monthsBack; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthlyTransactions = data.byMonth.get(monthKey) || [];

        if (monthlyTransactions.length > 0 || i === 0) { // Include current month or any month with data
            const { expense } = calculateTotals(monthlyTransactions);
            totalExpense += expense;
            monthsFound++;
        }
    }

    return monthsFound > 0 ? totalExpense / monthsFound : 0;
};

export const calculateFIStatus = (currentAssets: number, burnRate: number) => {
    const annualExpense = burnRate * 12;
    const fiTarget = annualExpense * 25;
    const progress = fiTarget > 0 ? (currentAssets / fiTarget) * 100 : 0;

    return {
        fiTarget,
        annualExpense,
        progress: Math.min(progress, 1000), // Cap at 1000% for UI safety
        isFI: progress >= 100
    };
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

export const getMonthlyTrends = (data: ProcessedData, monthsBack: number = 6) => {
    const result = {
        labels: [] as string[],
        incomeData: [] as number[],
        expenseData: [] as number[]
    };

    const today = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        result.labels.push(d.toLocaleString('default', { month: 'short' }));

        const monthlyTransactions = data.byMonth.get(monthKey) || [];
        const { income, expense } = calculateTotals(monthlyTransactions);
        result.incomeData.push(income);
        result.expenseData.push(expense);
    }
    return result;
};

// --- PULSE CHART METRICS ---

export const getCumulativeSpendingCurve = (data: ProcessedData, monthsBack: number): number[] => {
    const today = new Date();
    let count = 0;
    const dailySums: number[] = new Array(31).fill(0);

    for (let i = 1; i <= monthsBack; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthlyTrans = data.byMonth.get(monthKey) || [];
        if (monthlyTrans.length === 0) continue;

        const daysInThisMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        let monthRunningTotal = 0;

        // Group month's transactions by day once to avoid inner loop filter
        const byDay = new Map<number, number>();
        monthlyTrans.forEach(t => {
            if (t.type === 'EXPENSE') {
                const day = new Date(t.date).getDate();
                byDay.set(day, (byDay.get(day) || 0) + t.amount);
            }
        });

        for (let day = 1; day <= 31; day++) {
            if (day <= daysInThisMonth) {
                const daySum = byDay.get(day) || 0;
                monthRunningTotal += daySum;
            }
            dailySums[day - 1] += monthRunningTotal;
        }
        count++;
    }

    if (count === 0) return [];
    return dailySums.map(sum => sum / count);
};

export const getCurrentMonthCumulative = (currentMonthTransactions: Transaction[]): number[] => {
    const today = new Date();
    const currentDay = today.getDate();
    const result: number[] = [];
    let runningTotal = 0;

    // Optimize by grouping by day first
    const byDay = new Map<number, number>();
    currentMonthTransactions.forEach(t => {
        if (t.type === 'EXPENSE') {
            const day = new Date(t.date).getDate();
            byDay.set(day, (byDay.get(day) || 0) + t.amount);
        }
    });

    for (let day = 1; day <= currentDay; day++) {
        const daySum = byDay.get(day) || 0;
        runningTotal += daySum;
        result.push(runningTotal);
    }
    return result;
};

export interface Anomaly {
    type: 'SPIKE' | 'NEW_CATEGORY' | 'HIGH_SPENDING';
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Optimized anomaly detection
 */
export const detectAnomalies = (data: ProcessedData): Anomaly[] => {
    const anomalies: Anomaly[] = [];
    const today = new Date();
    const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const currentMonthTransactions = data.byMonth.get(currentMonthKey) || [];

    // Only detect anomalies if we have enough historical data
    if (data.all.length < 10) {
        return anomalies; // Not enough data to detect meaningful patterns
    }

    // 1. Pre-process history into category buckets ($O(N)$ once)
    const historyByCategory = new Map<string, ProcessedTransaction[]>();
    data.all.forEach(t => {
        if (t.monthKey === currentMonthKey || t.type !== 'EXPENSE') return;

        if (!historyByCategory.has(t.category)) {
            historyByCategory.set(t.category, []);
        }
        historyByCategory.get(t.category)!.push(t);
    });

    // 2. Check current month breakdown ($O(M)$ where M = categories)
    const currentBreakdown = getCategoryBreakdown(currentMonthTransactions, 'EXPENSE');

    currentBreakdown.forEach(item => {
        const catHistory = historyByCategory.get(item.name) || [];
        if (catHistory.length < 3) return; // Need at least 3 historical transactions

        // Calculate historical average
        const historicalTotal = catHistory.reduce((sum, t) => sum + t.amount, 0);
        if (historicalTotal === 0) return;

        const historicalAverage = historicalTotal / catHistory.length;
        const percentIncrease = ((item.amount - historicalAverage) / historicalAverage) * 100;
        const difference = item.amount - historicalAverage;

        if (percentIncrease > 50 && difference > 1000) {
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
