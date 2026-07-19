import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import { saveInsightsPulsePeriod, getInsightsPulsePeriod } from '@services/core/storageService';

interface CumulativeSpendingChartProps {
    transactions: Transaction[];
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading?: boolean;
    selectedDate?: Date;
}

const CumulativeSpendingChart: React.FC<CumulativeSpendingChartProps> = ({
    transactions,
    currency,
    isPrivacyEnabled,
    isLoading = false,
    selectedDate = new Date()
}) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const [period, setPeriod] = useState<3 | 6 | 12>(3);
    const [showInfo, setShowInfo] = useState(false);

    // Restore the last-selected period (3M / 6M / 12M) on mount
    const isInitialPeriodLoad = useRef(true);
    useEffect(() => {
        const loadPeriod = async () => {
            const saved = await getInsightsPulsePeriod();
            if (saved === '3' || saved === '6' || saved === '12') {
                setPeriod(Number(saved) as 3 | 6 | 12);
            }
            isInitialPeriodLoad.current = false;
        };
        loadPeriod();
    }, []);

    useEffect(() => {
        if (!isInitialPeriodLoad.current) {
            saveInsightsPulsePeriod(String(period));
        }
    }, [period]);

    // 1. Calculate Raw Data (Stable)
    const { currentData, avgData, projectionData, insight } = useMemo(() => {
        const today = selectedDate;
        const isCurrentMonth = today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear();
        const currentMonthTrans = getTransactionsByMonth(transactions, today);

        const currentData = getCurrentMonthCumulative(currentMonthTrans, today);
        const avgData = getCumulativeSpendingCurve(transactions, period, today);

        const projectionData: number[] = [];
        // Only show projection for the current month
        if (isCurrentMonth && currentData.length > 0 && avgData.length > 0) {
            const currentDay = currentData.length;
            const currentTotal = currentData[currentData.length - 1];

            projectionData.push(currentTotal);

            let runningTotal = currentTotal;
            for (let day = currentDay; day < avgData.length; day++) {
                const dailyIncrement = avgData[day] - avgData[day - 1];
                runningTotal += dailyIncrement;
                projectionData.push(runningTotal);
            }
        }

        let insight = "";
        if (currentData.length > 0 && avgData.length > 0) {
            const currentTotal = currentData[currentData.length - 1];
            const dayIndex = currentData.length - 1;
            const avgAtThisDay = avgData[Math.min(dayIndex, avgData.length - 1)];

            const diff = currentTotal - avgAtThisDay;
            const monthName = isCurrentMonth ? "" : today.toLocaleDateString('en-US', { month: 'short' }) + " ";

            if (diff > 0) {
                insight = isPrivacyEnabled
                    ? `${monthName}Pacing **** above ${period}M avg`
                    : `${monthName}Pacing ${formatCompactCurrency(diff, currency)} above ${period}M avg`;
            } else {
                insight = isPrivacyEnabled
                    ? `${monthName}Pacing **** below ${period}M avg`
                    : `${monthName}Pacing ${formatCompactCurrency(Math.abs(diff), currency)} below ${period}M avg`;
            }
        } else if (avgData.length === 0) {
            insight = "Not enough history for comparison";
        }

        return { currentData, avgData, projectionData, insight };
    }, [transactions, period, currency, isPrivacyEnabled, selectedDate]);

    // 2. Prepare DataSet (FIX: All logic inside useMemo to prevent re-renders)
    const dataSet = useMemo(() => {
        const ds = [];

        // --- A. Prepare Average Data ---
        const averageLineData = avgData.map((value, index) => ({
            value,
            type: 'Average',
            day: index + 1
        }));

        if (avgData.length > 0) {
            ds.push({
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

        // --- B. Prepare Projection Data ---
        const fullProjectionLine: any[] = [];
        if (projectionData.length > 0) {
            const prefix = currentData.slice(0, currentData.length - 1);
            fullProjectionLine.push(...prefix.map((val, index) => ({
                value: val,
                type: 'Current',
                day: index + 1
            })));

            const startDay = currentData.length;
            fullProjectionLine.push(...projectionData.map((val, index) => ({
                value: val,
                type: 'Projected',
                day: startDay + index
            })));
        }

        if (fullProjectionLine.length > 0) {
            ds.push({
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

        // --- C. Prepare Current Data ---
        const currentLineData = currentData.map((value, index) => ({
            value,
            type: 'Current',
            day: index + 1
        }));

        if (currentData.length > 0) {
            ds.push({
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

        return ds;
    }, [avgData, currentData, projectionData, colors.primary]);

    // Calculate Max Value for dynamic tooltip positioning
    const maxValue = useMemo(() => {
        const allValues = [
            ...(currentData || []),
            ...(projectionData || []),
            ...(avgData || [])
        ];
        return allValues.length > 0 ? Math.max(...allValues) : 0;
    }, [currentData, projectionData, avgData]);

    // 3. Pointer Config (Stable)
    const pointerConfig = useMemo(() => ({
        pointerStripHeight: 160,
        pointerStripColor: colors.border,
        pointerStripWidth: 2,
        pointerColor: colors.primary,
        radius: 6,
        pointerLabelWidth: 140,
        pointerLabelHeight: 100,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        pointerComponent: (items: any) => {
            const safeItems = Array.isArray(items) ? items : [items].filter(Boolean);
            const isProjected = safeItems.some((i: any) => i?.type === 'Projected');

            if (isProjected) {
                return (
                    <View style={{
                        height: 10,
                        width: 10,
                        borderRadius: 5,
                        backgroundColor: colors.primary,
                        borderWidth: 2,
                        borderColor: colors.surface
                    }} />
                );
            }
            return <View />;
        },
        pointerLabelComponent: (items: any) => {
            const safeItems = Array.isArray(items) ? items : [items].filter(Boolean);

            const currentItem = safeItems.find((i: any) => i?.type === 'Current');
            const projectedItem = safeItems.find((i: any) => i?.type === 'Projected');
            const averageItem = safeItems.find((i: any) => i?.type === 'Average');

            const mainItem = currentItem || projectedItem;
            if (!mainItem && !averageItem) return null;

            // --- Dynamic Positioning Logic ---
            const day = mainItem?.day || averageItem?.day || 1;
            const value = mainItem?.value || averageItem?.value || 0;

            // X-Axis Positioning: Always avoid center to prevent finger overlap
            let marginLeft = 10; // Default to Right side
            if (day > 16) {
                marginLeft = -100; // Show on Left side for second half of month
            }

            // Y-Axis Positioning: Prevent clipping at top
            // If value is in top 20% of range, push tooltip DOWN
            let marginTop = -30; // Default (Above point)
            if (maxValue > 0 && value > maxValue * 0.8) {
                marginTop = 40; // Push below point
            }

            return (
                <View
                    style={{
                        height: 100,
                        width: 140,
                        justifyContent: 'center',
                        marginTop: marginTop,
                        marginLeft: marginLeft,
                    }}>
                    <View style={{
                        paddingHorizontal: 12,
                        paddingVertical: 10,
                        borderRadius: 12,
                        backgroundColor: colors.surface,
                        elevation: 5,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.25,
                        shadowRadius: 3.84,
                        borderWidth: 1,
                        borderColor: colors.border + '20'
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 11, fontWeight: 'bold', marginBottom: 6, textAlign: 'center' }}>
                            Day {mainItem?.day || averageItem?.day || '?'}
                        </Text>

                        {mainItem && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primary, marginRight: 6 }} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{mainItem.type === 'Current' ? 'Actual' : 'Projected'}</Text>
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                                    {formatCompactCurrency(mainItem.value, currency)}
                                </Text>
                            </View>
                        )}

                        {averageItem && (
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A0A0A0', marginRight: 6 }} />
                                    <Text style={{ color: colors.textSecondary, fontSize: 10 }}>History</Text>
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>
                                    {formatCompactCurrency(averageItem.value, currency)}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            );
        },
    }), [colors, currency, maxValue]);

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
                            width={screenWidth - 40}
                            spacing={(screenWidth - 80) / 31}
                            initialSpacing={10}
                            thickness={2}
                            hideRules={false}
                            rulesColor={colors.border + '40'}
                            yAxisColor="transparent"
                            xAxisColor="transparent"
                            yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10, marginLeft: 4 }}
                            xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, width: 30, textAlign: 'center' }}
                            hideDataPoints
                            curved
                            curveType={0}
                            xAxisIndicesHeight={2}
                            xAxisIndicesWidth={2}
                            noOfSections={4}
                            xAxisLabelTexts={Array.from({ length: 31 }, (_, i) => (i + 1) % 5 === 0 ? (i + 1).toString() : "")}
                            formatYLabel={(value: string) => {
                                const num = parseFloat(value);
                                if (isNaN(num) || num === 0) return formatCompactCurrency(0, currency);
                                return formatCompactCurrency(num, currency);
                            }}
                            yAxisLabelWidth={65}
                            animationDuration={1000}
                            pointerConfig={pointerConfig}
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