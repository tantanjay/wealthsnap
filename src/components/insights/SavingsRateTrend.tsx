import React, { useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getSavingsRateTrend } from '@utils/financialMetrics';

interface SavingsRateTrendProps {
    transactions: Transaction[];
    privacyMode: boolean;
    isLoading?: boolean;
}

const SavingsRateTrend: React.FC<SavingsRateTrendProps> = ({ transactions, privacyMode, isLoading = false }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    const [timeRange, setTimeRange] = React.useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');
    const [showInfoModal, setShowInfoModal] = React.useState(false);

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

    const savingsData = useMemo(() => {
        const data = getSavingsRateTrend(transactions, monthsToLoad);

        // Optimize labels for large datasets (prevent overcrowding)
        const labels = data.map((d, index) => {
            // If dataset is small, show all labels
            if (data.length <= 12) return d.month;

            // For large datasets, show roughly 6 labels evenly distributed
            const interval = Math.ceil(data.length / 6);

            // Always show first and last, and periodic interval matches
            if (index === 0 || index === data.length - 1 || index % interval === 0) {
                return d.month;
            }
            return ''; // Hide label
        });

        return {
            labels: labels,
            datasets: [{
                data: data.map(d => d.rate),
                color: (opacity = 1) => colors.primary,
                strokeWidth: 3
            }],
            rawData: data
        };
    }, [transactions, monthsToLoad, colors.primary]);



    // Calculate average savings rate
    const avgRate = useMemo(() => {
        if (savingsData.rawData.length === 0) return 0;
        const sum = savingsData.rawData.reduce((acc, d) => acc + d.rate, 0);
        return Math.round((sum / savingsData.rawData.length) * 10) / 10;
    }, [savingsData.rawData]);

    // Calculate chart bounds for Symmetric Y-Axis
    const chartStats = useMemo(() => {
        if (savingsData.rawData.length === 0) return { min: -100, max: 100, zeroOffset: 0.5, step: 25 };

        const rates = savingsData.rawData.map(d => d.rate);
        const dataMax = Math.max(...rates);
        const dataMin = Math.min(...rates);

        // Create symmetric chart boundary based on max absolute value
        const absMax = Math.max(Math.abs(dataMax), Math.abs(dataMin));

        // Round up to nearest nice number
        let boundary = 100;
        if (absMax <= 10) boundary = 10;
        else if (absMax <= 25) boundary = 25;
        else if (absMax <= 50) boundary = 50;
        else if (absMax <= 100) boundary = 100;
        else boundary = Math.ceil(absMax / 50) * 50;

        const min = -boundary;
        const max = boundary;

        // 8 sections for symmetry around zero
        const sections = 8;
        const step = (max - min) / sections;

        return { min, max, zeroOffset: 0.5, step };
    }, [savingsData.rawData]);

    const latestRate = savingsData.rawData[savingsData.rawData.length - 1]?.rate || 0;

    // Calculate consecutive positive/negative streak
    const streak = useMemo(() => {
        // Filter out months with no transaction data
        const data = savingsData.rawData.filter(d => !d.income.isZero() || !d.expense.isZero());
        if (data.length === 0) return { count: 0, type: 'neutral' as const };

        const lastRate = data[data.length - 1].rate;
        let count = 0;
        const currentType = lastRate >= 0 ? 'positive' : 'negative';

        // Count backwards
        for (let i = data.length - 1; i >= 0; i--) {
            const rate = data[i].rate;
            const monthType = rate >= 0 ? 'positive' : 'negative';

            if (monthType === currentType) {
                count++;
            } else {
                break;
            }
        }

        return { count, type: currentType };
    }, [savingsData.rawData]);

    // Calculate historical stats for selected range
    const historicalStats = useMemo(() => {
        // Filter out months with no transaction data
        const data = savingsData.rawData.filter(d => !d.income.isZero() || !d.expense.isZero());
        if (data.length === 0) return { positiveCount: 0, negativeCount: 0, longestPositiveStreak: 0, longestNegativeStreak: 0 };

        let positiveCount = 0;
        let negativeCount = 0;
        let longestPositiveStreak = 0;
        let longestNegativeStreak = 0;
        let currentPositiveStreak = 0;
        let currentNegativeStreak = 0;

        for (const item of data) {
            if (item.rate >= 0) {
                positiveCount++;
                currentPositiveStreak++;
                currentNegativeStreak = 0;
                longestPositiveStreak = Math.max(longestPositiveStreak, currentPositiveStreak);
            } else {
                negativeCount++;
                currentNegativeStreak++;
                currentPositiveStreak = 0;
                longestNegativeStreak = Math.max(longestNegativeStreak, currentNegativeStreak);
            }
        }

        return { positiveCount, negativeCount, longestPositiveStreak, longestNegativeStreak };
    }, [savingsData.rawData]);

    const renderTimeFilter = () => (
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
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
        </View>
    );

    const renderInfoModal = () => (
        <BottomModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="Understanding Your Chart"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Visual Metrics Example */}
                <View style={{ marginBottom: 20 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 12 }}>
                        {/* Current Example */}
                        <View style={{ alignItems: 'center', flex: 1, padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 4 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Current</Text>
                            <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: 'bold' }}>25%</Text>
                        </View>

                        {/* Streak Example */}
                        <View style={{ alignItems: 'center', flex: 1, padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 4 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Streak</Text>
                            <Text style={{ color: '#4CAF50', fontSize: 18, fontWeight: 'bold' }}>5📈</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                        {/* Positive Example */}
                        <View style={{ alignItems: 'center', flex: 1, padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 4 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Positive</Text>
                            <Text style={{ color: '#4CAF50', fontSize: 16, fontWeight: 'bold' }}>8 / 5</Text>
                        </View>

                        {/* Negative Example */}
                        <View style={{ alignItems: 'center', flex: 1, padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginHorizontal: 4 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 4 }}>Negative</Text>
                            <Text style={{ color: '#F44336', fontSize: 16, fontWeight: 'bold' }}>3 / 2</Text>
                        </View>
                    </View>
                </View>

                {/* Chart Explanation */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>📈 Reading the Chart</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 12 }}>
                        The line chart shows your savings rate trend over time. Here&apos;s what it means:
                    </Text>

                    {/* Visual examples side by side */}
                    <View style={{ flexDirection: 'row', marginBottom: 12, gap: 8 }}>
                        {/* Saving Example */}
                        <View style={{ flex: 1, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                            <View style={{ alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ width: '100%', height: 60, backgroundColor: colors.background, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                                    {/* Zero line */}
                                    <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: colors.border }} />
                                    {/* Upward trend line */}
                                    <View style={{ position: 'absolute', bottom: 10, left: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' }} />
                                    <View style={{ position: 'absolute', bottom: 18, left: '40%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' }} />
                                    <View style={{ position: 'absolute', bottom: 25, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50' }} />
                                </View>
                            </View>
                            <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 13, marginBottom: 2, textAlign: 'center' }}>Saving Money</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>Line above zero (green)</Text>
                        </View>

                        {/* Overspending Example */}
                        <View style={{ flex: 1, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                            <View style={{ alignItems: 'center', marginBottom: 8 }}>
                                <View style={{ width: '100%', height: 60, backgroundColor: colors.background, borderRadius: 6, position: 'relative', overflow: 'hidden' }}>
                                    {/* Zero line */}
                                    <View style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, backgroundColor: colors.border }} />
                                    {/* Downward trend line */}
                                    <View style={{ position: 'absolute', top: 35, left: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336' }} />
                                    <View style={{ position: 'absolute', top: 40, left: '40%', width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336' }} />
                                    <View style={{ position: 'absolute', top: 43, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: '#F44336' }} />
                                </View>
                            </View>
                            <Text style={{ color: '#F44336', fontWeight: 'bold', fontSize: 13, marginBottom: 2, textAlign: 'center' }}>Overspending</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: 'center' }}>Line below zero (red)</Text>
                        </View>
                    </View>

                    {/* Key Points */}
                    <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                            • <Text style={{ fontWeight: 'bold' }}>Zero Line:</Text> The horizontal line in the middle{"\n"}
                            • <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Green Line:</Text> Above zero = You&apos;re saving{"\n"}
                            • <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Red Line:</Text> Below zero = Spending more than earning{"\n"}
                            • <Text style={{ fontWeight: 'bold' }}>Dots:</Text> Each represents one month{"\n"}
                            • <Text style={{ fontWeight: 'bold' }}>Higher is Better:</Text> More savings = further above zero
                        </Text>
                    </View>
                </View>

                {/* Current Rate Explanation */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>📊 Current Savings Rate</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
                        Your savings rate for the most recent month:
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            • <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Positive %</Text>: You saved money 💰{"\n"}
                            • <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Negative %</Text>: You overspent 📉
                        </Text>
                    </View>
                </View>

                {/* Streak Explanation */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>🔥 Streak</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
                        Consecutive months with the same trend. Higher streaks show consistency!
                    </Text>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                            <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>5📈</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>5 months of saving</Text>
                        </View>
                        <View style={{ flex: 1, backgroundColor: colors.surface, padding: 10, borderRadius: 8 }}>
                            <Text style={{ color: '#F44336', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>2📉</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>2 months overspending</Text>
                        </View>
                    </View>
                </View>

                {/* Positive/Negative Format Explanation */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>📈 Understanding &quot;8 / 5&quot; Format</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 8 }}>
                        This shows <Text style={{ fontWeight: 'bold' }}>two separate numbers</Text>, not division:
                    </Text>

                    {/* Positive Visual Example */}
                    <View style={{ backgroundColor: '#4CAF5020', padding: 12, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#4CAF50' }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>Positive: 8 / 5</Text>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 3 }}>
                                <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>8</Text> = Total positive months
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>5</Text> = Best consecutive streak
                            </Text>
                        </View>
                    </View>

                    {/* Negative Visual Example */}
                    <View style={{ backgroundColor: '#F4433620', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#F44336' }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 6 }}>Negative: 3 / 2</Text>
                        <View style={{ marginLeft: 8 }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 3 }}>
                                <Text style={{ color: '#F44336', fontWeight: 'bold' }}>3</Text> = Total negative months
                            </Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                                <Text style={{ color: '#F44336', fontWeight: 'bold' }}>2</Text> = Worst consecutive streak
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Other Metrics */}
                <View style={{ marginBottom: 16 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 8 }}>📉 Other Metrics</Text>
                    <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, gap: 8 }}>
                        <View>
                            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Average</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                Average savings rate across all months
                            </Text>
                        </View>
                        <View style={{ height: 1, backgroundColor: colors.border }} />
                        <View>
                            <Text style={{ color: colors.text, fontWeight: '600', fontSize: 13 }}>Best & Worst Month</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                Highest and lowest rates in the period
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={{ height: 20 }} />
            </ScrollView>
        </BottomModal>
    );

    // --- Center-zero workaround for gifted-charts (older versions) ---

    const yBoundary = chartStats.max; // symmetric boundary
    const yOffset = yBoundary;        // shift zero to center

    const shiftedChartData = savingsData.datasets[0].data.map((val) => ({
        value: val + yOffset, // shift
        originalValue: val,   // keep real value for labels/colors
        dataPointColor: val < 0 ? '#F44336' : colors.primary,
    }));

    const Y_AXIS_WIDTH = 45;
    const INITIAL_SPACING = 20;

    const chartWidth = screenWidth - 40;
    const plotWidth = chartWidth - Y_AXIS_WIDTH - INITIAL_SPACING;

    const pointSpacing =
        savingsData.datasets[0].data.length > 1
            ? plotWidth / (savingsData.datasets[0].data.length - 1)
            : plotWidth;

    if (!isLoading && savingsData.datasets[0].data.length === 0) {
        return (
            <View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Savings Rate</Text>
                        <TouchableOpacity
                            onPress={() => setShowInfoModal(true)}
                            style={{
                                padding: 4,
                                backgroundColor: colors.primary + '20',
                                borderRadius: 6
                            }}
                        >
                            <Ionicons name="information-circle-outline" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {renderTimeFilter()}
                </View>
                <Card>
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                        No data yet. Start tracking income and expenses!
                    </Text>
                </Card>
                {renderInfoModal()}
            </View>
        );
    }

    return (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Savings Rate</Text>
                    <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                {renderTimeFilter()}
            </View>
            <Card>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                    {/* Left side metrics */}
                    <View style={{ flexDirection: 'row', gap: 16 }}>
                        {/* Streak */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Streak</Text>
                            {isLoading ? (
                                <Skeleton width={40} height={20} />
                            ) : (
                                <Text style={{
                                    color: streak.type === 'positive' ? '#4CAF50' : '#F44336',
                                    fontSize: 18,
                                    fontWeight: 'bold'
                                }}>
                                    {privacyMode ? '••' : `${streak.count}${streak.type === 'positive' ? '📈' : '📉'}`}
                                </Text>
                            )}
                        </View>

                        {/* Positive */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Positive</Text>
                            {isLoading ? (
                                <Skeleton width={50} height={20} />
                            ) : (
                                <Text style={{
                                    color: '#4CAF50',
                                    fontSize: 16,
                                    fontWeight: 'bold'
                                }}>
                                    {privacyMode ? '••' : `${historicalStats.positiveCount} / ${historicalStats.longestPositiveStreak}`}
                                </Text>
                            )}
                        </View>

                        {/* Negative */}
                        <View style={{ alignItems: 'flex-start' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Negative</Text>
                            {isLoading ? (
                                <Skeleton width={50} height={20} />
                            ) : (
                                <Text style={{
                                    color: '#F44336',
                                    fontSize: 16,
                                    fontWeight: 'bold'
                                }}>
                                    {privacyMode ? '••' : `${historicalStats.negativeCount} / ${historicalStats.longestNegativeStreak}`}
                                </Text>
                            )}
                        </View>
                    </View>

                    {/* Right: Current Savings Rate */}
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Current</Text>
                        {isLoading ? (
                            <Skeleton width={60} height={20} />
                        ) : (
                            <Text style={{
                                color: latestRate >= 0 ? '#4CAF50' : '#F44336',
                                fontSize: 18,
                                fontWeight: 'bold'
                            }}>
                                {privacyMode ? '••••' : `${latestRate}%`}
                            </Text>
                        )}
                    </View>
                </View>

                {isLoading ? (
                    <View style={{ height: 200, padding: 10 }}>
                        <Skeleton height={180} width="100%" borderRadius={16} />
                    </View>
                ) : !privacyMode && (
                    <View style={{ overflow: 'hidden', marginLeft: -10 }}>
                        <LineChart
                            data={shiftedChartData.map(d => ({
                                value: d.value,
                                dataPointColor: d.dataPointColor,
                            }))}

                            height={200}
                            width={screenWidth - 40}
                            spacing={(screenWidth - 80) / Math.max(shiftedChartData.length, 1)}
                            initialSpacing={20}
                            thickness={3}
                            curved
                            curveType={0}

                            /* ---- SCALE (IMPORTANT) ---- */
                            maxValue={yBoundary * 2}
                            noOfSections={4}

                            /* ---- GRID ---- */
                            hideRules={false}
                            rulesType="solid"
                            rulesColor={colors.border + '80'}
                            rulesThickness={1}

                            showVerticalLines
                            verticalLinesColor={colors.border + '80'}
                            verticalLinesThickness={1}

                            /* ---- AXIS ---- */
                            yAxisColor="transparent"
                            xAxisColor="transparent"
                            yAxisLabelWidth={45}
                            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}

                            /* ---- ZERO LINE (NOW CENTERED) ---- */
                            showReferenceLine1
                            referenceLine1Position={yOffset}
                            referenceLine1Config={{
                                color: colors.textSecondary,
                                thickness: 1,
                                type: 'dashed',
                                dashWidth: 5,
                                dashGap: 5,
                            }}

                            /* ---- LINE GRADIENT ---- */
                            lineGradient
                            lineGradientId="g_savings"
                            lineGradientComponent={() => (
                                <LinearGradient id="g_savings" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0%" stopColor={colors.primary} stopOpacity="1" />
                                    <Stop offset="50%" stopColor={colors.primary} stopOpacity="1" />
                                    <Stop offset="50%" stopColor="#F44336" stopOpacity="1" />
                                    <Stop offset="100%" stopColor="#F44336" stopOpacity="1" />
                                </LinearGradient>
                            )}

                            /* ---- LABEL FIX (UNSHIFT VALUES) ---- */
                            formatYLabel={(value: string) => {
                                const realValue = Number(value) - yOffset;
                                return `${realValue.toFixed(0)}%`;
                            }}
                        />
                        {/* Custom X-Axis Labels Reference (Below Chart) */}
                        {/* Custom X-Axis Labels (Pixel-Aligned) */}
                        <View
                            style={{
                                position: 'relative',
                                width: chartWidth,
                                height: 20,
                                marginTop: 4,
                            }}
                        >
                            {savingsData.labels.map((label, index) => {
                                if (!label) return null;

                                const left =
                                    Y_AXIS_WIDTH +
                                    INITIAL_SPACING +
                                    index * pointSpacing -
                                    15; // half of label width (30 / 2)

                                return (
                                    <Text
                                        key={index}
                                        style={{
                                            position: 'absolute',
                                            left,
                                            width: 30,
                                            textAlign: 'center',
                                            fontSize: 10,
                                            color: colors.textSecondary,
                                        }}
                                    >
                                        {label}
                                    </Text>
                                );
                            })}
                        </View>
                    </View>
                )}

                {!isLoading && privacyMode && (
                    <View style={{
                        height: 200,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.border + '20',
                        borderRadius: 16,
                        marginVertical: 8
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>🔒 Chart hidden for privacy</Text>
                    </View>
                )}

                {savingsData.rawData.length > 1 ? (
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Average</Text>
                            <Text style={{ color: avgRate >= 0 ? '#4CAF50' : '#F44336', fontSize: 14, fontWeight: '600' }}>
                                {privacyMode ? '••••' : `${avgRate}%`}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Best Month</Text>
                            <Text style={{ color: '#4CAF50', fontSize: 14, fontWeight: '600' }}>
                                {privacyMode ? '••••' : `${Math.max(...savingsData.rawData.map(d => d.rate))}%`}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Worst Month</Text>
                            <Text style={{ color: '#F44336', fontSize: 14, fontWeight: '600' }}>
                                {privacyMode ? '••••' : `${Math.min(...savingsData.rawData.map(d => d.rate))}%`}
                            </Text>
                        </View>
                    </View>
                ) : (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', fontSize: 12 }}>
                            Track more months to see your best and worst ratios!
                        </Text>
                    </View>
                )}
            </Card>
            {renderInfoModal()}
        </View>
    );
};

export default SavingsRateTrend;
