import React, { useEffect, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import MonthEndProjectionModal from '@components/insights/modals/MonthEndProjectionModal';
import { Row, SectionHeader } from '@components/ds';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Transaction } from '@types';
import { type, space, radius } from '@styles/theme';
import { getMonthlyTrends, getMonthlyTrendsForYear } from '@utils/financialMetrics';
import { saveInsightsIncomeTab, getInsightsIncomeTab, saveInsightsIncomeTimeRange, getInsightsIncomeTimeRange } from '@services/core/storageService';

interface IncomeAnalysisProps {
    monthlyTrends: {
        labels: string[];
        fullLabels?: string[];
        incomeData: BigNumber[];
    };
    categoryBreakdown: {
        name: string;
        amount: BigNumber;
        percentage: BigNumber;
    }[];
    currency: string;
    transactions: Transaction[];
    isLoading?: boolean;
    selectedDate?: Date;
}

const TREND_HEIGHT = 220;
const PIE_HEIGHT = 160;
// Resting bars; the selected month or pressed bar draws at full strength.
const BAR_REST_OPACITY = 0.22;
// Hex alpha suffixes for source slices: 100%, 60%, 30%.
const SOURCE_ALPHAS = ['FF', '99', '4D'];

const TABS = [
    { key: 'TREND', label: 'Trend' },
    { key: 'SOURCES', label: 'Sources' },
];

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

const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ monthlyTrends: initialTrends, categoryBreakdown, currency, transactions, isLoading = false, selectedDate = new Date() }) => {
    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);
    const [showProjectionModal, setShowProjectionModal] = React.useState(false);
    const [showInfoModal, setShowInfoModal] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'TREND' | 'SOURCES'>('TREND');
    const [showInsightInfo, setShowInsightInfo] = React.useState(false);
    const [selectedBarIndex, setSelectedBarIndex] = React.useState<number | null>(null);

    // Time Range Filter Logic
    const [timeRange, setTimeRange] = React.useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');
    const [selectedYear, setSelectedYear] = React.useState(selectedDate.getFullYear());

    // Keep the in-chart year selector aligned with the month picker at the top of Insights
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- default the user can still override via prev/next; see FIXES.md
        setSelectedYear(selectedDate.getFullYear());
    }, [selectedDate]);

    // Restore the last-selected tab (Trend / Sources) and time range on mount. Flipped false
    // either when the load resolves OR the instant the user taps a tab/range (see
    // handleTabChange/handleTimeRangeChange below) - without that second path, a tap made
    // before the still-in-flight AsyncStorage read resolves would get silently reverted by
    // the load once it completes, since it applied its result unconditionally.
    const isInitialPrefLoad = React.useRef(true);
    useEffect(() => {
        const loadPrefs = async () => {
            const [savedTab, savedRange] = await Promise.all([
                getInsightsIncomeTab(),
                getInsightsIncomeTimeRange()
            ]);
            if (isInitialPrefLoad.current) {
                if (savedTab === 'TREND' || savedTab === 'SOURCES') setActiveTab(savedTab);
                if (savedRange === '6M' || savedRange === '1Y' || savedRange === '3Y' || savedRange === 'ALL') setTimeRange(savedRange);
            }
            isInitialPrefLoad.current = false;
        };
        loadPrefs();
    }, []);

    const handleTabChange = (tab: 'TREND' | 'SOURCES') => {
        isInitialPrefLoad.current = false;
        setActiveTab(tab);
    };

    const handleTimeRangeChange = (range: '6M' | '1Y' | '3Y' | 'ALL') => {
        isInitialPrefLoad.current = false;
        setTimeRange(range);
    };

    useEffect(() => {
        if (!isInitialPrefLoad.current) saveInsightsIncomeTab(activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (!isInitialPrefLoad.current) saveInsightsIncomeTimeRange(timeRange);
    }, [timeRange]);

    const availableYears = useMemo(() => {
        if (transactions.length === 0) return [new Date().getFullYear()];
        const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))];
        return years.sort((a, b) => b - a);
    }, [transactions]);

    // Calculate how many months of data to load based on selection
    const monthsToLoad = useMemo(() => {
        if (timeRange === '6M') return 6;
        if (timeRange === '1Y') return 12;
        if (timeRange === '3Y') return 36;

        // For 'ALL', calculate months since first transaction
        if (transactions.length === 0) return 6;
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const today = selectedDate;
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6); // Ensure at least 6 months shown even if data is new
    }, [timeRange, transactions, selectedDate]);

    // Recalculate trends based on selected time range
    const activeMonthlyTrends = useMemo(() => {
        if (timeRange === '1Y') {
            return getMonthlyTrendsForYear(transactions, selectedYear);
        }
        return getMonthlyTrends(transactions, monthsToLoad, selectedDate);
    }, [transactions, monthsToLoad, timeRange, selectedYear, selectedDate]);

    // Sources step down through accent strengths, like the allocation bar's opacity steps.
    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: item.amount,
        color: `${ds.accent}${SOURCE_ALPHAS[index % SOURCE_ALPHAS.length]}`,
    }));

    // ... getInsight and renderTimeFilter ...
    // Generate smart insight (using active trends); it only uses %, so every mode shows it.
    const getInsight = () => {
        const data = activeMonthlyTrends.incomeData;
        if (data.length < 2) return "Great start! Keep tracking to see income trends.";

        const lastMonth = data[data.length - 1]; // BigNumber
        const prevMonth = data[data.length - 2]; // BigNumber

        // 1. Comparison using BigNumber methods
        if (lastMonth.isGreaterThan(prevMonth)) {
            // Handle division by zero if prevMonth was 0
            const growth = prevMonth.isZero()
                ? new BigNumber(100)
                : lastMonth.minus(prevMonth).dividedBy(prevMonth).times(100);

            return `Your income grew by ${growth.toFixed(1)}% compared to last month.`;

        } else if (lastMonth.isLessThan(prevMonth)) {
            const drop = prevMonth.isZero()
                ? new BigNumber(0)
                : prevMonth.minus(lastMonth).dividedBy(prevMonth).times(100);

            return `Income is down by ${drop.toFixed(1)}% compared to last month.`;
        }

        return "Your income has been stable.";
    };

    const renderYearSelector = () => {
        if (availableYears.length <= 1 && availableYears[0] === new Date().getFullYear()) return null;

        const currentIndex = availableYears.indexOf(selectedYear);
        const hasNext = currentIndex > 0;
        const hasPrev = currentIndex < availableYears.length - 1;

        return (
            <View style={styles.yearSelector}>
                <Pressable
                    onPress={() => setSelectedYear(availableYears[currentIndex + 1])}
                    disabled={!hasPrev}
                    hitSlop={space[2]}
                >
                    <Ionicons name="chevron-back" size={18} color={hasPrev ? ds.text : ds.text3} />
                </Pressable>
                <Text style={[type.smallMediumNum, { color: ds.text }]}>{selectedYear}</Text>
                <Pressable
                    onPress={() => setSelectedYear(availableYears[currentIndex - 1])}
                    disabled={!hasNext}
                    hitSlop={space[2]}
                >
                    <Ionicons name="chevron-forward" size={18} color={hasNext ? ds.text : ds.text3} />
                </Pressable>
            </View>
        );
    };

    const renderTrend = () => {
        // Prepare data with pro-rated projection (Historical Average Strategy)
        // Use historical average as the target for the current month's projection

        const labels = [...activeMonthlyTrends.labels];
        const fullLabels = activeMonthlyTrends.fullLabels ? [...activeMonthlyTrends.fullLabels] : [...labels];
        const rawData = [...activeMonthlyTrends.incomeData];

        // Last element is current month
        const isCurrentlyThisMonth = selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();
        const currentMonthIncome = rawData[rawData.length - 1] || new BigNumber(0);

        // Calculate Average from historical months (exclude current)
        const historicalData = rawData.slice(0, rawData.length - 1);

        const historicalTotal = historicalData.reduce(
            (sum, val) => sum.plus(val),
            new BigNumber(0)
        );

        const averageIncome = historicalData.length > 0
            ? historicalTotal.dividedBy(historicalData.length)
            : currentMonthIncome;

        // Projection = Max(Current, Average)
        const proRatedIncome = isCurrentlyThisMonth ? BigNumber.max(currentMonthIncome, averageIncome) : currentMonthIncome;

        // Discreet: a bar's signed % change vs that historical average.
        const vsAverage = (value: BigNumber): number | null =>
            averageIncome.isGreaterThan(0) ? value.minus(averageIncome).dividedBy(averageIncome).times(100).toNumber() : null;

        // Replace last label with * indicator only if it's the actual current month
        if (labels.length > 0 && isCurrentlyThisMonth) {
            labels[labels.length - 1] = labels[labels.length - 1] + "*";
            fullLabels[fullLabels.length - 1] = fullLabels[fullLabels.length - 1] + "*";
        }

        const barData = labels.map((label, index) => {
            const today = new Date();
            const isActualCurrentMonth = selectedYear === today.getFullYear() && index === today.getMonth();
            const isCurrentMonth = timeRange === '1Y' ? (isActualCurrentMonth && isCurrentlyThisMonth) : (index === labels.length - 1 && isCurrentlyThisMonth);
            // The month picked at the top of Insights is the highlighted bar.
            const isSelectedMonth = timeRange === '1Y'
                ? selectedYear === selectedDate.getFullYear() && index === selectedDate.getMonth()
                : index === labels.length - 1;

            const value = isCurrentMonth ? proRatedIncome : (rawData[index] || new BigNumber(0));
            const actual = rawData[index] || new BigNumber(0);

            // Smart Labeling: Throttling for density
            const showLabelInterval = Math.ceil(labels.length / 6);
            const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

            return {
                label: shouldShowLabel ? label : '',
                fullLabel: fullLabels[index],
                value,
                actual,
                isProjected: isCurrentMonth,
                isCurrent: isSelectedMonth,
            };
        });

        const maxValue = BigNumber.max(...barData.map(b => b.value), 1); // Prevent 0 division
        const yMin = 0;
        const yMax = maxValue.toNumber() * 1.05; // 5% padding
        const yRange = yMax - yMin;
        const chartHeight = 150;

        // Y-axis labels (4), amounts only: Discreet drops the axis.
        const yLabels = Array.from({ length: 4 }, (_, i) => format.money(yMin + (yRange * (i / 3)), { compact: true }));

        return (
            <View style={styles.plot}>
                {format.isOpen && (
                    <View style={styles.yAxis}>
                        {yLabels.reverse().map((label, i) => (
                            <Text key={i} style={[type.captionNum, { color: ds.text2 }]}>{label}</Text>
                        ))}
                    </View>
                )}

                {/* Bars */}
                <View style={styles.bars}>
                    {barData.map((bar, index) => {
                        const totalHeight = yRange > 0 ? ((bar.value.toNumber() - yMin) / yRange) * chartHeight : 0;
                        const actualHeight = yRange > 0 ? ((bar.actual.toNumber() - yMin) / yRange) * chartHeight : 0;
                        // If projected < actual, prevent overflow
                        const projectedHeight = bar.isProjected ? Math.max(0, totalHeight - actualHeight) : 0;
                        const isSelected = selectedBarIndex === index;
                        const barOpacity = isSelected || bar.isCurrent ? 1 : BAR_REST_OPACITY;

                        return (
                            <View key={index} style={[styles.barColumn, { zIndex: isSelected ? 100 : 0, elevation: isSelected ? 10 : 0 }]}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPressIn={() => setSelectedBarIndex(index)}
                                    onPressOut={() => setSelectedBarIndex(null)}
                                    style={[styles.barTouch, { height: chartHeight }]}
                                >
                                    {bar.isProjected ? (
                                        // Stacked bar: actual (solid) + projected remainder (resting tint)
                                        <View style={styles.barWidth}>
                                            <View style={[styles.barTop, { height: projectedHeight, backgroundColor: ds.accent, opacity: BAR_REST_OPACITY }]} />
                                            <View style={[
                                                projectedHeight > 0 ? undefined : styles.barTop,
                                                { height: Math.max(0, actualHeight), backgroundColor: ds.accent, opacity: barOpacity },
                                            ]} />
                                        </View>
                                    ) : (
                                        <View style={[styles.barTop, styles.barWidth, {
                                            height: Math.max(0, totalHeight),
                                            backgroundColor: ds.accent,
                                            opacity: barOpacity,
                                        }]} />
                                    )}
                                </TouchableOpacity>

                                {/* Tooltip Overlay */}
                                {isSelected && (
                                    <View style={[styles.tooltip, { bottom: Math.max(0, totalHeight) + 8, backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                                        <Text style={[type.captionMedium, { color: ds.text }]}>{bar.fullLabel.replace('*', '')}</Text>
                                        <Text style={[type.captionNum, { color: ds.text2 }]}>
                                            Actual: <Text style={{ color: ds.text }}>
                                                {format.isDiscreet ? `${formatPercent(vsAverage(bar.actual), { signed: true })} vs avg` : format.money(bar.actual, { compact: true })}
                                            </Text>
                                        </Text>
                                        {bar.isProjected && (
                                            <Text style={[type.captionNum, { color: ds.text2 }]}>
                                                Proj: <Text style={{ color: ds.text }}>
                                                    {format.isDiscreet ? `${formatPercent(vsAverage(bar.value), { signed: true })} vs avg` : format.money(bar.value, { compact: true })}
                                                </Text>
                                            </Text>
                                        )}
                                        <View style={[styles.tooltipArrow, { backgroundColor: ds.raised, borderColor: ds.hairline }]} />
                                    </View>
                                )}

                                <Text
                                    numberOfLines={1}
                                    style={[type.caption, styles.barLabel, {
                                        color: isSelected ? ds.accent : ds.text2,
                                        opacity: bar.label || isSelected ? 1 : 0
                                    }]}
                                >
                                    {bar.label}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderSources = () => {
        if (pieData.length === 0) {
            return <Text style={[type.small, styles.empty, { color: ds.text2 }]}>No income data available.</Text>;
        }
        return (
            <View style={styles.pie}>
                <View style={styles.pieChart}>
                    <PieChart
                        data={pieData.map(d => ({ value: d.population.toNumber(), color: d.color, text: '' }))}
                        radius={70}
                        donut
                        innerCircleColor={ds.bg}
                        innerRadius={40}
                        centerLabelComponent={() => (
                            <View style={styles.pieCenter}>
                                <Text style={[type.bodyNum, { color: ds.text }]}>{categoryBreakdown.length}</Text>
                                <Text style={[type.caption, { color: ds.text2 }]}>Sources</Text>
                            </View>
                        )}
                    />
                </View>

                {/* Shares are % of total, so the legend reads the same in every mode */}
                <View style={styles.pieLegend}>
                    {categoryBreakdown.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: pieData[index].color }]} />
                            <Text style={[type.caption, styles.flex, { color: ds.text2 }]}>
                                {item.name} <Text style={[type.captionMedium, { color: ds.text }]}>({item.percentage.toFixed(0)}%)</Text>
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const chartHeight = activeTab === 'TREND' ? TREND_HEIGHT : PIE_HEIGHT;

    return (
        <View>
            <SectionHeader
                title="Income analytics"
                menu={{ options: TABS, value: activeTab, onSelect: key => handleTabChange(key as 'TREND' | 'SOURCES') }}
            />

            <View style={styles.subline}>
                <Text style={[type.small, styles.flex, { color: ds.text2 }]}>{isLoading ? "Analyzing income trends..." : getInsight()}</Text>
                <Pressable onPress={() => setShowInsightInfo(true)} hitSlop={space[2]}>
                    <Ionicons name="calculator-outline" size={18} color={ds.text2} />
                </Pressable>
            </View>

            <View style={styles.toolbar}>
                {/* Time Range Filter - Only show for TREND tab */}
                {activeTab === 'TREND' ? (
                    <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
                ) : <View />}
                <Pressable onPress={() => setShowInfoModal(true)} hitSlop={space[2]}>
                    <Ionicons name="information-circle-outline" size={18} color={ds.text2} />
                </Pressable>
            </View>

            {isLoading ? (
                <Skeleton width="100%" height={chartHeight} borderRadius={radius.md} />
            ) : format.isHidden ? (
                <HiddenChart height={chartHeight} />
            ) : activeTab === 'TREND' ? (
                <View style={styles.trendArea}>
                    {timeRange === '1Y' && renderYearSelector()}
                    {renderTrend()}
                </View>
            ) : renderSources()}

            {/* The projection sheet lists amounts and isn't privacy-aware yet */}
            {format.isOpen && (
                <Row
                    icon="trending-up-outline"
                    title="Month-end projection"
                    chevron
                    onPress={() => setShowProjectionModal(true)}
                    style={styles.projection}
                    last
                />
            )}

            <MonthEndProjectionModal
                visible={showProjectionModal}
                onClose={() => setShowProjectionModal(false)}
                transactions={transactions}
                currency={currency}
            />

            <BottomModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Understanding your chart"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        This chart compares your current income against your past months.
                    </Text>

                    <View style={modalStyles.scenarios}>
                        <View style={[modalStyles.scenario, { backgroundColor: ds.inset }]}>
                            <View style={modalStyles.scenarioBars}>
                                <View style={[modalStyles.scenarioBar, { backgroundColor: ds.accent }]} />
                            </View>
                            <Text style={[type.body, { color: ds.text }]}>Actual</Text>
                            <Text style={[type.small, modalStyles.center, { color: ds.text2 }]}>
                                The solid bar shows income you have already received.
                            </Text>
                        </View>
                        <View style={[modalStyles.scenario, { backgroundColor: ds.inset }]}>
                            <View style={modalStyles.scenarioBars}>
                                <View style={[modalStyles.scenarioBar, modalStyles.split]}>
                                    <View style={[modalStyles.flex, { backgroundColor: ds.accent, opacity: BAR_REST_OPACITY }]} />
                                    <View style={[modalStyles.flex, { backgroundColor: ds.accent }]} />
                                </View>
                            </View>
                            <Text style={[type.body, { color: ds.text }]}>Projected</Text>
                            <Text style={[type.small, modalStyles.center, { color: ds.text2 }]}>
                                The lighter top part is what you&apos;re projected to earn by month end.
                            </Text>
                        </View>
                    </View>

                    <SectionHeader title="What do the labels mean?" />
                    <Text style={[type.small, modalStyles.paragraph, { color: ds.text2 }]}>
                        <Text style={[type.smallMedium, { color: ds.text }]}>Current month*: </Text>
                        The asterisk (*) indicates this is a projection.
                    </Text>
                    <Text style={[type.small, modalStyles.paragraph, { color: ds.text2 }]}>
                        <Text style={[type.smallMedium, { color: ds.accent }]}>Solid color: </Text>
                        Actual income recorded.
                    </Text>
                    <Text style={[type.small, modalStyles.paragraph, { color: ds.text2 }]}>
                        <Text style={[type.smallMedium, { color: ds.accent, opacity: 0.6 }]}>Lighter color: </Text>
                        Projecting you will match your historical average.
                    </Text>
                </ScrollView>
            </BottomModal>
            <BottomModal
                visible={showInsightInfo}
                onClose={() => setShowInsightInfo(false)}
                title="How is this calculated?"
                maxHeight="40%"
            >
                <View>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        This smart insight compares the <Text style={{ color: ds.text }}>income actually recorded</Text> in the latest month shown (not the projected part of its bar) against the <Text style={{ color: ds.text }}>month before it</Text>.
                    </Text>
                    <View style={modalStyles.legend}>
                        {([
                            ['Growth', 'You earned more than last month.', ds.success],
                            ['Decline', 'Income is lower than last month.', ds.danger],
                            ['Stable', 'Income is exactly the same as last month.', ds.text2],
                        ] as const).map(([label, meaning, color]) => (
                            <View key={label} style={modalStyles.legendRow}>
                                <View style={[modalStyles.legendDot, { backgroundColor: color }]} />
                                <Text style={[type.small, modalStyles.flex, { color: ds.text2 }]}>
                                    <Text style={{ color: ds.text }}>{label}: </Text>{meaning}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            </BottomModal>
        </View>
    );
};

const styles = StyleSheet.create({
    subline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    flex: {
        flex: 1,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: space[3],
        marginBottom: space[2],
    },
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    empty: {
        textAlign: 'center',
        paddingVertical: space[5],
    },
    trendArea: {
        height: TREND_HEIGHT,
        paddingVertical: space[2],
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[5],
        marginBottom: space[3],
    },
    plot: {
        flex: 1,
        flexDirection: 'row',
    },
    yAxis: {
        width: 48,
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: 25,
        paddingRight: space[1],
    },
    bars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
    },
    barTouch: {
        width: '100%',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    barWidth: {
        width: '50%',
    },
    barTop: {
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    barLabel: {
        width: 40,
        marginTop: space[2],
        textAlign: 'center',
    },
    tooltip: {
        position: 'absolute',
        minWidth: 100,
        alignItems: 'center',
        padding: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        zIndex: 100,
    },
    tooltipArrow: {
        position: 'absolute',
        bottom: -5,
        width: 10,
        height: 10,
        transform: [{ rotate: '45deg' }],
        borderBottomWidth: 1,
        borderRightWidth: 1,
        zIndex: -1,
    },
    pie: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pieChart: {
        flex: 6,
        alignItems: 'center',
    },
    pieCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pieLegend: {
        flex: 4,
        paddingLeft: space[2],
        gap: space[2],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    projection: {
        marginTop: space[2],
    },
});

const modalStyles = StyleSheet.create({
    scenarios: {
        flexDirection: 'row',
        gap: space[3],
        marginTop: space[4],
    },
    scenario: {
        flex: 1,
        alignItems: 'center',
        gap: space[1],
        padding: space[4],
        borderRadius: radius.md,
    },
    scenarioBars: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        height: 60,
        width: 80,
        marginBottom: space[2],
    },
    scenarioBar: {
        width: 30,
        height: '80%',
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    split: {
        overflow: 'hidden',
    },
    flex: {
        flex: 1,
    },
    center: {
        textAlign: 'center',
    },
    paragraph: {
        marginTop: space[2],
    },
    legend: {
        gap: space[2],
        marginTop: space[4],
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[2],
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
        marginTop: 5,
    },
});

export default IncomeAnalysis;
