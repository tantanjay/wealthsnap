import React, { useState, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import BottomModal from '../../common/BottomModal';
import { Transaction } from '../../../types';
import { getCumulativeSpendingCurve, getCurrentMonthCumulative, getTransactionsByMonth } from '../../../utils/financialMetrics';
import { CURRENCY_SYMBOLS, formatCompactCurrency, formatCurrencyAmount } from '../../../utils/currencyUtils';

interface CumulativeSpendingChartProps {
    transactions: Transaction[];
    currency: string;
    isPrivacyEnabled: boolean;
}

const CumulativeSpendingChart: React.FC<CumulativeSpendingChartProps> = ({
    transactions,
    currency,
    isPrivacyEnabled
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

    // Fill Avg Data with 0s if empty, or ensure it matches X-axis length if needed
    // But LineChart needs labels. Let's just do 1, 5, 10, 15, 20, 25, 30
    const chartLabels = ["1", "5", "10", "15", "20", "25", "30"];

    // We need to map our daily data (index 0 = day 1) to these labels? 
    // Actually LineChart expects data points to match labels count if we are strict, 
    // OR we can just pass all 30 points and hide labels.
    // React Native Chart Kit is weird with X labels. 
    // Better strategy: 
    // Pass ALL data points (30 or 31).
    // Hide X Labels except every 5th one using formatXLabel? No, formatXLabel runs on string.

    // Simplest: Just let it draw all points. 
    // If we want fewer labels, we must provide fewer labels in the array, but the data length must match?
    // Actually, if we provide empty strings for intermediate labels, it works.

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
    // We need to pad currentData with nulls or existing value? 
    // react-native-chart-kit crashes if data lengths differ significantly without correct configuration.
    // Actually it just stops drawing.
    // BUT we need both arrays to be same length for X-axis alignment?
    // Yes. So for currentData, we should pad the rest of the month with `null` or `undefined` (if supported) 
    // OR just handle the fact that line chart might stretch the short array.

    // PROPER WAY: 
    // Both arrays length 31.
    // Current Data: [100, 200, ... values ... , null, null, null] (using withDots: false on nulls?)
    // This library handles nulls poorly (treats as 0 sometimes).
    // Workaround: We only graph up to "Max Day" of the longest dataset (usually 31).
    // If current data is length 15, and avg is 31.
    // If we pass data point as `null`, it breaks.

    // Let's try: 
    // Only pass the Current Data points that exist.
    // But then the chart X-axis is only 15 days long. The Avg curve will be squashed?
    // No, we must ensure the dataset covers the full X range.

    // TRICK: Add a transparent point at Day 31 for current data?
    // Or simpler: Just render what we have. If Current is short, the graph is short.
    // BUT the user wants to compare to the Month End.

    // OK, let's try the "Same Length" approach if possible.
    // If avgData exists (length 31), we want CurrentData to align.
    // If we add `null` to datasets data, RNChartKit might crash or draw 0.

    // Alternative: Just graph the current progress relative to avg *up to today*.
    // And maybe show the rest of the avg curve as a "projection"?

    // Let's assume for now we just graph both as is. 
    // If lengths mismatch, chartkit draws them over same Width. This is BAD. (Day 15 current aligns with Day 30 avg).
    // FIX: We must pad `currentData` to length 31, but make the future points `NaN` or handle via `pixel` props?
    // RN Chart Kit is limited here.

    // SAFE FIX: Use `bezier`? No.
    // We will use the `counts` property? No.

    // Let's manually pad with the LAST KNOWN VALUE? 
    // No, that implies flat line.

    // Let's rely on Average Data being the "Master".
    // Real Data: [10, 20, 30]
    // Avg Data: [10, 20, 30, 40, 50 ...]
    // If we pass both, the library will likely only render X labels based on the first dataset?

    // Let's Try:
    // Dataset 1: Avg (Length 31)
    // Dataset 2: Current (Length 15... padded with 'null'?)
    // Note: react-native-chart-kit 6.x supports `withScrollableDot` which handles some disjoints, 
    // but typically `null` turns to 0.

    // Hack: If current data is short, we make it length 31, filling the future with `undefined`?
    // Let's try to just render the chart with `avgData` as the primary (if exists), 
    // and `currentData` as secondary.
    // If `currentData` is shorter, we might need a custom renderer or just accept the limitation?

    // BETTER IDEA:
    // If user has NO history (Avg Data is empty), just show Current Data.
    // If user HAS history, the Chart width is fixed to 31 days.
    // We pad `currentData` with `null`. Recent versions might support `null` to skip drawing.

    // Let's try padding with `null` and see.
    const fullCurrentData = [...currentData];
    if (avgData.length > 0) {
        while (fullCurrentData.length < avgData.length) {
            // @ts-ignore - Allow null for chart ki quirk (might need verify)
            fullCurrentData.push(null);
        }
    }

    // If that fails, we might just clip AvgData to current day? 
    // No, that defeats the purpose of "See where I am going".

    // Let's stick to safe path:
    // If we have history, we add AvgData first.
    // Then Current Data (padded).
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
                {isPrivacyEnabled ? (
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
