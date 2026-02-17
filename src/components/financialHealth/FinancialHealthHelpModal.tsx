import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import BottomModal from '@components/common/BottomModal';
import { formatCurrencyAmount } from '@utils/currencyUtils';

export type HelpModalType = 'RUNWAY' | 'CASH_FLOW' | 'DEBT' | 'WEALTH' | null;

interface FinancialHealthHelpModalProps {
    visible: boolean;
    onClose: () => void;
    type: HelpModalType;
    data: {
        currency: string;
        // Runway Data
        runwayMonths?: number;
        verticalTrend?: number;
        totalCash?: BigNumber;
        monthlyBurn?: BigNumber;
        debtDragMonths?: number;
        investmentBoostMonths?: number;
        monthlyDebtObligations?: BigNumber;

        // Cash Flow Data
        netFlow?: BigNumber; // Current month
        avgNetFlow?: BigNumber; // 3-month average
        spendingTrendPercent?: number;
        spendingTrendDirection?: 'up' | 'down' | 'flat';
        freedomImpactMonths?: number;

        // Debt Data
        totalDebt?: BigNumber;
        monthlyPayments?: BigNumber;
        interestCost?: BigNumber;
        freedomDelayYears?: number;

        // Wealth Data
        portfolioValue?: BigNumber;
        annualReturn?: number;
        freedomAccelerationMonths?: number;
        scenarioInvestAmount?: number;
        scenarioYearsEarlier?: number;
        currentYearsToFreedom?: number;
        acceleratedYearsToFreedom?: number;
        currentMonthlyInvest?: number;
    };
}

const FinancialHealthHelpModal: React.FC<FinancialHealthHelpModalProps> = ({
    visible,
    onClose,
    type,
    data
}) => {
    const { colors } = useTheme();

    const formatMoney = (amount?: BigNumber) => {
        return formatCurrencyAmount(amount || new BigNumber(0), data.currency);
    };

    const renderMathBlock = (title: string, formula: string, calculation: string, result: string, resultColor?: string) => (
        <View style={[styles.mathBlock, { backgroundColor: colors.surface }]}>
            <Text style={[styles.mathLabel, { color: colors.textSecondary }]}>{title}</Text>
            <Text style={[styles.formula, { color: colors.text }]}>{formula}</Text>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.calculation, { color: colors.textSecondary }]}>{calculation}</Text>
            <Text style={[styles.result, { color: resultColor || colors.primary }]}>= {result}</Text>
        </View>
    );

    const renderContent = () => {
        switch (type) {
            case 'RUNWAY':
                // Derived values for Debt Drag explanation
                const burnWithoutDebt = (data.monthlyBurn || new BigNumber(0)).minus(data.monthlyDebtObligations || 0);
                const runwayWithoutDebt = burnWithoutDebt.gt(0)
                    ? (data.totalCash || new BigNumber(0)).dividedBy(burnWithoutDebt).toNumber()
                    : 0;

                return (
                    <>
                        <Text style={[styles.introText, { color: colors.text }]}>
                            Financial Runway is the number of months you can survive without any income. This modal breaks down the factors affecting it.
                        </Text>

                        {renderMathBlock(
                            "RUNWAY CALCULATION",
                            "Total Cash / Monthly Burn Rate",
                            `${formatMoney(data.totalCash)} / ${formatMoney(data.monthlyBurn)}`,
                            `${(data.runwayMonths || 0).toFixed(1)} Months`,
                            (data.runwayMonths || 0) < 3 ? colors.error : colors.success
                        )}

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "DEBT DRAG (Loss)",
                            "Runway Without Debt - Current Runway",
                            `${runwayWithoutDebt.toFixed(1)} mo - ${(data.runwayMonths || 0).toFixed(1)} mo`,
                            `-${(data.debtDragMonths || 0).toFixed(1)} Months`,
                            colors.error
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            This confirms that your debt payments are costing you <Text style={{ fontWeight: 'bold' }}>{(data.debtDragMonths || 0).toFixed(1)} months</Text> of security.
                        </Text>

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "INVESTMENT BOOST (Gain)",
                            "Investments / Monthly Burn",
                            `${formatMoney(data.portfolioValue)} / ${formatMoney(data.monthlyBurn)}`,
                            `+${(data.investmentBoostMonths || 0).toFixed(1)} Months`,
                            colors.success
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            If you sold all your investments today, you would gain this much extra runway.
                        </Text>
                    </>
                );

            case 'CASH_FLOW':
                const isPositive = (data.avgNetFlow?.toNumber() || 0) > 0;
                const spendDiff = data.spendingTrendPercent || 0;
                const dir = data.spendingTrendDirection;
                const spendText = dir === 'up' ? `Higher` : dir === 'down' ? `Lower` : `Flat`;
                const spendColor = dir === 'up' ? colors.error : colors.success;

                return (
                    <>
                        <Text style={[styles.introText, { color: colors.text }]}>
                            Net Flow is your &quot;Profit&quot; after all expenses. We use your <Text style={{ fontWeight: 'bold' }}>3-month average</Text> to smooth out income timing.
                        </Text>

                        {renderMathBlock(
                            "AVERAGE NET FLOW",
                            "(Income + Transfers In) - (Expense + Transfers Out)",
                            `${formatMoney(data.avgNetFlow)} (3-month avg)`,
                            formatMoney(data.avgNetFlow),
                            isPositive ? colors.success : colors.error
                        )}

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "SPENDING TREND",
                            "(Current Pacing - Average Pacing) / Average",
                            `${spendText} spending vs 90-day baseline`,
                            `${spendDiff.toFixed(0)}% ${spendText}`,
                            spendColor
                        )}

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "IMPACT ON SELF-SUSTAIN",
                            "(Annual Net Flow / Monthly Burn)",
                            `${formatMoney((data.avgNetFlow || new BigNumber(0)).times(12))} / ${formatMoney(data.monthlyBurn)}`,
                            `${(data.freedomImpactMonths || 0) > 0 ? '+' : ''}${(data.freedomImpactMonths || 0).toFixed(1)} Months/Year`,
                            (data.freedomImpactMonths || 0) > 0 ? colors.success : colors.error
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            This represents how much future self-sustain you are &quot;buying&quot; with your monthly net flow. At this rate, you gain {(data.freedomImpactMonths || 0).toFixed(1)} months of absolute self-sustain every year.
                        </Text>
                    </>
                );

            case 'DEBT':
                const annualSavings = (data.avgNetFlow?.toNumber() || 0) * 12;
                const yearsToPayoff = annualSavings > 0
                    ? (data.totalDebt?.toNumber() || 0) / annualSavings
                    : 999;
                const isForever = yearsToPayoff > 50;

                return (
                    <>
                        <Text style={[styles.introText, { color: colors.text }]}>
                            Debt acts as a &quot;Self-Sustain Thief&quot;. This modal calculates exactly how much it&apos;s stealing from your future.
                        </Text>

                        {renderMathBlock(
                            "SELF-SUSTAIN DELAY",
                            "Total Debt / Annual Savings",
                            `${formatMoney(data.totalDebt)} / ${formatMoney(new BigNumber(annualSavings))}`,
                            isForever ? "Forecast: Forever" : `${yearsToPayoff.toFixed(1)} Years`,
                            colors.error
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            {isForever
                                ? "Since your savings are low (or negative), you will never pay off this debt at the current rate."
                                : "You would be Free " + yearsToPayoff.toFixed(1) + " years earlier if this debt were gone."
                            }
                        </Text>

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "INTEREST COST (DEAD MONEY)",
                            "Total Principal * Monthly Rate",
                            `Approximate monthly interest paid`,
                            formatMoney(data.interestCost),
                            colors.error
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            This represents money lost forever to the bank. It does not reduce your debt balance.
                        </Text>
                    </>
                );

            case 'WEALTH':
                const annualDividendImpact = (data.portfolioValue?.toNumber() || 0) * ((data.annualReturn || 0) / 100);
                const monthlyBurnVal = data.monthlyBurn?.toNumber() || 1; // Avoid div by 0
                const monthsGained = annualDividendImpact / monthlyBurnVal;

                const potentialInvest = (data.scenarioInvestAmount || 0) * 12;
                const potentialImpact = (potentialInvest * ((data.annualReturn || 0) / 100)) / monthlyBurnVal;

                return (
                    <>
                        <Text style={[styles.introText, { color: colors.text }]}>
                            Your investments are buying you time. This shows how much freedom you earn each year from your portfolio and potential contributions.
                        </Text>

                        {renderMathBlock(
                            "ANNUAL DIVIDEND IMPACT",
                            "(Portfolio * Yield) / Monthly Burn",
                            `${formatMoney(data.portfolioValue)} * ${(data.annualReturn || 0).toFixed(1)}% / ${formatMoney(data.monthlyBurn)}`,
                            `+${monthsGained.toFixed(1)} Months / Yr`,
                            colors.success
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            At your current yield, your portfolio passively generates enough to cover <Text style={{ fontWeight: 'bold' }}>{monthsGained.toFixed(1)} months</Text> of living expenses every single year.
                        </Text>

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "ACCELERATION FROM INVESTING",
                            "(Monthly Investment * 12 * Yield) / Burn",
                            `(${formatMoney(new BigNumber(data.scenarioInvestAmount || 0))} * 12 * ${(data.annualReturn || 0).toFixed(1)}%) / ${formatMoney(data.monthlyBurn)}`,
                            `+${potentialImpact.toFixed(1)} Months / Yr`,
                            colors.success
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            If you invest this amount, the compound growth alone will add another <Text style={{ fontWeight: 'bold' }}>{potentialImpact.toFixed(1)} months</Text> of runway every year.
                        </Text>

                        <View style={styles.spacer} />

                        <View style={styles.spacer} />

                        <View style={[styles.mathBlock, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.mathLabel, { color: colors.textSecondary }]}>TIME SAVED CALCULATION</Text>
                            <Text style={{ color: colors.text, marginBottom: 12 }}>
                                How long to reach Financial Freedom (25x annual spend)?
                            </Text>

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Current Path</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                                            {(data.currentMonthlyInvest || 0) > 0
                                                ? `${formatMoney(new BigNumber(data.currentMonthlyInvest || 0))}/mo`
                                                : "Insufficient Data"
                                            }
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginTop: 2 }}>
                                        {(data.currentYearsToFreedom || 0) > 100
                                            ? "Forever"
                                            : `${(data.currentYearsToFreedom || 0).toFixed(1)} Years`
                                        }
                                    </Text>
                                </View>
                                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Accelerated</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                        <Text style={{ fontSize: 14, color: colors.text, fontWeight: '500' }}>
                                            {formatMoney(new BigNumber(data.scenarioInvestAmount || 0))}/mo
                                        </Text>
                                    </View>
                                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.success, marginTop: 2 }}>
                                        {(data.acceleratedYearsToFreedom || 0).toFixed(1)} Years
                                    </Text>
                                </View>
                            </View>

                            <View style={[styles.divider, { backgroundColor: colors.border }]} />

                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ fontSize: 14, color: colors.textSecondary }}>
                                    {(data.currentYearsToFreedom || 0) > 100 ? "" : "Time Bought:"}
                                </Text>
                                <Text style={[styles.result, { marginTop: 0, color: colors.success }]}>
                                    {(data.currentYearsToFreedom || 0) > 100
                                        ? "Self Sufficiency Possible"
                                        : `${(data.scenarioYearsEarlier || 0).toFixed(1)} Years`
                                    }
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            {(data.currentYearsToFreedom || 0) > 100 ? (
                                <>
                                    Currently, you are not on track to reach Financial Freedom.
                                    Investing this amount would make it possible to retire in <Text style={{ fontWeight: 'bold' }}>{(data.acceleratedYearsToFreedom || 0).toFixed(1)} years</Text>.
                                </>
                            ) : (
                                <>
                                    Currently, your Net Flow puts you on track to stop working in <Text style={{ fontWeight: 'bold' }}>{(data.currentYearsToFreedom || 0).toFixed(1)} years</Text>.
                                    Investing the extra amount speeds this up to <Text style={{ fontWeight: 'bold' }}>{(data.acceleratedYearsToFreedom || 0).toFixed(1)} years</Text>.
                                </>
                            )}
                        </Text>
                    </>
                );

            default:
                return null;
        }
    };

    const getTitle = () => {
        switch (type) {
            case 'RUNWAY': return '🏁 Financial State Analysis';
            case 'CASH_FLOW': return '🌊 Cash Flow & Spending';
            case 'DEBT': return '💳 Debt Impact Analysis';
            case 'WEALTH': return '🚀 Wealth Growth Analysis';
            default: return 'Financial Insight';
        }
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={getTitle()}
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ padding: 16, paddingBottom: 40 }}>
                    {renderContent()}

                    <View style={{ marginTop: 24, padding: 12, backgroundColor: colors.background, borderRadius: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                            <Ionicons name="information-circle" size={20} color={colors.textSecondary} />
                            <Text style={{ marginLeft: 8, color: colors.text, fontWeight: 'bold' }}>Note on data</Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>
                            Calculations use your 3-month averages to provide stable, realistic projections rather than fluctuating based on a single expensive month.
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    introText: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 20,
    },
    mathBlock: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    mathLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    formula: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        fontFamily: 'monospace',
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 12,
        opacity: 0.1,
    },
    calculation: {
        fontSize: 14,
        marginBottom: 4,
    },
    result: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'right',
        marginTop: 8,
    },
    explanation: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    spacer: {
        height: 16,
    },
});

export default FinancialHealthHelpModal;
