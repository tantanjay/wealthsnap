import React, { useState, useMemo } from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { formatCompactCurrency } from '@utils/currencyUtils';
import { getCumulativeSpendingCurve, getCurrentMonthCumulative, getTransactionsByMonth } from '@utils/financialMetrics';

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

    const { currentData, avgData, projectionData, insight } = useMemo(() => {
        const today = new Date();
        const currentMonthTrans = getTransactionsByMonth(transactions, today);

        const currentData = getCurrentMonthCumulative(currentMonthTrans);
        const avgData = getCumulativeSpendingCurve(transactions, period);

        // Calculate projection using historical average for future days
        const projectionData: number[] = [];
        if (currentData.length > 0 && avgData.length > 0) {
            const currentDay = currentData.length;
            const currentTotal = currentData[currentData.length - 1];

            // Start with current day's actual value (for seamless connection)
            projectionData.push(currentTotal);

            // Project future days using historical average's daily increments
            let runningTotal = currentTotal;
            for (let day = currentDay; day < avgData.length; day++) {
                // Use the daily increment from historical average
                const dailyIncrement = avgData[day] - avgData[day - 1];
                runningTotal += dailyIncrement;
                projectionData.push(runningTotal);
            }
        }

        // Calculate Insight
        let insight = "";
        if (currentData.length > 0 && avgData.length > 0) {
            const currentTotal = currentData[currentData.length - 1];
            // Compare to the avg curve on the SAME day
            const dayIndex = currentData.length - 1;
            const avgAtThisDay = avgData[Math.min(dayIndex, avgData.length - 1)];

            const diff = currentTotal - avgAtThisDay;
            if (diff > 0) {
                insight = isPrivacyEnabled
                    ? `Pacing **** above ${period}M avg`
                    : `Pacing ${formatCompactCurrency(diff, currency)} above ${period}M avg`;
            } else {
                insight = isPrivacyEnabled
                    ? `Pacing **** below ${period}M avg`
                    : `Pacing ${formatCompactCurrency(Math.abs(diff), currency)} below ${period}M avg`;
            }
        } else if (avgData.length === 0) {
            insight = "Not enough history for comparison";
        }

        return { currentData, avgData, projectionData, insight };
    }, [transactions, period, currency, isPrivacyEnabled]);

    // Construct DataSets for Gifted Charts

    // 1. Average Data (Background, Gray, Dashed)
    const averageLineData = avgData.map(value => ({ value }));

    // 2. Current Data (Foreground, Primary, Solid)
    const currentLineData = currentData.map(value => ({ value }));

    // 3. Projection Data (Primary, Dotted)
    // Strategy:
    // - Layer 1 (Bottom): Average (Gray Dashed)
    // - Layer 2 (Middle): Full Projection (Primary Dotted) from start to finish
    // - Layer 3 (Top): Current Actuals (Primary Solid) overlays the projection up to today

    const fullProjectionLine = [];
    if (projectionData.length > 0) {
        // Create a full array combining currentData (up to last point) and projectionData (rest)
        // projectionData array already includes the connection point (last actual value) at index 0.

        // Full curve = currentData[0...last-1] + projectionData[0...end]
        const prefix = currentData.slice(0, currentData.length - 1);
        fullProjectionLine.push(...prefix.map(val => ({ value: val })));
        fullProjectionLine.push(...projectionData.map(val => ({ value: val })));
    }

    const dataSet = [];

    // 1. Average (Gray Dashed)
    if (avgData.length > 0) {
        dataSet.push({
            data: averageLineData,
            color: 'rgba(160, 160, 160, 1)',
            strokeDashArray: [5, 5],
            thickness: 2,
            hideDataPoints: true,
            zIndex: 1,
            startFillColor: 'rgba(160, 160, 160, 0.2)',
            endFillColor: 'rgba(160, 160, 160, 0.01)',
            startOpacity: 0.2,
            endOpacity: 0.01,
            areaChart: true,
        });
    }

    // 2. Projection (Primary Dotted) - Behind Current
    if (fullProjectionLine.length > 0) {
        dataSet.push({
            data: fullProjectionLine,
            color: colors.primary,
            strokeDashArray: [8, 4],
            thickness: 2,
            hideDataPoints: true,
            zIndex: 2,
            startFillColor: 'rgba(160, 160, 160, 0.2)',
            endFillColor: 'rgba(160, 160, 160, 0.01)',
            startOpacity: 0.2,
            endOpacity: 0.01,
            areaChart: true,
        });
    }

    // 3. Current (Primary Solid) - On Top
    if (currentData.length > 0) {
        dataSet.push({
            data: currentLineData,
            color: colors.primary,
            thickness: 3,
            hideDataPoints: true,
            zIndex: 3,
            startFillColor: 'rgba(160, 160, 160, 0.4)',
            endFillColor: 'rgba(160, 160, 160, 0.01)',
            startOpacity: 0.2,
            endOpacity: 0.01,
            areaChart: true,
        });
    }

    // Determine max value for Y-axis scaling
    const allValues = [
        ...currentData,
        ...avgData,
        ...(fullProjectionLine.map(d => d.value))
    ];
    const maxValue = Math.max(...allValues, 0);


    return (
        <View style={{ marginBottom: 20 }}>
            {/* Header + Tabs */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                <View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Monthly Pulse</Text>
                        <TouchableOpacity onPress={() => setShowInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                            <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                        </TouchableOpacity>
                    </View>
                    <Text style={{ color: colors.text === '#ffffff' ? '#A0A0A0' : '#666', fontSize: 12 }}>
                        {insight || "Cumulative Spending"}
                    </Text>
                </View>

                {/* Tabs */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {avgData.length > 0 && (
                        <View style={{ flexDirection: 'row', backgroundColor: colors.border + '40', borderRadius: 8, padding: 2 }}>
                            {[3, 6, 12].map((m) => (
                                <TouchableOpacity
                                    key={m}
                                    onPress={() => setPeriod(m as any)}
                                    style={{
                                        paddingVertical: 4,
                                        paddingHorizontal: 12,
                                        backgroundColor: period === m ? colors.surface : 'transparent',
                                        borderRadius: 6,
                                        elevation: period === m ? 1 : 0,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 1 },
                                        shadowOpacity: period === m ? 0.1 : 0,
                                        shadowRadius: 1
                                    }}
                                >
                                    <Text style={{
                                        color: period === m ? colors.primary : colors.textSecondary,
                                        fontSize: 12,
                                        fontWeight: period === m ? '600' : '400'
                                    }}>{m}M</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
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
                    <View style={{ overflow: 'hidden', marginLeft: -20 }}>
                        <LineChart
                            dataSet={dataSet}
                            height={200}
                            width={screenWidth - 40} // Card padding deduction
                            spacing={(screenWidth - 80) / 31} // Approx spacing for 31 days
                            initialSpacing={10}
                            thickness={2}
                            hideRules={false}
                            rulesColor={colors.border + '40'}
                            yAxisColor="transparent"
                            xAxisColor="transparent"
                            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10, marginLeft: 4 }}
                            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                            hideDataPoints
                            curved
                            curveType={0} // 0 = Normal, 1 = Cubic Bezier? Gifted charts use 'curved' prop.
                            // For Labels
                            xAxisIndicesHeight={2}
                            xAxisIndicesWidth={2}
                            noOfSections={4}

                            // Custom Labels logic
                            xAxisLabelTexts={Array.from({ length: 31 }, (_, i) => (i + 1) % 5 === 0 ? (i + 1).toString() : "")}
                            formatYLabel={(value: string) => {
                                const num = parseFloat(value);
                                if (isNaN(num) || num === 0) return formatCompactCurrency(0, currency);
                                return formatCompactCurrency(num, currency);
                            }}
                            yAxisLabelWidth={65}
                            animationDuration={1000}
                        />
                    </View>
                )}

                {/* Legend */}
                {!isPrivacyEnabled && avgData.length > 0 && (
                    <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 5 }}>
                            <View style={{ width: 12, height: 2, backgroundColor: colors.primary, marginRight: 6 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Current</Text>
                        </View>
                        {projectionData.length > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 15, marginBottom: 5 }}>
                                <View style={{ width: 12, height: 2, backgroundColor: colors.primary, marginRight: 6, borderStyle: 'dashed', borderRadius: 1 }} />
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Projected</Text>
                            </View>
                        )}
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                            <View style={{ width: 12, height: 2, backgroundColor: '#A0A0A0', marginRight: 6, borderStyle: 'dashed', borderRadius: 1 }} />
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{period}M Average</Text>
                        </View>
                    </View>
                )}
            </Card>

            <BottomModal
                visible={showInfo}
                onClose={() => setShowInfo(false)}
                title="Understanding Your Chart"
                maxHeight="85%"
            >
                <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 15, lineHeight: 22 }}>
                        This chart shows your <Text style={{ fontWeight: 'bold' }}>spending speed</Text> throughout the month. It adds up your expenses day by day.
                    </Text>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 24, height: 4, backgroundColor: colors.primary, marginRight: 12, borderRadius: 2 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>Solid Line (Current)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Your actual spending so far this month.</Text>
                        </View>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ width: 24, height: 4, backgroundColor: colors.primary, marginRight: 12, borderRadius: 2, borderStyle: 'dashed', borderWidth: 2, borderColor: colors.primary }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>Dotted Line (Projection)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Where you&apos;re headed based on your historical spending pattern.</Text>
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
