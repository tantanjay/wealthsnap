import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Skeleton } from '@components/common/Skeleton';
import { SectionHeader } from '@components/ds';
import { usePrivacy } from '@context/PrivacyContext';
import { useTheme } from '@context/ThemeContext';
import { formatPercent } from '@hooks/usePrivacyFormat';
import { type, space, radius } from '@styles/theme';
import { formatCurrencyAmount, formatCompactNumber, formatCompactCurrency } from '@utils/currencyUtils';
import { CalendarEvent } from '@services/domain/dividendHistoryService';
import { MonthlyDividend } from '@services/domain/investmentService';
import { Ionicons } from '@expo/vector-icons';
import { saveInvestmentDividendTab, getInvestmentDividendTab } from '@services/core/storageService';

interface DividendChartProps {
    projectedDividends: { labels: string[], data: MonthlyDividend[] };
    actualDividends: Record<number, MonthlyDividend[]>;
    calendarData: Record<number, CalendarEvent[]>;
    currency?: string;
    isLoading?: boolean;
}

type TabType = 'actual' | 'calendar' | 'projected';

const CHART_HEIGHT = 220;

const TABS: { key: TabType; label: string }[] = [
    { key: 'actual', label: 'Actual' },
    { key: 'calendar', label: 'Calendar' },
    { key: 'projected', label: 'Projected' },
];

export const DividendChart: React.FC<DividendChartProps> = ({
    projectedDividends,
    actualDividends,
    calendarData,
    currency = 'PHP',
    isLoading = false,
}) => {
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    const isDiscreet = mode === 'discreet';
    const isHidden = mode === 'hidden';
    const { width: windowWidth } = useWindowDimensions();
    const isLandscape = windowWidth > 600; // Simple landscape check

    const [activeTab, setActiveTab] = useState<TabType>('actual');
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    // For Actual Dividends Year Selection
    const availableYears = Object.keys(actualDividends).map(Number).sort((a, b) => a - b);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- default the user can still override via prev/next; see FIXES.md
            setSelectedYear(availableYears[availableYears.length - 1]);
        }
    }, [actualDividends, availableYears, selectedYear]);

    // Restore the last-selected tab (Actual / Calendar / Proj.) on mount
    const isInitialTabLoad = useRef(true);
    useEffect(() => {
        const loadTab = async () => {
            const saved = await getInvestmentDividendTab();
            if (saved === 'actual' || saved === 'calendar' || saved === 'projected') {
                setActiveTab(saved);
            }
            isInitialTabLoad.current = false;
        };
        loadTab();
    }, []);

    useEffect(() => {
        if (!isInitialTabLoad.current) {
            saveInvestmentDividendTab(activeTab);
        }
    }, [activeTab]);

    const actualYearData = actualDividends[selectedYear] || [];
    const actualTotal = actualYearData.reduce((acc, curr) => acc + curr.total, 0);
    const projectedTotal = projectedDividends.data.reduce((acc, curr) => acc + curr.total, 0);
    const displayTotal = activeTab === 'actual' ? actualTotal : projectedTotal;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    // Discreet drops the amount axis; tooltips show shares instead (% of the month, % of the year).
    const renderBarChart = (labels: string[], data: MonthlyDividend[], currentIndex: number | null) => {
        const values = data.map(d => d.total);
        const maxValue = Math.max(...values, 1);
        const yearTotal = values.reduce((sum, v) => sum + v, 0);
        const yMax = maxValue * 1.1;
        const yMin = 0;
        const yRange = yMax - yMin;
        const chartHeight = 160;
        const highlightIndex = selectedBarIndex ?? currentIndex;
        const shareOf = (part: number, whole: number) => formatPercent(whole > 0 ? (part / whole) * 100 : null);

        const yLabels: string[] = [];
        for (let i = 0; i < 4; i++) {
            const value = yMin + (yRange * (i / 3));
            yLabels.push(formatCompactNumber(value));
        }

        return (
            <View style={styles.barChart}>
                {!isDiscreet && (
                    <View style={styles.yAxis}>
                        {[...yLabels].reverse().map((label, i) => (
                            <Text key={i} style={[type.captionNum, { color: ds.text2 }]}>{label}</Text>
                        ))}
                    </View>
                )}

                <View style={styles.bars}>
                    {data.map((item, index) => {
                        const value = item.total;
                        const barHeight = yRange > 0 ? ((value - yMin) / yRange) * chartHeight : 0;
                        const isSelected = selectedBarIndex === index;
                        const showLabelInterval = Math.ceil(labels.length / 6);
                        const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

                        return (
                            <View key={index} style={{ alignItems: 'center', flex: 1, zIndex: isSelected ? 100 : 0 }}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPressIn={() => setSelectedBarIndex(index)}
                                    onPressOut={() => setSelectedBarIndex(null)}
                                    style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}
                                >
                                    <View style={[styles.bar, {
                                        height: Math.max(2, barHeight),
                                        backgroundColor: ds.accent,
                                        // Received dividends are solid, projected ones a faint tint; pressing dims a bar.
                                        opacity: (activeTab === 'projected' ? 0.22 : 1) * (selectedBarIndex === index ? 0.7 : 1),
                                    }]} />
                                </TouchableOpacity>

                                {isSelected && (
                                    <View style={[styles.tooltip, { backgroundColor: ds.raised, borderColor: ds.hairline, bottom: Math.max(2, barHeight) + space[2] }]}>
                                        <Text style={[type.captionMedium, { color: ds.text, marginBottom: space[1] }]}>{labels[index]}</Text>

                                        {data[index].breakdown.length > 0 ? (
                                            <View style={{ width: '100%', marginBottom: space[1] }}>
                                                {data[index].breakdown.map((item, i) => (
                                                    <View key={i} style={styles.tooltipRow}>
                                                        <Text style={[type.caption, { color: ds.text2 }]}>{item.symbol}</Text>
                                                        <Text style={[type.captionNum, { color: ds.text }]}>
                                                            {isDiscreet ? shareOf(item.amount, data[index].total) : formatCompactCurrency(item.amount, currency)}
                                                        </Text>
                                                    </View>
                                                ))}
                                                <View style={{ height: 1, backgroundColor: ds.hairline, marginVertical: space[1] }} />
                                            </View>
                                        ) : null}

                                        <View style={styles.tooltipRow}>
                                            <Text style={[type.captionMedium, { color: ds.text }]}>{isDiscreet ? 'Of year' : 'Total'}</Text>
                                            <Text style={[type.captionNum, { color: ds.text }]}>
                                                {isDiscreet ? shareOf(data[index].total, yearTotal) : formatCompactCurrency(data[index].total, currency)}
                                            </Text>
                                        </View>

                                        <View style={[styles.tooltipArrow, { backgroundColor: ds.raised, borderColor: ds.hairline }]} />
                                    </View>
                                )}

                                <Text numberOfLines={1} style={[type.caption, styles.barLabel, { color: highlightIndex === index ? ds.text : ds.text2, opacity: shouldShowLabel || isSelected ? 1 : 0 }]}>
                                    {labels[index]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderActualTab = () => {
        const currentData = actualDividends[selectedYear] || Array.from({ length: 12 }, () => ({ total: 0, breakdown: [] }));
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

        return (
            <View style={{ flex: 1 }}>
                <View style={styles.yearSelector}>
                    <TouchableOpacity
                        onPress={() => {
                            const idx = availableYears.indexOf(selectedYear);
                            if (idx > 0) setSelectedYear(availableYears[idx - 1]);
                        }}
                        disabled={availableYears.indexOf(selectedYear) <= 0}
                    >
                        <Ionicons name="chevron-back" size={20} color={availableYears.indexOf(selectedYear) <= 0 ? ds.text3 : ds.text} />
                    </TouchableOpacity>
                    <Text style={[type.smallStrong, { color: ds.text }]}>{selectedYear}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            const idx = availableYears.indexOf(selectedYear);
                            if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
                        }}
                        disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1 || availableYears.length === 0}
                    >
                        <Ionicons name="chevron-forward" size={20} color={availableYears.indexOf(selectedYear) >= availableYears.length - 1 || availableYears.length === 0 ? ds.text3 : ds.text} />
                    </TouchableOpacity>
                </View>
                {renderBarChart(months, currentData, selectedYear === currentYear ? currentMonth : null)}
            </View>
        );
    };

    const renderCalendarTab = () => {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const numColumns = isLandscape ? 4 : 3;
        const monthWidth = `${(100 / numColumns) - 2}%` as any;

        return (
            <View style={styles.calendarGrid}>
                {months.map((month, idx) => {
                    const events = calendarData[idx] || [];
                    // 12 months divides evenly by both 3 and 4 columns, so the last row is always
                    // the final `numColumns` cells - skip their bottom margin so the grid doesn't
                    // add a trailing gap the card then has to accommodate.
                    const isLastRow = idx >= months.length - numColumns;
                    return (
                        <View
                            key={month}
                            style={[
                                styles.calendarMonth,
                                { width: monthWidth, backgroundColor: ds.inset },
                                isLastRow && { marginBottom: 0 }
                            ]}
                        >
                            <Text style={[type.captionMedium, { color: ds.text2 }]}>{month}</Text>
                            <View style={styles.assetList}>
                                {events.length > 0 ? events.map((ev, i) => (
                                    <Text key={i} style={[type.captionMedium, { color: ds.text }]}>{ev.symbol}</Text>
                                )) : (
                                    <Text style={[type.caption, { color: ds.text3 }]}>—</Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderContent = () => {
        if (isHidden) {
            return (
                <View style={[styles.placeholder, { backgroundColor: ds.inset }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={ds.text2} />
                    <Text style={[type.small, { color: ds.text2 }]}>Chart hidden for privacy</Text>
                </View>
            );
        }

        switch (activeTab) {
            case 'actual':
                return renderActualTab();
            case 'calendar':
                return renderCalendarTab();
            case 'projected':
            default:
                const labels = projectedDividends.labels.length > 0 ? projectedDividends.labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const data = projectedDividends.data.length > 0 ? projectedDividends.data : Array.from({ length: 12 }, () => ({ total: 0, breakdown: [] }));
                // Projections cover the current year.
                return renderBarChart(labels, data, currentMonth);
        }
    };

    return (
        <View>
            <SectionHeader title="Dividends" menu={{ options: TABS, value: activeTab, onSelect: key => setActiveTab(key as TabType) }} />
            {/* Discreet leaves the year's total out; it has no scale-free version here. */}
            {activeTab !== 'calendar' && !isDiscreet && (
                <Text style={[type.titleNum, styles.total, { color: ds.text }]}>
                    {isHidden ? '****' : formatCurrencyAmount(displayTotal, currency)}
                </Text>
            )}

            {isLoading ? (
                <Skeleton width="100%" height={CHART_HEIGHT} borderRadius={radius.md} />
            ) : (
                // key={activeTab} forces a clean remount per tab instead of reusing the same
                // native node across drastically different content shapes (fixed-height bar
                // chart vs. content-sized calendar grid), which was leaving stale layout
                // sizing behind when switching back from Calendar to Actual/Projected.
                <View key={activeTab} style={activeTab === 'calendar' && !isHidden ? undefined : { height: CHART_HEIGHT }}>
                    {renderContent()}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    total: {
        marginBottom: space[2],
    },
    placeholder: {
        flex: 1,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        gap: space[2],
    },
    barChart: {
        flex: 1,
        flexDirection: 'row',
        marginTop: space[2],
    },
    yAxis: {
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        paddingBottom: space[5],
        paddingRight: space[1],
    },
    bars: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
    },
    bar: {
        width: '70%',
        minWidth: 3,
        maxWidth: 30,
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    tooltip: {
        position: 'absolute',
        padding: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        alignItems: 'center',
        zIndex: 1000,
        minWidth: 100,
    },
    tooltipRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        gap: space[3],
    },
    tooltipArrow: {
        position: 'absolute',
        bottom: -4,
        width: 8,
        height: 8,
        transform: [{ rotate: '45deg' }],
        borderBottomWidth: 1,
        borderRightWidth: 1,
        zIndex: -1
    },
    barLabel: {
        marginTop: space[1],
        width: 32,
        textAlign: 'center',
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[5],
        marginBottom: space[1],
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: space[1],
    },
    calendarMonth: {
        borderRadius: radius.sm,
        padding: space[2],
        marginBottom: space[2],
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
    },
    assetList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        columnGap: space[1],
    },
});
