import React, { useMemo, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getCategoryGroup } from '@constants/categories';
import { getCategoryTrend } from '@utils/financialMetrics';
import { type, space, radius } from '@styles/theme';
import { formatCurrencyAmount, formatCompactCurrency } from '@utils/currencyUtils';
import { SEVERITY_ICON } from '@utils/severity';

interface CategoryTrendModalProps {
    visible: boolean;
    onClose: () => void;
    category: string;
    transactions: Transaction[];
    currency: string;
    grouping?: 'GROUP' | 'ITEM';
    selectedDate?: Date;
}

const CategoryTrendModal: React.FC<CategoryTrendModalProps> = ({
    visible,
    onClose,
    category,
    transactions,
    currency,
    grouping = 'GROUP',
    selectedDate = new Date()
}) => {
    const { ds } = useTheme();
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
        const today = selectedDate;
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6);
    }, [timeRange, transactions, category, grouping, selectedDate]);

    const trendData = useMemo(() => {
        return getCategoryTrend(transactions, category, 'EXPENSE', monthsToLoad, grouping, selectedDate);
    }, [transactions, category, grouping, monthsToLoad, selectedDate]);

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
        pointerStripColor: ds.hairline,
        pointerStripWidth: 1,
        pointerColor: ds.accent,
        radius: 6,
        pointerLabelWidth: 100,
        pointerLabelHeight: 90,
        activatePointersOnLongPress: true,
        autoAdjustPointerLabelPosition: true,
        pointerComponent: () => (
            <View style={[styles.pointer, { backgroundColor: ds.accent, borderColor: ds.sheet }]} />
        ),
        pointerLabelComponent: (items: any) => {
            const item = items[0];
            if (!item) return null;

            return (
                <View style={styles.pointerLabelWrap}>
                    <View style={[styles.pointerLabel, { backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                        <Text style={[type.caption, styles.center, { color: ds.text2 }]}>{item.label}</Text>
                        <Text style={[type.smallMediumNum, styles.center, { color: ds.text }]}>
                            {formatCurrencyAmount(new BigNumber(item.value), currency)}
                        </Text>
                    </View>
                </View>
            );
        },
    }), [ds, currency]);

    const axisText = [type.caption, { color: ds.text2 }];

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={`${category} trend`}
            subtitle={`Last ${monthsToLoad} months`}
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.range}>
                    <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
                </View>

                {trendData.data.length > 0 && (
                    <View style={styles.chart}>
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
                            thickness={1.5}
                            color={ds.accent}
                            hideRules
                            yAxisColor="transparent"
                            xAxisColor="transparent"
                            yAxisTextStyle={axisText}
                            xAxisLabelTextStyle={axisText}
                            dataPointsColor={ds.accent}
                            dataPointsRadius={3}
                            curved
                            curveType={0}
                            yAxisLabelWidth={90}
                            xAxisLabelTexts={trendData.labels}
                            formatYLabel={(value: string) => formatCompactCurrency(value, currency)}
                            pointerConfig={pointerConfig}
                        />
                    </View>
                )}

                <Row title="Total" value={formatCurrencyAmount(total, currency)} />
                <Row title="Average" value={formatCurrencyAmount(average, currency)} />
                <Row title="Highest" value={formatCurrencyAmount(max, currency)} last />

                {trendData.data.length > 1 && (
                    <View style={styles.insight}>
                        <Ionicons name={SEVERITY_ICON.info} size={20} color={ds.text2} />
                        <Text style={[type.small, styles.insightText, { color: ds.text2 }]}>
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

const styles = StyleSheet.create({
    pointer: {
        height: 10,
        width: 10,
        borderRadius: radius.full,
        borderWidth: 2,
    },
    pointerLabelWrap: {
        height: 90,
        width: 100,
        justifyContent: 'center',
        marginTop: -30,
        marginLeft: -40,
    },
    pointerLabel: {
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
    },
    center: {
        textAlign: 'center',
    },
    range: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginBottom: space[5],
    },
    chart: {
        height: 240,
        paddingVertical: space[2],
        overflow: 'hidden',
        marginLeft: -space[5],
        marginBottom: space[4],
    },
    insight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        marginTop: space[4],
    },
    insightText: {
        flex: 1,
    },
});

export default CategoryTrendModal;
