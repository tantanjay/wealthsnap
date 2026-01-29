import { BigNumber } from 'bignumber.js';
import { Transaction, TransactionType } from '@types';
import { getCategoryGroup } from '@constants/categories';

type BreakdownType = Exclude<TransactionType, 'TRANSFER'>;

const isExpense = (t: Transaction) => t.type === 'EXPENSE';
const isIncome = (t: Transaction) => t.type === 'INCOME';

export const parseDate = (date: string | Date): Date => {
    return typeof date === 'string' ? new Date(date) : date;
};

export const getTransactionsByMonth = (transactions: Transaction[], date: Date = new Date()) => {
    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    return transactions.filter(t => {
        const tDate = parseDate(t.date);
        return tDate.getMonth() === targetMonth && tDate.getFullYear() === targetYear;
    });
};

export const calculateTotals = (transactions: Transaction[]) => {
    let income = new BigNumber(0);
    let expense = new BigNumber(0);

    transactions.forEach(t => {
        if (isIncome(t)) {
            income = income.plus(t.amount);
        } else if (isExpense(t)) {
            // Always store the total expense as a positive "bucket"
            expense = expense.plus(t.amount.abs());
        }
    });

    return { income, expense, net: income.minus(expense) };
};

export const calculateSavingsRate = (income: BigNumber, expense: BigNumber): BigNumber => {
    if (income.isZero() || income.isLessThan(0)) return new BigNumber(0);
    // (Income - Expense) / Income * 100
    const savings = income.minus(expense);
    return savings.dividedBy(income).times(100);
};

export const getSavingsRateTrend = (transactions: Transaction[], months: number = 6) => {
    const trends = getMonthlyTrends(transactions, months);

    return trends.labels.map((month, index) => {
        const income = trends.incomeData[index];
        const expense = trends.expenseData[index];
        const savingsRate = calculateSavingsRate(income, expense);

        return {
            month,
            // .dp(1) is the BigNumber way to round to 1 decimal place safely
            rate: savingsRate.dp(1).toNumber(),
            income,
            expense,
            savings: income.minus(expense)
        };
    });
};

export const getTopExpenses = (transactions: Transaction[], limit: number = 5) => {
    const currentMonth = new Date();
    const currentMonthTransactions = getTransactionsByMonth(transactions, currentMonth);

    return currentMonthTransactions
        .filter(isExpense)
        .sort((a, b) => b.amount.abs().comparedTo(a.amount.abs()) ?? 0)
        .slice(0, limit);
};

export const getCategoryTrend = (
    transactions: Transaction[],
    category: string,
    type: BreakdownType = 'EXPENSE',
    months: number = 6,
    grouping: 'CATEGORY' | 'SUB_CATEGORY' = 'CATEGORY'
) => {
    const result = {
        labels: [] as string[],
        data: [] as BigNumber[]
    };

    const today = new Date();
    for (let i = months - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        result.labels.push(d.toLocaleString('default', { month: 'short' }));

        const monthlyTransactions = getTransactionsByMonth(transactions, d);
        const categoryTotal = monthlyTransactions
            .filter(t => t.type === type)
            .filter(t => {
                if (grouping === 'CATEGORY') {
                    const group = getCategoryGroup(t.category, t.type);
                    return group === category;
                } else {
                    const key = (t.subCategory && t.subCategory !== 'undefined') ? t.subCategory : t.category;
                    return key === category;
                }
            })
            .reduce((sum, t) => sum.plus(t.amount.abs()), new BigNumber(0));

        result.data.push(categoryTotal);
    }

    return result;
};

export const getMonthEndProjection = (transactions: Transaction[]) => {
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const daysRemaining = daysInMonth - currentDay;

    const currentMonthTrans = getTransactionsByMonth(transactions, today);
    const { income, expense } = calculateTotals(currentMonthTrans);

    // 1. Linear Fallback
    const dailyIncome = income.dividedBy(currentDay || 1);
    const dailyExpense = expense.dividedBy(currentDay || 1);

    const linearProjectedIncome = income.plus(dailyIncome.times(daysRemaining));
    const linearProjectedExpense = expense.plus(dailyExpense.times(daysRemaining));

    // 2. Smart Pacing
    let totalHistExpenseEnd = new BigNumber(0);
    let totalHistExpenseToDate = new BigNumber(0);
    let historyMonthsCount = 0;

    for (let i = 1; i <= 6; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const histTrans = getTransactionsByMonth(transactions, d).filter(isExpense);
        if (histTrans.length === 0) continue;

        const histTotals = calculateTotals(histTrans);
        const histToDate = histTrans
            .filter(t => parseDate(t.date).getDate() <= currentDay)
            .reduce((sum, t) => sum.plus(t.amount.abs()), new BigNumber(0));

        totalHistExpenseEnd = totalHistExpenseEnd.plus(histTotals.expense);
        totalHistExpenseToDate = totalHistExpenseToDate.plus(histToDate);
        historyMonthsCount++;
    }

    let smartProjectedExpense = linearProjectedExpense;
    if (historyMonthsCount > 0 && totalHistExpenseToDate.isGreaterThan(0)) {
        const paceMultiplier = expense.dividedBy(totalHistExpenseToDate.dividedBy(historyMonthsCount));
        const avgExpenseEnd = totalHistExpenseEnd.dividedBy(historyMonthsCount);
        smartProjectedExpense = avgExpenseEnd.times(paceMultiplier);
    }

    return {
        currentIncome: income,
        currentExpense: expense,
        projectedIncome: linearProjectedIncome,
        projectedExpense: smartProjectedExpense,
        projectedSavings: linearProjectedIncome.minus(smartProjectedExpense),
        daysRemaining,
        progress: new BigNumber(currentDay).dividedBy(daysInMonth).times(100).dp(1).toNumber()
    };
};

export const calculateBurnRate = (allTransactions: Transaction[], monthsBack: number = 6): BigNumber => {
    if (allTransactions.length === 0) return new BigNumber(0);

    const today = new Date();
    // Start from LAST month to avoid using partial current data which lowers the average artificially
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Find the earliest transaction date to determine account age
    const firstTxDate = allTransactions.reduce((earliest, t) => {
        const tDate = parseDate(t.date);
        return tDate < earliest ? tDate : earliest;
    }, new Date());

    const firstTxMonthStart = new Date(firstTxDate.getFullYear(), firstTxDate.getMonth(), 1);

    // Calculate full months of history available (up to last month)
    const monthDiff = (lastMonthStart.getFullYear() - firstTxMonthStart.getFullYear()) * 12 +
        (lastMonthStart.getMonth() - firstTxMonthStart.getMonth()) + 1;

    // If less than 1 month of history (i.e., new user in their first month), return 0
    // The UI handles this 0 fallback by showing "Calculating..." or falling back to current month logic
    if (monthDiff < 1) return new BigNumber(0);

    const effectiveMonths = Math.max(1, Math.min(monthsBack, monthDiff));
    let totalExpense = new BigNumber(0);
    let monthsWithData = 0;

    // Sum expenses for the effective window (excluding current month)
    for (let i = 0; i < effectiveMonths; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - 1 - i, 1); // Start from previous month
        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);

        // Only count months where we actually had activity if we want to be strict,
        // but for burn rate, "0 spend" is valid if the account existed.
        const { expense } = calculateTotals(monthlyTransactions);
        totalExpense = totalExpense.plus(expense);
        monthsWithData++;
    }

    return monthsWithData > 0 ? totalExpense.dividedBy(monthsWithData) : new BigNumber(0);
};

export const getCategoryBreakdown = (transactions: Transaction[], type: BreakdownType, groupBy: 'CATEGORY' | 'SUB_CATEGORY' = 'CATEGORY') => {
    const breakdown: { [key: string]: BigNumber } = {};
    let total = new BigNumber(0);

    const filteredTransactions = transactions.filter(t => t.type === type);

    filteredTransactions.forEach(t => {
        let key: string;
        if (groupBy === 'CATEGORY') {
            key = getCategoryGroup(t.category, t.type);
        } else {
            key = (t.subCategory && t.subCategory !== 'undefined') ? t.subCategory : t.category;
        }

        // Use absolute value for the total and breakdown if you want positive bars/charts
        const absAmount = t.amount.abs();
        breakdown[key] = (breakdown[key] || new BigNumber(0)).plus(absAmount);
        total = total.plus(absAmount);
    });

    return Object.entries(breakdown)
        .map(([name, amount]) => ({
            name,
            amount,
            percentage: total.isGreaterThan(0)
                ? amount.dividedBy(total).times(100)
                : new BigNumber(0)
        }))
        // Sorts largest magnitude to smallest
        .sort((a, b) => b.amount.comparedTo(a.amount) ?? 0);
};

export const getMonthlyTrends = (allTransactions: Transaction[], monthsBack: number = 6) => {
    const result = {
        labels: [] as string[],
        incomeData: [] as BigNumber[],
        expenseData: [] as BigNumber[]
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

// --- PULSE CHART METRICS ---

export const getCumulativeSpendingCurve = (allTransactions: Transaction[], monthsBack: number): number[] => {
    const today = new Date();
    const dailySums: BigNumber[] = new Array(31).fill(null).map(() => new BigNumber(0));
    let count = 0;

    for (let i = 1; i <= monthsBack; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const monthlyTrans = getTransactionsByMonth(allTransactions, d);
        if (monthlyTrans.length === 0) continue;

        const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        let runningTotal = new BigNumber(0);

        // Pre-index days for performance
        const dayMap = monthlyTrans.reduce((acc, t) => {
            if (isExpense(t)) {
                const day = parseDate(t.date).getDate();
                acc[day] = (acc[day] || new BigNumber(0)).plus(t.amount.abs());
            }
            return acc;
        }, {} as Record<number, BigNumber>);

        for (let day = 1; day <= 31; day++) {
            if (day <= daysInMonth) {
                runningTotal = runningTotal.plus(dayMap[day] || 0);
            }
            dailySums[day - 1] = dailySums[day - 1].plus(runningTotal);
        }
        count++;
    }

    return count === 0 ? [] : dailySums.map(s => s.dividedBy(count).toNumber());
};

export const getCurrentMonthCumulative = (currentMonthTransactions: Transaction[]): number[] => {
    const today = new Date();
    const currentDay = today.getDate();
    const result: number[] = [];
    let runningTotal = new BigNumber(0);

    // Optimization: Group transactions by day first so we don't .filter() in a loop
    const dailyExpenses = currentMonthTransactions
        .filter(isExpense)
        .reduce((acc, t) => {
            const d = parseDate(t.date);
            const dayNum = d.getDate();
            acc[dayNum] = (acc[dayNum] || new BigNumber(0)).plus(t.amount.abs());
            return acc;
        }, {} as Record<number, BigNumber>);

    // Build the cumulative array up to 'today'
    for (let day = 1; day <= currentDay; day++) {
        const daySum = dailyExpenses[day] || new BigNumber(0);
        runningTotal = runningTotal.plus(daySum);

        // Push as a number for the charting library
        result.push(runningTotal.toNumber());
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

    if (allTransactions.length < 10) return anomalies;

    // Use a Set for faster lookup when filtering out current transactions
    const currentIds = new Set(currentMonthTransactions.map(t => t.id));
    const historyTransactions = allTransactions.filter(t => !currentIds.has(t.id));

    // currentBreakdown amounts are already Absolute and BigNumber from our previous update
    const currentBreakdown = getCategoryBreakdown(currentMonthTransactions, 'EXPENSE');

    currentBreakdown.forEach(item => {
        const catHistory = historyTransactions.filter(t =>
            t.category === item.name && isExpense(t)
        );

        if (catHistory.length < 3) return;

        // 1. Calculate historical average using absolute values
        const historicalTotal = catHistory.reduce(
            (sum, t) => sum.plus(t.amount.abs()),
            new BigNumber(0)
        );

        if (historicalTotal.isZero()) return;

        const historicalAverage = historicalTotal.dividedBy(catHistory.length);

        // 2. Calculate Difference: (Current - Average)
        const difference = item.amount.minus(historicalAverage);

        // 3. Calculate Percent Increase: (Difference / Average) * 100
        const percentIncrease = difference.dividedBy(historicalAverage).times(100);

        // 4. Threshold Checks
        // Note: .toNumber() is fine here because we are just comparing for logic gates
        if (percentIncrease.toNumber() > 50 && difference.toNumber() > 100) {
            anomalies.push({
                type: 'SPIKE',
                message: `${item.name} spending is ${percentIncrease.toFixed(0)}% higher than usual`,
                severity: percentIncrease.isGreaterThan(100) ? 'HIGH' : 'MEDIUM'
            });
        }
    });

    return anomalies;
};

export const getCategoryAverages = (allTransactions: Transaction[], monthsBack: number = 3) => {
    const today = new Date();
    const totalsByCategory: { [key: string]: BigNumber } = {};

    // 1. Define date boundaries
    const startHistory = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const endHistory = new Date(today.getFullYear(), today.getMonth(), 0);

    // 2. Filter history and track which months actually had transactions
    const uniqueMonths = new Set<string>();

    const historyTransactions = allTransactions.filter(t => {
        const d = parseDate(t.date);
        const isMatch = d >= startHistory && d <= endHistory && isExpense(t);

        if (isMatch) {
            uniqueMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
        }
        return isMatch;
    });

    // 3. Aggregate totals using absolute values
    historyTransactions.forEach(t => {
        totalsByCategory[t.category] = (totalsByCategory[t.category] || new BigNumber(0)).plus(t.amount.abs());
    });

    // 4. Calculate averages
    const averages: { [key: string]: number } = {};

    // We divide by the actual number of months found, or the requested monthsBack
    // This prevents "diluting" averages for new users
    const divisor = uniqueMonths.size > 0 ? uniqueMonths.size : monthsBack;

    Object.keys(totalsByCategory).forEach(key => {
        averages[key] = totalsByCategory[key].dividedBy(divisor).toNumber();
    });

    return averages;
};
