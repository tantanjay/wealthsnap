import { BigNumber } from 'bignumber.js';
import { SavingsGoal, Transaction, RecurrenceFrequency } from '@types';

/**
 * A goal's balance is always derived from the ledger, never stored - mirrors
 * calculateCurrentDebtBalance in debtMetrics.ts. Contributions (CONTRIBUTION/
 * INITIAL_FUNDING, both TRANSFER_OUT) add; spends/withdrawals/sweeps (GOAL_SPEND/
 * WITHDRAWAL/SWEEP, all TRANSFER_IN) subtract. Clamped at 0 per the "no negative
 * balances" rule - split-funding on the write side is what keeps a spend from ever
 * driving this below zero in the first place, this clamp is just a defensive floor.
 */
export const calculateGoalBalance = (goal: SavingsGoal, transactions: Transaction[]): BigNumber => {
    const goalTransactions = transactions.filter(t => t.savingsGoalId === goal.id);

    const contributions = goalTransactions
        .filter(t => t.type === 'TRANSFER_OUT')
        .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));

    const outflows = goalTransactions
        .filter(t => t.type === 'TRANSFER_IN')
        .reduce((sum, t) => sum.plus(t.amount), new BigNumber(0));

    return BigNumber.maximum(0, contributions.minus(outflows));
};

/**
 * Percent of target saved so far - mirrors calculateDebtProgress. Can exceed 100 by
 * design (goals are allowed to accumulate past target); callers that render a progress
 * bar should clamp the visual fill at 100 themselves while still showing the real number.
 */
export const calculateGoalProgress = (targetAmount: BigNumber, balance: BigNumber): number => {
    if (targetAmount.lte(0)) return 100;
    return balance.div(targetAmount).times(100).toNumber();
};

export type SavingsGoalBucket = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

/**
 * "Completed" is a computed display bucket (balance >= target), not a stored status, so
 * it can never drift from the ledger. Paused takes precedence in display terms only when
 * not yet completed - a paused goal that's already over target still reads as Completed.
 */
export const getGoalBucket = (goal: SavingsGoal, balance: BigNumber): SavingsGoalBucket => {
    if (balance.isGreaterThanOrEqualTo(goal.targetAmount) && goal.targetAmount.isGreaterThan(0)) {
        return 'COMPLETED';
    }
    return goal.isPaused ? 'PAUSED' : 'ACTIVE';
};

// Normalizes a goal's recurringAmount to a monthly-equivalent rate - unlike Debt.minPayment
// (always implicitly monthly), a goal's contribution can be any frequency, so it can't just
// be summed directly the way calculateTotalDebtObligations sums minPayment.
const FREQUENCY_MONTHLY_MULTIPLIER: Record<RecurrenceFrequency, number> = {
    DAILY: 30.44,       // average days/month
    WEEKLY: 4.345,      // 52 weeks / 12 months
    SEMI_MONTHLY: 2,
    MONTHLY: 1,
    QUARTERLY: 1 / 3,
    BI_ANNUAL: 1 / 6,
    YEARLY: 1 / 12,
};

export const calculateMonthlyContributionEquivalent = (amount: BigNumber, frequency: RecurrenceFrequency): BigNumber =>
    amount.times(FREQUENCY_MONTHLY_MULTIPLIER[frequency] ?? 1);

/**
 * Fixed monthly-equivalent total across every active, unpaused goal's auto-contribution -
 * mirrors calculateTotalDebtObligations(debts) exactly (same "derived from the entity's own
 * settings, not from scanning transaction history" shape), so it can be added into Burn
 * Rate/Runway the same way debt obligations already are. A paused goal contributes 0 (its
 * auto-contribution isn't firing), matching isPaused's actual effect on cash flow.
 */
export const calculateTotalGoalContributions = (goals: SavingsGoal[]): BigNumber => {
    return goals
        .filter(g => !g.isPaused && g.recurringAmount && g.frequency)
        .reduce((sum, g) => sum.plus(calculateMonthlyContributionEquivalent(g.recurringAmount!, g.frequency!)), new BigNumber(0));
};
