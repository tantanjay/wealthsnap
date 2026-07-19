import { BigNumber } from 'bignumber.js';
import { Transaction, Debt } from '@types';
import { calculateBurnRate } from '@utils/financialMetrics';
import { calculateTotalDebtObligations, calculateCurrentDebtBalance } from '@utils/debtMetrics';

export interface PortfolioStatsInput {
    totalEquity: number;
    realizedPL: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
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

export interface FinancialSnapshotData {
    totalCash: number;
    totalInvestmentValue: number;
    realizedPL: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
    totalDividends: number;
    holdings: HoldingAllocation[];
    totalDebtLiability: number;
    monthlyBurnRate: number;
    runwayMonths: number | null; // null = infinite (no burn rate)
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
    holdings: HoldingInput[] = []
): FinancialSnapshotData => {
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
        runwayMonths
    };
};

const fmt = (n: number, currency: string) =>
    `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const renderFinancialSnapshotText = (data: FinancialSnapshotData, currency: string = 'PHP'): string => {
    const lines: string[] = ['=== Current Financial Snapshot ==='];
    lines.push(`Total Cash (lifetime net): ${fmt(data.totalCash, currency)}`);
    lines.push(`Total Investment Value: ${fmt(data.totalInvestmentValue, currency)}`);
    lines.push(`  Realized P/L: ${fmt(data.realizedPL, currency)}`);
    lines.push(`  Unrealized P/L: ${fmt(data.unrealizedPL, currency)} (${data.unrealizedPLPercent.toFixed(1)}%)`);
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
    return lines.join('\n');
};
