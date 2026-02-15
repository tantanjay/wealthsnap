import { Ionicons } from '@expo/vector-icons';
import { calculateLiquidityDate } from '@utils/insightMetrics';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card } from '..';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';

interface FinancialStateCardProps {
    runwayMonths: number;
    runwayChange: number;
    spendingDifferencePercent: number;
    debtDragMonths: number;
    investmentBoostMonths: number;
    isLoading: boolean;
    onInfoPress: () => void;
}

const FinancialStateCard: React.FC<FinancialStateCardProps> = ({
    runwayMonths,
    runwayChange,
    spendingDifferencePercent,
    debtDragMonths,
    investmentBoostMonths,
    isLoading,
    onInfoPress
}) => {
    const { colors } = useTheme();

    const liquidityDate = calculateLiquidityDate(runwayMonths);
    const isRunwayUp = runwayChange > 0;

    // Spending Narrative
    const spendingNarrative = spendingDifferencePercent < 0
        ? `Spending ${Math.abs(spendingDifferencePercent).toFixed(0)}% below your 90-day average`
        : `Spending ${Math.abs(spendingDifferencePercent).toFixed(0)}% above your 90-day average`;

    const spendingColor = spendingDifferencePercent <= 0 ? colors.success : colors.warning;

    if (isLoading) {
        return (
            <Card style={[styles.card, { backgroundColor: colors.surface }]}>
                <Skeleton width={120} height={20} style={{ marginBottom: 16 }} />
                <Skeleton width={200} height={40} style={{ marginBottom: 8 }} />
                <Skeleton width={100} height={16} style={{ marginBottom: 24 }} />
                <View style={styles.divider} />
                <Skeleton width="100%" height={16} style={{ marginBottom: 8 }} />
                <Skeleton width="100%" height={16} />
            </Card>
        );
    }

    return (
        <Card style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={[styles.header, { color: colors.textSecondary, marginBottom: 0 }]}>FINANCIAL STATE</Text>
                <TouchableOpacity onPress={onInfoPress}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <View style={styles.heroSection}>
                <View style={styles.statusRow}>
                    <View style={[styles.indicator, { backgroundColor: colors.success }]} />
                    <Text style={[styles.heroTitle, { color: colors.text }]}>
                        You’re stable for
                    </Text>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={[styles.runwayValue, { color: colors.text }]}>
                        {runwayMonths === Infinity ? '∞' : runwayMonths.toFixed(1)} months
                    </Text>

                </View>

                {runwayChange !== 0 && (
                    <View style={styles.trendRow}>
                        <Ionicons name={isRunwayUp ? "caret-up" : "caret-down"} size={12} color={isRunwayUp ? colors.success : colors.error} />
                        <Text style={[styles.trendText, { color: isRunwayUp ? colors.success : colors.error }]}>
                            {isRunwayUp ? '+' : ''}{runwayChange.toFixed(1)} months since last month
                        </Text>
                    </View>
                )}

                <Text style={[styles.liquidityText, { color: colors.textSecondary }]}>
                    If income stopped today,{'\n'}your current liquidity would last until{'\n'}
                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{liquidityDate}.</Text>
                </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={styles.insightSection}>
                <Text style={[styles.insightText, { color: spendingColor }]}>
                    {spendingNarrative}
                </Text>

                {debtDragMonths > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.insightText, { color: colors.error }]}>
                            Debt drag: –{debtDragMonths.toFixed(1)} months
                        </Text>

                    </View>
                )}

                {investmentBoostMonths > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={[styles.insightText, { color: colors.success }]}>
                            Investments boost: +{investmentBoostMonths.toFixed(1)} months
                        </Text>

                    </View>
                )}
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
        marginBottom: 16,
        textTransform: 'uppercase',
    },
    heroSection: {
        marginBottom: 20,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    indicator: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    heroTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    runwayValue: {
        fontSize: 32,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    trendRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    trendText: {
        fontSize: 14,
        marginLeft: 4,
        fontWeight: '500',
    },
    liquidityText: {
        fontSize: 14,
        lineHeight: 20,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 16,
    },
    insightSection: {
        gap: 8,
    },
    insightText: {
        fontSize: 14,
        fontWeight: '500',
    }
});

export default FinancialStateCard;
