import { BigNumber } from 'bignumber.js';
import { Transaction, Debt } from '@types';
import { calculateBurnRate } from '@utils/financialMetrics';
import { calculateTotalDebtObligations, calculateCurrentDebtBalance } from '@utils/debtMetrics';

export interface PortfolioStatsInput {
    totalEquity: number;
    realizedPL: number;
    unrealizedPL: number;
    // null when cost basis is $0 but there's a real gain/loss (e.g. free/gifted shares)
    unrealizedPLPercent: number | null;
    totalDividends: number;
}

export interface HoldingInput {
    symbol: string;
    name?: string;
    totalValue: number;
}

export interface HoldingAllocation {
    symbol: string;
    name?: string;
    totalValue: number;
    allocationPercent: number;
}

export interface BudgetInput {
    category: string;
    amount: BigNumber;
}

export interface BudgetSnapshotItem {
    category: string;
    budgeted: number;
    spent: number;
    percentUsed: number;
    status: 'safe' | 'warning' | 'over';
}

export interface PrivateCategoriesTotal {
    income: number;
    expense: number;
}

export interface FinancialSnapshotData {
    totalCash: number;
    totalInvestmentValue: number;
    realizedPL: number;
    unrealizedPL: number;
    unrealizedPLPercent: number | null;
    totalDividends: number;
    holdings: HoldingAllocation[];
    totalDebtLiability: number;
    monthlyBurnRate: number;
    runwayMonths: number | null; // null = infinite (no burn rate)
    budgets: BudgetSnapshotItem[]; // current calendar month, budgeted categories only
    privateCategoriesTotal: PrivateCategoriesTotal | null; // lifetime lump sum for excluded categories, null when nothing's excluded
}

/**
 * A lightweight "as of today" snapshot - deliberately not the full Financial Health
 * simulation set (debt drag, freedom acceleration, payoff strategy). Those are
 * UI-card-specific projections; a chat context block just needs the headline figures.
 *
 * Portfolio figures (equity, realized/unrealized P/L, dividends) are passed in from
 * `getPortfolioStats()` (src/services/domain/investmentService.ts) - the same
 * aggregator InvestmentScreen's stats cards use - rather than recomputed here.
 */
export const buildFinancialSnapshotData = (
    transactions: Transaction[],
    debts: Debt[],
    portfolioStats: PortfolioStatsInput,
    holdings: HoldingInput[] = [],
    budgets: BudgetInput[] = [],
    excludeCategories: string[] = []
): FinancialSnapshotData => {
    // `transactions` must always be the FULL, unfiltered set - every total below
    // (cash, burn rate, debt, budgets) needs the complete picture to stay accurate.
    // Excluded categories are only ever hidden from *category-level* detail below,
    // never subtracted from the underlying data, otherwise aggregates like Total
    // Cash silently drift from the user's real numbers.
    const excludeSet = new Set(excludeCategories);
    // Allocation is a share of the authoritative portfolio total (from getPortfolioStats),
    // not a sum of the holdings passed in here, so it stays consistent with totalInvestmentValue above.
    const holdingAllocations: HoldingAllocation[] = holdings
        .filter(h => h.totalValue > 0)
        .map(h => ({
            symbol: h.symbol,
            name: h.name,
            totalValue: h.totalValue,
            allocationPercent: portfolioStats.totalEquity > 0
                ? (h.totalValue / portfolioStats.totalEquity) * 100
                : 0
        }))
        .sort((a, b) => b.totalValue - a.totalValue);

    let totalCash = new BigNumber(0);
    transactions.forEach(t => {
        if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') totalCash = totalCash.plus(t.amount.abs());
        if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') totalCash = totalCash.minus(t.amount.abs());
    });

    const activeDebts = debts.filter(d => d.status === 'ACTIVE' && (d.direction || 'PAYABLE') === 'PAYABLE');
    const totalDebtLiability = activeDebts.reduce(
        (sum, d) => sum.plus(calculateCurrentDebtBalance(d, transactions)),
        new BigNumber(0)
    );

    const baseBurnRate = calculateBurnRate(transactions, 6);
    const monthlyDebtObligations = calculateTotalDebtObligations(debts);
    const monthlyBurnRate = baseBurnRate.plus(monthlyDebtObligations);

    const runwayMonths = monthlyBurnRate.isGreaterThan(0)
        ? totalCash.dividedBy(monthlyBurnRate).dp(1).toNumber()
        : null;

    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const spentByCategory = new Map<string, BigNumber>();
    transactions
        .filter(t => t.type === 'EXPENSE' && t.date.startsWith(currentYearMonth))
        .forEach(t => {
            spentByCategory.set(t.category, (spentByCategory.get(t.category) || new BigNumber(0)).plus(t.amount.abs()));
        });

    let privateCategoriesTotal: PrivateCategoriesTotal | null = null;
    if (excludeSet.size > 0) {
        let privateIncome = new BigNumber(0);
        let privateExpense = new BigNumber(0);
        transactions.forEach(t => {
            if (!excludeSet.has(t.category)) return;
            if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') privateIncome = privateIncome.plus(t.amount.abs());
            if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') privateExpense = privateExpense.plus(t.amount.abs());
        });
        privateCategoriesTotal = { income: privateIncome.toNumber(), expense: privateExpense.toNumber() };
    }

    const visibleBudgets = excludeSet.size > 0 ? budgets.filter(b => !excludeSet.has(b.category)) : budgets;
    const budgetItems: BudgetSnapshotItem[] = visibleBudgets.map(b => {
        const spent = spentByCategory.get(b.category) || new BigNumber(0);
        const percentUsed = b.amount.isGreaterThan(0) ? spent.dividedBy(b.amount).times(100).dp(0).toNumber() : 0;
        const status: BudgetSnapshotItem['status'] = percentUsed > 100 ? 'over' : percentUsed >= 80 ? 'warning' : 'safe';
        return {
            category: b.category,
            budgeted: b.amount.toNumber(),
            spent: spent.toNumber(),
            percentUsed,
            status
        };
    }).sort((a, b) => b.percentUsed - a.percentUsed);

    return {
        totalCash: totalCash.toNumber(),
        totalInvestmentValue: portfolioStats.totalEquity,
        realizedPL: portfolioStats.realizedPL,
        unrealizedPL: portfolioStats.unrealizedPL,
        unrealizedPLPercent: portfolioStats.unrealizedPLPercent,
        totalDividends: portfolioStats.totalDividends,
        holdings: holdingAllocations,
        totalDebtLiability: totalDebtLiability.toNumber(),
        monthlyBurnRate: monthlyBurnRate.toNumber(),
        runwayMonths,
        budgets: budgetItems,
        privateCategoriesTotal
    };
};

const fmt = (n: number, currency: string) =>
    `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const renderFinancialSnapshotText = (data: FinancialSnapshotData, currency: string = 'PHP'): string => {
    const lines: string[] = ['=== Current Financial Snapshot ==='];
    lines.push(`Total Cash (lifetime net): ${fmt(data.totalCash, currency)}`);
    lines.push(`Total Investment Value: ${fmt(data.totalInvestmentValue, currency)}`);
    lines.push(`  Realized P/L: ${fmt(data.realizedPL, currency)}`);
    lines.push(`  Unrealized P/L: ${fmt(data.unrealizedPL, currency)} (${data.unrealizedPLPercent === null ? 'N/A' : `${data.unrealizedPLPercent.toFixed(1)}%`})`);
    lines.push(`  Total Dividends Received: ${fmt(data.totalDividends, currency)}`);
    if (data.holdings.length > 0) {
        lines.push('  Allocation by Holding:');
        data.holdings.forEach(h => {
            const label = h.name ? `${h.symbol} (${h.name})` : h.symbol;
            lines.push(`    ${label}: ${fmt(h.totalValue, currency)} (${h.allocationPercent.toFixed(1)}%)`);
        });
    }
    lines.push(`Total Debt Liability: ${fmt(data.totalDebtLiability, currency)}`);
    lines.push(`Monthly Burn Rate (incl. debt payments): ${fmt(data.monthlyBurnRate, currency)}`);
    lines.push(`Financial Runway: ${data.runwayMonths === null ? 'Infinite (no recurring burn)' : `${data.runwayMonths} months`}`);
    if (data.budgets.length > 0) {
        lines.push('Current Month Budgets:');
        data.budgets.forEach(b => {
            const statusLabel = b.status === 'over' ? ' (OVER BUDGET)' : b.status === 'warning' ? ' (near limit)' : '';
            lines.push(`  ${b.category}: ${fmt(b.spent, currency)} spent of ${fmt(b.budgeted, currency)} budget (${b.percentUsed}%)${statusLabel}`);
        });
    }
    if (data.privateCategoriesTotal) {
        lines.push(`Private Categories: Income ${fmt(data.privateCategoriesTotal.income, currency)}, Expenses ${fmt(data.privateCategoriesTotal.expense, currency)}`);
        lines.push('  "Private" is not a real category name - it stands in for one or more of the user\'s own transaction categories (e.g. Credit Payment) that they chose to hide from this conversation before sending it to you. You are not told which category name(s) these are, or any individual transaction inside them - only this combined lifetime total across every month.');
        lines.push('  These amounts are already included in every total above and in the monthly summaries below (Total Cash, Burn Rate, Income/Expense figures) - they are just not broken out by category or by month. If asked what is inside "Private," say you don\'t have visibility into it (by design) and the user would need to check the app themselves.');
    }
    lines.push('Note: "Savings Rate" in the monthly summaries below = (Income - Expenses) / Income x 100. Money moved to investments, debt payments, or transfers between your own accounts is not counted as an "Expense" here, so it still counts as savings even though it left your cash on hand.');
    return lines.join('\n');
};
