import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PieChart } from 'react-native-chart-kit';

import BottomModal from '@components/common/BottomModal';
import MonthEndProjectionModal from '@components/transaction/modals/MonthEndProjectionModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getMonthlyTrends } from '@utils/financialMetrics';
import { CURRENCY_SYMBOLS, formatCompactCurrency } from '@utils/currencyUtils';

interface IncomeAnalysisProps {
    monthlyTrends: {
        labels: string[];
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
}

const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ monthlyTrends: initialTrends, categoryBreakdown, currency, isPrivacyEnabled, transactions, isLoading = false }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const [showProjectionModal, setShowProjectionModal] = React.useState(false);
    const [showInfoModal, setShowInfoModal] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'TREND' | 'SOURCES'>('TREND');
    const [showInsightInfo, setShowInsightInfo] = React.useState(false);

    // Time Range Filter Logic
    const [timeRange, setTimeRange] = React.useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');

    // Calculate how many months of data to load based on selection
    const monthsToLoad = useMemo(() => {
        if (timeRange === '6M') return 6;
        if (timeRange === '1Y') return 12;
        if (timeRange === '3Y') return 36;

        // For 'ALL', calculate months since first transaction
        if (transactions.length === 0) return 6;
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const today = new Date();
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6); // Ensure at least 6 months shown even if data is new
    }, [timeRange, transactions]);

    // Recalculate trends based on selected time range
    const activeMonthlyTrends = useMemo(() => {
        return getMonthlyTrends(transactions, monthsToLoad);
    }, [transactions, monthsToLoad]);

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: item.amount,
        color: index % 2 === 0 ? colors.primary : '#FF9800', // Simple alternator for now, could be better
        legendFontColor: colors.textSecondary,
        legendFontSize: 12
    }));

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

    const renderTimeFilter = () => (
        <View style={{ flexDirection: 'row', backgroundColor: colors.border + '40', borderRadius: 8, padding: 2 }}>
            {(['6M', '1Y', '3Y', 'ALL'] as const).map((range) => (
                <Text
                    key={range}
                    onPress={() => setTimeRange(range)}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: timeRange === range ? colors.surface : 'transparent',
                        color: timeRange === range ? colors.primary : colors.textSecondary,
                        fontWeight: timeRange === range ? '600' : '400',
                        fontSize: 12,
                        overflow: 'hidden',
                        elevation: timeRange === range ? 1 : 0,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: timeRange === range ? 0.1 : 0,
                        shadowRadius: 1
                    }}
                >
                    {range}
                </Text>
            ))}
        </View>
    );

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
                            onPress={() => setActiveTab('TREND')}
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
                            onPress={() => setActiveTab('SOURCES')}
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
                    {activeTab === 'TREND' && renderTimeFilter()}
                </View>

                {!isPrivacyEnabled ? (
                    isLoading ? (
                        <View style={{ height: 220, padding: 10, justifyContent: 'center', alignItems: 'center' }}>
                            <Skeleton width="100%" height={200} borderRadius={16} />
                        </View>
                    ) : activeTab === 'TREND' ? (
                        <View style={{ height: 220, paddingVertical: 10 }}>
                            {(() => {
                                // Prepare data with pro-rated projection (Historical Average Strategy)
                                // Use historical average as the target for the current month's projection

                                const labels = [...activeMonthlyTrends.labels];
                                const rawData = [...activeMonthlyTrends.incomeData];

                                // Last element is current month
                                const currentMonthIncome = rawData[rawData.length - 1] || new BigNumber(0);

                                // Calculate Average from historical months (exclude current)
                                const historicalData = rawData.slice(0, rawData.length - 1);
                                // 1. Sum up the history using .plus()
                                const historicalTotal = historicalData.reduce(
                                    (sum, val) => sum.plus(val),
                                    new BigNumber(0)
                                );

                                // 2. Calculate average using .dividedBy()
                                const averageIncome = historicalData.length > 0
                                    ? historicalTotal.dividedBy(historicalData.length)
                                    : currentMonthIncome; // currentMonthIncome should also be a BigNumber

                                // Projection = Max(Current, Average)
                                // If current < average, project we will reach the average.
                                // If current > average, projection is just the current income (no extra bar).
                                const proRatedIncome = BigNumber.max(currentMonthIncome, averageIncome);

                                // Replace last label with * indicator
                                if (labels.length > 0) {
                                    labels[labels.length - 1] = labels[labels.length - 1] + "*";
                                }

                                const barData = labels.map((label, index) => {
                                    const isCurrentMonth = index === labels.length - 1;
                                    const value = isCurrentMonth ? proRatedIncome : (rawData[index] || 0);
                                    const actual = rawData[index] || 0;

                                    // Smart Labeling: Throttling for density
                                    const showLabelInterval = Math.ceil(labels.length / 6);
                                    const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

                                    return {
                                        label: shouldShowLabel ? label : '',
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

                                                return (
                                                    <View key={index} style={{ alignItems: 'center', flex: 1 }}>
                                                        <View style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                                                            {bar.isProjected ? (
                                                                <View style={{ width: '50%', borderRadius: 4, overflow: 'hidden' }}>
                                                                    {/* Projected (Lighter) */}
                                                                    <View style={{
                                                                        height: projectedHeight,
                                                                        backgroundColor: colors.primary + '50', // Lighter opacity
                                                                        borderTopLeftRadius: 4,
                                                                        borderTopRightRadius: 4,
                                                                    }} />
                                                                    {/* Actual (Solid) */}
                                                                    <View style={{
                                                                        height: Math.max(0, actualHeight),
                                                                        backgroundColor: colors.primary,
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
                                                                    borderRadius: 4,
                                                                }} />
                                                            )}
                                                        </View>
                                                        <Text
                                                            numberOfLines={1}
                                                            style={{
                                                                color: colors.textSecondary,
                                                                fontSize: 10,
                                                                marginTop: 6,
                                                                width: 40,
                                                                textAlign: 'center'
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
                            <>
                                <PieChart
                                    data={pieData}
                                    width={screenWidth - 64}
                                    height={220}
                                    chartConfig={{
                                        color: (opacity = 1) => colors.text,
                                    }}
                                    accessor={"population"}
                                    backgroundColor={"transparent"}
                                    paddingLeft={"15"}
                                    center={[10, 0]}
                                    absolute={false}
                                />
                                <View style={{ marginTop: 20 }}>
                                    {categoryBreakdown.map((item, index) => (
                                        <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pieData[index].color, marginRight: 10 }} />
                                                <Text style={{ color: colors.text, fontSize: 14 }}>{item.name}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                                                    {formatCompactCurrency(item.amount, currency)}
                                                </Text>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.percentage.toFixed(1)}%</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
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
