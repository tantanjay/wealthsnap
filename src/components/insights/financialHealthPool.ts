import { BigNumber } from 'bignumber.js';

import { IconName, Tone } from '@components/ds';
import { DASH, MINUS, PrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { FinancialHealthData } from '@hooks/useFinancialHealth';
import { HealthMetricId } from '@services/core/storageService';

// Discreet versions follow docs/METRICS.md → Financial Health grid.
export const HEALTH_METRIC_META: Record<HealthMetricId, { label: string; icon: IconName }> = {
    runway: { label: 'Runway', icon: 'hourglass-outline' },
    spending: { label: 'Spending pace', icon: 'speedometer-outline' },
    debt: { label: 'Debt drag', icon: 'trending-down-outline' },
    wealth: { label: 'Investment boost', icon: 'rocket-outline' },
    budget: { label: 'Budget health', icon: 'pie-chart-outline' },
    netflow: { label: 'Net cash flow', icon: 'swap-vertical-outline' },
    savings: { label: 'Savings rate', icon: 'cash-outline' },
    income: { label: 'Total income', icon: 'arrow-down-outline' },
    expense: { label: 'Total expense', icon: 'arrow-up-outline' },
    burn: { label: 'Burn rate', icon: 'flame-outline' },
    daily: { label: 'Daily average', icon: 'today-outline' },
    annual: { label: 'Annualized exp.', icon: 'calendar-outline' },
    topcat: { label: 'Top category', icon: 'trophy-outline' },
};

// The four that open the full Financial Health content instead of a value + formula sheet.
export const FINANCIAL_HEALTH_DETAIL_IDS: HealthMetricId[] = ['runway', 'spending', 'debt', 'wealth'];

// Insights' month figures for the browsed month (Burn rate and its average income are as of today).
export interface InsightsMonthData {
    // "this month", or "Oct 26" while browsing a past month.
    monthLabel: string;
    netCashFlow: BigNumber;
    income: BigNumber;
    expense: BigNumber;
    goalFundedExpense: BigNumber;
    savingsRate: BigNumber;
    // Up to 6 prior full months, relative to the browsed month.
    averageIncome: BigNumber;
    // Up to 3 prior full months' Total Expense, relative to the browsed month.
    averageExpense: BigNumber;
    dailyAverage: BigNumber;
    burnRate: BigNumber;
    burnAverageIncome: BigNumber;
    hasBudgets: boolean;
    budgetPerformance: BigNumber;
    topExpenseCategory: { name: string; amount: BigNumber; percentage: BigNumber };
}

export interface HealthEntry {
    value: string;
    change: string;
    changeTone: Tone;
}

const AVG_DAYS_PER_MONTH = 30.44;

export const formatMonths = (months: number, unit = 'mo'): string => {
    if (!Number.isFinite(months)) return '∞';
    const rounded = Number(months.toFixed(1));
    return `${rounded < 0 ? MINUS : ''}${Math.abs(rounded).toFixed(1)} ${unit}`;
};

// Months lost, shown with a minus unless it rounds to zero.
export const formatMonthsLost = (months: number, unit = 'mo'): string =>
    Number(months.toFixed(1)) > 0 ? `${MINUS}${formatMonths(months, unit)}` : formatMonths(0, unit);

export const formatSignedMonths = (months: number, unit = 'mo'): string => {
    const rounded = Number(months.toFixed(1));
    const sign = rounded < 0 ? MINUS : rounded > 0 ? '+' : '';
    return `${sign}${Math.abs(rounded).toFixed(1)} ${unit}`;
};

const ratio = (part: BigNumber, whole: BigNumber): number | null =>
    whole.gt(0) ? part.dividedBy(whole).times(100).toNumber() : null;

// "8% lower" / "8% higher"; good when lower.
export const paceText = (diffPercent: number): { text: string; tone: Tone } => {
    const rounded = Math.round(diffPercent);
    if (rounded === 0) return { text: 'On pace', tone: 'neutral' };
    return rounded < 0
        ? { text: `${Math.abs(rounded)}% lower`, tone: 'good' }
        : { text: `${rounded}% higher`, tone: 'bad' };
};

export const budgetTone = (percent: number): Tone => (percent <= 70 ? 'good' : percent <= 90 ? 'warning' : 'bad');

const PENDING: HealthEntry = { value: DASH, change: 'Loading', changeTone: 'neutral' };

// Value + change line for every pool number, already privacy-formatted.
export const buildHealthEntries = (
    m: InsightsMonthData,
    h: FinancialHealthData | null,
    f: PrivacyFormat,
): Record<HealthMetricId, HealthEntry> => {
    const hasIncome = m.income.gt(0);
    const top = m.topExpenseCategory;
    const hasTopCategory = top.amount.gt(0);
    const burnShare = formatPercent(ratio(m.burnRate, m.burnAverageIncome));
    const dailyBaseline = m.averageExpense.dividedBy(AVG_DAYS_PER_MONTH);
    const dailyPace = dailyBaseline.gt(0) ? paceText(m.dailyAverage.minus(dailyBaseline).dividedBy(dailyBaseline).times(100).toNumber()) : null;

    const runway = (): HealthEntry => {
        if (!h) return PENDING;
        const { months, change, hasPrevMonth } = h.runway;
        if (!hasPrevMonth) return { value: formatMonths(months), change: 'first month tracked', changeTone: 'neutral' };
        return {
            value: formatMonths(months),
            change: Number(change.toFixed(1)) === 0 ? 'same as last month' : `${formatSignedMonths(change)} vs last month`,
            changeTone: change > 0 ? 'good' : change < 0 ? 'bad' : 'neutral',
        };
    };

    const spending = (): HealthEntry => {
        if (!h) return PENDING;
        if (!h.spending.hasBaseline) return { value: DASH, change: 'not enough history', changeTone: 'neutral' };
        const pace = paceText(h.spending.paceDiffPercent);
        return { value: pace.text, change: 'vs 3-mo avg', changeTone: pace.tone };
    };

    const debt = (): HealthEntry => {
        if (!h) return PENDING;
        if (h.debt.isDebtFree) return { value: '0 mo', change: 'no debt', changeTone: 'good' };
        return { value: formatMonthsLost(h.debt.dragMonths), change: 'runway lost', changeTone: 'neutral' };
    };

    const wealth = (): HealthEntry => {
        if (!h) return PENDING;
        // A large figure implies investments far exceed spending, so Discreet drops it.
        if (f.isDiscreet) return { value: DASH, change: 'if sold', changeTone: 'neutral' };
        if (!h.wealth.hasInvestments) return { value: '0 mo', change: 'no investments', changeTone: 'neutral' };
        return { value: formatSignedMonths(h.wealth.boostMonths), change: 'if sold', changeTone: 'neutral' };
    };

    const budgetPercent = m.budgetPerformance.toNumber();

    return {
        runway: runway(),
        spending: spending(),
        debt: debt(),
        wealth: wealth(),
        budget: m.hasBudgets
            ? {
                value: `${budgetPercent.toFixed(0)}%`,
                change: budgetPercent <= 100 ? 'under budget' : 'over budget',
                changeTone: budgetTone(budgetPercent),
            }
            : { value: DASH, change: 'no budgets set', changeTone: 'neutral' },
        netflow: {
            value: f.show(f.money(m.netCashFlow, { signed: true }), hasIncome ? `${formatPercent(ratio(m.netCashFlow, m.income))} kept` : DASH),
            change: m.monthLabel,
            changeTone: 'neutral',
        },
        savings: hasIncome
            ? {
                value: `${m.savingsRate.toFixed(1)}%`,
                change: m.savingsRate.gte(20) ? 'healthy' : 'below goal',
                changeTone: m.savingsRate.gte(20) ? 'good' : 'warning',
            }
            : { value: DASH, change: 'no income', changeTone: 'neutral' },
        income: {
            value: f.show(
                f.money(m.income),
                formatPercent(m.averageIncome.gt(0) ? m.income.minus(m.averageIncome).dividedBy(m.averageIncome).times(100).toNumber() : null, { signed: true }),
            ),
            change: f.show(m.monthLabel, 'vs 6-mo avg'),
            changeTone: 'neutral',
        },
        expense: {
            value: f.show(f.money(m.expense), formatPercent(ratio(m.expense, m.income))),
            change: f.show(
                m.goalFundedExpense.gt(0) ? `+ ${f.money(m.goalFundedExpense, { compact: true })} from goals` : m.monthLabel,
                'of income',
            ),
            changeTone: 'neutral',
        },
        burn: {
            value: f.show(f.money(m.burnRate), burnShare),
            change: f.show('avg monthly', 'of avg income'),
            changeTone: 'neutral',
        },
        daily: {
            value: f.show(f.money(m.dailyAverage), dailyPace ? dailyPace.text : DASH),
            change: f.show(m.monthLabel, 'vs 3-mo daily avg'),
            changeTone: f.isDiscreet && dailyPace ? dailyPace.tone : 'neutral',
        },
        annual: {
            value: f.show(f.money(m.burnRate.times(12)), burnShare),
            change: f.show('burn rate × 12', 'of yearly income'),
            changeTone: 'neutral',
        },
        topcat: {
            value: hasTopCategory ? top.name : 'None',
            change: hasTopCategory ? f.show(f.money(top.amount), `${top.percentage.toFixed(0)}% of spending`) : 'no spending',
            changeTone: 'neutral',
        },
    };
};
