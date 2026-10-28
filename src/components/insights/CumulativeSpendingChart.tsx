import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, Dimensions, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Row, SectionHeader } from '@components/ds';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Transaction } from '@types';
import { type, space, radius } from '@styles/theme';
import { getCumulativeSpendingCurve, getCurrentMonthCumulative, getTransactionsByMonth } from '@utils/financialMetrics';
import { saveInsightsPulsePeriod, getInsightsPulsePeriod } from '@services/core/storageService';

interface CumulativeSpendingChartProps {
    transactions: Transaction[];
    currency: string;
    isLoading?: boolean;
    selectedDate?: Date;
}

const CHART_HEIGHT = 200;

const PERIODS = [
    { key: '3', label: '3M avg' },
    { key: '6', label: '6M avg' },
    { key: '12', label: '12M avg' },
];

// Signed % change of a value against its reference; null when there's no reference.
const changeVs = (value: number, reference: number): number | null =>
    reference > 0 ? ((value - reference) / reference) * 100 : null;

// Hidden mode: same size, fill and copy as every other hidden chart.
const HiddenChart: React.FC<{ height: number }> = ({ height }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.hidden, { height, backgroundColor: ds.inset }]}>
            <Ionicons name="lock-closed-outline" size={18} color={ds.text2} />
            <Text style={[type.small, { color: ds.text2 }]}>Chart hidden for privacy</Text>
        </View>
    );
};

const CumulativeSpendingChart: React.FC<CumulativeSpendingChartProps> = ({
    transactions,
    currency,
    isLoading = false,
    selectedDate = new Date()
}) => {
    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);
    const screenWidth = Dimensions.get('window').width;
    const [period, setPeriod] = useState<3 | 6 | 12>(3);
    const [showInfo, setShowInfo] = useState(false);

    // Restore the last-selected period (3M / 6M / 12M) on mount. Flipped false either when
    // the load resolves OR the instant the user taps a period (see handlePeriodChange below) -
    // without that second path, a tap made before the still-in-flight AsyncStorage read
    // resolves would get silently reverted by the load once it completes, since it applied
    // its result unconditionally.
    const isInitialPeriodLoad = useRef(true);
    useEffect(() => {
        const loadPeriod = async () => {
            const saved = await getInsightsPulsePeriod();
            if (isInitialPeriodLoad.current && (saved === '3' || saved === '6' || saved === '12')) {
                setPeriod(Number(saved) as 3 | 6 | 12);
            }
            isInitialPeriodLoad.current = false;
        };
        loadPeriod();
    }, []);

    const handlePeriodChange = (value: 3 | 6 | 12) => {
        isInitialPeriodLoad.current = false;
        setPeriod(value);
    };

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

            // Discreet: the gap as % of the average so far; Hidden masks the amount.
            const pct = changeVs(currentTotal, avgAtThisDay);
            const gap = format.isDiscreet
                ? (pct === null ? '' : `${formatPercent(Math.abs(pct))} `)
                : `${format.money(Math.abs(diff), { compact: true })} `;
            insight = `${monthName}Pacing ${gap}${diff > 0 ? 'above' : 'below'} ${period}M avg`;
        } else if (avgData.length === 0) {
            insight = "Not enough history for comparison";
        }

        return { currentData, avgData, projectionData, insight };
    }, [transactions, period, format, selectedDate]);

    // 2. Prepare DataSet (FIX: All logic inside useMemo to prevent re-renders)
    const dataSet = useMemo(() => {
        const sets = [];

        // --- A. Prepare Average Data (reference series) ---
        if (avgData.length > 0) {
            sets.push({
                data: avgData.map((value, index) => ({ value, type: 'Average', day: index + 1 })),
                color: ds.text2,
                strokeDashArray: [4, 4],
                thickness: 1.5,
                hideDataPoints: true,
                zIndex: 1,
                ...NO_FILL,
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
            sets.push({
                data: fullProjectionLine,
                color: ds.accent,
                strokeDashArray: [6, 4],
                thickness: 1.5,
                hideDataPoints: true,
                zIndex: 2,
                ...NO_FILL,
            });
        }

        // --- C. Prepare Current Data ---
        if (currentData.length > 0) {
            sets.push({
                data: currentData.map((value, index) => ({ value, type: 'Current', day: index + 1 })),
                color: ds.accent,
                thickness: 1.5,
                hideDataPoints: true,
                zIndex: 3,
                // Soft shade under what's actually been spent; projection and average stay plain lines.
                areaChart: true,
                startFillColor: ds.accent,
                endFillColor: ds.accent,
                startOpacity: 0.18,
                endOpacity: 0,
            });
        }

        return sets;
    }, [avgData, currentData, projectionData, ds]);

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
        pointerStripColor: ds.hairline,
        pointerStripWidth: 1,
        pointerColor: ds.accent,
        radius: 6,
        pointerLabelWidth: 140,
        pointerLabelHeight: 100,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        pointerComponent: (items: any) => {
            const safeItems = Array.isArray(items) ? items : [items].filter(Boolean);
            const isProjected = safeItems.some((i: any) => i?.type === 'Projected');

            if (isProjected) {
                return <View style={[styles.pointer, { backgroundColor: ds.accent, borderColor: ds.bg }]} />;
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

            // Discreet: the day's change vs the average curve instead of either amount.
            const vsAvg = mainItem && averageItem ? changeVs(mainItem.value, averageItem.value) : null;

            return (
                <View style={[styles.pointerLabelWrap, { marginTop, marginLeft }]}>
                    <View style={[styles.pointerLabel, { backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                        <Text style={[type.captionMedium, styles.pointerTitle, { color: ds.text2 }]}>
                            Day {mainItem?.day || averageItem?.day || '?'}
                        </Text>

                        {mainItem && (
                            <View style={styles.pointerRow}>
                                <View style={styles.pointerKey}>
                                    <View style={[styles.pointerDot, { backgroundColor: ds.accent }]} />
                                    <Text style={[type.caption, { color: ds.text2 }]}>{mainItem.type === 'Current' ? 'Actual' : 'Projected'}</Text>
                                </View>
                                <Text style={[type.captionNum, type.captionMedium, { color: ds.text }]}>
                                    {format.isDiscreet ? `${formatPercent(vsAvg, { signed: true })} vs avg` : format.money(mainItem.value, { compact: true })}
                                </Text>
                            </View>
                        )}

                        {averageItem && !format.isDiscreet && (
                            <View style={styles.pointerRow}>
                                <View style={styles.pointerKey}>
                                    <View style={[styles.pointerDot, { backgroundColor: ds.text2 }]} />
                                    <Text style={[type.caption, { color: ds.text2 }]}>History</Text>
                                </View>
                                <Text style={[type.captionNum, type.captionMedium, { color: ds.text }]}>
                                    {format.money(averageItem.value, { compact: true })}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            );
        },
    }), [ds, format, maxValue]);

    const axisText = [type.caption, { color: ds.text2 }];

    // The chart box is the page width minus its right gutter (it bleeds into the left one), so day 31's
    // label must fit inside that box: spacing comes from what's left after the y-axis and edge room.
    const yAxisWidth = format.isOpen ? 56 : space[5];
    const plotWidth = screenWidth - space[5] - yAxisWidth;
    const pointSpacing = (plotWidth - X_START - X_END) / 30;

    return (
        <View>
            <SectionHeader
                title="Monthly pulse"
                menu={avgData.length > 0
                    ? { options: PERIODS, value: String(period), onSelect: key => handlePeriodChange(Number(key) as 3 | 6 | 12) }
                    : undefined}
            />
            <View style={styles.subline}>
                <Text style={[type.small, styles.flex, { color: ds.text2 }]}>{insight || "Cumulative spending"}</Text>
                <Pressable onPress={() => setShowInfo(true)} hitSlop={space[2]}>
                    <Ionicons name="information-circle-outline" size={18} color={ds.text2} />
                </Pressable>
            </View>

            {isLoading ? (
                <Skeleton height={CHART_HEIGHT} width="100%" borderRadius={radius.md} />
            ) : format.isHidden ? (
                <HiddenChart height={CHART_HEIGHT} />
            ) : (
                <View style={styles.chart}>
                    <LineChart
                        dataSet={dataSet}
                        height={CHART_HEIGHT}
                        width={plotWidth}
                        spacing={pointSpacing}
                        initialSpacing={X_START}
                        endSpacing={X_END}
                        thickness={1.5}
                        hideRules
                        yAxisColor="transparent"
                        xAxisColor="transparent"
                        yAxisTextStyle={axisText}
                        xAxisLabelTextStyle={[axisText, styles.xLabel]}
                        hideYAxisText={!format.isOpen}
                        hideDataPoints
                        curved
                        curveType={0}
                        xAxisIndicesHeight={2}
                        xAxisIndicesWidth={2}
                        noOfSections={4}
                        xAxisLabelTexts={Array.from({ length: 31 }, (_, i) => (i + 1) % 5 === 0 ? (i + 1).toString() : "")}
                        formatYLabel={(value: string) => {
                            const num = parseFloat(value);
                            return format.money(isNaN(num) ? 0 : num, { compact: true });
                        }}
                        yAxisLabelWidth={yAxisWidth}
                        animationDuration={1000}
                        pointerConfig={pointerConfig}
                    />
                </View>
            )}

            {/* Legend */}
            {!isLoading && !format.isHidden && avgData.length > 0 && (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.swatch, { backgroundColor: ds.accent }]} />
                        <Text style={[type.caption, { color: ds.text2 }]}>Current</Text>
                    </View>
                    {projectionData.length > 0 && (
                        <View style={styles.legendItem}>
                            <View style={[styles.swatch, styles.dashed, { borderColor: ds.accent }]} />
                            <Text style={[type.caption, { color: ds.text2 }]}>Projected</Text>
                        </View>
                    )}
                    <View style={styles.legendItem}>
                        <View style={[styles.swatch, styles.dashed, { borderColor: ds.text2 }]} />
                        <Text style={[type.caption, { color: ds.text2 }]}>{period}M average</Text>
                    </View>
                </View>
            )}

            <BottomModal
                visible={showInfo}
                onClose={() => setShowInfo(false)}
                title="Understanding your chart"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={[type.small, modalStyles.lead, { color: ds.text2 }]}>
                        This chart shows your <Text style={{ color: ds.text }}>spending speed</Text> throughout the month. It adds up your expenses day by day.
                    </Text>

                    <Row
                        leading={<View style={[modalStyles.swatch, { backgroundColor: ds.accent }]} />}
                        title="Solid line (current)"
                        subtitle="Your actual spending so far this month."
                    />
                    <Row
                        leading={<View style={[modalStyles.swatch, modalStyles.dashed, { borderColor: ds.accent }]} />}
                        title="Dotted line (projection)"
                        subtitle="Where you're headed based on your historical spending pattern."
                    />
                    <Row
                        leading={<View style={[modalStyles.swatch, modalStyles.dashed, { borderColor: ds.text2 }]} />}
                        title="Dashed line (average)"
                        subtitle="How you usually spend by this time of the month."
                        last
                    />

                    <View style={modalStyles.note}>
                        <Ionicons name="flag-outline" size={20} color={ds.text2} />
                        <Text style={[type.small, modalStyles.noteText, { color: ds.text2 }]}>
                            <Text style={[type.smallMedium, { color: ds.text }]}>The goal: </Text>
                            Try to keep your solid line <Text style={{ color: ds.text }}>below</Text> the dashed line.
                            If it goes above, you are spending faster than your historical average.
                        </Text>
                    </View>
                </ScrollView>
            </BottomModal>
        </View>
    );
};

// gifted-charts stores area fills only for filled sets but looks them up by set index, so every set
// gets a fill (invisible on the reference lines) to keep the Actual line's shade at its own index.
const NO_FILL = { areaChart: true, startOpacity: 0, endOpacity: 0 };

// Room before day 1 and after day 31, so the first and last x labels aren't clipped.
const X_START = 10;
const X_END = 16;

const styles = StyleSheet.create({
    subline: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        marginBottom: space[3],
    },
    flex: {
        flex: 1,
    },
    chart: {
        overflow: 'hidden',
        marginLeft: -space[5],
    },
    xLabel: {
        width: 30,
        textAlign: 'center',
    },
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    pointer: {
        height: 10,
        width: 10,
        borderRadius: radius.full,
        borderWidth: 2,
    },
    pointerLabelWrap: {
        height: 100,
        width: 140,
        justifyContent: 'center',
    },
    pointerLabel: {
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        gap: space[1],
    },
    pointerTitle: {
        textAlign: 'center',
    },
    pointerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space[2],
    },
    pointerKey: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
    },
    pointerDot: {
        width: 6,
        height: 6,
        borderRadius: radius.full,
    },
    legend: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: space[4],
        marginTop: space[2],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    swatch: {
        width: 12,
        height: 2,
    },
    dashed: {
        height: 0,
        borderTopWidth: 2,
        borderStyle: 'dashed',
    },
});

const modalStyles = StyleSheet.create({
    lead: {
        marginBottom: space[2],
    },
    swatch: {
        width: 20,
        height: 4,
        borderRadius: 2,
    },
    dashed: {
        height: 0,
        borderTopWidth: 2,
        borderStyle: 'dashed',
    },
    note: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[3],
        marginTop: space[6],
    },
    noteText: {
        flex: 1,
    },
});

export default CumulativeSpendingChart;
