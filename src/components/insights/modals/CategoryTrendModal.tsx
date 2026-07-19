import React, { useMemo, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, Dimensions, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getCategoryGroup } from '@constants/categories';
import { getCategoryTrend } from '@utils/financialMetrics';
import { formatCurrencyAmount, formatCompactCurrency } from '@utils/currencyUtils';

interface CategoryTrendModalProps {
    visible: boolean;
    onClose: () => void;
    category: string;
    transactions: Transaction[];
    currency: string;
    grouping?: 'GROUP' | 'ITEM';
}

const CategoryTrendModal: React.FC<CategoryTrendModalProps> = ({
    visible,
    onClose,
    category,
    transactions,
    currency,
    grouping = 'GROUP'
}) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const [timeRange, setTimeRange] = useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');

    // Calculate how many months of data to load based on selection
    const monthsToLoad = useMemo(() => {
        if (timeRange === '6M') return 6;
        if (timeRange === '1Y') return 12;
        if (timeRange === '3Y') return 36;

        // For 'ALL', calculate months since first transaction for this category
        // Filter transactions for this category first to find the first one
        const categoryTransactions = transactions.filter(t => {
            if (t.type !== 'EXPENSE') return false;

            if (grouping === 'GROUP') {
                return getCategoryGroup(t.category, t.type) === category;
            } else {
                return t.category === category;
            }
        });

        if (categoryTransactions.length === 0) return 6;

        const dates = categoryTransactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const today = new Date();
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6);
    }, [timeRange, transactions, category, grouping]);

    const trendData = useMemo(() => {
        return getCategoryTrend(transactions, category, 'EXPENSE', monthsToLoad, grouping);
    }, [transactions, category, grouping, monthsToLoad]);

    // Calculate stats
    const total = trendData.data.reduce(
        (sum: BigNumber, val: BigNumber) => sum.plus(val),
        new BigNumber(0)
    );

    const average = trendData.data.length > 0
        ? total.dividedBy(trendData.data.length)
        : new BigNumber(0);

    const max = trendData.data.length > 0
        ? BigNumber.max(...trendData.data)
        : new BigNumber(0);

    // Pointer Config for Tap & Drag
    const pointerConfig = useMemo(() => ({
        pointerStripHeight: 160,
        pointerStripColor: colors.border,
        pointerStripWidth: 2,
        pointerColor: colors.primary,
        radius: 6,
        pointerLabelWidth: 100,
        pointerLabelHeight: 90,
        activatePointersOnLongPress: true,
        autoAdjustPointerLabelPosition: true,
        pointerComponent: () => {
            return (
                <View style={{
                    height: 10,
                    width: 10,
                    borderRadius: 5,
                    backgroundColor: colors.primary,
                    borderWidth: 2,
                    borderColor: colors.surface
                }} />
            );
        },
        pointerLabelComponent: (items: any) => {
            const item = items[0];
            if (!item) return null;

            return (
                <View style={{
                    height: 90,
                    width: 100,
                    justifyContent: 'center',
                    marginTop: -30,
                    marginLeft: -40,
                }}>
                    <View style={{
                        paddingHorizontal: 10,
                        paddingVertical: 8,
                        borderRadius: 12,
                        backgroundColor: colors.surface,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        borderWidth: 1,
                        borderColor: colors.border + '20'
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2, textAlign: 'center' }}>
                            {item.label}
                        </Text>
                        <Text style={{ color: colors.text, fontSize: 13, fontWeight: 'bold', textAlign: 'center' }}>
                            {formatCurrencyAmount(new BigNumber(item.value), currency)}
                        </Text>
                    </View>
                </View>
            );
        },
    }), [colors, currency]);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={`${category} Trend`}
            subtitle={`Last ${monthsToLoad} months`}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 20 }}
            >
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 20 }}>
                    <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                </View>

                {/* Chart */}
                {trendData.data.length > 0 && (
                    <View style={{ height: 240, paddingVertical: 10, overflow: 'hidden', marginLeft: -20 }}>
                        <LineChart
                            data={trendData.data.map((val, index) => ({
                                value: val.toNumber(),
                                label: trendData.labels[index],
                            }))}
                            height={220}
                            width={screenWidth - 40}
                            maxValue={max.multipliedBy(1.2).toNumber()}
                            spacing={(screenWidth - 150) / Math.max(trendData.data.length - 1, 1)}
                            initialSpacing={20}
                            thickness={3}
                            color={colors.primary}
                            hideRules={false}
                            rulesColor={colors.border + '40'}
                            yAxisColor="transparent"
                            xAxisColor="transparent"
                            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                            hideDataPoints={false}
                            dataPointsColor={colors.primary}
                            curved
                            curveType={0}
                            yAxisLabelWidth={90}
                            xAxisLabelTexts={trendData.labels}
                            formatYLabel={(value: string) => formatCompactCurrency(value, currency)}
                            pointerConfig={pointerConfig}
                        />
                    </View>
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
