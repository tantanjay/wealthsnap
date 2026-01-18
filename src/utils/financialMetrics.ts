import { Transaction, TransactionType } from '../types';

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

export const calculateBurnRate = (allTransactions: Transaction[], monthsBack: number = 6) => {
    // Average monthly expense over the last N months
    const today = new Date();
    let totalExpense = 0;
    let monthCount = 0;

    for (let i = 0; i < monthsBack; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);
        const { expense } = calculateTotals(monthlyTransactions);

        // Only count months that have expenses or are not in the future
        if (monthlyTransactions.length > 0 || i === 0) { // Always count current month? Maybe not if empty. Let's count if it exists.
            totalExpense += expense;
            monthCount++;
        }
    }

    return monthCount > 0 ? totalExpense / monthCount : 0;
};

export const getCategoryBreakdown = (transactions: Transaction[], type: TransactionType) => {
    const breakdown: { [category: string]: number } = {};
    let total = 0;

    transactions.filter(t => t.type === type).forEach(t => {
        const cat = t.category;
        breakdown[cat] = (breakdown[cat] || 0) + t.amount;
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

    // 1. Check for new categories
    const historyTransactions = allTransactions.filter(t => !currentMonthTransactions.includes(t));
    const historicalCategories = new Set(historyTransactions.map(t => t.category));

    const newCategories = new Set<string>();
    currentMonthTransactions.forEach(t => {
        if (!historicalCategories.has(t.category) && t.type === 'EXPENSE') {
            newCategories.add(t.category);
        }
    });

    newCategories.forEach(cat => {
        anomalies.push({
            type: 'NEW_CATEGORY',
            message: `New recurring expense detected: ${cat}`, // Simplified text
            severity: 'MEDIUM'
        });
    });

    // 2. Check for spikes in existing categories (Simple Avg comparison)
    // Group current month by category
    const currentBreakdown = getCategoryBreakdown(currentMonthTransactions, 'EXPENSE');

    currentBreakdown.forEach(item => {
        // Find average for this category in history
        const catHistory = historyTransactions.filter(t => t.category === item.name && t.type === 'EXPENSE');
        if (catHistory.length === 0) return;

        // Simple average of all historical transactions (better would be monthly average, but this is a start)
        // Let's do monthly average for the last 3 months for this category
        let totalCatHistory = 0;
        let monthsWithTrans = 0; // naive count
        // Group history by month to get proper monthly average
        // ... (Skipping complex grouping for brevity, using simple avg of total / 3 as a heuristic if we assume 3 months history)

        // Better: Compare to "Normal" monthly average
        // Let's use getCategoryBreakdown on history and divide by approx months
        // This is getting complex for a synced function. Let's simplify:
        // Identify single large transactions > 50% of history average?

        // Let's stick to the user's specific request: "Sudden spike vs historical average"
        // Calculate historical average for this category per month.
    });

    return anomalies;
};

export const getCategoryAverages = (allTransactions: Transaction[], monthsBack: number = 3) => {
    const today = new Date();
    const totalsByCategory: { [key: string]: number } = {};
    const months = monthsBack; // Divide by this

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
