import React, { useMemo } from 'react';
import BigNumber from 'bignumber.js';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getCategoryTrend } from '@utils/financialMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface CategoryTrendModalProps {
    visible: boolean;
    onClose: () => void;
    category: string;
    transactions: Transaction[];
    currency: string;
    grouping?: 'CATEGORY' | 'SUB_CATEGORY';
}

const CategoryTrendModal: React.FC<CategoryTrendModalProps> = ({
    visible,
    onClose,
    category,
    transactions,
    currency,
    grouping = 'CATEGORY'
}) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    const trendData = useMemo(() => {
        return getCategoryTrend(transactions, category, 6, grouping);
    }, [transactions, category, grouping]);

    const chartData = {
        labels: trendData.labels.length > 0 ? trendData.labels : ["No Data"],
        datasets: [{
            // 1. Map BigNumbers to primitive numbers for the UI
            // 2. Use a fallback array of [0] if data is empty
            data: trendData.data.length > 0
                ? trendData.data.map(val => val.toNumber())
                : [0],
            color: (opacity = 1) => colors.primary,
            strokeWidth: 3
        }]
    };

    const chartConfig = {
        backgroundColor: colors.surface,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => colors.primary,
        labelColor: (opacity = 1) => colors.text,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '5',
            strokeWidth: '2',
            stroke: colors.primary
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: colors.border,
            strokeWidth: 1
        }
    };

    // Calculate stats

    // 1. Sum using .plus() and a BigNumber starting value
    const total = trendData.data.reduce(
        (sum: BigNumber, val: BigNumber) => sum.plus(val),
        new BigNumber(0)
    );

    // 2. Average using .dividedBy() with a zero-safety check
    const average = trendData.data.length > 0
        ? total.dividedBy(trendData.data.length)
        : new BigNumber(0);

    // 3. Max using the static BigNumber.max method
    // We use a fallback of 0 to handle empty arrays safely
    const max = trendData.data.length > 0
        ? BigNumber.max(...trendData.data)
        : new BigNumber(0);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={`${category} Trend`}
            subtitle="Last 6 months"
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                {/* Chart */}
                {trendData.data.length > 0 && (
                    <LineChart
                        data={chartData}
                        width={screenWidth - 40}
                        height={220}
                        chartConfig={chartConfig}
                        bezier
                        style={{
                            marginVertical: 8,
                            borderRadius: 16,
                        }}
                        formatYLabel={(value) => {
                            const num = parseFloat(value);
                            if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                            return num.toFixed(0);
                        }}
                    />
                )}

                {/* Stats */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    marginTop: 20,
                    padding: 15,
                    backgroundColor: colors.surface,
                    borderRadius: 12
                }}>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Total</Text>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
                            {formatCurrencyAmount(total, currency)}
                        </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Average</Text>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold' }}>
                            {formatCurrencyAmount(average, currency)}
                        </Text>
                    </View>
                    <View style={{ width: 1, backgroundColor: colors.border }} />
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Highest</Text>
                        <Text style={{ color: '#F44336', fontSize: 16, fontWeight: 'bold' }}>
                            {formatCurrencyAmount(max, currency)}
                        </Text>
                    </View>
                </View>

                {/* Insight */}
                {trendData.data.length > 1 && (
                    <View style={{
                        marginTop: 15,
                        padding: 12,
                        backgroundColor: colors.primary + '10',
                        borderRadius: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.text, fontSize: 12, flex: 1 }}>
                            {trendData.data[trendData.data.length - 1].isGreaterThan(average)
                                ? `Your ${category} spending this month is above average.`
                                : `Your ${category} spending this month is below average. Great job! 🎉`
                            }
                        </Text>
                    </View>
                )}
            </ScrollView>
        </BottomModal>
    );
};

export default CategoryTrendModal;
