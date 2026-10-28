import { BigNumber } from 'bignumber.js';

import { Debt, Investment, PriceHistory, SavingsGoal, Transaction } from '@types';
import {
    calculateBalance,
    calculateDebtPrincipalRepaid,
    calculateSavingsRate,
    calculateTotals,
    getTransactionsByMonth,
    isDebtFee,
    parseDate,
} from '@utils/financialMetrics';
import { calculateCurrentDebtBalance, calculateProjectedDebtLiability } from '@utils/debtMetrics';
import { calculateGoalBalance, calculateTotalGoalContributions } from '@utils/savingsGoalMetrics';
import { getAllPortfolioMetrics } from '@utils/investmentMetrics';

// Home Snapshot metrics. Formulas: docs/METRICS.md (Net Worth Change, Cash Kept, Investment
// Return, Loans Repaid / Obligations Paid, Goals Progress / On Track).

const ZERO = new BigNumber(0);

export const endOfMonth = (year: number, month: number): Date => new Date(year, month + 1, 0, 23, 59, 59, 999);
const endOfLastMonth = (now: Date): Date => endOfMonth(now.getFullYear(), now.getMonth() - 1);

const upTo = <T extends { date: string }>(items: T[], asOf?: Date): T[] =>
    asOf ? items.filter(i => parseDate(i.date) <= asOf) : items;

const isPayable = (d: Debt) => (d.direction || 'PAYABLE') === 'PAYABLE';
const debtStart = (d: Debt) => new Date(d.startDate || d.createdAt);
// Owed as of a past date: started by then, and still active or resolved after it. Status keeps no
// history, so a Paid off / Forgiven debt counts as resolved from its last update (updatedAt).
const isOwedAsOf = (d: Debt, asOf: Date) =>
    debtStart(d) <= asOf && (d.status === 'ACTIVE' || new Date(d.updatedAt) > asOf);
const isFeeOrOpening = (t: Transaction) => isDebtFee(t) || t.subCategory === 'INITIAL_TRANSACTION';
const percentOf = (part: BigNumber, whole: BigNumber): number | null =>
    whole.gt(0) ? part.dividedBy(whole).times(100).toNumber() : null;

// Price for a symbol as of a date (latest when asOf is omitted), from price_history.
export type PriceLookup = (symbol: string, asOf?: Date) => BigNumber | undefined;

export const buildPriceLookup = (history: PriceHistory[]): PriceLookup => {
    const bySymbol: Record<string, { ts: number; price: BigNumber }[]> = {};
    history.forEach(h => {
        (bySymbol[h.symbol] ||= []).push({ ts: new Date(h.timestamp).getTime(), price: h.price });
    });
    Object.values(bySymbol).forEach(list => list.sort((a, b) => b.ts - a.ts));

    return (symbol, asOf) => {
        const list = bySymbol[symbol];
        if (!list) return undefined;
        if (!asOf) return list[0].price;
        return list.find(p => p.ts <= asOf.getTime())?.price;
    };
};

// Same fallback as getPortfolioStats: no price history -> the latest trade's price.
const buildPriceMap = (investments: Investment[], priceAt: PriceLookup, asOf?: Date): Record<string, BigNumber> => {
    const map: Record<string, BigNumber> = {};
    const latestTrade: Record<string, Investment> = {};
    investments.forEach(inv => {
        const current = latestTrade[inv.symbol];
        if (!current || parseDate(inv.date) > parseDate(current.date)) latestTrade[inv.symbol] = inv;
    });
    Object.keys(latestTrade).forEach(symbol => {
        map[symbol] = priceAt(symbol, asOf) ?? latestTrade[symbol].price;
    });
    return map;
};

export interface NetWorthBreakdown {
    cash: BigNumber;
    investments: BigNumber;
    goals: BigNumber;
    assets: BigNumber;
    liabilities: BigNumber;
    netWorth: BigNumber;
}

// Projected Net Worth now, or as of a past date. Now: active debts you owe. Past: debts you owe
// that were owed then (isOwedAsOf).
export const calculateNetWorth = (
    transactions: Transaction[], investments: Investment[], debts: Debt[], goals: SavingsGoal[], priceAt: PriceLookup, asOf?: Date
): NetWorthBreakdown => {
    const tx = upTo(transactions, asOf);
    const inv = upTo(investments, asOf);

    const cash = calculateBalance(tx);
    const goalsTotal = goals.reduce((sum, g) => sum.plus(calculateGoalBalance(g, tx)), ZERO);
    const investmentsTotal = getAllPortfolioMetrics(inv, buildPriceMap(inv, priceAt, asOf))
        .reduce((sum, m) => sum.plus(m.totalMarketValue), ZERO);

    const liabilities = debts
        .filter(d => isPayable(d) && (asOf ? isOwedAsOf(d, asOf) : d.status === 'ACTIVE'))
        .reduce((sum, d) => {
            const principal = calculateCurrentDebtBalance(d, tx);
            return principal.gt(0) ? sum.plus(calculateProjectedDebtLiability(d, principal).totalLiability) : sum;
        }, ZERO);

    const assets = cash.plus(investmentsTotal).plus(goalsTotal);
    return { cash, investments: investmentsTotal, goals: goalsTotal, assets, liabilities, netWorth: assets.minus(liabilities) };
};

export interface NetWorthChange {
    now: NetWorthBreakdown;
    // null until there's a transaction before this month.
    prev: NetWorthBreakdown | null;
    change: BigNumber | null;
    // null when there's no prev, or prev net worth is <= 0.
    percent: number | null;
    // Past month-ends with data across the chosen range (thinned past MAX_SPARKLINE_POINTS), then now.
    sparkline: number[];
}

// A point costs a full net worth calculation, so long ranges skip months to stay near this.
const MAX_SPARKLINE_POINTS = 36;

export const calculateNetWorthChange = (
    transactions: Transaction[], investments: Investment[], debts: Debt[], goals: SavingsGoal[], priceAt: PriceLookup,
    now: Date = new Date(), rangeMonths: number | 'ALL' = 6
): NetWorthChange => {
    const current = calculateNetWorth(transactions, investments, debts, goals, priceAt);
    const firstDate = transactions.reduce<Date | null>((min, t) => {
        const d = parseDate(t.date);
        return !min || d < min ? d : min;
    }, null);

    const monthsBack = rangeMonths === 'ALL'
        ? (firstDate ? (now.getFullYear() - firstDate.getFullYear()) * 12 + now.getMonth() - firstDate.getMonth() : 0)
        : rangeMonths;
    const step = Math.max(1, Math.ceil(monthsBack / MAX_SPARKLINE_POINTS));

    const netWorthAtMonthEnd = (monthsAgo: number): NetWorthBreakdown | null => {
        const monthEnd = endOfMonth(now.getFullYear(), now.getMonth() - monthsAgo);
        return !firstDate || firstDate > monthEnd
            ? null
            : calculateNetWorth(transactions, investments, debts, goals, priceAt, monthEnd);
    };

    // Last month-end drives the change line whatever the range, and is always the newest past point.
    const prev = netWorthAtMonthEnd(1);
    const sparkline: number[] = [];
    for (let i = 1 + Math.floor((monthsBack - 1) / step) * step; i >= 1; i -= step) {
        const nw = i === 1 ? prev : netWorthAtMonthEnd(i);
        if (nw) sparkline.push(nw.netWorth.toNumber());
    }
    sparkline.push(current.netWorth.toNumber());

    const change = prev ? current.netWorth.minus(prev.netWorth) : null;
    const percent = prev && change && prev.netWorth.gt(0) ? change.dividedBy(prev.netWorth).times(100).toNumber() : null;

    return { now: current, prev, change, percent, sparkline };
};

export interface MonthCashFlow {
    income: BigNumber;
    // Total Expense: goal-funded purchases left out.
    expense: BigNumber;
    monthlyNet: BigNumber;
    transfersNet: BigNumber;
    // null when the month has no income.
    savingsRate: number | null;
}

export const calculateMonthCashFlow = (transactions: Transaction[], month: Date): MonthCashFlow => {
    const tx = getTransactionsByMonth(transactions, month);
    const { income, expense } = calculateTotals(tx.filter(t => !(t.type === 'EXPENSE' && t.savingsGoalId)));
    const transfersNet = tx.reduce((sum, t) => {
        if (t.type === 'TRANSFER_IN') return sum.plus(t.amount.abs());
        if (t.type === 'TRANSFER_OUT') return sum.minus(t.amount.abs());
        return sum;
    }, ZERO);
    const savingsRate = income.gt(0)
        ? calculateSavingsRate(income, expense.plus(calculateDebtPrincipalRepaid(tx))).toNumber()
        : null;
    return { income, expense, monthlyNet: income.minus(expense), transfersNet, savingsRate };
};

export interface MonthMoneyInOut {
    // Income + Transfer In / Expense + Transfer Out, every transaction dated this month.
    moneyIn: BigNumber;
    moneyOut: BigNumber;
    // Out ÷ In; null when nothing came in.
    outPercentOfIn: number | null;
}

// Home Ledger's "In / Out" line (docs/METRICS.md, Money In / Out).
export const calculateMonthMoneyInOut = (transactions: Transaction[], month: Date): MonthMoneyInOut => {
    let moneyIn = ZERO;
    let moneyOut = ZERO;
    getTransactionsByMonth(transactions, month).forEach(t => {
        if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') moneyIn = moneyIn.plus(t.amount.abs());
        else if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') moneyOut = moneyOut.plus(t.amount.abs());
    });
    return { moneyIn, moneyOut, outPercentOfIn: percentOf(moneyOut, moneyIn) };
};

export interface CashKept {
    cash: BigNumber;
    cashPrev: BigNumber;
    // Any transaction before this month.
    hasPrev: boolean;
    moneyIn: BigNumber;
    moneyOut: BigNumber;
    // Cash Balance ÷ lifetime Income; null while lifetime Income is 0.
    keptPercent: number | null;
    keptPercentPrev: number | null;
}

export const calculateCashKept = (transactions: Transaction[], now: Date = new Date()): CashKept => {
    const keptAt = (asOf?: Date) => {
        const tx = upTo(transactions, asOf);
        return percentOf(calculateBalance(tx), calculateTotals(tx).income);
    };
    let moneyIn = ZERO;
    let moneyOut = ZERO;
    transactions.forEach(t => {
        if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') moneyIn = moneyIn.plus(t.amount.abs());
        else if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') moneyOut = moneyOut.plus(t.amount.abs());
    });
    const prevEnd = endOfLastMonth(now);
    const hasPrev = transactions.some(t => parseDate(t.date) <= prevEnd);
    return {
        cash: calculateBalance(transactions),
        cashPrev: calculateBalance(transactions, prevEnd),
        hasPrev,
        moneyIn,
        moneyOut,
        keptPercent: keptAt(),
        keptPercentPrev: hasPrev ? keptAt(prevEnd) : null,
    };
};

export interface InvestmentSnapshot {
    hasHoldings: boolean;
    marketValue: BigNumber;
    unrealizedPL: BigNumber;
    // Unrealized P/L ÷ cost basis; null when cost basis is 0.
    unrealizedPercent: number | null;
    topHoldingPercent: number | null;
    // Buys (+ fees) − sells (− fees) this month, as getPortfolioStats.
    monthInvested: BigNumber;
    // Shares bought this month and still held: (value − cost), and ÷ cost.
    monthBuysPL: BigNumber;
    monthBuysPercent: number | null;
}

export const calculateInvestmentSnapshot = (investments: Investment[], priceAt: PriceLookup, now: Date = new Date()): InvestmentSnapshot => {
    const prices = buildPriceMap(investments, priceAt);
    const metrics = getAllPortfolioMetrics(investments, prices);
    const marketValue = metrics.reduce((sum, m) => sum.plus(m.totalMarketValue), ZERO);
    const unrealizedPL = metrics.reduce((sum, m) => sum.plus(m.unrealizedPL), ZERO);
    const costBasis = metrics.reduce((sum, m) => sum.plus(m.totalCostBasis), ZERO);
    const topValue = metrics.reduce((max, m) => BigNumber.max(max, m.totalMarketValue), ZERO);

    const isThisMonth = (date: string) => {
        const d = parseDate(date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    };

    let monthInvested = ZERO;
    const buys: Record<string, { qty: BigNumber; cost: BigNumber }> = {};
    investments.filter(inv => isThisMonth(inv.date)).forEach(inv => {
        const amount = inv.price.times(inv.quantity);
        if (inv.action === 'BUY') {
            const cost = amount.plus(inv.fees || 0);
            monthInvested = monthInvested.plus(cost);
            const b = (buys[inv.symbol] ||= { qty: ZERO, cost: ZERO });
            b.qty = b.qty.plus(inv.quantity);
            b.cost = b.cost.plus(cost);
        } else if (inv.action === 'SELL') {
            monthInvested = monthInvested.minus(amount.minus(inv.fees || 0));
        }
    });

    let buysValue = ZERO;
    let buysCost = ZERO;
    Object.entries(buys).forEach(([symbol, b]) => {
        const held = metrics.find(m => m.symbol === symbol)?.currentQuantity ?? ZERO;
        const qty = BigNumber.min(b.qty, held);
        if (qty.lte(0)) return;
        buysCost = buysCost.plus(b.cost.dividedBy(b.qty).times(qty));
        buysValue = buysValue.plus((prices[symbol] ?? ZERO).times(qty));
    });
    const monthBuysPL = buysValue.minus(buysCost);

    return {
        hasHoldings: metrics.some(m => m.currentQuantity.gt(0)),
        marketValue,
        unrealizedPL,
        unrealizedPercent: costBasis.gt(0) ? unrealizedPL.dividedBy(costBasis).times(100).toNumber() : (unrealizedPL.isZero() ? 0 : null),
        topHoldingPercent: percentOf(topValue, marketValue),
        monthInvested,
        monthBuysPL,
        monthBuysPercent: percentOf(monthBuysPL, buysCost),
    };
};

export interface LoansSnapshot {
    hasLoans: boolean;
    outstanding: BigNumber;
    outstandingPrev: BigNumber;
    repaidPercent: number | null;
    repaidPercentPrev: number | null;
    // Points moved this month on the loans that existed at last month-end, so a new loan isn't a drop.
    repaidPointsChange: number | null;
    obligationsDue: BigNumber;
    obligationsPaid: BigNumber;
    paidCount: number;
    dueCount: number;
}

// Active debts you owe (or, for RECEIVABLE, money owed to you). Obligations: principal + interest
// paid (received) this month, fees excluded, capped per debt at its minimum payment.
export const calculateLoansSnapshot = (
    transactions: Transaction[], debts: Debt[], now: Date = new Date(), direction: 'PAYABLE' | 'RECEIVABLE' = 'PAYABLE'
): LoansSnapshot => {
    const active = debts.filter(d => isPayable(d) === (direction === 'PAYABLE') && d.status === 'ACTIVE');
    const paymentTypes: Transaction['type'][] = direction === 'PAYABLE' ? ['TRANSFER_OUT', 'EXPENSE'] : ['TRANSFER_IN', 'INCOME'];
    const prevEnd = endOfLastMonth(now);
    const prevTx = upTo(transactions, prevEnd);
    const existedPrev = active.filter(d => debtStart(d) <= prevEnd);

    const remaining = (list: Debt[], tx: Transaction[]) => list.reduce((sum, d) => sum.plus(calculateCurrentDebtBalance(d, tx)), ZERO);
    const borrowed = (list: Debt[]) => list.reduce((sum, d) => sum.plus(d.initialAmount), ZERO);

    const outstanding = remaining(active, transactions);
    const outstandingPrev = remaining(existedPrev, prevTx);
    const repaidPct = (list: Debt[], left: BigNumber) => percentOf(borrowed(list).minus(left), borrowed(list));

    const monthTx = getTransactionsByMonth(transactions, now);
    let obligationsDue = ZERO;
    let obligationsPaid = ZERO;
    let paidCount = 0;
    let dueCount = 0;
    active.filter(d => d.minPayment.gt(0)).forEach(d => {
        const paid = monthTx
            .filter(t => t.debtId === d.id && paymentTypes.includes(t.type))
            .filter(t => !isFeeOrOpening(t))
            .reduce((sum, t) => sum.plus(t.amount.abs()), ZERO);
        // Repaid in full earlier but still marked Active: nothing is due (the Loans tab lists it as paid off).
        if (paid.isZero() && calculateCurrentDebtBalance(d, transactions).lte(0)) return;
        dueCount++;
        obligationsDue = obligationsDue.plus(d.minPayment);
        obligationsPaid = obligationsPaid.plus(BigNumber.min(paid, d.minPayment));
        if (paid.gte(d.minPayment)) paidCount++;
    });

    const repaidPercentPrev = existedPrev.length > 0 ? repaidPct(existedPrev, outstandingPrev) : null;
    const sameLoansNow = existedPrev.length > 0 ? repaidPct(existedPrev, remaining(existedPrev, transactions)) : null;

    return {
        hasLoans: active.length > 0,
        outstanding,
        outstandingPrev,
        repaidPercent: repaidPct(active, outstanding),
        repaidPercentPrev,
        repaidPointsChange: sameLoansNow !== null && repaidPercentPrev !== null ? sameLoansNow - repaidPercentPrev : null,
        obligationsDue,
        obligationsPaid,
        paidCount,
        dueCount,
    };
};

export interface GoalsSnapshot {
    count: number;
    total: BigNumber;
    target: BigNumber;
    // Σ min(balance, target) ÷ Σ target.
    progressPercent: number | null;
    progressPercentPrev: number | null;
    onTrackCount: number;
    monthContributed: BigNumber;
    monthNetContributed: BigNumber;
    fundedCount: number;
    // Goals not yet at target.
    fundableCount: number;
    // null when no goal has a recurring plan.
    onPlan: boolean | null;
}

export const calculateGoalsSnapshot = (transactions: Transaction[], goals: SavingsGoal[], now: Date = new Date()): GoalsSnapshot => {
    const prevEnd = endOfLastMonth(now);
    const prevTx = upTo(transactions, prevEnd);
    const monthTx = getTransactionsByMonth(transactions, now).filter(t => t.savingsGoalId);

    const progress = (list: SavingsGoal[], tx: Transaction[]) => {
        const target = list.reduce((sum, g) => sum.plus(g.targetAmount), ZERO);
        const capped = list.reduce((sum, g) => sum.plus(BigNumber.min(calculateGoalBalance(g, tx), g.targetAmount)), ZERO);
        return percentOf(capped, target);
    };

    let total = ZERO;
    let onTrackCount = 0;
    let fundedCount = 0;
    let fundableCount = 0;
    goals.forEach(g => {
        const balance = calculateGoalBalance(g, transactions);
        total = total.plus(balance);
        const reached = g.targetAmount.gt(0) && balance.gte(g.targetAmount);
        if (reached || (!g.isPaused && g.recurringAmount?.gt(0) && g.frequency)) onTrackCount++;
        if (!reached) {
            fundableCount++;
            if (monthTx.some(t => t.savingsGoalId === g.id && t.type === 'TRANSFER_OUT')) fundedCount++;
        }
    });

    const sumType = (type: Transaction['type']) =>
        monthTx.filter(t => t.type === type).reduce((sum, t) => sum.plus(t.amount.abs()), ZERO);
    const monthContributed = sumType('TRANSFER_OUT');
    const plan = calculateTotalGoalContributions(goals, transactions);
    const prevGoals = goals.filter(g => new Date(g.createdAt) <= prevEnd);

    return {
        count: goals.length,
        total,
        target: goals.reduce((sum, g) => sum.plus(g.targetAmount), ZERO),
        progressPercent: progress(goals, transactions),
        progressPercentPrev: prevGoals.length > 0 ? progress(prevGoals, prevTx) : null,
        onTrackCount,
        monthContributed,
        monthNetContributed: monthContributed.minus(sumType('TRANSFER_IN')),
        fundedCount,
        fundableCount,
        onPlan: plan.gt(0) ? monthContributed.gte(plan) : null,
    };
};
