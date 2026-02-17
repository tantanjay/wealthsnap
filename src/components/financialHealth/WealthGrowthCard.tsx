import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { useTheme } from '@context/ThemeContext';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface WealthGrowthCardProps {
    portfolioValue: BigNumber;
    annualReturnPercent: number;
    freedomAccelerationMonths: number;
    scenarioInvestAmount: number;
    scenarioYearsEarlier: number;
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading: boolean;
    hasInvestments: boolean;
    isDefaultReturnRate?: boolean;
    monthlyBurn: BigNumber;
    currentYearsToFreedom?: number;
    onInfoPress: () => void;
}

const WealthGrowthCard: React.FC<WealthGrowthCardProps> = ({
    portfolioValue,
    annualReturnPercent,
    freedomAccelerationMonths,
    scenarioInvestAmount,
    scenarioYearsEarlier,
    currency,
    isPrivacyEnabled,
    isLoading,
    hasInvestments,
    isDefaultReturnRate,
    monthlyBurn,
    currentYearsToFreedom = 0,
    onInfoPress
}) => {
    const { colors } = useTheme();

    const formatMoney = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, currency);
    };

    const getMonthsGainedPerYear = (annualAmount: BigNumber) => {
        if (monthlyBurn.lte(0)) return 0;
        return annualAmount.dividedBy(monthlyBurn).toNumber();
    };

    if (isLoading) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Skeleton width={120} height={16} style={{ marginBottom: 20 }} />
                <Skeleton width="100%" height={24} style={{ marginBottom: 12 }} />
                <Skeleton width="80%" height={24} />
            </Card>
        );
    }

    if (!hasInvestments) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Text style={[styles.header, { color: colors.textSecondary }]}>WEALTH GROWTH</Text>
                <Text style={{ color: colors.text, fontSize: 16, marginBottom: 20 }}>No active investments.</Text>
                <View style={styles.divider} />
                <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 8 }]}>
                    {scenarioInvestAmount > 0
                        ? `If you invest ${formatMoney(new BigNumber(scenarioInvestAmount))}/month at ${annualReturnPercent.toFixed(1)}%:`
                        : 'Need additional net flow to invest'
                    }
                </Text>
                {isDefaultReturnRate && scenarioInvestAmount > 0 && (
                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 4, fontStyle: 'italic' }}>
                        (No dividend data found. Defaulting to 7%)
                    </Text>
                )}
                {scenarioInvestAmount > 0 && (
                    <Text style={{ color: colors.success, fontSize: 16, fontWeight: 'bold' }}>
                        {currentYearsToFreedom > 100 ? (
                            `Self-sustain becomes possible`
                        ) : (
                            `Self-sustain arrives ${scenarioYearsEarlier < 1
                                ? `${(scenarioYearsEarlier * 12).toFixed(1)} months earlier.`
                                : `${scenarioYearsEarlier.toFixed(1)} years earlier.`
                            }`
                        )}
                    </Text>
                )}
            </Card>
        );
    }

    const currentAnnualDividend = portfolioValue.multipliedBy(annualReturnPercent / 100);
    const monthsGainedCurrent = getMonthsGainedPerYear(currentAnnualDividend);

    const projectedAnnualDividend = new BigNumber(scenarioInvestAmount * 12 * (annualReturnPercent / 100));
    const monthsGainedProjected = getMonthsGainedPerYear(projectedAnnualDividend);

    return (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={[styles.header, { color: colors.textSecondary, marginBottom: 0 }]}>WEALTH GROWTH</Text>
                <TouchableOpacity onPress={onInfoPress}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Portfolio Value:</Text>
                    <Text style={[styles.value, { color: colors.text }]}>
                        {formatMoney(portfolioValue)}
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>12-Month Return:</Text>
                    <Text style={[styles.value, { color: annualReturnPercent >= 0 ? colors.success : colors.error }]}>
                        {annualReturnPercent > 0 ? '+' : ''}{annualReturnPercent.toFixed(1)}%
                    </Text>
                </View>
            </View>

            <View style={styles.spacer} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Annual Dividend Impact:</Text>
                    <Text style={[styles.value, { color: colors.success, fontSize: 16, fontWeight: '500' }]}>
                        +{monthsGainedCurrent.toFixed(1)} months per year
                    </Text>
                    {scenarioInvestAmount > 0 && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                            (+ {monthsGainedProjected.toFixed(1)} months / yr if investing)
                        </Text>
                    )}
                </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
                <View style={styles.column}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>
                        {scenarioInvestAmount > 0
                            ? `If you invest ${formatMoney(new BigNumber(scenarioInvestAmount))}/month:`
                            : 'Need additional net flow to invest'
                        }
                    </Text>
                    {scenarioInvestAmount > 0 && (
                        <Text style={[styles.value, { color: colors.success, fontSize: 16 }]}>
                            {currentYearsToFreedom > 100 ? (
                                `Self-sustain becomes possible`
                            ) : (
                                `Self-sustain arrives ${scenarioYearsEarlier.toFixed(1)} years earlier`
                            )}
                        </Text>
                    )}
                </View>
            </View>
        </Card>
    );
};

const styles = StyleSheet.create({
    card: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 16,
    },
    header: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 20,
        textTransform: 'uppercase',
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    column: {
        flex: 1,
    },
    label: {
        fontSize: 12,
        marginBottom: 4,
    },
    value: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    spacer: {
        height: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        opacity: 0.1,
        marginVertical: 16,
    }
});

export default WealthGrowthCard;
