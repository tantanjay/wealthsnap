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

export const calculateBalance = (transactions: Transaction[], endDate: Date = new Date()): BigNumber => {
    let balance = new BigNumber(0);

    transactions.forEach(t => {
        if (parseDate(t.date) > endDate) return;

        if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') {
            balance = balance.plus(t.amount);
        } else if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') {
            balance = balance.minus(t.amount.abs());
        }
    });

    return balance;
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
        let expense = trends.expenseData[index];

        // --- INJECT DEBT REPAYMENTS INTO EXPENSE FOR SAVINGS RATE ---
        // We want Savings Rate = (Income - (Expenses + Debt Payments)) / Income
        // But we kept 'calculateTotals' pure (Expenses only) for other metrics.
        // So we calculate debt payments for this specific month here.

        const d = new Date();
        d.setMonth(d.getMonth() - (months - 1 - index)); // Re-calculate date for this index
        const monthlyTransactions = getTransactionsByMonth(transactions, d);

        const debtRepayments = monthlyTransactions
            .filter(t => t.type === 'TRANSFER_OUT' && t.debtId)
            .reduce((sum, t) => sum.plus(t.amount.abs()), new BigNumber(0));

        expense = expense.plus(debtRepayments);

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
    grouping: 'GROUP' | 'ITEM' = 'GROUP'
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
                if (grouping === 'GROUP') {
                    const group = getCategoryGroup(t.category, t.type);
                    return group === category;
                } else {
                    // Item is stored in t.category
                    // e.g. "Groceries" is the category, "Food & Lifestyle" is the group
                    return t.category === category;
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

export const calculateBurnRate = (allTransactions: Transaction[], monthsBack: number = 6, referenceDate: Date = new Date()): BigNumber => {
    if (allTransactions.length === 0) return new BigNumber(0);

    const today = referenceDate;
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

export const calculateAverageIncome = (allTransactions: Transaction[], monthsBack: number = 6, referenceDate: Date = new Date()): BigNumber => {
    if (allTransactions.length === 0) return new BigNumber(0);

    const today = referenceDate;
    // Start from LAST month to avoid using partial current data which lowers the average artificially
    // And for Income, including current month might INFLATE potential capacity if expenses haven't hit yet.
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
    let totalIncome = new BigNumber(0);
    // Fixed: We loop through effectiveMonths, so monthsWithData is effectively effectiveMonths
    // Let's stick to the loop logic to be safe and consistent with burn rate.

    // Sum income for the effective window (excluding current month)
    for (let i = 0; i < effectiveMonths; i++) {
        const d = new Date(today.getFullYear(), today.getMonth() - 1 - i, 1); // Start from previous month
        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);

        const { income } = calculateTotals(monthlyTransactions);
        totalIncome = totalIncome.plus(income);
    }

    return effectiveMonths > 0 ? totalIncome.dividedBy(effectiveMonths) : new BigNumber(0);
};

export const getCategoryBreakdown = (transactions: Transaction[], type: BreakdownType, groupBy: 'GROUP' | 'ITEM' = 'GROUP') => {
    const breakdown: { [key: string]: BigNumber } = {};
    let total = new BigNumber(0);

    const filteredTransactions = transactions.filter(t => t.type === type);

    filteredTransactions.forEach(t => {
        let key: string;
        if (groupBy === 'GROUP') {
            key = getCategoryGroup(t.category, t.type);
        } else {
            // Item is stored in t.category
            key = t.category;
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
        fullLabels: [] as string[],
        incomeData: [] as BigNumber[],
        expenseData: [] as BigNumber[],
        netCashFlowData: [] as BigNumber[]
    };

    const today = new Date();
    for (let i = monthsBack - 1; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        result.labels.push(d.toLocaleString('default', { month: 'short' }));
        result.fullLabels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));

        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);
        const { income, expense } = calculateTotals(monthlyTransactions);

        // Use calculateBalance to get Net Flow including Transfers (Income + TransferIn - Expense - TransferOut)
        // We pass a future date as endDate to ensure we capture all transactions in this historical month
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const netCashFlow = calculateBalance(monthlyTransactions, monthEnd);

        result.incomeData.push(income);
        result.expenseData.push(expense);
        result.netCashFlowData.push(netCashFlow);
    }
    return result;
};

export const getMonthlyTrendsForYear = (allTransactions: Transaction[], year: number) => {
    const result = {
        labels: [] as string[],
        fullLabels: [] as string[],
        incomeData: [] as BigNumber[],
        expenseData: [] as BigNumber[],
        netCashFlowData: [] as BigNumber[]
    };

    for (let month = 0; month < 12; month++) {
        const d = new Date(year, month, 1);
        result.labels.push(d.toLocaleString('default', { month: 'short' }));
        result.fullLabels.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));

        const monthlyTransactions = getTransactionsByMonth(allTransactions, d);
        const { income, expense } = calculateTotals(monthlyTransactions);

        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
        const netCashFlow = calculateBalance(monthlyTransactions, monthEnd);

        result.incomeData.push(income);
        result.expenseData.push(expense);
        result.netCashFlowData.push(netCashFlow);
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

export const getCurrentMonthCumulative = (currentMonthTransactions: Transaction[], referenceDate: Date = new Date()): number[] => {
    const today = referenceDate;
    const isCurrentMonth = today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear();
    const currentDay = isCurrentMonth ? today.getDate() : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
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
    type: 'SPIKE' | 'NEW_CATEGORY' | 'HIGH_SPENDING' | 'BUDGET_EXCEEDED' | 'RUNWAY_DROP';
    category: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export const detectAnomalies = (currentMonthTransactions: Transaction[], allTransactions: Transaction[], budgets: import('@types').Budget[] = []): Anomaly[] => {
    const anomalies: Anomaly[] = [];

    if (allTransactions.length < 10) return anomalies;

    // --- 0. RUNWAY DROP CHECK ---
    // Check if Financial Runway has dropped significantly (>25%) since last month
    const today = new Date();
    const currentBalance = calculateBalance(allTransactions, today);
    const currentBurnRate = calculateBurnRate(allTransactions, 6, today);

    // To avoid division by zero or huge numbers with 0 burn rate
    if (currentBurnRate.isGreaterThan(0) && currentBalance.isGreaterThan(0)) {
        const currentRunway = currentBalance.dividedBy(currentBurnRate);

        // Previous Month Data
        // Go 1 day back from start of this month to get end of last month
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        const prevBalance = calculateBalance(allTransactions, lastMonthEnd);
        const prevBurnRate = calculateBurnRate(allTransactions, 6, lastMonthEnd);

        if (prevBurnRate.isGreaterThan(0) && prevBalance.isGreaterThan(0)) {
            const prevRunway = prevBalance.dividedBy(prevBurnRate);

            // Avoid triggering for very small runway changes (e.g. 0.5 to 0.4) if it's not meaningful
            // Or very high runways (e.g. 50 months -> 35 months is 30% drop but maybe not "alert" worthy? User said 25% drop.)
            // We'll stick to the % drop request.

            const dropAmount = prevRunway.minus(currentRunway);
            const dropPercent = dropAmount.dividedBy(prevRunway); // e.g. (10 - 7) / 10 = 0.3

            if (dropPercent.isGreaterThanOrEqualTo(0.25)) {
                anomalies.push({
                    type: 'RUNWAY_DROP' as any, // Cast to any to avoid TS error until type def is updated (or just update type def above)
                    category: 'Financial Health',
                    message: `Runway dropped from ${prevRunway.toFixed(1)} to ${currentRunway.toFixed(1)} months`,
                    severity: 'HIGH'
                });
            }
        }
    }

    // Use a Set for faster lookup when filtering out current transactions
    const currentIds = new Set(currentMonthTransactions.map(t => t.id));
    const historyTransactions = allTransactions.filter(t => !currentIds.has(t.id));

    // 1. Group Current Month by Category Item (e.g., "Water", "Rent")
    const currentBreakdown: { [key: string]: BigNumber } = {};

    currentMonthTransactions.filter(isExpense).forEach(t => {
        // Use the raw category name (e.g., "Water") directly
        currentBreakdown[t.category] = (currentBreakdown[t.category] || new BigNumber(0)).plus(t.amount.abs());
    });

    Object.entries(currentBreakdown).forEach(([categoryName, currentAmount]) => {
        // --- 1. BUDGET CHECK ---
        const budget = budgets.find(b => b.category === categoryName);
        if (budget && currentAmount.isGreaterThan(budget.amount)) {
            const percentOver = currentAmount.minus(budget.amount).div(budget.amount).times(100);
            anomalies.push({
                type: 'BUDGET_EXCEEDED',
                category: categoryName,
                message: `${categoryName} has exceeded your monthly budget by ${percentOver.toFixed(0)}%`,
                severity: 'HIGH'
            });
        }

        // --- 2. SPIKE CHECK (HISTORY) ---
        // Filter History for this specific Category Item
        const catHistory = historyTransactions.filter(t =>
            t.category === categoryName && isExpense(t)
        );

        // We need enough historical data points for this specific item to be meaningful
        if (catHistory.length < 3) return;

        // 3. Calculate Stats (Monthly Average)
        // We must group by month first, otherwise we are comparing "Monthly Total" vs "Per Transaction Average"
        const monthlyTotals: { [key: string]: BigNumber } = {};

        catHistory.forEach(t => {
            const date = new Date(t.date); // specific transaction date
            const monthKey = `${date.getFullYear()}-${date.getMonth()}`;
            monthlyTotals[monthKey] = (monthlyTotals[monthKey] || new BigNumber(0)).plus(t.amount.abs());
        });

        const monthsCount = Object.keys(monthlyTotals).length;
        if (monthsCount < 1) return; // Need at least 1 month of history (though catHistory.length < 3 check above implies we have data)

        const historicalTotal = Object.values(monthlyTotals).reduce(
            (sum, val) => sum.plus(val),
            new BigNumber(0)
        );

        const historicalAverage = historicalTotal.dividedBy(monthsCount);

        // Avoid alerts for very small amounts where high % variance is common/irrelevant
        if (historicalAverage.isLessThan(50)) return;

        const difference = currentAmount.minus(historicalAverage);
        const percentIncrease = difference.dividedBy(historicalAverage).times(100);

        // Threshold Checks
        // Trigger if > 50% increase AND > 100 nominal increase
        if (percentIncrease.toNumber() > 50 && difference.toNumber() > 100) {
            anomalies.push({
                type: 'SPIKE',
                category: categoryName,
                message: `${categoryName} spending is ${percentIncrease.toFixed(0)}% higher than usual`,
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
