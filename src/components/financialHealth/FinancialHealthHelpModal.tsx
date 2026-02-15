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
                            Net Flow is your "Profit" after all expenses. We use your <Text style={{ fontWeight: 'bold' }}>3-month average</Text> to smooth out income timing.
                        </Text>

                        {renderMathBlock(
                            "AVERAGE NET FLOW",
                            "Avg Monthly Income - Avg Monthly Expense",
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
                            "IMPACT ON FREEDOM",
                            "(Annual Savings / Monthly Burn)",
                            `${formatMoney((data.avgNetFlow || new BigNumber(0)).times(12))} / ${formatMoney(data.monthlyBurn)}`,
                            `${(data.freedomImpactMonths || 0) > 0 ? '+' : ''}${(data.freedomImpactMonths || 0).toFixed(1)} Months/Year`,
                            (data.freedomImpactMonths || 0) > 0 ? colors.success : colors.error
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            This represents how much future freedom you are "buying" with your monthly savings. At this rate, you gain {(data.freedomImpactMonths || 0).toFixed(1)} months of absolute freedom every year.
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
                            Debt acts as a "Freedom Thief". This modal calculates exactly how much it's stealing from your future.
                        </Text>

                        {renderMathBlock(
                            "FREEDOM DELAY",
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
                return (
                    <>
                        <Text style={[styles.introText, { color: colors.text }]}>
                            Your investments are "bought" freedom. This shows how much time they've already secured for you.
                        </Text>

                        {renderMathBlock(
                            "FREEDOM ACCELERATION",
                            "Investment Value / Monthly Expenses",
                            `${formatMoney(data.portfolioValue)} / ${formatMoney(data.monthlyBurn)}`,
                            `+${(data.freedomAccelerationMonths || 0).toFixed(1)} Months`,
                            colors.success
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            If you stopped working today, your investments alone would fund {(data.freedomAccelerationMonths || 0).toFixed(1)} months of your lifestyle.
                        </Text>

                        <View style={styles.spacer} />

                        {renderMathBlock(
                            "FREEDOM ARRIVES EARLIER",
                            "Impact of Monthly Investment",
                            `Investing ${formatMoney(new BigNumber(data.scenarioInvestAmount || 0))} / month`,
                            `-${(data.scenarioYearsEarlier || 0).toFixed(1)} Years of Work`,
                            colors.success
                        )}
                        <Text style={[styles.explanation, { color: colors.textSecondary }]}>
                            By committing to this <Text style={{ fontWeight: 'bold' }}>monthly investment</Text>, you literally buy back {(data.scenarioYearsEarlier || 0).toFixed(1)} years of your life from mandatory work.
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
