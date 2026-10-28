import React, { useMemo, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import { Row } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Transaction } from '@types';
import { getCategoryGroup } from '@constants/categories';
import { getCategoryTrend } from '@utils/financialMetrics';
import { type, space, radius } from '@styles/theme';
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

const CHART_HEIGHT = 220;

// Discreet: a month's signed % change vs the period average.
const changeVs = (value: BigNumber, average: BigNumber): number | null =>
    average.isGreaterThan(0) ? value.minus(average).dividedBy(average).times(100).toNumber() : null;

// Hidden mode: same size, fill and copy as every other hidden chart.
const HiddenChart: React.FC<{ height: number }> = ({ height }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.hidden, { height, backgroundColor: ds.inset }]}>
            <Ionicons name="lock-closed-outline" size={18} color={ds.text2} />
            <Text style={[type.small, { color: ds.text2 }]}>Chart hidden for privacy</Text>
        </View>
    );
};

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
    const format = usePrivacyFormat(currency);
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
    const { total, average, max } = useMemo(() => {
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
        return { total, average, max };
    }, [trendData]);

    const highestIndex = trendData.data.findIndex(v => v.isEqualTo(max));

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
                            {format.isDiscreet
                                ? `${formatPercent(changeVs(new BigNumber(item.value), average), { signed: true })} vs avg`
                                : format.money(item.value)}
                        </Text>
                    </View>
                </View>
            );
        },
    }), [ds, format, average]);

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

                {trendData.data.length > 0 && format.isHidden && (
                    <View style={styles.hiddenWrap}>
                        <HiddenChart height={CHART_HEIGHT} />
                    </View>
                )}

                {trendData.data.length > 0 && !format.isHidden && (
                    <View style={styles.chart}>
                        <LineChart
                            data={trendData.data.map((val, index) => ({
                                value: val.toNumber(),
                                label: trendData.labels[index],
                            }))}
                            height={CHART_HEIGHT}
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
                            hideYAxisText={!format.isOpen}
                            yAxisLabelWidth={format.isOpen ? 90 : space[5]}
                            xAxisLabelTexts={trendData.labels}
                            formatYLabel={(value: string) => format.money(Number(value) || 0, { compact: true })}
                            pointerConfig={pointerConfig}
                        />
                    </View>
                )}

                {format.isDiscreet ? (
                    // No scale-free total or average; the peak month and its gap to the average stand in.
                    highestIndex >= 0 && (
                        <Row
                            title="Highest"
                            value={trendData.labels[highestIndex]}
                            change={`${formatPercent(changeVs(max, average), { signed: true })} vs avg`}
                            last
                        />
                    )
                ) : (
                    <>
                        <Row title="Total" value={format.money(total)} />
                        <Row title="Average" value={format.money(average)} />
                        <Row title="Highest" value={format.money(max)} last />
                    </>
                )}

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
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    hiddenWrap: {
        marginBottom: space[4],
    },
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
