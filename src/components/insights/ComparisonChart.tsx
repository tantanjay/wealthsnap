import React, { useEffect, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import { SectionHeader } from '@components/ds';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Transaction } from '@types';
import { type, space, radius } from '@styles/theme';
import { Formula } from './FinancialHealthDetails';
import { getMonthlyTrends, getMonthlyTrendsForYear } from '@utils/financialMetrics';
import { saveInsightsComparisonView, getInsightsComparisonView, saveInsightsComparisonTimeRange, getInsightsComparisonTimeRange } from '@services/core/storageService';

interface ComparisonChartProps {
    currentMonthExpense: BigNumber;
    lastMonthExpense: BigNumber;
    averageExpense: BigNumber;
    average6Month: BigNumber;
    average1Year: BigNumber;
    currency: string;
    transactions: Transaction[];
    isLoading?: boolean;
    selectedDate?: Date;
}

const CHART_HEIGHT = 220;
// Resting bars; the current or pressed period draws at full strength.
const BAR_REST_OPACITY = 0.22;

const VIEWS = [
    { key: 'COMPARISON', label: 'Compare' },
    { key: 'MONTHLY', label: 'Trend' },
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

const ComparisonChart: React.FC<ComparisonChartProps> = ({ currentMonthExpense, lastMonthExpense, averageExpense, average6Month, average1Year, currency, transactions, isLoading = false, selectedDate = new Date() }) => {
    const [showInfoModal, setShowInfoModal] = React.useState(false);
    const [showInsightInfo, setShowInsightInfo] = React.useState(false);
    const [selectedBarIndex, setSelectedBarIndex] = React.useState<number | null>(null);
    const [activeView, setActiveView] = React.useState<'COMPARISON' | 'MONTHLY'>('COMPARISON');
    const [timeRange, setTimeRange] = React.useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');
    const [selectedYear, setSelectedYear] = React.useState(selectedDate.getFullYear());

    // Keep the in-chart year selector aligned with the month picker at the top of Insights
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- default the user can still override via prev/next; see FIXES.md
        setSelectedYear(selectedDate.getFullYear());
    }, [selectedDate]);

    // Restore the last-selected view (Trend / Compare) and time range on mount. Flipped false
    // either when the load resolves OR the instant the user taps a view/range (see
    // handleViewChange/handleTimeRangeChange below) - without that second path, a tap made
    // before the still-in-flight AsyncStorage read resolves would get silently reverted by
    // the load once it completes, since it applied its result unconditionally.
    const isInitialPrefLoad = React.useRef(true);
    useEffect(() => {
        const loadPrefs = async () => {
            const [savedView, savedRange] = await Promise.all([
                getInsightsComparisonView(),
                getInsightsComparisonTimeRange()
            ]);
            if (isInitialPrefLoad.current) {
                if (savedView === 'COMPARISON' || savedView === 'MONTHLY') setActiveView(savedView);
                if (savedRange === '6M' || savedRange === '1Y' || savedRange === '3Y' || savedRange === 'ALL') setTimeRange(savedRange);
            }
            isInitialPrefLoad.current = false;
        };
        loadPrefs();
    }, []);

    const handleViewChange = (view: 'COMPARISON' | 'MONTHLY') => {
        isInitialPrefLoad.current = false;
        setActiveView(view);
    };

    const handleTimeRangeChange = (range: '6M' | '1Y' | '3Y' | 'ALL') => {
        isInitialPrefLoad.current = false;
        setTimeRange(range);
    };

    useEffect(() => {
        if (!isInitialPrefLoad.current) saveInsightsComparisonView(activeView);
    }, [activeView]);

    useEffect(() => {
        if (!isInitialPrefLoad.current) saveInsightsComparisonTimeRange(timeRange);
    }, [timeRange]);

    const availableYears = useMemo(() => {
        if (transactions.length === 0) return [new Date().getFullYear()];
        const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))];
        return years.sort((a, b) => b - a);
    }, [transactions]);

    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);

    // Calculate how many months of data to load based on selection
    const monthsToLoad = useMemo(() => {
        if (timeRange === '6M') return 6;
        if (timeRange === '1Y') return 12;
        if (timeRange === '3Y') return 36;

        if (transactions.length === 0) return 6;
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const today = selectedDate;
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6);
    }, [timeRange, transactions, selectedDate]);

    // Recalculate trends based on selected time range
    const activeMonthlyTrends = useMemo(() => {
        if (activeView === 'MONTHLY' && timeRange === '1Y') {
            return getMonthlyTrendsForYear(transactions, selectedYear);
        }
        return getMonthlyTrends(transactions, monthsToLoad, selectedDate);
    }, [transactions, monthsToLoad, activeView, timeRange, selectedYear, selectedDate]);

    // Pro-rate current month spending to estimate full month
    const referenceDate = selectedDate;
    const isCurrentMonth = referenceDate.getMonth() === new Date().getMonth() && referenceDate.getFullYear() === new Date().getFullYear();
    const currentDay = isCurrentMonth ? new Date().getDate() : new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
    const daysInMonth = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0).getDate();
    
    const proRatedExpense = currentDay > 0 ?
        currentMonthExpense.dividedBy(currentDay).multipliedBy(daysInMonth) : currentMonthExpense;

    // Signed % change vs the 3-month average; null without one.
    const vsAverage = (value: BigNumber): number | null =>
        averageExpense.isGreaterThan(0) ? value.minus(averageExpense).dividedBy(averageExpense).times(100).toNumber() : null;

    const getComparisonInsight = () => {
        if (proRatedExpense.minus(averageExpense).abs().isLessThan(0.01)) {
            return "On track to match your 3-month average.*";
        }
        // Discreet: the gap as % of the average; Hidden masks the amount.
        const diff = proRatedExpense.minus(averageExpense).abs();
        const pct = vsAverage(proRatedExpense);
        const gap = format.isDiscreet
            ? (pct === null ? '' : `${formatPercent(Math.abs(pct))} `)
            : `${format.money(diff)} `;
        if (proRatedExpense.isGreaterThan(averageExpense)) {
            return `On track to spend ${gap}more than your 3-month average.*`;
        }
        return `Great job! On track to spend ${gap}less than average.*`;
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


    const renderVisualScenario = (scenario: 'OVER' | 'UNDER') => (
        <View style={modalStyles.scenarioBars}>
            {/* User bar vs average bar */}
            <View style={[modalStyles.scenarioBar, { height: scenario === 'OVER' ? '100%' : '50%', backgroundColor: scenario === 'OVER' ? ds.danger : ds.success }]} />
            <View style={[modalStyles.scenarioBar, { height: '75%', backgroundColor: ds.hairline }]} />
        </View>
    );

    const renderChart = () => {
        const barData = activeView === 'COMPARISON' ? [
            { label: isCurrentMonth ? "This M*" : "Actual", value: proRatedExpense, actual: currentMonthExpense, fullLabel: isCurrentMonth ? "This Month (Projected)" : "Actual Monthly Spending", isProjected: isCurrentMonth, isCurrent: true },
            { label: "Last M", value: lastMonthExpense, actual: lastMonthExpense, fullLabel: "Last Month", isProjected: false, isCurrent: false },
            { label: "Avg 3M", value: averageExpense, actual: averageExpense, fullLabel: "3-Month Average", isProjected: false, isCurrent: false },
            { label: "Avg 6M", value: average6Month, actual: average6Month, fullLabel: "6-Month Average", isProjected: false, isCurrent: false },
            { label: "Avg 1Y", value: average1Year, actual: average1Year, fullLabel: "1-Year Average", isProjected: false, isCurrent: false },
        ] : (() => {
            const labels = [...activeMonthlyTrends.labels];
            const fullLabels = activeMonthlyTrends.fullLabels ? [...activeMonthlyTrends.fullLabels] : [...labels];
            const rawData = [...activeMonthlyTrends.expenseData];

            return labels.map((label, index) => {
                const today = new Date();
                const isActualCurrentMonth = selectedYear === today.getFullYear() && index === today.getMonth();
                // Only pro-rate/project a bar if it's the REAL current month (partial data).
                // A fully-completed past month (e.g. browsing history via the month picker)
                // should never be projected, even if it happens to be the last bar loaded.
                const isProjectableBar = timeRange === '1Y' ? isActualCurrentMonth : (index === labels.length - 1 && isCurrentMonth);
                // The month picked at the top of Insights is the highlighted bar.
                const isCurrent = timeRange === '1Y'
                    ? selectedYear === selectedDate.getFullYear() && index === selectedDate.getMonth()
                    : index === labels.length - 1;

                const actual = rawData[index] || new BigNumber(0);
                const value = isProjectableBar ? proRatedExpense : actual;

                const showLabelInterval = Math.ceil(labels.length / 6);
                const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

                return {
                    label: shouldShowLabel ? (isProjectableBar ? label + "*" : label) : '',
                    fullLabel: isProjectableBar ? fullLabels[index] + "*" : fullLabels[index],
                    value,
                    actual,
                    isProjected: isProjectableBar,
                    isCurrent,
                };
            });
        })();

        // Calculate Max Value safely
        const maxValue = BigNumber.max(
            ...barData.map(b => b.value),
            new BigNumber(0)
        ).toNumber();

        // Calculate Min Value safely
        const minValue = activeView === 'COMPARISON' ? BigNumber.min(
            ...barData.map(b => b.isProjected ? b.actual : b.value),
            maxValue
        ).toNumber() : 0;

        // Start Y-axis 15% below minimum for COMPARISON, or 0 for MONTHLY
        const yMin = activeView === 'COMPARISON' ? Math.max(0, minValue * 0.85) : 0;
        const yMax = maxValue * 1.05; // 5% padding on top
        const yRange = yMax - yMin;
        const chartHeight = 150;

        // Y-axis labels (4), amounts only: Discreet drops the axis.
        const yLabels = Array.from({ length: 4 }, (_, i) => format.money(yMin + (yRange * (i / 3)), { compact: true }));
        const barWidth = activeView === 'COMPARISON' ? '50%' : '70%';

        return (
            <View style={styles.plot}>
                {format.isOpen && (
                    <View style={styles.yAxis}>
                        {yLabels.reverse().map((label, i) => (
                            <Text key={i} style={[type.captionNum, { color: ds.text2 }]}>{label}</Text>
                        ))}
                    </View>
                )}

                <View style={styles.bars}>
                    {barData.map((bar, index) => {
                        // Calculate heights relative to yMin-yMax range
                        const totalHeight = (yRange > 0
                            ? bar.value.minus(yMin).dividedBy(yRange).times(chartHeight)
                            : new BigNumber(0)).toNumber();

                        const actualHeight = (yRange > 0
                            ? bar.actual.minus(yMin).dividedBy(yRange).times(chartHeight)
                            : new BigNumber(0)).toNumber();

                        const projectedHeight = bar.isProjected ? Math.max(0, totalHeight - actualHeight) : 0;

                        const isSelected = selectedBarIndex === index;
                        const barOpacity = isSelected || bar.isCurrent ? 1 : BAR_REST_OPACITY;
                        const actualPct = vsAverage(bar.actual);
                        const projectedPct = vsAverage(bar.value);

                        return (
                            <View key={index} style={[styles.barColumn, { zIndex: isSelected ? 100 : 0, elevation: isSelected ? 10 : 0 }]}>
                                {/* Tappable Bar Area */}
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPressIn={() => setSelectedBarIndex(index)}
                                    onPressOut={() => setSelectedBarIndex(null)}
                                    style={[styles.barTouch, { height: chartHeight }]}
                                >
                                    {bar.isProjected ? (
                                        // Stacked bar: actual (solid) + projected remainder (resting tint)
                                        <View style={{ width: barWidth }}>
                                            <View style={[styles.barTop, { height: projectedHeight, backgroundColor: ds.accent, opacity: BAR_REST_OPACITY }]} />
                                            <View style={[
                                                projectedHeight > 0 ? undefined : styles.barTop,
                                                { height: Math.max(0, actualHeight), backgroundColor: ds.accent, opacity: barOpacity },
                                            ]} />
                                        </View>
                                    ) : (
                                        <View style={[styles.barTop, {
                                            height: Math.max(0, totalHeight),
                                            width: barWidth,
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
                                                {format.isDiscreet ? `${formatPercent(actualPct, { signed: true })} vs 3M avg` : format.money(bar.actual)}
                                            </Text>
                                        </Text>
                                        {bar.isProjected && (
                                            <Text style={[type.captionNum, { color: ds.text2 }]}>
                                                Proj: <Text style={{ color: ds.text }}>
                                                    {format.isDiscreet ? `${formatPercent(projectedPct, { signed: true })} vs 3M avg` : format.money(bar.value)}
                                                </Text>
                                            </Text>
                                        )}
                                        <View style={[styles.tooltipArrow, { backgroundColor: ds.raised, borderColor: ds.hairline }]} />
                                    </View>
                                )}

                                {/* Label */}
                                <Text
                                    numberOfLines={1}
                                    style={[type.caption, styles.barLabel, {
                                        color: isSelected ? ds.accent : ds.text2,
                                        width: activeView === 'COMPARISON' ? undefined : 40,
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

    return (
        <View>
            <SectionHeader
                title={activeView === 'COMPARISON' ? 'Spending comparison' : 'Monthly spending'}
                menu={{ options: VIEWS, value: activeView, onSelect: key => handleViewChange(key as 'COMPARISON' | 'MONTHLY') }}
            />

            <View style={styles.subline}>
                <Text style={[type.small, styles.flex, { color: ds.text2 }]}>{isLoading ? "Analyzing spending habits..." : getComparisonInsight()}</Text>
                <Pressable onPress={() => setShowInsightInfo(true)} hitSlop={space[2]}>
                    <Ionicons name="calculator-outline" size={18} color={ds.text2} />
                </Pressable>
            </View>
            <Text style={[type.caption, styles.footnote, { color: ds.text2 }]}>
                *Projection assumes even spending throughout month
            </Text>

            <View style={styles.toolbar}>
                {activeView === 'MONTHLY' ? (
                    <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
                ) : <View />}
                <Pressable onPress={() => setShowInfoModal(true)} hitSlop={space[2]}>
                    <Ionicons name="information-circle-outline" size={18} color={ds.text2} />
                </Pressable>
            </View>

            {isLoading ? (
                <Skeleton height={CHART_HEIGHT} width="100%" borderRadius={radius.md} />
            ) : format.isHidden ? (
                <HiddenChart height={CHART_HEIGHT} />
            ) : (
                <View style={styles.chartArea}>
                    {activeView === 'MONTHLY' && timeRange === '1Y' && renderYearSelector()}
                    {renderChart()}
                </View>
            )}

            <BottomModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Understanding your chart"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        This chart compares your current spending against your past habits.
                    </Text>

                    <View style={modalStyles.scenarios}>
                        <View style={[modalStyles.scenario, { backgroundColor: ds.inset }]}>
                            {renderVisualScenario('OVER')}
                            <Text style={[type.body, { color: ds.text }]}>Spending more</Text>
                            <Text style={[type.small, modalStyles.center, { color: ds.text2 }]}>
                                When this month&apos;s bar is taller than the average bars, you are spending above your average.
                            </Text>
                        </View>
                        <View style={[modalStyles.scenario, { backgroundColor: ds.inset }]}>
                            {renderVisualScenario('UNDER')}
                            <Text style={[type.body, { color: ds.text }]}>Spending less</Text>
                            <Text style={[type.small, modalStyles.center, { color: ds.text2 }]}>
                                When this month&apos;s bar is shorter, you are saving money.
                            </Text>
                        </View>
                    </View>

                    <SectionHeader title="What do the labels mean?" />
                    <Text style={[type.small, modalStyles.paragraph, { color: ds.text2 }]}>
                        <Text style={[type.smallMedium, { color: ds.text }]}>This M*: </Text>
                        Projected full month spending.{'\n'}
                        <Text style={[type.smallMedium, { color: ds.accent }]}>Solid color</Text> = actual spending so far.{'\n'}
                        <Text style={{ color: ds.accent, opacity: 0.5 }}>Lighter color</Text> = projected remaining.
                    </Text>
                    <Text style={[type.small, modalStyles.paragraph, { color: ds.text2 }]}>
                        <Text style={[type.smallMedium, { color: ds.text }]}>Avg 3M/6M/1Y: </Text>
                        Your average monthly spending over the last 3 months, 6 months, and 1 year, counting full months only.
                    </Text>

                    <View style={modalStyles.note}>
                        <Ionicons name="information-circle-outline" size={20} color={ds.text2} />
                        <Text style={[type.small, modalStyles.noteText, { color: ds.text2 }]}>
                            <Text style={[type.smallMedium, { color: ds.text }]}>New account? </Text>
                            If you just started using WealthSnap, these bars might look identical. As you track more months, they will start to show different trends.
                        </Text>
                    </View>
                </ScrollView>
            </BottomModal>

            <BottomModal
                visible={showInsightInfo}
                onClose={() => setShowInsightInfo(false)}
                title="How is this calculated?"
                maxHeight="55%"
            >
                <View>
                    <Text style={[type.small, modalStyles.lead, { color: ds.text2 }]}>
                        This smart insight compares your <Text style={{ color: ds.text }}>projected spending</Text> for this month against your <Text style={{ color: ds.text }}>3-month average</Text>.
                    </Text>
                    <Formula formula="Projected = (Spent so far ÷ Days elapsed) × Days in month" />
                    <View style={modalStyles.legend}>
                        <View style={modalStyles.legendRow}>
                            <View style={[modalStyles.legendDot, { backgroundColor: ds.success }]} />
                            <Text style={[type.small, modalStyles.noteText, { color: ds.text2 }]}>
                                <Text style={{ color: ds.text }}>Less than average: </Text>
                                You&apos;re on track to spend less than your 3-month average.
                            </Text>
                        </View>
                        <View style={modalStyles.legendRow}>
                            <View style={[modalStyles.legendDot, { backgroundColor: ds.danger }]} />
                            <Text style={[type.small, modalStyles.noteText, { color: ds.text2 }]}>
                                <Text style={{ color: ds.text }}>More than average: </Text>
                                You&apos;re on track to spend more than your 3-month average.
                            </Text>
                        </View>
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
    footnote: {
        marginTop: space[1],
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: space[3],
        marginBottom: space[2],
    },
    chartArea: {
        height: CHART_HEIGHT,
        paddingVertical: space[2],
    },
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
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
    barTop: {
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    barLabel: {
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
        gap: space[2],
        height: 60,
        width: 80,
        marginBottom: space[2],
    },
    scenarioBar: {
        width: 20,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    center: {
        textAlign: 'center',
    },
    paragraph: {
        marginTop: space[2],
    },
    lead: {
        marginBottom: space[3],
    },
    note: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[3],
        marginTop: space[6],
    },
    noteText: {
        flex: 1,
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

export default ComparisonChart;
