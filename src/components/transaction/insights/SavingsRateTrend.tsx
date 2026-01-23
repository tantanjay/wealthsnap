import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { Transaction } from '../../../types';
import { getSavingsRateTrend } from '../../../utils/financialMetrics';
import { Skeleton } from '../../common/Skeleton';

interface SavingsRateTrendProps {
    transactions: Transaction[];
    privacyMode: boolean;
    isLoading?: boolean;
}

const SavingsRateTrend: React.FC<SavingsRateTrendProps> = ({ transactions, privacyMode, isLoading = false }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

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

    const chartConfig = {
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => colors.primary,
        labelColor: (opacity = 1) => colors.textSecondary,
        propsForLabels: {
            fontSize: 10
        },
        fillShadowGradientFrom: colors.surface,
        fillShadowGradientTo: colors.surface,
        fillShadowGradientOpacity: 0,
        style: {
            borderRadius: 16,
            paddingRight: 0, // Minimize right padding
        },
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#fafafa'
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: colors.border,
            strokeWidth: 1
        }
    };

    // Calculate average savings rate
    const avgRate = useMemo(() => {
        if (savingsData.rawData.length === 0) return 0;
        const sum = savingsData.rawData.reduce((acc, d) => acc + d.rate, 0);
        return Math.round((sum / savingsData.rawData.length) * 10) / 10;
    }, [savingsData.rawData]);

    // Calculate chart bounds and properties based on data range
    const chartStats = useMemo(() => {
        if (savingsData.rawData.length === 0) return { min: 0, max: 100, zeroOffset: 1 };

        const rates = savingsData.rawData.map(d => d.rate);
        const dataMax = Math.max(...rates);
        const dataMin = Math.min(...rates);

        // Smart Scaling Algorithm
        // Find optimal step size key: 0 must be a tick (so Min is multiple of Step).
        // Range must be exactly 4 * Step.
        // Range must cover dataMin and dataMax.
        const SEGMENTS = 4;
        const steps = [1, 2, 5, 8, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 75, 80, 90, 100, 150, 200];

        for (const step of steps) {
            // Find minimal 'n' such that -n * step <= dataMin
            // -n * step is the chart floor (Min)
            // If dataMin is positive (e.g. 5%), we technically can start at 0 (n=0).
            // But if dataMin is negative (e.g. -38%), we need floor to be below it.

            // n * step >= -dataMin  =>  n >= -dataMin / step
            // Since n must be >= 0 (to ensure 0 is max or below), 
            // n = ceil(abs(min(dataMin, 0)) / step)

            const n = Math.ceil(Math.abs(Math.min(dataMin, 0)) / step);
            const candidateMin = -n * step;
            const candidateMax = candidateMin + (step * SEGMENTS);

            if (candidateMax >= dataMax) {
                // Found the tightest fit!
                let finalMin = candidateMin;
                let finalMax = candidateMax;

                // Smart Adjustment:
                // Sometimes Max is WAY higher than dataMax. Can we shift the window down?
                // We can increase n (shift Min down) as long as Min + 4*Step >= dataMax? 
                // No, shifting down reduces Max. We want to shift UP?
                // Shifting up means decreasing n. But we picked minimal n to cover dataMin.
                // So we cannot shift up.

                // However, we effectively check smallest steps first.
                // So this IS the tightest range bandwidth (Range = 4*Step).
                // We just need to ensure the window placement is best.
                // Our logic fixes Min at the highest possible value (tightest to dataMin).
                // This minimizes whitespace at the bottom.
                // By definition of small steps, we also minimize bandwidth, so whitespace at top is minimized too relative to Step size.

                const range = finalMax - finalMin;
                const zeroOffset = finalMax / range;

                return { min: finalMin, max: finalMax, zeroOffset };
            }
        }

        // Fallback to symmetric if no smart fit found (e.g. huge numbers)
        const absMax = Math.max(Math.abs(dataMax), Math.abs(dataMin));
        const roundedAbs = Math.ceil(absMax / 10) * 10;
        return { min: -roundedAbs, max: roundedAbs, zeroOffset: 0.5 };

    }, [savingsData.rawData]);

    const latestRate = savingsData.rawData[savingsData.rawData.length - 1]?.rate || 0;

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

    if (!isLoading && savingsData.datasets[0].data.length === 0) {
        return (
            <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                        Savings Rate Trend
                    </Text>
                    {renderTimeFilter()}
                </View>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                    No data yet. Start tracking income and expenses!
                </Text>
            </Card>
        );
    }

    return (
        <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Savings Rate Trend</Text>
                {renderTimeFilter()}
            </View>

            <View style={{ alignItems: 'flex-end', marginBottom: 10 }}>
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

            {isLoading ? (
                <View style={{ height: 200, padding: 10 }}>
                    <Skeleton height={180} width="100%" borderRadius={16} />
                </View>
            ) : !privacyMode && (
                <LineChart
                    data={{
                        labels: savingsData.labels,
                        datasets: [
                            {
                                data: savingsData.datasets[0].data,
                                color: (opacity = 1) => `url(#savings_gradient_${savingsData.labels.join('')})`,
                                strokeWidth: 3
                            },
                            {
                                // Zero baseline
                                data: savingsData.datasets[0].data.map(() => 0),
                                color: (opacity = 1) => colors.border,
                                strokeWidth: 1,
                                withDots: false,
                            },
                            {
                                // Hidden dataset to force specific scaling
                                data: savingsData.datasets[0].data.map((_, i) => i === 0 ? chartStats.max : chartStats.min),
                                color: () => 'transparent',
                                strokeWidth: 0,
                                withDots: false
                            }
                        ]
                    }}
                    width={screenWidth - 48} // Slightly wider to reduce right gap relative to container
                    height={200}
                    chartConfig={{
                        ...chartConfig,
                        propsForDots: {
                            r: '4',
                            strokeWidth: '2',
                            stroke: '#fafafa'
                        }
                    }}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16,
                        paddingRight: 40,
                    }}
                    segments={4}
                    formatYLabel={(value) => `${parseFloat(value).toFixed(0)}%`}
                    fromZero
                    getDotColor={(dataPoint, dataPointIndex) => {
                        return dataPoint < 0 ? '#F44336' : colors.primary;
                    }}
                    decorator={({ width, height }: any) => {
                        // The chart library doesn't expose the y-scaler in decorator.
                        // We fall back to manual padding calibration which was visually verified.
                        // Since the chart height is fixed (200), these absolute values should be consistent.
                        const paddingTop = 16;
                        const paddingBottom = 36;

                        // Use height from args or fallback to 200
                        const chartHeight = height || 200;

                        return (
                            <Defs key={`savings-rate-defs-${savingsData.labels.join('')}`}>
                                <LinearGradient
                                    id={`savings_gradient_${savingsData.labels.join('')}`}
                                    x1="0"
                                    y1={paddingTop}
                                    x2="0"
                                    y2={chartHeight - paddingBottom}
                                    gradientUnits="userSpaceOnUse"
                                >
                                    {/* Dynamic offset based on smart scaling */}
                                    <Stop offset={`${chartStats.zeroOffset}`} stopColor={colors.primary} stopOpacity="1" />
                                    <Stop offset={`${chartStats.zeroOffset}`} stopColor="#F44336" stopOpacity="1" />
                                </LinearGradient>
                            </Defs>
                        );
                    }}
                />
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
    );
};

export default SavingsRateTrend;
