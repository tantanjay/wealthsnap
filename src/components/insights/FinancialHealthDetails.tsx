import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import { Hero, Tone, toneColor } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { DASH, PrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { DebtScenario, FinancialHealthData } from '@hooks/useFinancialHealth';
import { type, space, radius } from '@styles/theme';
import { calculateLiquidityDate } from '@utils/insightMetrics';
import { formatMonths, formatMonthsLost, formatSignedMonths, paceText } from './financialHealthPool';

// ---------- Shared sheet pieces ----------

export const SheetHero: React.FC<{ label: string; value: string; change?: string; changeTone?: Tone }> = props => (
    <Hero {...props} style={styles.hero} />
);

// Label on the left, value on the right; for the figures inside a detail sheet.
export const StatLine: React.FC<{ label: string; value: string; tone?: Tone; note?: string; last?: boolean }> = ({ label, value, tone, note, last }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.stat, { borderBottomColor: ds.hairline, borderBottomWidth: last ? 0 : 1 }]}>
            <View style={styles.statMain}>
                <Text style={[type.small, { color: ds.text2 }]}>{label}</Text>
                {note ? <Text style={[type.caption, styles.statNote, { color: ds.text2 }]}>{note}</Text> : null}
            </View>
            <Text style={[type.bodyNum, styles.statValue, { color: tone ? toneColor(ds, tone) : ds.text }]}>{value}</Text>
        </View>
    );
};

// Formula block plus its worked numbers (callers pass `worked` only when the mode allows amounts).
export const Formula: React.FC<{ title?: string; formula: string; worked?: string; explanation?: string }> = ({ title, formula, worked, explanation }) => {
    const { ds } = useTheme();
    return (
        <View style={styles.formulaGroup}>
            {title ? <Text style={[type.smallStrong, { color: ds.text }]}>{title}</Text> : null}
            <View style={[styles.formula, { backgroundColor: ds.inset }]}>
                <Text style={[type.small, { color: ds.text }]}>{formula}</Text>
                {worked ? <Text style={[type.smallNum, styles.worked, { color: ds.text2 }]}>{worked}</Text> : null}
            </View>
            {explanation ? <Text style={[type.small, { color: ds.text2 }]}>{explanation}</Text> : null}
        </View>
    );
};

// Collapsible "How is this calculated?"; replaces the old info modals (never a modal over a sheet).
export const HowCalculated: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { ds } = useTheme();
    const [open, setOpen] = useState(false);
    return (
        <View style={styles.how}>
            <Pressable
                onPress={() => setOpen(o => !o)}
                style={styles.howSummary}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                hitSlop={space[2]}
            >
                <Ionicons name="calculator-outline" size={15} color={ds.accent} />
                <Text style={[type.smallMedium, { color: ds.accent }]}>How is this calculated?</Text>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={ds.accent} />
            </Pressable>
            {open ? children : null}
        </View>
    );
};

const DataNote: React.FC = () => (
    <Formula
        title="Note on data"
        formula="Living costs = average of up to 6 full months (daily spending so far × 30.44 before your first full month)"
        explanation="Net flow uses a 3-month average, so projections don't swing on one expensive month."
    />
);

const signedMoneyTone = (amount: BigNumber): Tone => (amount.gt(0) ? 'good' : amount.lt(0) ? 'bad' : 'neutral');

const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

const paceVsAverage = (diffPercent: number): string => {
    const rounded = Math.round(diffPercent);
    return rounded === 0 ? 'On pace' : `${Math.abs(rounded)}% ${rounded < 0 ? 'below' : 'above'} average`;
};

interface DetailProps {
    data: FinancialHealthData;
    format: PrivacyFormat;
}

// ---------- Runway (old FinancialStateCard) ----------

export const RunwayDetail: React.FC<DetailProps> = ({ data, format: f }) => {
    const { ds } = useTheme();
    const { runway, spending, debt, wealth } = data;
    const changeRounded = Number(runway.change.toFixed(1));
    const changeText = runway.hasPrevMonth && changeRounded !== 0
        ? `${changeRounded > 0 ? '▲' : '▼'} ${formatSignedMonths(runway.change, 'months')} since last month`
        : runway.hasPrevMonth ? 'Same as last month' : 'First month tracked';
    const pace = paceText(spending.paceDiffPercent);

    return (
        <>
            <SheetHero
                label="Runway"
                value={formatMonths(runway.months, 'months')}
                change={changeText}
                changeTone={changeRounded > 0 ? 'good' : changeRounded < 0 ? 'bad' : 'neutral'}
            />
            <Text style={[type.small, styles.paragraph, { color: ds.text2 }]}>
                {Number.isFinite(runway.months) ? (
                    <>
                        If income stopped today, your cash would last until{' '}
                        <Text style={{ color: ds.text }}>{calculateLiquidityDate(runway.months)}</Text>.
                    </>
                ) : 'No spending tracked yet, so your cash has no end date.'}
            </Text>

            {!f.isDiscreet && <StatLine label="Cash" value={f.money(runway.cash)} />}
            {!f.isDiscreet && <StatLine label="Monthly costs" value={f.money(runway.monthlyBurn)} />}
            <StatLine
                label="Spending"
                value={spending.hasBaseline ? paceVsAverage(spending.paceDiffPercent) : 'Not enough history'}
                tone={spending.hasBaseline ? pace.tone : undefined}
            />
            <StatLine
                label="Debt drag"
                value={debt.isDebtFree ? 'No debt' : formatMonthsLost(debt.dragMonths, 'months')}
                tone={debt.isDebtFree ? 'good' : debt.dragMonths > 0 ? 'bad' : undefined}
                last={f.isDiscreet}
            />
            {!f.isDiscreet && (
                <StatLine
                    label="Investments boost"
                    value={wealth.hasInvestments ? formatSignedMonths(wealth.boostMonths, 'months') : 'None'}
                    tone={wealth.hasInvestments ? 'good' : undefined}
                    last
                />
            )}

            <HowCalculated>
                <Formula
                    formula="Cash ÷ Monthly costs"
                    worked={f.isOpen ? `${f.money(runway.cash)} ÷ ${f.money(runway.monthlyBurn)} = ${formatMonths(runway.months, 'months')}` : undefined}
                    explanation="Monthly costs = average living costs + debt minimum payments + savings goal contributions. Debt interest is inside the minimums, so it isn't counted twice; debt fees are."
                />
                <Formula
                    formula="Cash = (Income + Transfers in) − (Expenses + Transfers out)"
                    explanation="Your tracked balance, not your bank balance. Record your starting balance as an opening transaction for an accurate runway."
                />
                <Formula
                    title="Debt drag"
                    formula="Runway without debt minimums − Runway with them"
                    worked={`${formatMonths(runway.monthsWithoutDebt)} − ${formatMonths(runway.months)} = ${formatMonthsLost(debt.dragMonths)}`}
                />
                {!f.isDiscreet && (
                    <Formula
                        title="Investment boost"
                        formula="Portfolio value ÷ Monthly costs"
                        worked={f.isOpen ? `${f.money(wealth.portfolioValue)} ÷ ${f.money(runway.monthlyBurn)} = ${formatSignedMonths(wealth.boostMonths, 'months')}` : undefined}
                        explanation="Extra runway if you sold every investment today. Investments aren't counted as cash."
                    />
                )}
                <DataNote />
            </HowCalculated>
        </>
    );
};

// ---------- Spending pace (old SpendingCashFlowCard) ----------

export const SpendingDetail: React.FC<DetailProps> = ({ data, format: f }) => {
    const { spending, runway } = data;
    const pace = paceText(spending.paceDiffPercent);
    const kept = spending.monthIncome.gt(0)
        ? `${formatPercent(spending.netFlow.dividedBy(spending.monthIncome).times(100).toNumber())} of income kept`
        : DASH;
    const impactTone: Tone = spending.freedomImpactMonths > 0 ? 'good' : spending.freedomImpactMonths < 0 ? 'bad' : 'neutral';
    const trend = Math.round(spending.paceDiffPercent);

    return (
        <>
            <SheetHero
                label="Spending pace"
                value={spending.hasBaseline ? pace.text : DASH}
                change={spending.hasBaseline ? 'than your 3-month average at this point of the month' : 'Not enough history for a 3-month average yet'}
                changeTone={spending.hasBaseline ? pace.tone : 'neutral'}
            />
            <StatLine
                label="Net flow this month"
                value={f.show(f.money(spending.netFlow, { signed: true }), kept)}
                tone={f.isHidden ? undefined : signedMoneyTone(spending.netFlow)}
            />
            <StatLine
                label="Spending trend"
                value={spending.hasBaseline ? `${Math.abs(trend)}% ${trend > 0 ? 'above' : 'below'} baseline` : DASH}
                tone={spending.hasBaseline ? pace.tone : undefined}
            />
            <StatLine
                label="Impact on self-sustain"
                value={`${formatSignedMonths(spending.freedomImpactMonths, 'months')} per year`}
                tone={impactTone}
                last
            />

            <HowCalculated>
                <Formula
                    formula="(Spent this month so far − 3-month average by the same day) ÷ 3-month average"
                    explanation="Goal-funded purchases don't count as spending."
                />
                <Formula
                    title="Net flow"
                    formula="(Income + Transfers in) − (Expenses + Transfers out)"
                    worked={f.isOpen ? `3-month average: ${f.money(spending.averageNetFlow, { signed: true })}` : undefined}
                    explanation="Transfers count, so money you invest isn't counted twice."
                />
                <Formula
                    title="Impact on self-sustain"
                    formula="Average net flow × 12 ÷ Monthly costs"
                    worked={f.isOpen ? `${f.money(spending.averageNetFlow.times(12), { signed: true })} ÷ ${f.money(runway.monthlyBurn)} = ${formatSignedMonths(spending.freedomImpactMonths, 'months')}` : undefined}
                    explanation="How many months of self-sustain your net flow buys you each year."
                />
                <DataNote />
            </HowCalculated>
        </>
    );
};

// ---------- Debt drag (old DebtPressureCard) ----------

const Stepper: React.FC<{ value: string; onStep: (delta: 1 | -1) => void; canDecrease: boolean }> = ({ value, onStep, canDecrease }) => {
    const { ds } = useTheme();
    const button = (delta: 1 | -1) => (
        <Pressable
            onPress={() => onStep(delta)}
            disabled={delta === -1 && !canDecrease}
            accessibilityLabel={delta === 1 ? 'More' : 'Less'}
            style={[styles.stepButton, { backgroundColor: ds.raised, borderColor: ds.hairline, opacity: delta === -1 && !canDecrease ? 0.4 : 1 }]}
        >
            <Ionicons name={delta === 1 ? 'add' : 'remove'} size={18} color={ds.text} />
        </Pressable>
    );
    return (
        <View style={[styles.stepper, { backgroundColor: ds.inset }]}>
            {button(-1)}
            <Text style={[type.bodyNum, { color: ds.text }]}>{value}</Text>
            {button(1)}
        </View>
    );
};

export const DebtDetail: React.FC<DetailProps & { scenario: DebtScenario }> = ({ data, format: f, scenario }) => {
    const { ds } = useTheme();
    const { debt, runway, spending } = data;

    if (debt.isDebtFree) {
        return (
            <>
                <SheetHero label="Debt drag" value="0 months" change="No active debt, so no interest drag." changeTone="good" />
                <Text style={[type.small, styles.paragraph, { color: ds.success }]}>Self-sustain fully compounding.</Text>
                <HowCalculated>
                    <Formula
                        formula="Runway without debt minimums − Runway with them"
                        explanation="Only debts you owe count. Money owed to you isn't a liability."
                    />
                </HowCalculated>
            </>
        );
    }

    const interestShare = debt.monthlyPayments.gt(0) ? debt.interestCost.dividedBy(debt.monthlyPayments).times(100).toNumber() : null;
    const isForever = spending.investableSurplus.lte(0) || debt.freedomDelayYears > 50;
    const stepperValue = f.isDiscreet ? pluralize(scenario.steps, 'step') : f.money(scenario.amount);
    const annualSavings = spending.investableSurplus.gt(0) ? spending.investableSurplus.times(12) : new BigNumber(0);
    const monthlyRate = debt.totalLiability.gt(0) ? debt.interestCost.dividedBy(debt.totalLiability).times(100).toNumber() : 0;

    return (
        <>
            <SheetHero
                label="Debt drag"
                value={formatMonthsLost(debt.dragMonths, 'months')}
                change="of runway your minimum payments cost you"
                changeTone="bad"
            />
            <StatLine
                label="Mandatory payments"
                value={f.show(`${f.money(debt.monthlyPayments)}/mo`, pluralize(debt.count, 'loan'))}
            />
            <StatLine
                label="Interest cost"
                value={f.show(`${f.money(debt.interestCost)}/mo`, `${formatPercent(interestShare)} of payments`)}
                tone="bad"
                note={interestShare !== null && interestShare > 50 ? 'Early loan payments are mostly interest.' : undefined}
            />
            <StatLine
                label="Self-sustain impact"
                value={debt.freedomDelayYears > 50 ? 'Delayed indefinitely' : `Delayed ${debt.freedomDelayYears.toFixed(1)} years`}
                tone="bad"
                note="This shrinks as you pay down principal."
                last
            />

            <Text style={[type.smallStrong, styles.stepperLabel, { color: ds.text }]}>If you add extra per month</Text>
            <Stepper value={stepperValue} onStep={scenario.step} canDecrease={scenario.amount > 0} />
            <Text style={[type.smallStrong, styles.stepperResult, { color: scenario.monthsSaved > 0 ? ds.success : ds.text2 }]}>
                {scenario.monthsSaved > 0 ? `Debt-free ${pluralize(scenario.monthsSaved, 'month')} sooner` : 'Add an amount to see the impact'}
            </Text>

            <HowCalculated>
                <Formula
                    formula="Runway without debt minimums − Runway with them"
                    worked={`${formatMonths(runway.monthsWithoutDebt)} − ${formatMonths(runway.months)} = ${formatMonthsLost(debt.dragMonths)}`}
                    explanation="Only debts you owe count. Money owed to you isn't a liability."
                />
                <Formula
                    title="Self-sustain impact"
                    formula="Total debt ÷ Annual savings"
                    worked={f.isOpen ? `${f.money(debt.totalLiability)} ÷ ${f.money(annualSavings)} = ${isForever ? 'Forever' : `${debt.freedomDelayYears.toFixed(1)} years`}` : undefined}
                    explanation={isForever
                        ? 'Your savings are too low (or negative) to pay this debt off at the current rate.'
                        : `Annual savings = (6-month average income − Monthly costs) × 12. You'd be free ${debt.freedomDelayYears.toFixed(1)} years earlier without this debt.`}
                />
                <Formula
                    title="Interest cost"
                    formula="Σ Balance × Monthly rate (Flat: original amount × monthly rate)"
                    worked={f.isOpen ? `${f.money(debt.totalLiability)} × ~${monthlyRate.toFixed(2)}% = ${f.money(debt.interestCost)}` : undefined}
                    explanation="Money paid to the lender that doesn't lower your balance."
                />
                <Formula
                    title="If you add extra per month"
                    formula="Payoff date with your minimums − Payoff date with the extra"
                    explanation="Runs your payoff plan (Snowball or Avalanche, as chosen on Loans) with and without the extra amount."
                />
            </HowCalculated>
        </>
    );
};

// ---------- Investment boost (old WealthGrowthCard) ----------

export const WealthDetail: React.FC<DetailProps> = ({ data, format: f }) => {
    const { ds } = useTheme();
    const { wealth, runway } = data;
    const rate = `${wealth.annualReturnPercent.toFixed(1)}%`;
    const rateLabel = wealth.isDefaultReturnRate ? 'Assumed return' : 'Dividend yield';
    const burn = runway.monthlyBurn;
    const monthsPerYear = (annual: BigNumber) => (burn.gt(0) ? annual.dividedBy(burn).toNumber() : 0);
    const dividendMonths = monthsPerYear(wealth.portfolioValue.times(wealth.annualReturnPercent / 100));
    const projectedMonths = monthsPerYear(new BigNumber(wealth.scenarioInvestAmount * 12 * (wealth.annualReturnPercent / 100)));
    const yearsEarlier = wealth.scenarioYearsEarlier < 1
        ? `${(wealth.scenarioYearsEarlier * 12).toFixed(1)} months`
        : `${wealth.scenarioYearsEarlier.toFixed(1)} years`;
    const freedomResult = wealth.currentYearsToFreedom > 100 ? 'Self-sustain becomes possible' : `Self-sustain arrives ${yearsEarlier} earlier`;

    let scenarioTitle: string;
    let scenarioResult: string | null = freedomResult;
    if (!wealth.hasInvestments) {
        scenarioTitle = wealth.scenarioInvestAmount > 0
            ? `If you invest ${f.isOpen ? `${f.money(wealth.scenarioInvestAmount)}/mo` : 'your monthly surplus'} at ${rate}`
            : 'Need additional net flow to invest';
        if (wealth.scenarioInvestAmount <= 0) scenarioResult = null;
    } else if (wealth.extraMonthlyInvest > 0) {
        const remaining = wealth.currentMonthlyInvest > 0 ? 'remaining ' : '';
        scenarioTitle = f.isOpen
            ? `If you invest your ${remaining}${f.money(wealth.extraMonthlyInvest)}/mo surplus at ${rate}`
            : `If you invest your ${remaining}monthly surplus at ${rate}`;
    } else {
        scenarioTitle = wealth.currentMonthlyInvest > 0 ? 'You are investing your full surplus!' : 'Need additional net flow to invest';
        scenarioResult = null;
    }

    const hero = f.isDiscreet
        ? <SheetHero label="Investment boost" value={formatPercent(wealth.annualReturnPercent, { signed: true, decimals: 1 })} change={`${rateLabel} on your portfolio`} changeTone="good" />
        : wealth.hasInvestments
            ? <SheetHero label="Investment boost" value={formatSignedMonths(wealth.boostMonths, 'months')} change="of runway your investments would add if sold" changeTone="good" />
            : <SheetHero label="Investment boost" value="0 months" change="No active investments" />;

    return (
        <>
            {hero}
            {wealth.hasInvestments && !f.isDiscreet && <StatLine label="Portfolio value" value={f.money(wealth.portfolioValue)} />}
            {wealth.hasInvestments && (
                <StatLine
                    label={rateLabel}
                    value={formatPercent(wealth.annualReturnPercent, { signed: true, decimals: 1 })}
                    tone={wealth.annualReturnPercent >= 0 ? 'good' : 'bad'}
                    last={f.isDiscreet}
                />
            )}
            {wealth.hasInvestments && !f.isDiscreet && (
                <StatLine
                    label="Annual dividend impact"
                    value={`${formatSignedMonths(dividendMonths, 'months')} / year`}
                    tone="good"
                    note={wealth.scenarioInvestAmount > 0 ? `${formatSignedMonths(projectedMonths, 'months')} / year more if investing` : undefined}
                    last
                />
            )}

            <View style={[styles.scenario, { backgroundColor: ds.inset }]}>
                <Text style={[type.small, { color: scenarioResult ? ds.text2 : ds.success }]}>{scenarioTitle}</Text>
                {scenarioResult ? <Text style={[type.body, styles.scenarioResult, { color: ds.success }]}>{scenarioResult}</Text> : null}
                {wealth.isDefaultReturnRate && scenarioResult ? (
                    <Text style={[type.caption, styles.scenarioResult, { color: ds.text2 }]}>No dividend data found, so this assumes {rate} a year.</Text>
                ) : null}
            </View>

            <HowCalculated>
                {!f.isDiscreet && (
                    <Formula
                        formula="Portfolio value ÷ Monthly costs"
                        worked={f.isOpen ? `${f.money(wealth.portfolioValue)} ÷ ${f.money(burn)} = ${formatSignedMonths(wealth.boostMonths, 'months')}` : undefined}
                        explanation="Extra runway if you sold everything at today's prices."
                    />
                )}
                {!f.isDiscreet && (
                    <Formula
                        title="Annual dividend impact"
                        formula="(Portfolio value × Yield) ÷ Monthly costs"
                        worked={f.isOpen ? `${f.money(wealth.portfolioValue)} × ${rate} ÷ ${f.money(burn)} = ${formatSignedMonths(dividendMonths, 'months')} / year` : undefined}
                        explanation="Months of living costs your portfolio pays for each year."
                    />
                )}
                <Formula
                    title="Self-sustain"
                    formula="Years until investments reach 25× yearly costs, investing today's amount vs your full surplus"
                    worked={`${wealth.currentYearsToFreedom > 100 ? 'Not on track' : `${wealth.currentYearsToFreedom.toFixed(1)} years`} now · ${wealth.acceleratedYearsToFreedom.toFixed(1)} years with the surplus`}
                    explanation={`Uses your dividend yield as the expected return, or ${rate} when there's no dividend data. Debt minimums are left out of the long-term costs.`}
                />
            </HowCalculated>
        </>
    );
};

const styles = StyleSheet.create({
    hero: {
        marginBottom: space[3],
    },
    paragraph: {
        marginBottom: space[2],
    },
    stat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingVertical: space[3],
    },
    statMain: {
        flex: 1,
        minWidth: 0,
    },
    statNote: {
        marginTop: 2,
    },
    statValue: {
        flexShrink: 1,
        textAlign: 'right',
    },
    formulaGroup: {
        marginTop: space[3],
    },
    formula: {
        borderRadius: radius.sm,
        padding: space[3],
        marginTop: space[2],
        marginBottom: space[2],
    },
    worked: {
        marginTop: space[1],
    },
    how: {
        marginTop: space[4],
    },
    howSummary: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    stepperLabel: {
        marginTop: space[4],
    },
    stepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: radius.md,
        padding: 6,
        marginTop: space[2],
    },
    stepButton: {
        width: 36,
        height: 36,
        borderRadius: radius.full,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    stepperResult: {
        textAlign: 'center',
        marginTop: space[2],
    },
    scenario: {
        borderRadius: radius.md,
        padding: space[4],
        marginTop: space[3],
    },
    scenarioResult: {
        marginTop: space[1],
    },
});
