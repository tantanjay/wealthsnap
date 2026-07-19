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

export interface FinancialSnapshotData {
    totalCash: number;
    totalInvestmentValue: number;
    realizedPL: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
    totalDividends: number;
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
    portfolioStats: PortfolioStatsInput
): FinancialSnapshotData => {
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
    lines.push(`Total Debt Liability: ${fmt(data.totalDebtLiability, currency)}`);
    lines.push(`Monthly Burn Rate (incl. debt payments): ${fmt(data.monthlyBurnRate, currency)}`);
    lines.push(`Financial Runway: ${data.runwayMonths === null ? 'Infinite (no recurring burn)' : `${data.runwayMonths} months`}`);
    return lines.join('\n');
};
