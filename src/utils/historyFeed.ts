import { BigNumber } from 'bignumber.js';

import { Investment, SavingsGoal, Transaction } from '@types';
import { HistoryItem, isDebt, isInvestment } from '@components/history/HistoryListItem';

// Shared by History and Home's Ledger tab: item dates, type/search filters, merged legs and day groups.

export type HistoryFilter = 'ALL' | 'EXPENSE' | 'INVESTMENT' | 'DEBT' | 'INCOME' | 'CASH_FLOW';

export interface HistorySection {
    title: string;
    data: HistoryItem[];
    totalAmount: BigNumber;
    count: number;
    originalDate: Date;
}

export const getHistoryItemDate = (item: HistoryItem): Date =>
    isDebt(item) ? new Date(item.startDate || item.createdAt) : new Date(item.date);

export const matchesHistoryFilter = (item: HistoryItem, filter: HistoryFilter): boolean => {
    if (filter === 'ALL') return true;
    if (filter === 'INVESTMENT') return isInvestment(item);
    if (filter === 'DEBT') return isDebt(item);
    if (isInvestment(item) || isDebt(item)) return false;

    const t = item as Transaction;
    if (filter === 'EXPENSE') return t.type === 'EXPENSE';
    if (filter === 'INCOME') return t.type === 'INCOME';
    return t.type === 'TRANSFER_IN' || t.type === 'TRANSFER_OUT';
};

export const matchesHistorySearch = (item: HistoryItem, rawQuery: string): boolean => {
    const query = rawQuery.trim().toLowerCase();
    if (!query) return true;
    if (isInvestment(item)) {
        return item.symbol.toLowerCase().includes(query) || item.action.toLowerCase().includes(query);
    }
    if (isDebt(item)) {
        return item.name.toLowerCase().includes(query) || !!(item.notes && item.notes.toLowerCase().includes(query));
    }
    const t = item as Transaction;
    return t.category.toLowerCase().includes(query) ||
        !!(t.subCategory && t.subCategory.toLowerCase().includes(query)) ||
        !!(t.note && t.note.toLowerCase().includes(query)) ||
        !!(t.transferAccount && t.transferAccount.toLowerCase().includes(query));
};

// An investment's cash/P&L legs, a goal spend's offset transfer and a debt payment's Interest/Fees
// legs double up their primary item; fold them away only while that primary is in the same day group.
export const isMergedIntoSibling = (item: HistoryItem, siblings: HistoryItem[]): boolean => {
    if (isInvestment(item) || isDebt(item)) return false;
    const t = item as Transaction;
    if (t.investmentId) {
        return siblings.some(s => isInvestment(s) && s.id === t.investmentId);
    }
    if (t.linkedTransactionId) {
        return siblings.some(s => !isInvestment(s) && !isDebt(s) && (s as Transaction).id === t.linkedTransactionId);
    }
    return false;
};

// Day totals count every cash transaction in the day, merged legs included (they still moved cash).
export const groupHistoryByDay = (items: HistoryItem[], now: Date = new Date()): HistorySection[] => {
    const grouped: Record<string, HistoryItem[]> = {};
    items.forEach(item => {
        const key = getHistoryItemDate(item).toDateString();
        (grouped[key] ||= []).push(item);
    });

    const yesterday = new Date(now.getTime() - 86400000);

    return Object.keys(grouped).map(dateKey => {
        const dayItems = grouped[dateKey];
        const totalAmount = dayItems.reduce((sum, item) => {
            if (isInvestment(item) || isDebt(item)) return sum;
            const t = item as Transaction;
            if (t.type === 'INCOME' || t.type === 'TRANSFER_IN') return sum.plus(t.amount.abs());
            if (t.type === 'EXPENSE' || t.type === 'TRANSFER_OUT') return sum.minus(t.amount.abs());
            return sum;
        }, new BigNumber(0));

        const visibleItems = dayItems.filter(item => !isMergedIntoSibling(item, dayItems));
        const d = new Date(dateKey);
        const title = d.toDateString() === now.toDateString() ? 'Today'
            : d.toDateString() === yesterday.toDateString() ? 'Yesterday'
                : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return { title, data: visibleItems, totalAmount, count: visibleItems.length, originalDate: getHistoryItemDate(dayItems[0]) };
    }).sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
};

export const isMoneyIn = (t: Transaction): boolean => t.type === 'INCOME' || t.type === 'TRANSFER_IN';

// Signed cash effect; a debt payment's principal row carries its merged interest/fee legs.
export const transactionCashAmount = (t: Transaction, legs: Transaction[] = []): BigNumber => {
    let amount = isMoneyIn(t) ? t.amount.abs() : t.amount.abs().negated();
    legs.forEach(l => { amount = isMoneyIn(l) ? amount.plus(l.amount.abs()) : amount.minus(l.amount.abs()); });
    return amount;
};

export interface RecentTransaction {
    transaction: Transaction;
    amount: BigNumber;
}

// Home's Recent list: newest first, up to today, with merged legs folded away as the Ledger does.
export const buildRecentTransactions = (transactions: Transaction[], count: number, now: Date = new Date()): RecentTransaction[] => {
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const pool = transactions
        .filter(t => t.type !== 'CAPITAL_GAIN' && t.type !== 'CAPITAL_LOSS' && new Date(t.date) <= endOfToday)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const ids = new Set(pool.map(t => t.id));
    const legsByPrincipalId: Record<string, Transaction[]> = {};
    pool.forEach(t => {
        if (t.debtId && t.linkedTransactionId && (t.subCategory === 'INTEREST' || t.subCategory === 'FEES')) {
            (legsByPrincipalId[t.linkedTransactionId] ||= []).push(t);
        }
    });

    return pool
        .filter(t => !(t.linkedTransactionId && ids.has(t.linkedTransactionId)))
        .slice(0, count)
        .map(t => ({
            transaction: t,
            amount: transactionCashAmount(t, t.debtId && t.subCategory === 'PRINCIPAL' ? legsByPrincipalId[t.id] : []),
        }));
};

export interface HistoryLookups {
    investmentMap: Record<string, Investment>;
    savingsGoalNameMap: Record<string, string>;
    linkedPLByInvestmentId: Record<string, Transaction>;
    // A debt payment's Interest/Fees legs keyed by their Principal leg's id.
    debtLegsByPrincipalId: Record<string, Transaction[]>;
}

export const buildHistoryLookups = (transactions: Transaction[], investments: Investment[], goals: SavingsGoal[]): HistoryLookups => {
    const investmentMap: Record<string, Investment> = {};
    investments.forEach(inv => { investmentMap[inv.id] = inv; });

    const savingsGoalNameMap: Record<string, string> = {};
    goals.forEach(g => { savingsGoalNameMap[g.id] = g.name; });

    const linkedPLByInvestmentId: Record<string, Transaction> = {};
    const debtLegsByPrincipalId: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
        if ((t.type === 'CAPITAL_GAIN' || t.type === 'CAPITAL_LOSS') && t.investmentId) {
            linkedPLByInvestmentId[t.investmentId] = t;
        }
        if (t.debtId && t.linkedTransactionId && (t.subCategory === 'INTEREST' || t.subCategory === 'FEES')) {
            (debtLegsByPrincipalId[t.linkedTransactionId] ||= []).push(t);
        }
    });

    return { investmentMap, savingsGoalNameMap, linkedPLByInvestmentId, debtLegsByPrincipalId };
};
