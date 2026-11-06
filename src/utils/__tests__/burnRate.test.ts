import { describe, expect, it } from 'vitest';
import { calculateBaseBurnRate, calculateMonthlyBurnRate, getBurnRateBase } from '@utils/financialMetrics';
import { at, debt, expense, goal, income, iso, tx } from './fixtures';

// docs/METRICS.md → Burn Rate. Each test names the history row it pins down.

const NOW = at(2026, 11, 6);

describe('test environment', () => {
    it('runs in the time zone its project sets', () => {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ);
    });
});

describe('Burn Rate base', () => {
    it('keeps debt fees and drops debt interest and principal (1.19.0 ↩ of 1.17.0/1.18.0)', () => {
        const loan = 'loan-1';
        const kept = expense(1000, iso(2026, 10, 1));
        const fee = expense(100, iso(2026, 10, 10), { debtId: loan, category: 'Fees' });
        const interest = expense(500, iso(2026, 10, 10), { debtId: loan, subCategory: 'INTEREST', category: 'Interest' });
        const principal = tx({ type: 'TRANSFER_OUT', amount: 2000, date: iso(2026, 10, 10), debtId: loan, subCategory: 'PRINCIPAL' });

        expect(getBurnRateBase([kept, fee, interest, principal])).toEqual([kept, fee]);
        expect(calculateBaseBurnRate([kept, fee, interest, principal], NOW).toNumber()).toBe(1100);
    });

    it('drops goal-funded purchases and goal contributions (1.18.0)', () => {
        const goalId = 'goal-1';
        const txs = [
            expense(1000, iso(2026, 10, 1)),
            tx({ type: 'TRANSFER_OUT', amount: 3000, date: iso(2026, 10, 2), savingsGoalId: goalId, subCategory: 'CONTRIBUTION' }),
            expense(3000, iso(2026, 10, 20), { savingsGoalId: goalId }),
            tx({ type: 'TRANSFER_IN', amount: 3000, date: iso(2026, 10, 20), savingsGoalId: goalId, subCategory: 'GOAL_SPEND' }),
        ];
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBe(1000);
    });

    it('leaves out the current, in-progress month (1.7.0)', () => {
        const txs = [expense(1000, iso(2026, 10, 1)), expense(50000, iso(2026, 11, 3))];
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBe(1000);
    });

    it('counts a full month with no spending as 0 (1.2.0)', () => {
        const txs = [expense(900, iso(2026, 8, 1))];
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBe(300);
    });

    it('averages no more than 6 prior full months', () => {
        // Jan–Mar at 10,000 fall outside the window; May–Oct at 1,000 are averaged.
        const txs = [
            ...[1, 2, 3, 4].map(m => expense(10000, iso(2026, m, 1))),
            ...[5, 6, 7, 8, 9, 10].map(m => expense(1000, iso(2026, m, 1))),
        ];
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBe(1000);
    });

    it('does not count a partly tracked first month as full (1.19.0)', () => {
        // First transaction Oct 15: Oct isn't full, so Sep–Oct can't be averaged.
        const txs = [expense(2300, iso(2026, 10, 15)), expense(1000, iso(2026, 9, 30))];
        const result = calculateBaseBurnRate(txs.slice(0, 1), NOW);
        // Oct 15 → Nov 6 is 23 days, inclusive: 2300 / 23 × 30.44.
        expect(result.toNumber()).toBeCloseTo(3044, 6);
        // Starting on Sep 30 instead leaves Oct as the only full month.
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBe(2300);
    });

    it('pro-rates daily spending when there is no full month yet, not the partial month as a whole (1.19.0)', () => {
        const txs = [expense(600, iso(2026, 11, 1)), expense(0, iso(2026, 11, 6))];
        // 6 days, inclusive: 600 / 6 × 30.44.
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBeCloseTo(3044, 6);
    });

    it('ignores income', () => {
        const txs = [expense(1000, iso(2026, 10, 1)), income(80000, iso(2026, 10, 15))];
        expect(calculateBaseBurnRate(txs, NOW).toNumber()).toBe(1000);
    });
});

describe('Burn Rate total', () => {
    const history = [expense(1000, iso(2026, 10, 1))];

    it('adds minimum payments of active debts you owe (1.10.0)', () => {
        const result = calculateMonthlyBurnRate(history, [debt({ initialAmount: 50000, minPayment: 2000 })], [], NOW);
        expect(result.debtObligations.toNumber()).toBe(2000);
        expect(result.total.toNumber()).toBe(3000);
    });

    it('never treats money owed to you as an obligation (1.13.0)', () => {
        const receivable = debt({ initialAmount: 50000, minPayment: 2000, direction: 'RECEIVABLE', type: 'YOU_OWE_ME' });
        expect(calculateMonthlyBurnRate(history, [receivable], [], NOW).total.toNumber()).toBe(1000);
    });

    it('drops debts that are paid off or forgiven', () => {
        const debts = [
            debt({ initialAmount: 50000, minPayment: 2000, status: 'PAID_OFF' }),
            debt({ initialAmount: 50000, minPayment: 3000, status: 'FORGIVEN' }),
        ];
        expect(calculateMonthlyBurnRate(history, debts, [], NOW).total.toNumber()).toBe(1000);
    });

    it('adds goal contributions from goal settings, as a monthly equivalent (1.18.0)', () => {
        const goals = [
            goal({ targetAmount: 100000, recurringAmount: 5000 }),
            goal({ targetAmount: 100000, recurringAmount: 1200, frequency: 'YEARLY' }),
        ];
        const result = calculateMonthlyBurnRate(history, [], goals, NOW);
        expect(result.goalContributions.toNumber()).toBe(5100);
        expect(result.total.toNumber()).toBe(6100);
    });

    it('skips goals that are paused or already at target', () => {
        const paused = goal({ targetAmount: 100000, recurringAmount: 5000, isPaused: true });
        const reached = goal({ targetAmount: 3000, recurringAmount: 5000 });
        const funding = tx({ type: 'TRANSFER_OUT', amount: 3000, date: iso(2026, 9, 1), savingsGoalId: reached.id, subCategory: 'CONTRIBUTION' });
        const result = calculateMonthlyBurnRate([...history, funding], [], [paused, reached], NOW);
        expect(result.goalContributions.toNumber()).toBe(0);
    });
});
