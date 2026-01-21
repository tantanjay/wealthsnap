import React, { useState, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import BottomModal from '../../common/BottomModal';
import { Transaction } from '../../../types';
import { getCumulativeSpendingCurve, getCurrentMonthCumulative, getTransactionsByMonth } from '../../../utils/financialMetrics';
import { CURRENCY_SYMBOLS, formatCompactCurrency } from '../../../utils/currencyUtils';
import { Skeleton } from '../../common/Skeleton';

interface CumulativeSpendingChartProps {
    transactions: Transaction[];
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading?: boolean;
}

const CumulativeSpendingChart: React.FC<CumulativeSpendingChartProps> = ({
    transactions,
    currency,
    isPrivacyEnabled,
    isLoading = false
}) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const [period, setPeriod] = useState<3 | 6 | 12>(3);
    const [showInfo, setShowInfo] = useState(false);

    const { currentData, avgData, insight } = useMemo(() => {
        const today = new Date();
        const currentMonthTrans = getTransactionsByMonth(transactions, today);

        const currentData = getCurrentMonthCumulative(currentMonthTrans);
        const avgData = getCumulativeSpendingCurve(transactions, period);

        // Calculate Insight
        let insight = "";
        if (currentData.length > 0 && avgData.length > 0) {
            const currentTotal = currentData[currentData.length - 1];
            // Compare to the avg curve on the SAME day
            const dayIndex = currentData.length - 1;
            const avgAtThisDay = avgData[Math.min(dayIndex, avgData.length - 1)];

            const diff = currentTotal - avgAtThisDay;
            if (diff > 0) {
                insight = `Pacing ${formatCompactCurrency(diff, currency)} above ${period}M avg`;
            } else {
                insight = `Pacing ${formatCompactCurrency(Math.abs(diff), currency)} below ${period}M avg`;
            }
        } else if (avgData.length === 0) {
            insight = "Not enough history for comparison";
        }

        return { currentData, avgData, insight };
    }, [transactions, period, currency]);

    const labels = Array.from({ length: 31 }, (_, i) => (i + 1) % 5 === 0 ? (i + 1).toString() : "");

    // Prepare datasets
    const datasets = [];

    // Dataset 1: Average (Background Line) - Only if we have history
    if (avgData.length > 0) {
        datasets.push({
            data: avgData, // 30-31 points
            color: (opacity = 1) => `rgba(160, 160, 160, ${opacity})`, // Gray
            strokeWidth: 2,
            withDots: false, // Clean line
            strokeDashArray: [5, 5] // Dashed
        });
    }

    // Dataset 2: Current (Foreground Line)
    // To ensure correct X-axis alignment, we must pad the current month's data to match
    // the length of the average data (typically 31 days). 
    // Without this, the library stretches the shorter dataset to fill the width.
    const fullCurrentData = [...currentData];
    if (avgData.length > 0) {
        while (fullCurrentData.length < avgData.length) {
            // @ts-ignore - Pad with null to prevent drawing future points while maintaining X-axis scale
            fullCurrentData.push(null);
        }
    }
    if (avgData.length > 0) {
        datasets.push({
            data: fullCurrentData,
            color: (opacity = 1) => colors.primary,
            strokeWidth: 3
        });
    } else {
        // No history, just show current
        datasets.push({
            data: currentData,
            color: (opacity = 1) => colors.primary,
            strokeWidth: 3
        });
    }

    const chartConfig = {
        backgroundColor: colors.surface,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => colors.textSecondary,
        labelColor: (opacity = 1) => colors.textSecondary,
        style: { borderRadius: 16 },
        propsForDots: { r: "0" }, // Hide dots by default for cleaner look
    };


    return (
        <View style={{ marginBottom: 20 }}>
            {/* Header + Tabs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <View>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Monthly Pulse</Text>
                    <Text style={{ color: colors.text === '#ffffff' ? '#A0A0A0' : '#666', fontSize: 12 }}>
                        {insight || "Cumulative Spending"}
                    </Text>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {avgData.length > 0 && (
                        <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2, marginRight: 10 }}>
                            {[3, 6, 12].map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setPeriod(m as any)}
                                    style={{
                                        paddingVertical: 4,
                                        paddingHorizontal: 8,
                                        backgroundColor: period === m ? colors.surface : 'transparent',
                                        borderRadius: 6,
                                        borderWidth: period === m ? 1 : 0,
                                        borderColor: colors.border
                                    }}
                                >
                                    <Text style={{
                                        color: period === m ? colors.text : colors.textSecondary,
                                        fontSize: 12,
                                        fontWeight: period === m ? '600' : '400'
                                    }}>{m}M</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                    <TouchableOpacity onPress={() => setShowInfo(true)}>
                        <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Chart */}
            <Card>
                {isLoading ? (
                    <View style={{ height: 200, padding: 10 }}>
                        <Skeleton height={180} width="100%" borderRadius={16} />
                    </View>
                ) : isPrivacyEnabled ? (
                    <View style={{ height: 200, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border + '20', borderRadius: 16 }}>
                        <Text style={{ color: colors.textSecondary }}>🔒 Chart hidden for privacy</Text>
                    </View>
                ) : (
                    <LineChart
                        data={{
                            labels: avgData.length > 0 ? labels : labels.slice(0, currentData.length), // Adjust labels
                            datasets: datasets
                        }}
                        width={screenWidth - 64}
                        height={200}
                        chartConfig={chartConfig}
                        withDots={false}
                        withInnerLines={false}
                        withOuterLines={true}
                        withVerticalLines={false}
                        withHorizontalLines={true}
                        bezier
                        style={{ borderRadius: 16 }}
                        yAxisLabel={CURRENCY_SYMBOLS[currency] || ""}
                    />
                )}

                {/* Legend */}
                {!isPrivacyEnabled && avgData.length > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15 }}>
                            <View style={{ width: 12, height: 2, backgroundColor: colors.primary, marginRight: 6 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Current Month</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={{ width: 12, height: 2, backgroundColor: '#A0A0A0', marginRight: 6, borderStyle: 'dashed', borderRadius: 1 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{period}M Average</Text>
                        </View>
                    </View>
                )}
            </Card>

            <BottomModal
                visible={showInfo}
                onClose={() => setShowInfo(false)}
                title="Understanding the Pulse"
                maxHeight="60%"
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        This chart shows your <Text style={{ fontWeight: 'bold' }}>spending speed</Text> throughout the month. It adds up your expenses day by day.
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 24, height: 4, backgroundColor: colors.primary, marginRight: 12, borderRadius: 2 }} />
                        <View>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>Solid Line (You)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Your actual spending so far this month.</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                        <View style={{ width: 24, height: 4, backgroundColor: '#A0A0A0', marginRight: 12, borderRadius: 2, borderStyle: 'dashed', borderWidth: 1, borderColor: '#A0A0A0' }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>Dashed Line (Average)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>How you usually spend by this time of the month.</Text>
                        </View>
                    </View>

                    <View style={{ backgroundColor: colors.primary + '15', padding: 15, borderRadius: 12 }}>
                        <Text style={{ color: colors.primary, fontWeight: 'bold', marginBottom: 5 }}>🏁 The Goal</Text>
                        <Text style={{ color: colors.text, fontSize: 13 }}>
                            Try to keep your Solid Line <Text style={{ fontWeight: 'bold' }}>below</Text> the Dashed Line.
                            If it goes above, you are spending faster than your historical average!
                        </Text>
                    </View>
                </ScrollView>
            </BottomModal>
        </View>
    );
};

export default CumulativeSpendingChart;
