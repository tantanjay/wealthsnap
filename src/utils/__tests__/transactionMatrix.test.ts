import { BigNumber } from 'bignumber.js';
import { describe, expect, it } from 'vitest';
import { Debt, Investment, Transaction } from '@types';
import {
    calculateBalance,
    calculateBaseBurnRate,
    calculateMonthSafeToSpend,
    getCategoryBreakdown,
    getMonthlyTrends,
    getSavingsRateTrend,
    getTransactionsByMonth,
} from '@utils/financialMetrics';
import { calculateCurrentDebtBalance, calculateProjectedDebtLiability } from '@utils/debtMetrics';
import { calculateNetWorth } from '@utils/snapshotMetrics';
import { at, debt, expense, goal, income, iso, noPrices, trade, tx } from './fixtures';

// docs/METRICS.md → "What each transaction counts toward", one case per row. Each row adds its
// transactions to a fixed household and checks how every column moves. Keep in step with the doc.

const NOW = at(2026, 11, 20);
const A = 900;

// --- The household every row is added to ---
const loan = debt({ name: 'Loan', initialAmount: 20000, interestRate: 12, minPayment: 2000 });
const lent = debt({ name: 'Lent', initialAmount: 5000, direction: 'RECEIVABLE', type: 'YOU_OWE_ME' });
const trip = goal({ name: 'Trip', targetAmount: 100000, recurringAmount: 5000 });
const opening = trade('BUY', 10, 100, iso(2026, 8, 1));

const BASE_TX: Transaction[] = [
    income(50000, iso(2026, 8, 1)),
    ...[8, 9, 10, 11].map(m => expense(3000, iso(2026, m, 1))),
    tx({ type: 'TRANSFER_IN', amount: 20000, date: iso(2026, 8, 1), debtId: loan.id, subCategory: 'INITIAL_TRANSACTION' }),
    tx({ type: 'TRANSFER_OUT', amount: 5000, date: iso(2026, 8, 1), debtId: lent.id, subCategory: 'INITIAL_TRANSACTION' }),
    tx({ type: 'TRANSFER_OUT', amount: 10000, date: iso(2026, 8, 1), savingsGoalId: trip.id, subCategory: 'CONTRIBUTION' }),
    tx({ type: 'TRANSFER_OUT', amount: 1000, date: iso(2026, 8, 1), investmentId: opening.id, category: 'Investment' }),
];
const BASE_DEBTS = [loan, lent];
const BASE_INV = [opening];
const GOALS = [trip];

interface Added { txs: Transaction[]; debts?: Debt[]; investments?: Investment[] }

// Column values, as the doc's symbols:
// cash/netWorth '+' | '-' | 0 · netWorth also '≈0' (principal paid) and '-interest' (borrowing).
// savingsRate: which side it lands on. sts.direct: effect on spent/income, apart from the
// allowance and obligations, which are checked on their own.
interface Row {
    kind: string;
    add: (date: string) => Added;
    cash: '+' | '-' | 0;
    totalExpense: boolean;
    savingsRate: 'income' | 'spent' | null;
    burnRate: boolean;
    sts: { direct: '+' | '-' | 0; allowance: boolean; obligation?: 'debt' | 'goal' };
    category: 'expense' | 'income' | 'goal-funded' | null;
    netWorth: '+' | '-' | 0 | '≈0' | '-interest';
}

const ROWS: Row[] = [
    {
        kind: 'Income', add: d => ({ txs: [income(A, d)] }),
        cash: '+', totalExpense: false, savingsRate: 'income', burnRate: false,
        sts: { direct: '+', allowance: false }, category: 'income', netWorth: '+',
    },
    {
        kind: 'Normal expense', add: d => ({ txs: [expense(A, d)] }),
        cash: '-', totalExpense: true, savingsRate: 'spent', burnRate: true,
        sts: { direct: '-', allowance: true }, category: 'expense', netWorth: '-',
    },
    {
        kind: 'Recurring expense', add: d => ({ txs: [expense(A, d, { isRecurring: true })] }),
        cash: '-', totalExpense: true, savingsRate: 'spent', burnRate: true,
        sts: { direct: '-', allowance: false }, category: 'expense', netWorth: '-',
    },
    {
        kind: 'Goal contribution',
        add: d => ({ txs: [tx({ type: 'TRANSFER_OUT', amount: A, date: d, savingsGoalId: trip.id, subCategory: 'CONTRIBUTION' })] }),
        cash: '-', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: '-', allowance: false, obligation: 'goal' }, category: null, netWorth: 0,
    },
    {
        kind: 'Goal-funded purchase',
        add: d => ({
            txs: [
                expense(A, d, { savingsGoalId: trip.id, category: 'Travel' }),
                tx({ type: 'TRANSFER_IN', amount: A, date: d, savingsGoalId: trip.id, subCategory: 'GOAL_SPEND' }),
            ],
        }),
        cash: 0, totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: 'goal-funded', netWorth: '-',
    },
    {
        kind: 'Goal withdrawal / sweep',
        add: d => ({ txs: [tx({ type: 'TRANSFER_IN', amount: A, date: d, savingsGoalId: trip.id, subCategory: 'WITHDRAWAL' })] }),
        cash: '+', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: null, netWorth: 0,
    },
    {
        kind: 'Debt principal paid',
        add: d => ({ txs: [tx({ type: 'TRANSFER_OUT', amount: A, date: d, debtId: loan.id, subCategory: 'PRINCIPAL' })] }),
        cash: '-', totalExpense: false, savingsRate: 'spent', burnRate: false,
        sts: { direct: '-', allowance: false, obligation: 'debt' }, category: null, netWorth: '≈0',
    },
    {
        // Paying interest also counts toward this month's minimum payment.
        kind: 'Debt interest paid',
        add: d => ({ txs: [expense(A, d, { debtId: loan.id, subCategory: 'INTEREST', category: 'Interest' })] }),
        cash: '-', totalExpense: true, savingsRate: 'spent', burnRate: false,
        sts: { direct: '-', allowance: false, obligation: 'debt' }, category: 'expense', netWorth: '-',
    },
    {
        kind: 'Debt fee', add: d => ({ txs: [expense(A, d, { debtId: loan.id, category: 'Fees' })] }),
        cash: '-', totalExpense: true, savingsRate: 'spent', burnRate: true,
        sts: { direct: '-', allowance: true }, category: 'expense', netWorth: '-',
    },
    {
        kind: 'Borrowing',
        add: d => {
            const borrowed = debt({ name: 'New loan', initialAmount: A, interestRate: 24, minPayment: 100 });
            return { debts: [borrowed], txs: [tx({ type: 'TRANSFER_IN', amount: A, date: d, debtId: borrowed.id, subCategory: 'INITIAL_TRANSACTION' })] };
        },
        cash: '+', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: null, netWorth: '-interest',
    },
    {
        kind: 'Lending out',
        add: d => {
            const loanedOut = debt({ name: 'New receivable', initialAmount: A, direction: 'RECEIVABLE', type: 'YOU_OWE_ME' });
            return { debts: [loanedOut], txs: [tx({ type: 'TRANSFER_OUT', amount: A, date: d, debtId: loanedOut.id, subCategory: 'INITIAL_TRANSACTION' })] };
        },
        cash: '-', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: '-', allowance: false }, category: null, netWorth: '-',
    },
    {
        kind: 'Repayment received',
        add: d => ({ txs: [tx({ type: 'TRANSFER_IN', amount: A, date: d, debtId: lent.id, subCategory: 'PRINCIPAL' })] }),
        cash: '+', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: null, netWorth: '+',
    },
    {
        kind: 'Interest earned', add: d => ({ txs: [income(A, d, { debtId: lent.id, category: 'Interest' })] }),
        cash: '+', totalExpense: false, savingsRate: 'income', burnRate: false,
        sts: { direct: '+', allowance: false }, category: 'income', netWorth: '+',
    },
    {
        kind: 'Investment buy',
        add: d => {
            const buy = trade('BUY', A / 100, 100, d);
            return { investments: [buy], txs: [tx({ type: 'TRANSFER_OUT', amount: A, date: d, investmentId: buy.id, category: 'Investment' })] };
        },
        cash: '-', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: '-', allowance: false }, category: null, netWorth: 0,
    },
    {
        kind: 'Investment sell',
        add: d => {
            const sell = trade('SELL', A / 100, 100, d);
            return { investments: [sell], txs: [tx({ type: 'TRANSFER_IN', amount: A, date: d, investmentId: sell.id, category: 'Investment' })] };
        },
        cash: '+', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: null, netWorth: 0,
    },
    {
        kind: 'Dividend', add: d => ({ txs: [income(A, d, { investmentId: opening.id, category: 'Dividend' })] }),
        cash: '+', totalExpense: false, savingsRate: 'income', burnRate: false,
        sts: { direct: '+', allowance: false }, category: 'income', netWorth: '+',
    },
    {
        kind: 'Realized gain/loss',
        add: d => ({
            txs: [
                tx({ type: 'CAPITAL_GAIN', amount: A, date: d, investmentId: opening.id }),
                tx({ type: 'CAPITAL_LOSS', amount: A / 3, date: d, investmentId: opening.id }),
            ],
        }),
        cash: 0, totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: null, netWorth: 0,
    },
    {
        kind: 'Plain transfer out',
        add: d => ({ txs: [tx({ type: 'TRANSFER_OUT', amount: A, date: d, category: 'Transfer', transferAccount: 'CASH_ATM' })] }),
        cash: '-', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: '-', allowance: false }, category: null, netWorth: '-',
    },
    {
        kind: 'Plain transfer in',
        add: d => ({ txs: [tx({ type: 'TRANSFER_IN', amount: A, date: d, category: 'Transfer', transferAccount: 'OTHER_ACCOUNT' })] }),
        cash: '+', totalExpense: false, savingsRate: null, burnRate: false,
        sts: { direct: 0, allowance: false }, category: null, netWorth: '+',
    },
];

// --- Column readers, each over the full household ---
interface World { txs: Transaction[]; debts: Debt[]; investments: Investment[] }

const world = (added?: Added): World => ({
    txs: [...BASE_TX, ...(added?.txs ?? [])],
    debts: [...BASE_DEBTS, ...(added?.debts ?? [])],
    investments: [...BASE_INV, ...(added?.investments ?? [])],
});

const sum = (xs: BigNumber[]) => xs.reduce((s, x) => s.plus(x), new BigNumber(0)).toNumber();

const columns = (w: World) => {
    const month = getTransactionsByMonth(w.txs, NOW);
    const savings = getSavingsRateTrend(w.txs, 1, NOW)[0];
    const expenses = getCategoryBreakdown(month, 'EXPENSE');
    const sts = calculateMonthSafeToSpend(w.txs, w.debts, GOALS, { bills: new BigNumber(0), income: new BigNumber(0) }, NOW);
    return {
        cash: calculateBalance(w.txs).toNumber(),
        totalExpense: getMonthlyTrends(w.txs, 1, NOW).expenseData[0].toNumber(),
        savingsIncome: savings.income.toNumber(),
        savingsSpent: savings.expense.toNumber(),
        stsAmount: sts.amount.toNumber(),
        stsDaily: sts.dailyBurnRate.toNumber(),
        stsVariable: sts.projectedVariableSpend.toNumber(),
        stsDebt: sts.remainingDebtObligations.toNumber(),
        stsGoal: sts.remainingGoalObligations.toNumber(),
        categoryExpense: sum(expenses.map(c => c.amount)),
        categoryGoalFunded: sum(expenses.map(c => c.goalFundedAmount)),
        categoryIncome: sum(getCategoryBreakdown(month, 'INCOME').map(c => c.amount)),
        netWorth: calculateNetWorth(w.txs, w.investments, w.debts, GOALS, noPrices).netWorth.toNumber(),
    };
};

const signed = (s: '+' | '-' | 0) => (s === '+' ? A : s === '-' ? -A : 0);

describe.each(ROWS)('$kind', row => {
    // Placed this month for every column except Burn Rate, which only reads prior full months.
    const added = row.add(iso(2026, 11, 10));
    const before = columns(world());
    const after = columns(world(added));
    const delta = (key: keyof typeof before) => after[key] - before[key];

    it('Cash Balance', () => {
        expect(delta('cash')).toBeCloseTo(signed(row.cash), 6);
    });

    it('Total Expense', () => {
        expect(delta('totalExpense')).toBeCloseTo(row.totalExpense ? A : 0, 6);
    });

    it('Savings Rate', () => {
        expect(delta('savingsIncome')).toBeCloseTo(row.savingsRate === 'income' ? A : 0, 6);
        expect(delta('savingsSpent')).toBeCloseTo(row.savingsRate === 'spent' ? A : 0, 6);
    });

    it.todo('Budget — computed inline in InsightScreen, not yet in a testable function');

    it('Burn Rate (spending base)', () => {
        // The household has 3 full prior months (Aug–Oct), so one more in October moves the average by A / 3.
        const priorWorld = world(row.add(iso(2026, 10, 10)));
        const moved = calculateBaseBurnRate(priorWorld.txs, NOW).minus(calculateBaseBurnRate(world().txs, NOW)).toNumber();
        expect(moved).toBeCloseTo(row.burnRate ? A / 3 : 0, 6);
    });

    it('Safe-to-Spend', () => {
        const direct = delta('stsAmount') + delta('stsVariable') + delta('stsDebt') + delta('stsGoal');
        expect(direct).toBeCloseTo(signed(row.sts.direct), 6);
        expect(delta('stsDaily')).toBeCloseTo(row.sts.allowance ? A / 90 : 0, 6);
        // A debt the row creates (Borrowing) reserves its own minimum payment from its settings.
        const newMinimums = sum((added.debts ?? []).filter(d => d.direction === 'PAYABLE').map(d => d.minPayment));
        expect(delta('stsDebt')).toBeCloseTo((row.sts.obligation === 'debt' ? -A : 0) + newMinimums, 6);
        expect(delta('stsGoal')).toBeCloseTo(row.sts.obligation === 'goal' ? -A : 0, 6);
    });

    it('Category Breakdown', () => {
        const spent = row.category === 'expense' || row.category === 'goal-funded';
        expect(delta('categoryExpense')).toBeCloseTo(spent ? A : 0, 6);
        expect(delta('categoryGoalFunded')).toBeCloseTo(row.category === 'goal-funded' ? A : 0, 6);
        expect(delta('categoryIncome')).toBeCloseTo(row.category === 'income' ? A : 0, 6);
    });

    it('Net Worth', () => {
        const moved = delta('netWorth');
        if (row.netWorth === '≈0') {
            // Cash and principal drop together; only the projected interest on that principal goes away.
            expect(moved).toBeGreaterThanOrEqual(0);
            expect(moved).toBeLessThan(A);
        } else if (row.netWorth === '-interest') {
            const borrowed = added.debts![0];
            const principal = calculateCurrentDebtBalance(borrowed, world(added).txs);
            const { interest } = calculateProjectedDebtLiability(borrowed, principal);
            expect(interest.toNumber()).toBeGreaterThan(0);
            expect(moved).toBeCloseTo(-interest.toNumber(), 6);
        } else {
            expect(moved).toBeCloseTo(signed(row.netWorth), 6);
        }
    });
});
