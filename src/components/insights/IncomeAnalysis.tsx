import React, { useEffect, useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-gifted-charts';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import MonthEndProjectionModal from '@components/insights/modals/MonthEndProjectionModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getMonthlyTrends, getMonthlyTrendsForYear } from '@utils/financialMetrics';
import { CURRENCY_SYMBOLS, formatCompactCurrency } from '@utils/currencyUtils';
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
    isPrivacyEnabled: boolean;
    transactions: Transaction[];
    isLoading?: boolean;
    selectedDate?: Date;
}

const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ monthlyTrends: initialTrends, categoryBreakdown, currency, isPrivacyEnabled, transactions, isLoading = false, selectedDate = new Date() }) => {
    const { colors } = useTheme();
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

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: item.amount,
        color: index % 2 === 0 ? colors.primary : '#FF9800',
        legendFontColor: colors.textSecondary,
        legendFontSize: 12
    }));

    // ... getInsight and renderTimeFilter ...
    // Generate smart insight (using active trends)
    const getInsight = () => {
        if (isPrivacyEnabled) return "Income insights hidden in privacy mode.";

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
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 }}>
                <TouchableOpacity
                    onPress={() => setSelectedYear(availableYears[currentIndex + 1])}
                    disabled={!hasPrev}
                >
                    <Ionicons name="chevron-back" size={20} color={hasPrev ? colors.text : colors.border} />
                </TouchableOpacity>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>{selectedYear}</Text>
                <TouchableOpacity
                    onPress={() => setSelectedYear(availableYears[currentIndex - 1])}
                    disabled={!hasNext}
                >
                    <Ionicons name="chevron-forward" size={20} color={hasNext ? colors.text : colors.border} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Income Analytics</Text>
                    <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Projection Button */}
                {!isPrivacyEnabled && (
                    <TouchableOpacity
                        onPress={() => setShowProjectionModal(true)}
                        style={{
                            padding: 8,
                            backgroundColor: colors.primary + '20',
                            borderRadius: 8
                        }}
                    >
                        <Ionicons name="trending-up" size={18} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                <Text style={{ color: colors.text, flex: 1 }}>{isLoading ? "Analyzing income trends..." : getInsight()}</Text>
                <TouchableOpacity onPress={() => setShowInsightInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity
                            onPress={() => handleTabChange('TREND')}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: activeTab === 'TREND' ? colors.surface : 'transparent',
                                borderRadius: 6,
                                borderWidth: activeTab === 'TREND' ? 1 : 0,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{
                                color: activeTab === 'TREND' ? colors.text : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: activeTab === 'TREND' ? '600' : '400'
                            }}>Trend</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => handleTabChange('SOURCES')}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: activeTab === 'SOURCES' ? colors.surface : 'transparent',
                                borderRadius: 6,
                                borderWidth: activeTab === 'SOURCES' ? 1 : 0,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{
                                color: activeTab === 'SOURCES' ? colors.text : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: activeTab === 'SOURCES' ? '600' : '400'
                            }}>Sources</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Time Range Filter - Only show for TREND tab */}
                    {activeTab === 'TREND' && (
                        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
                    )}
                </View>

                {!isPrivacyEnabled ? (
                    isLoading ? (
                        <View style={{ height: 220, padding: 10, justifyContent: 'center', alignItems: 'center' }}>
                            <Skeleton width="100%" height={200} borderRadius={16} />
                        </View>
                    ) : activeTab === 'TREND' ? (
                        <View style={{ height: 220, paddingVertical: 10 }}>
                            {activeTab === 'TREND' && timeRange === '1Y' && renderYearSelector()}
                            {(() => {
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

                                // Replace last label with * indicator only if it's the actual current month
                                if (labels.length > 0 && isCurrentlyThisMonth) {
                                    labels[labels.length - 1] = labels[labels.length - 1] + "*";
                                    fullLabels[fullLabels.length - 1] = fullLabels[fullLabels.length - 1] + "*";
                                }

                                const barData = labels.map((label, index) => {
                                    const today = new Date();
                                    const isActualCurrentMonth = selectedYear === today.getFullYear() && index === today.getMonth();
                                    const isCurrentMonth = timeRange === '1Y' ? (isActualCurrentMonth && isCurrentlyThisMonth) : (index === labels.length - 1 && isCurrentlyThisMonth);

                                    const value = isCurrentMonth ? proRatedIncome : (rawData[index] || 0);
                                    const actual = rawData[index] || 0;

                                    // Smart Labeling: Throttling for density
                                    const showLabelInterval = Math.ceil(labels.length / 6);
                                    const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

                                    return {
                                        label: shouldShowLabel ? label : '',
                                        fullLabel: fullLabels[index],
                                        value,
                                        actual,
                                        isProjected: isCurrentMonth
                                    };
                                });

                                const maxValue = BigNumber.max(...barData.map(b => b.value), 1); // Prevent 0 division
                                const yMin = 0;
                                const yMax = maxValue.toNumber() * 1.05; // 5% padding
                                const yRange = yMax - yMin;
                                const chartHeight = 150;

                                // Generate Y-axis labels (4 labels)
                                const yLabels = [];
                                for (let i = 0; i < 4; i++) {
                                    const value = yMin + (yRange * (i / 3));
                                    let formatted = value;
                                    let suffix = '';
                                    if (value >= 1000000) {
                                        formatted = value / 1000000;
                                        suffix = 'M';
                                    } else if (value >= 1000) {
                                        formatted = value / 1000;
                                        suffix = 'K';
                                    }
                                    yLabels.push(`${CURRENCY_SYMBOLS[currency] || currency}${formatted.toFixed(1)}${suffix}`);
                                }

                                return (
                                    <View style={{ flex: 1, flexDirection: 'row' }}>
                                        {/* Y-Axis Labels */}
                                        <View style={{ width: 45, justifyContent: 'space-between', paddingBottom: 25, alignItems: 'flex-end', paddingRight: 5 }}>
                                            {yLabels.reverse().map((label, i) => (
                                                <Text key={i} style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
                                            ))}
                                        </View>

                                        {/* Bars */}
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                                            {barData.map((bar, index) => {
                                                const totalHeight = yRange > 0 ? ((bar.value.toNumber() - yMin) / yRange) * chartHeight : 0;
                                                const actualHeight = yRange > 0 ? ((bar.actual.toNumber() - yMin) / yRange) * chartHeight : 0;
                                                // If projected < actual, prevent overflow
                                                const projectedHeight = bar.isProjected ? Math.max(0, totalHeight - actualHeight) : 0;
                                                const isSelected = selectedBarIndex === index;

                                                return (
                                                    <View key={index} style={{ alignItems: 'center', flex: 1, zIndex: isSelected ? 100 : 0, elevation: isSelected ? 10 : 0 }}>
                                                        <TouchableOpacity
                                                            activeOpacity={1}
                                                            onPressIn={() => setSelectedBarIndex(index)}
                                                            onPressOut={() => setSelectedBarIndex(null)}
                                                            style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}
                                                        >
                                                            {bar.isProjected ? (
                                                                <View style={{ width: '50%', borderRadius: 4, overflow: 'hidden' }}>
                                                                    {/* Projected (Lighter) */}
                                                                    <View style={{
                                                                        height: projectedHeight,
                                                                        backgroundColor: isSelected ? colors.primary + '80' : colors.primary + '50', // Lighter opacity
                                                                        borderTopLeftRadius: 4,
                                                                        borderTopRightRadius: 4,
                                                                    }} />
                                                                    {/* Actual (Solid) */}
                                                                    <View style={{
                                                                        height: Math.max(0, actualHeight),
                                                                        backgroundColor: isSelected ? colors.primary : colors.primary,
                                                                        opacity: isSelected ? 0.9 : 1,
                                                                        borderBottomLeftRadius: 4,
                                                                        borderBottomRightRadius: 4,
                                                                        borderTopLeftRadius: projectedHeight > 0 ? 0 : 4,
                                                                        borderTopRightRadius: projectedHeight > 0 ? 0 : 4,
                                                                    }} />
                                                                </View>
                                                            ) : (
                                                                <View style={{
                                                                    height: Math.max(0, totalHeight),
                                                                    width: '50%',
                                                                    backgroundColor: colors.primary,
                                                                    opacity: isSelected ? 0.8 : 1,
                                                                    borderRadius: 4,
                                                                }} />
                                                            )}
                                                        </TouchableOpacity>

                                                        {/* Tooltip Overlay */}
                                                        {isSelected && (
                                                            <View style={{
                                                                position: 'absolute',
                                                                bottom: Math.max(0, totalHeight) + 8, // Dynamic positioning
                                                                backgroundColor: colors.surface,
                                                                padding: 8,
                                                                borderRadius: 8,
                                                                shadowColor: '#000',
                                                                shadowOffset: { width: 0, height: 2 },
                                                                shadowOpacity: 0.15,
                                                                shadowRadius: 4,
                                                                elevation: 10,
                                                                minWidth: 100,
                                                                alignItems: 'center',
                                                                borderWidth: 1,
                                                                borderColor: colors.border,
                                                                zIndex: 100
                                                            }}>
                                                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>{bar.fullLabel.replace('*', '')}</Text>
                                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                                    Actual: <Text style={{ color: colors.text }}>{formatCompactCurrency(bar.actual, currency)}</Text>
                                                                </Text>
                                                                {bar.isProjected && (
                                                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                                        Proj: <Text style={{ color: colors.text }}>{formatCompactCurrency(bar.value, currency)}</Text>
                                                                    </Text>
                                                                )}
                                                                {/* Arrow */}
                                                                <View style={{
                                                                    position: 'absolute',
                                                                    bottom: -6,
                                                                    width: 12,
                                                                    height: 12,
                                                                    backgroundColor: colors.surface,
                                                                    transform: [{ rotate: '45deg' }],
                                                                    borderBottomWidth: 1,
                                                                    borderRightWidth: 1,
                                                                    borderColor: colors.border,
                                                                    zIndex: -1
                                                                }} />
                                                            </View>
                                                        )}

                                                        <Text
                                                            numberOfLines={1}
                                                            style={{
                                                                color: isSelected ? colors.primary : colors.textSecondary,
                                                                fontSize: 10,
                                                                marginTop: 6,
                                                                width: 40,
                                                                textAlign: 'center',
                                                                fontWeight: isSelected ? 'bold' : 'normal',
                                                                opacity: bar.label || isSelected ? 1 : 0
                                                            }}
                                                        >
                                                            {bar.label}
                                                        </Text>
                                                    </View>
                                                )
                                            })}
                                        </View>
                                    </View>
                                );
                            })()}
                        </View>
                    ) : (
                        pieData.length > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                {/* Chart Section */}
                                <View style={{ flex: 6, alignItems: 'center' }}>
                                    <PieChart
                                        data={pieData.map(d => ({
                                            value: d.population.toNumber(),
                                            color: d.color,
                                            text: '', // No text inside slices, moving to legend
                                        }))}
                                        radius={70} // Reduced radius to fit side-by-side
                                        donut
                                        innerCircleColor={colors.surface}
                                        innerRadius={40}
                                        centerLabelComponent={() => {
                                            return (
                                                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                                    <Text style={{ fontSize: 16, color: colors.text, fontWeight: 'bold' }}>
                                                        {categoryBreakdown.length}
                                                    </Text>
                                                    <Text style={{ fontSize: 8, color: colors.textSecondary }}>Sources</Text>
                                                </View>
                                            );
                                        }}
                                    />
                                </View>

                                {/* Legend (Ledger) Section - Right Side */}
                                <View style={{ flex: 4, paddingLeft: 10 }}>
                                    <View style={{ gap: 8 }}>
                                        {categoryBreakdown.map((item, index) => {
                                            return (
                                                <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pieData[index].color, marginRight: 8, marginTop: 2 }} />
                                                    <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                                                        {item.name} <Text style={{ fontWeight: 'bold', color: colors.text }}>({item.percentage.toFixed(0)}%)</Text>
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            </View>
                        ) : (
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No income data available.</Text>
                        )
                    )
                ) : (
                    <View style={{
                        height: 220,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.border + '20',
                        borderRadius: 16,
                        marginVertical: 8
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>🔒 Chart hidden for privacy</Text>
                    </View>
                )}
            </Card>

            <MonthEndProjectionModal
                visible={showProjectionModal}
                onClose={() => setShowProjectionModal(false)}
                transactions={transactions}
                currency={currency}
            />

            <BottomModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Understanding Your Chart"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.text, marginBottom: 15, lineHeight: 22 }}>
                        This chart compares your current income against your past months.
                    </Text>

                    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                        <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginRight: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, width: 80, justifyContent: 'center', marginBottom: 5 }}>
                                <View style={{ width: 30, height: '80%', backgroundColor: colors.primary, borderRadius: 4 }} />
                            </View>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Actual</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                                The solid bar shows income you have already received.
                            </Text>
                        </View>

                        <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginLeft: 8 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, width: 80, justifyContent: 'center', marginBottom: 5 }}>
                                <View style={{ width: 30, borderRadius: 4, overflow: 'hidden', height: '80%' }}>
                                    <View style={{ flex: 1, backgroundColor: colors.primary + '50' }} />
                                    <View style={{ flex: 1, backgroundColor: colors.primary }} />
                                </View>
                            </View>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Projected</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                                The lighter top part is what you&apos;re projected to earn by month end.
                            </Text>
                        </View>
                    </View>

                    <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 8, marginTop: 5 }}>What do the labels mean?</Text>
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>• <Text style={{ color: colors.text, fontWeight: 'bold' }}>Current Month*:</Text> The asterisk (*) indicates this is a projection.</Text>
                        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>• <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Solid Color:</Text> Actual income recorded.</Text>
                        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>• <Text style={{ color: colors.primary + '80', fontWeight: 'bold' }}>Lighter Color:</Text> Projecting you will match your historical average.</Text>
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>
            </BottomModal>
            <BottomModal
                visible={showInsightInfo}
                onClose={() => setShowInsightInfo(false)}
                title="How is this calculated?"
                maxHeight="40%"
            >
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 10, lineHeight: 22 }}>
                        This smart insight compares your <Text style={{ fontWeight: 'bold' }}>current month&apos;s income</Text> (including projections) against the <Text style={{ fontWeight: 'bold' }}>previous month</Text>.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginTop: 5 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            • <Text style={{ color: colors.primary, fontWeight: 'bold' }}>Growth:</Text> You earned more than last month.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                            • <Text style={{ color: '#FF5252', fontWeight: 'bold' }}>Decline:</Text> Income is lower than last month.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                            • <Text style={{ color: colors.text, fontWeight: 'bold' }}>Stable:</Text> Income is roughly the same.
                        </Text>
                    </View>
                    <View style={{ height: 20 }} />
                </View>
            </BottomModal>
        </View >
    );
};

export default IncomeAnalysis;
