import { BigNumber } from 'bignumber.js';
import { Transaction, Investment, Debt, Budget } from '@types';
import { calculateTotals, calculateSavingsRate, calculateBalance } from '@utils/financialMetrics';
import { calculateCurrentDebtBalance } from '@utils/debtMetrics';

export interface CategoryAmount {
    category: string;
    amount: number;
}

export interface InvestmentActivityItem {
    symbol: string;
    amount: number; // converted to base currency using the investment's exchangeRate
}

export interface DebtPaymentItem {
    debtName: string;
    amount: number;
    remainingBalance: number;
}

export interface TopTransactionItem {
    category: string;
    amount: number;
    date: string;
    note?: string;
}

export interface SpendingSpike {
    category: string;
    amount: number;
    historicalAverage: number;
    percentIncrease: number;
}

export interface BudgetAlert {
    category: string;
    percentUsed: number;
    status: 'warning' | 'over';
    budgetAmount: number;
    spentAmount: number;
}

export interface MonthlySummaryData {
    yearMonth: string;
    income: { total: number; recurringTotal: number; byCategory: CategoryAmount[] };
    expense: { total: number; byCategory: CategoryAmount[] };
    netCashFlow: number;
    savingsRate: number;
    momIncomeChangePercent: number | null;
    momExpenseChangePercent: number | null;
    investments: {
        buys: InvestmentActivityItem[];
        sells: InvestmentActivityItem[];
        dividends: InvestmentActivityItem[];
        totalFees: number;
        realizedPL: number;
    };
    debts: {
        payments: DebtPaymentItem[];
        totalPaid: number;
    };
    transfers: CategoryAmount[]; // category = transferAccount label
    budgetAlerts: BudgetAlert[];
    topExpenses: TopTransactionItem[];
    spendingSpikes: SpendingSpike[];
}

const isInMonth = (dateStr: string, yearMonth: string) => dateStr.startsWith(yearMonth);

const sumByCategory = (items: { category: string; amount: BigNumber }[]): CategoryAmount[] => {
    const totals = new Map<string, BigNumber>();
    items.forEach(item => {
        const key = item.category || 'Uncategorized';
        totals.set(key, (totals.get(key) || new BigNumber(0)).plus(item.amount.abs()));
    });
    return Array.from(totals.entries())
        .map(([category, amount]) => ({ category, amount: amount.toNumber() }))
        .sort((a, b) => b.amount - a.amount);
};

export const getEarliestYearMonth = (transactions: Transaction[], investments: Investment[]): string | null => {
    let earliest: string | null = null;
    const consider = (dateStr: string) => {
        const ym = dateStr.slice(0, 7);
        if (!earliest || ym < earliest) earliest = ym;
    };
    transactions.forEach(t => consider(t.date));
    investments.forEach(i => consider(i.date));
    return earliest;
};

export const getMonthsBetween = (startYearMonth: string, endYearMonth: string): string[] => {
    const months: string[] = [];
    const [sy, sm] = startYearMonth.split('-').map(Number);
    const [ey, em] = endYearMonth.split('-').map(Number);
    let y = sy;
    let m = sm;
    while (y < ey || (y === ey && m <= em)) {
        months.push(`${y}-${String(m).padStart(2, '0')}`);
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }
    return months;
};

const pctChange = (curr: BigNumber, prev: BigNumber): number | null => {
    if (prev.isZero()) return null;
    return curr.minus(prev).dividedBy(prev).times(100).dp(1).toNumber();
};

export const buildMonthlySummaryData = (
    yearMonth: string,
    allTransactions: Transaction[],
    allInvestments: Investment[],
    allDebts: Debt[],
    budgets: Budget[],
    excludeCategories: string[] = []
): MonthlySummaryData => {
    // `allTransactions` must always be the FULL, unfiltered set - income/expense/
    // netCashFlow/savingsRate below are computed from it directly so those totals
    // stay accurate even when some categories are hidden from the breakdown further
    // down. Excluded categories are only ever stripped from category-level detail
    // (byCategory, topExpenses, spendingSpikes, budgetAlerts), never from the totals.
    const excludeSet = new Set(excludeCategories);
    const monthTx = allTransactions.filter(t => isInMonth(t.date, yearMonth));
    const monthInv = allInvestments.filter(i => isInMonth(i.date, yearMonth));

    const incomeTx = monthTx.filter(t => t.type === 'INCOME');
    const expenseTx = monthTx.filter(t => t.type === 'EXPENSE');

    const { income, expense } = calculateTotals(monthTx);
    const savingsRate = calculateSavingsRate(income, expense).dp(1).toNumber();

    const recurringIncome = incomeTx
        .filter(t => t.isRecurring)
        .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));

    const [y, m] = yearMonth.split('-').map(Number);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);
    const netCashFlow = calculateBalance(monthTx, monthEnd).toNumber();

    // --- Month-over-month deltas ---
    const prevDate = new Date(y, m - 2, 1);
    const prevYearMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`;
    const prevMonthTx = allTransactions.filter(t => isInMonth(t.date, prevYearMonth));
    const prevTotals = calculateTotals(prevMonthTx);

    const momIncomeChangePercent = pctChange(income, prevTotals.income);
    const momExpenseChangePercent = pctChange(expense, prevTotals.expense);

    // --- Investments ---
    const buys: InvestmentActivityItem[] = [];
    const sells: InvestmentActivityItem[] = [];
    const dividends: InvestmentActivityItem[] = [];
    let totalFees = new BigNumber(0);

    monthInv.forEach(inv => {
        const rate = inv.exchangeRate && inv.exchangeRate.gt(0) ? inv.exchangeRate : new BigNumber(1);
        const grossAmount = inv.quantity.times(inv.price).times(rate);
        totalFees = totalFees.plus((inv.fees || new BigNumber(0)).times(rate));

        if (inv.action === 'BUY') {
            buys.push({ symbol: inv.symbol, amount: grossAmount.toNumber() });
        } else if (inv.action === 'SELL') {
            sells.push({ symbol: inv.symbol, amount: grossAmount.toNumber() });
        } else if (inv.action === 'DIVIDEND' || inv.action === 'INTEREST') {
            dividends.push({ symbol: inv.symbol, amount: grossAmount.toNumber() });
        }
    });

    const realizedPL = monthTx
        .reduce((sum, t) => {
            if (t.type === 'CAPITAL_GAIN') return sum.plus(t.amount);
            if (t.type === 'CAPITAL_LOSS') return sum.minus(t.amount.abs());
            return sum;
        }, new BigNumber(0))
        .toNumber();

    // --- Debts (payments made this month, excluding the initial "new loan" transaction) ---
    const debtPayments: DebtPaymentItem[] = [];
    let totalDebtPaid = new BigNumber(0);

    const debtPaymentTx = monthTx.filter(t =>
        t.debtId && (t.type === 'TRANSFER_OUT' || t.type === 'TRANSFER_IN') && t.subCategory !== 'INITIAL_TRANSACTION'
    );

    const debtsById = new Map(allDebts.map(d => [d.id, d]));
    const paymentsByDebt = new Map<string, BigNumber>();
    debtPaymentTx.forEach(t => {
        const key = t.debtId as string;
        paymentsByDebt.set(key, (paymentsByDebt.get(key) || new BigNumber(0)).plus(t.amount.abs()));
    });

    const txUpToMonthEnd = allTransactions.filter(t => new Date(t.date) <= monthEnd);

    paymentsByDebt.forEach((amount, debtId) => {
        const debt = debtsById.get(debtId);
        if (!debt) return;
        const remainingBalance = calculateCurrentDebtBalance(debt, txUpToMonthEnd).toNumber();
        debtPayments.push({ debtName: debt.name, amount: amount.toNumber(), remainingBalance });
        totalDebtPaid = totalDebtPaid.plus(amount);
    });

    // --- Transfers (excluding ones already covered by Investments/Debts above) ---
    const transferTx = monthTx.filter(t =>
        (t.type === 'TRANSFER_OUT' || t.type === 'TRANSFER_IN') && !t.debtId && !t.investmentId
    );
    const transfers = sumByCategory(
        transferTx.map(t => ({ category: t.transferAccount || 'Other', amount: t.amount }))
    );

    // --- Budget alerts (uses CURRENT budget settings as an approximation for past months) ---
    // Excluded categories are stripped from this list only - `income`/`expense` totals above
    // were already computed from the unfiltered transactions, so they stay accurate. This list
    // (and everything derived from it below: budgetAlerts, spendingSpikes) just won't itemize them.
    const expenseByCategory = sumByCategory(expenseTx.map(t => ({ category: t.category, amount: t.amount })))
        .filter(c => !excludeSet.has(c.category));
    const budgetAlerts: BudgetAlert[] = [];
    budgets.forEach(b => {
        const spent = expenseByCategory.find(c => c.category === b.category);
        if (!spent) return;
        const percentage = new BigNumber(spent.amount).dividedBy(b.amount).times(100).toNumber();
        if (percentage >= 80) {
            budgetAlerts.push({
                category: b.category,
                percentUsed: Math.round(percentage),
                status: percentage > 100 ? 'over' : 'warning',
                budgetAmount: b.amount.toNumber(),
                spentAmount: spent.amount
            });
        }
    });

    // --- Top expenses this month ---
    const topExpenses: TopTransactionItem[] = expenseTx
        .filter(t => !excludeSet.has(t.category))
        .sort((a, b) => b.amount.abs().comparedTo(a.amount.abs()) ?? 0)
        .slice(0, 3)
        .map(t => ({ category: t.subCategory || t.category, amount: t.amount.abs().toNumber(), date: t.date, note: t.note }));

    // --- Spending spikes: this month's category total vs its trailing 3-month average ---
    const spendingSpikes: SpendingSpike[] = [];
    const windowStart = new Date(y, m - 4, 1);
    const priorMonths = getMonthsBetween(
        `${windowStart.getFullYear()}-${String(windowStart.getMonth() + 1).padStart(2, '0')}`,
        prevYearMonth
    );
    const priorByCategory = new Map<string, { total: BigNumber; months: Set<string> }>();
    allTransactions
        .filter(t => t.type === 'EXPENSE' && priorMonths.includes(t.date.slice(0, 7)))
        .forEach(t => {
            const entry = priorByCategory.get(t.category) || { total: new BigNumber(0), months: new Set<string>() };
            entry.total = entry.total.plus(t.amount.abs());
            entry.months.add(t.date.slice(0, 7));
            priorByCategory.set(t.category, entry);
        });

    expenseByCategory.forEach(({ category, amount }) => {
        const hist = priorByCategory.get(category);
        if (!hist || hist.months.size < 2) return;

        const avg = hist.total.dividedBy(hist.months.size);
        if (avg.isLessThan(50)) return;

        const diff = new BigNumber(amount).minus(avg);
        const pct = diff.dividedBy(avg).times(100);
        if (pct.isGreaterThan(50) && diff.isGreaterThan(100)) {
            spendingSpikes.push({
                category,
                amount,
                historicalAverage: avg.toNumber(),
                percentIncrease: pct.dp(0).toNumber()
            });
        }
    });

    return {
        yearMonth,
        income: {
            total: income.toNumber(),
            recurringTotal: recurringIncome.toNumber(),
            byCategory: sumByCategory(incomeTx.map(t => ({ category: t.category, amount: t.amount })))
                .filter(c => !excludeSet.has(c.category))
        },
        expense: { total: expense.toNumber(), byCategory: expenseByCategory },
        netCashFlow,
        savingsRate,
        momIncomeChangePercent,
        momExpenseChangePercent,
        investments: { buys, sells, dividends, totalFees: totalFees.toNumber(), realizedPL },
        debts: { payments: debtPayments, totalPaid: totalDebtPaid.toNumber() },
        transfers,
        budgetAlerts,
        topExpenses,
        spendingSpikes
    };
};

const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const renderMonthlySummaryText = (data: MonthlySummaryData, currency: string = 'PHP'): string => {
    const lines: string[] = [];
    const [y, m] = data.yearMonth.split('-').map(Number);
    const monthLabel = new Date(y, m - 1, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    lines.push(`=== ${monthLabel} ===`);

    const incomeDelta = data.momIncomeChangePercent !== null
        ? ` (${data.momIncomeChangePercent >= 0 ? '+' : ''}${data.momIncomeChangePercent}% vs last month)`
        : '';
    lines.push(`Income: ${currency} ${fmt(data.income.total)}${incomeDelta}`);
    data.income.byCategory.forEach(c => lines.push(`  ${c.category}: ${currency} ${fmt(c.amount)}`));

    const expenseDelta = data.momExpenseChangePercent !== null
        ? ` (${data.momExpenseChangePercent >= 0 ? '+' : ''}${data.momExpenseChangePercent}% vs last month)`
        : '';
    lines.push(`Expenses: ${currency} ${fmt(data.expense.total)}${expenseDelta}`);
    data.expense.byCategory.forEach(c => lines.push(`  ${c.category}: ${currency} ${fmt(c.amount)}`));

    lines.push(`Net Cash Flow: ${currency} ${fmt(data.netCashFlow)}`);
    lines.push(`Savings Rate: ${data.savingsRate}%`);

    if (data.investments.buys.length || data.investments.sells.length || data.investments.dividends.length) {
        lines.push('Investments:');
        data.investments.buys.forEach(b => lines.push(`  BUY ${b.symbol}: ${currency} ${fmt(b.amount)}`));
        data.investments.sells.forEach(s => lines.push(`  SELL ${s.symbol}: ${currency} ${fmt(s.amount)}`));
        data.investments.dividends.forEach(d => lines.push(`  Dividend/Interest ${d.symbol}: ${currency} ${fmt(d.amount)}`));
        if (data.investments.realizedPL !== 0) lines.push(`  Realized P/L: ${currency} ${fmt(data.investments.realizedPL)}`);
        if (data.investments.totalFees > 0) lines.push(`  Fees: ${currency} ${fmt(data.investments.totalFees)}`);
    }

    if (data.debts.payments.length) {
        lines.push('Debts:');
        data.debts.payments.forEach(p =>
            lines.push(`  ${p.debtName}: paid ${currency} ${fmt(p.amount)}, balance now ${currency} ${fmt(p.remainingBalance)}`)
        );
    }

    if (data.transfers.length) {
        lines.push('Transfers:');
        data.transfers.forEach(t => lines.push(`  ${currency} ${fmt(t.amount)} -> ${t.category}`));
    }

    if (data.budgetAlerts.length) {
        lines.push('Budget Alerts:');
        data.budgetAlerts.forEach(a =>
            lines.push(`  ${a.category}: ${currency} ${fmt(a.spentAmount)} spent of ${currency} ${fmt(a.budgetAmount)} budget (${a.percentUsed}% used)${a.status === 'over' ? ' (OVER BUDGET)' : ''}`)
        );
    }

    if (data.spendingSpikes.length) {
        lines.push('Spending Spikes:');
        data.spendingSpikes.forEach(s =>
            lines.push(`  ${s.category} is ${s.percentIncrease}% above usual (${currency} ${fmt(s.amount)} vs avg ${currency} ${fmt(s.historicalAverage)})`)
        );
    }

    if (data.topExpenses.length) {
        const items = data.topExpenses.map(t => {
            const noteSuffix = t.note ? ` - note: "${t.note}"` : '';
            return `${t.category} ${currency} ${fmt(t.amount)} (${new Date(t.date).toLocaleDateString('default', { month: 'short', day: 'numeric' })})${noteSuffix}`;
        });
        lines.push(`Top Expenses: ${items.join(' | ')}`);
    }

    return lines.join('\n');
};
