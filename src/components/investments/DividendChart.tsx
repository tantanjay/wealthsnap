import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions } from 'react-native';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount, formatCompactNumber, formatCompactCurrency } from '@utils/currencyUtils';
import { CalendarEvent } from '@services/domain/dividendHistoryService';
import { MonthlyDividend } from '@services/domain/investmentService';
import { Ionicons } from '@expo/vector-icons';

interface DividendChartProps {
    projectedDividends: { labels: string[], data: MonthlyDividend[] };
    actualDividends: Record<number, MonthlyDividend[]>;
    calendarData: Record<number, CalendarEvent[]>;
    currency?: string;
    isLoading?: boolean;
    isPrivacyEnabled?: boolean;
}

type TabType = 'actual' | 'calendar' | 'projected';

export const DividendChart: React.FC<DividendChartProps> = ({
    projectedDividends,
    actualDividends,
    calendarData,
    currency = 'PHP',
    isLoading = false,
    isPrivacyEnabled = false,
}) => {
    const { colors } = useTheme();
    const { width: windowWidth } = useWindowDimensions();
    const isLandscape = windowWidth > 600; // Simple landscape check

    const [activeTab, setActiveTab] = useState<TabType>('actual');
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);

    // For Actual Dividends Year Selection
    const availableYears = Object.keys(actualDividends).map(Number).sort((a, b) => a - b);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    useEffect(() => {
        if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
            setSelectedYear(availableYears[availableYears.length - 1]);
        }
    }, [actualDividends, availableYears, selectedYear]);

    const actualYearData = actualDividends[selectedYear] || [];
    const actualTotal = actualYearData.reduce((acc, curr) => acc + curr.total, 0);
    const projectedTotal = projectedDividends.data.reduce((acc, curr) => acc + curr.total, 0);
    const displayTotal = activeTab === 'actual' ? actualTotal : projectedTotal;

    const renderBarChart = (labels: string[], data: MonthlyDividend[]) => {
        const values = data.map(d => d.total);
        const maxValue = Math.max(...values, 1);
        const yMax = maxValue * 1.1;
        const yMin = 0;
        const yRange = yMax - yMin;
        const chartHeight = 160;

        const yLabels: string[] = [];
        for (let i = 0; i < 4; i++) {
            const value = yMin + (yRange * (i / 3));
            yLabels.push(formatCompactNumber(value));
        }

        return (
            <View style={{ flex: 1, flexDirection: 'row', marginTop: 10 }}>
                <View style={{ width: 35, justifyContent: 'space-between', paddingBottom: 20, alignItems: 'flex-end', paddingRight: 4 }}>
                    {[...yLabels].reverse().map((label, i) => (
                        <Text key={i} style={{ color: colors.textSecondary, fontSize: 9 }}>{label}</Text>
                    ))}
                </View>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
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
                                    <View style={{
                                        position: 'relative',
                                        height: Math.max(2, barHeight),
                                        width: '70%',
                                        backgroundColor: activeTab === 'actual' ? colors.primary : '#10B981',
                                        opacity: isSelected ? 0.7 : 1,
                                        borderRadius: 4,
                                        minWidth: 3,
                                        maxWidth: 30
                                    }} />
                                </TouchableOpacity>

                                {isSelected && (
                                    <View style={[styles.tooltip, { backgroundColor: colors.surface, borderColor: colors.border, bottom: Math.max(2, barHeight) + 10 }]}>
                                        <Text style={{ color: colors.text, fontSize: 10, fontWeight: 'bold', marginBottom: 4 }}>{labels[index]}</Text>

                                        {data[index].breakdown.length > 0 ? (
                                            <View style={{ width: '100%', marginBottom: 4 }}>
                                                {data[index].breakdown.map((item, i) => (
                                                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 8 }}>{item.symbol}</Text>
                                                        <Text style={{ color: colors.text, fontSize: 8, fontWeight: '600' }}>
                                                            {formatCompactCurrency(item.amount, currency)}
                                                        </Text>
                                                    </View>
                                                ))}
                                                <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 4 }} />
                                            </View>
                                        ) : null}

                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: 10 }}>
                                            <Text style={{ color: colors.text, fontSize: 9, fontWeight: 'bold' }}>Total</Text>
                                            <Text style={{ color: colors.primary, fontSize: 9, fontWeight: 'bold' }}>
                                                {formatCompactCurrency(data[index].total, currency)}
                                            </Text>
                                        </View>

                                        <View style={[styles.tooltipArrow, { backgroundColor: colors.surface, borderColor: colors.border }]} />
                                    </View>
                                )}

                                <Text numberOfLines={1} style={[styles.barLabel, { color: isSelected ? colors.primary : colors.textSecondary, opacity: shouldShowLabel || isSelected ? 1 : 0 }]}>
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
                        <Ionicons name="chevron-back" size={20} color={availableYears.indexOf(selectedYear) <= 0 ? colors.border : colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.yearText, { color: colors.text }]}>{selectedYear}</Text>
                    <TouchableOpacity
                        onPress={() => {
                            const idx = availableYears.indexOf(selectedYear);
                            if (idx < availableYears.length - 1) setSelectedYear(availableYears[idx + 1]);
                        }}
                        disabled={availableYears.indexOf(selectedYear) >= availableYears.length - 1 || availableYears.length === 0}
                    >
                        <Ionicons name="chevron-forward" size={20} color={availableYears.indexOf(selectedYear) >= availableYears.length - 1 || availableYears.length === 0 ? colors.border : colors.text} />
                    </TouchableOpacity>
                </View>
                {renderBarChart(months, currentData)}
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
                    return (
                        <View
                            key={month}
                            style={[
                                styles.calendarMonth,
                                {
                                    width: monthWidth,
                                    borderColor: colors.border,
                                    backgroundColor: colors.surface
                                }
                            ]}
                        >
                            <Text style={[styles.monthTitle, { color: colors.textSecondary }]}>{month}</Text>
                            <View style={styles.assetList}>
                                {events.length > 0 ? events.map((ev, i) => (
                                    <View key={i} style={[styles.assetBadge, { backgroundColor: colors.primary + '15' }]}>
                                        <Text style={[styles.assetText, { color: colors.primary }]}>{ev.symbol}</Text>
                                    </View>
                                )) : (
                                    <Text style={{ fontSize: 8, color: colors.border, fontStyle: 'italic' }}>-</Text>
                                )}
                            </View>
                        </View>
                    );
                })}
            </View>
        );
    };

    const renderContent = () => {
        if (isPrivacyEnabled) {
            return (
                <View style={styles.placeholderContainer}>
                    <Text style={{ color: colors.textSecondary }}>🔒 Chart hidden for privacy</Text>
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
                return renderBarChart(labels, data);
        }
    };

    return (
        <View style={styles.outerContainer}>
            <View style={styles.headerRow}>
                <View>
                    <Text style={[styles.title, { color: colors.text }]}>Dividends</Text>
                    <Text style={[styles.total, { color: colors.primary, opacity: activeTab === 'calendar' ? 0 : 1 }]}>
                        {isPrivacyEnabled ? "••••" : formatCurrencyAmount(displayTotal, currency)}
                    </Text>
                </View>

                {/* Tabs moved to Header */}
                <View style={[styles.tabContainer, { backgroundColor: colors.background, marginBottom: 0 }]}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'actual' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('actual')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'actual' ? '#fff' : colors.textSecondary }]}>Actual</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'calendar' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('calendar')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'calendar' ? '#fff' : colors.textSecondary }]}>Calendar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'projected' && { backgroundColor: colors.primary }]}
                        onPress={() => setActiveTab('projected')}
                    >
                        <Text style={[styles.tabText, { color: activeTab === 'projected' ? '#fff' : colors.textSecondary }]}>Proj.</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.card, { backgroundColor: colors.surface }]}>

                {isLoading ? (
                    <Skeleton width="100%" height={220} borderRadius={12} />
                ) : (
                    <View style={activeTab === 'calendar' ? undefined : { height: 220 }}>
                        {renderContent()}
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        marginBottom: 20,
        marginHorizontal: 16,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingHorizontal: 4
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    total: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    card: {
        borderRadius: 16,
        padding: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    tabContainer: {
        flexDirection: 'row',
        marginBottom: 12,
        borderRadius: 8,
        padding: 2,
        alignSelf: 'flex-start'
    },
    tab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    tabText: {
        fontSize: 12,
        fontWeight: '700'
    },
    placeholderContainer: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    tooltip: {
        position: 'absolute',
        padding: 6,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
        zIndex: 1000,
        minWidth: 100,
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
        fontSize: 8,
        marginTop: 4,
        width: 30,
        textAlign: 'center',
    },
    yearSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        marginBottom: 4
    },
    yearText: {
        fontSize: 14,
        fontWeight: 'bold'
    },
    calendarGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingTop: 4
    },
    calendarMonth: {
        aspectRatio: 1,
        borderWidth: 1,
        borderRadius: 8,
        padding: 4,
        marginBottom: 8,
        alignItems: 'center',
        minHeight: 60
    },
    monthTitle: {
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2
    },
    assetList: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignContent: 'center',
        gap: 2
    },
    assetBadge: {
        paddingHorizontal: 3,
        paddingVertical: 1,
        borderRadius: 4
    },
    assetText: {
        fontSize: 7,
        fontWeight: 'bold'
    }
});
