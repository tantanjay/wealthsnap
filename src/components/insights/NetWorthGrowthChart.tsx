import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Dimensions, Pressable, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector, { TimeRange } from '@components/common/TimeRangeSelector';
import { Group, Row, SectionHeader, Tone, toneColor } from '@components/ds';
import { Skeleton } from '@components/common/Skeleton';
import HiddenChart from '@components/common/HiddenChart';
import { Formula, HowCalculated } from '@components/insights/FinancialHealthDetails';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Debt, Investment, SavingsGoal, Transaction } from '@types';
import { type, space, radius, layout } from '@styles/theme';
import { getNetWorthHistory, NetWorthPoint, PriceLookup } from '@utils/snapshotMetrics';
import {
    getInsightsNetWorthView, saveInsightsNetWorthView,
    getInsightsNetWorthTimeRange, saveInsightsNetWorthTimeRange,
} from '@services/core/storageService';

interface NetWorthGrowthChartProps {
    transactions: Transaction[];
    investments: Investment[];
    debts: Debt[];
    goals: SavingsGoal[];
    priceAt: PriceLookup | null;
    currency: string;
    isLoading?: boolean;
    selectedDate?: Date;
}

type NetWorthView = 'CUMULATIVE' | 'PERCENT' | 'GROWTH';

const VIEWS: { key: NetWorthView; label: string }[] = [
    { key: 'CUMULATIVE', label: 'Cumulative' },
    { key: 'PERCENT', label: 'Percentage' },
    { key: 'GROWTH', label: 'Growth' },
];

const RANGE_MONTHS: Record<TimeRange, number | 'ALL'> = { '6M': 6, '1Y': 12, '3Y': 36, 'ALL': 'ALL' };
const RANGE_TEXT: Record<TimeRange, string> = { '6M': '6 months', '1Y': '1 year', '3Y': '3 years', 'ALL': 'all time' };

const CHART_HEIGHT = 200;
const BAR_HEIGHT = 160;
const PRESSED_OPACITY = 0.7;
const TOOLTIP_WIDTH = 120;
const MAX_LINE_POINTS = 37;
// Ranges whose header shows the weighted monthly rate instead of the % since the first point.
const WEIGHTED_RANGES: TimeRange[] = ['3Y', 'ALL'];

const toneOf = (value: number): Tone => (value > 0 ? 'good' : value < 0 ? 'bad' : 'neutral');

// Change vs a base; null while the base is zero or below (a % of it means nothing).
const pctOf = (change: number, base: number): number | null => (base > 0 ? (change / base) * 100 : null);

const monthLabel = (date: Date, withYear: boolean): string =>
    date.toLocaleDateString('en-US', { month: 'short' }) + (withYear ? ` '${String(date.getFullYear()).slice(2)}` : '');

const fullLabel = (p: NetWorthPoint): string =>
    p.isNow ? 'Today' : p.date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

// Shows about 6 x-axis labels however many points there are; none crowds the last one.
const thinLabels = (labels: string[]): string[] => {
    if (labels.length <= 7) return labels;
    const interval = Math.ceil(labels.length / 6);
    const lastIndex = labels.length - 1;
    return labels.map((l, i) => (i === lastIndex || (i % interval === 0 && lastIndex - i >= interval) ? l : ''));
};

const LegendLine: React.FC<{ label: string; meaning: string; color: string; dashed?: boolean }> = ({ label, meaning, color, dashed }) => {
    const { ds } = useTheme();
    return (
        <View style={modalStyles.legendRow}>
            <View style={[dashed ? modalStyles.dash : modalStyles.dot, dashed ? { borderColor: color } : { backgroundColor: color }]} />
            <Text style={[type.small, modalStyles.flex, { color: ds.text2 }]}>
                <Text style={{ color: ds.text }}>{label}: </Text>{meaning}
            </Text>
        </View>
    );
};

const NetWorthGrowthChart: React.FC<NetWorthGrowthChartProps> = ({
    transactions, investments, debts, goals, priceAt, currency, isLoading = false, selectedDate = new Date(),
}) => {
    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);
    const screenWidth = Dimensions.get('window').width;

    const [view, setView] = useState<NetWorthView>('CUMULATIVE');
    const [timeRange, setTimeRange] = useState<TimeRange>('6M');
    const [showInfo, setShowInfo] = useState(false);
    const [pressedBar, setPressedBar] = useState<number | null>(null);
    const [barsWidth, setBarsWidth] = useState(0);

    // Restore the saved view and range; a tap before the read resolves wins over it.
    const isInitialPrefLoad = useRef(true);
    useEffect(() => {
        (async () => {
            const [savedView, savedRange] = await Promise.all([getInsightsNetWorthView(), getInsightsNetWorthTimeRange()]);
            if (isInitialPrefLoad.current) {
                if (savedView === 'CUMULATIVE' || savedView === 'PERCENT' || savedView === 'GROWTH') setView(savedView);
                if (savedRange === '6M' || savedRange === '1Y' || savedRange === '3Y' || savedRange === 'ALL') setTimeRange(savedRange);
            }
            isInitialPrefLoad.current = false;
        })();
    }, []);

    const handleViewChange = (next: NetWorthView) => {
        isInitialPrefLoad.current = false;
        setView(next);
        saveInsightsNetWorthView(next);
    };

    const handleRangeChange = (next: TimeRange) => {
        isInitialPrefLoad.current = false;
        setTimeRange(next);
        saveInsightsNetWorthTimeRange(next);
    };

    // Every month, so bars and the weighted average use real monthly changes; the lines thin it below.
    const points = useMemo(() => {
        if (!priceAt) return [];
        return getNetWorthHistory(transactions, investments, debts, goals, priceAt, selectedDate, RANGE_MONTHS[timeRange], true);
    }, [transactions, investments, debts, goals, priceAt, selectedDate, timeRange]);

    const first = points[0]?.netWorth ?? 0;
    const last = points[points.length - 1]?.netWorth ?? 0;
    const change = last - first;
    const changePct = pctOf(change, first);
    const startText = points[0] ? fullLabel(points[0]) : '';
    const spanMonths = points.length > 1
        ? (points[points.length - 1].date.getFullYear() - points[0].date.getFullYear()) * 12 + points[points.length - 1].date.getMonth() - points[0].date.getMonth()
        : 0;
    const withYear = spanMonths > 12;

    const growth = useMemo(() => points.slice(1).map((p, i) => ({
        point: p,
        value: p.netWorth - points[i].netWorth,
        pct: pctOf(p.netWorth - points[i].netWorth, points[i].netWorth),
    })), [points]);

    // Σ monthly growth ÷ Σ net worth at the start of those months; skips months starting at or below 0.
    const weightedMonthly = useMemo(() => {
        const counted = growth.filter(g => g.pct !== null);
        const baseSum = counted.reduce((sum, g) => sum + (g.point.netWorth - g.value), 0);
        return pctOf(counted.reduce((sum, g) => sum + g.value, 0), baseSum);
    }, [growth]);

    // ---------- Summary above the chart ----------
    const summary = useMemo((): { label: string; value: string; line: string; tone: Tone } => {
        const rangeText = `over ${RANGE_TEXT[timeRange]}`;
        const pctText = formatPercent(changePct, { signed: true, decimals: 1 });
        const sinceText = `${format.money(change, { signed: true })} since ${startText}`;
        // Over long ranges a % from an early, small balance means little, so every view shows the weighted monthly rate.
        if (WEIGHTED_RANGES.includes(timeRange)) {
            const weightedText = formatPercent(weightedMonthly, { signed: true, decimals: 1 });
            const upText = `${growth.filter(g => g.value > 0).length} of ${growth.length} months up`;
            if (view === 'CUMULATIVE' && format.isOpen) {
                return { label: 'Net worth', value: format.money(last), line: `${sinceText} · ${weightedText}/month avg`, tone: toneOf(change) };
            }
            return {
                label: 'Weighted avg growth per month',
                value: weightedText,
                line: view === 'GROWTH'
                    ? (format.isOpen ? `${sinceText} · ${upText}` : upText)
                    : (format.isOpen ? sinceText : `since ${startText}`),
                tone: toneOf(weightedMonthly ?? 0),
            };
        }
        if (view === 'PERCENT') {
            return {
                label: `Change since ${startText}`,
                value: pctText,
                line: format.isOpen ? `${format.money(change, { signed: true })} from ${format.money(first)}` : rangeText,
                tone: toneOf(change),
            };
        }
        if (view === 'GROWTH') {
            const upText = `${growth.filter(g => g.value > 0).length} of ${growth.length} months up`;
            return {
                label: `Grew ${rangeText}`,
                value: format.show(format.money(change, { signed: true }), pctText),
                line: format.isOpen ? `${pctText} · ${upText}` : upText,
                tone: toneOf(change),
            };
        }
        return {
            label: format.isDiscreet ? `Change ${rangeText}` : 'Net worth',
            value: format.show(format.money(last), pctText),
            line: format.isDiscreet ? `since ${startText}` : `${format.money(change, { signed: true })} ${rangeText}`,
            tone: toneOf(change),
        };
    }, [view, timeRange, format, change, changePct, first, last, startText, growth, weightedMonthly]);

    const chartWidth = screenWidth - 80 - (layout.groupInset + layout.groupPadding - space[5]) * 2;
    const axisText = [type.caption, { color: ds.text2 }];

    // ---------- Line views (Cumulative, Percentage) ----------
    const percentUnavailable = view === 'PERCENT' && first <= 0;
    // Long ranges keep the first point and every step-th month back from the last, about 36 points.
    const linePoints = useMemo(() => {
        if (points.length <= MAX_LINE_POINTS) return points;
        const step = Math.ceil((points.length - 1) / (MAX_LINE_POINTS - 1));
        return points.filter((_, i) => i === 0 || (points.length - 1 - i) % step === 0);
    }, [points]);
    const lineValues = useMemo(
        () => linePoints.map(p => (view === 'PERCENT' ? pctOf(p.netWorth - first, first) ?? 0 : p.netWorth)),
        [linePoints, view, first]
    );

    // Values are shifted so the lowest sits at 0 (gifted-charts here can't draw below its baseline).
    const lineScale = useMemo(() => {
        if (lineValues.length === 0) return { lo: 0, hi: 1 };
        let lo = Math.min(...lineValues);
        let hi = Math.max(...lineValues);
        if (view === 'PERCENT') { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
        const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
        const paddedLo = lo - pad;
        return { lo: view === 'CUMULATIVE' && lo >= 0 && paddedLo < 0 ? 0 : paddedLo, hi: hi + pad };
    }, [lineValues, view]);

    const showYAxis = view === 'PERCENT' || format.isOpen;
    const lineLabels = thinLabels(linePoints.map(p => monthLabel(p.date, withYear)));

    const pointerConfig = useMemo(() => ({
        pointerStripHeight: CHART_HEIGHT - 20,
        pointerStripColor: ds.hairline,
        pointerStripWidth: 1,
        pointerColor: ds.accent,
        radius: 5,
        pointerLabelWidth: 140,
        pointerLabelHeight: 70,
        activatePointersOnLongPress: false,
        autoAdjustPointerLabelPosition: true,
        pointerLabelComponent: (items: any) => {
            const item = (Array.isArray(items) ? items : [items])[0];
            if (!item) return null;
            const p: NetWorthPoint | undefined = linePoints[item.index];
            if (!p) return null;
            const sinceStart = p.netWorth - first;
            const value = view === 'PERCENT' || format.isDiscreet
                ? `${formatPercent(pctOf(sinceStart, first), { signed: true, decimals: 1 })} vs start`
                : format.money(p.netWorth);
            return (
                <View style={[styles.pointerLabelWrap, { marginLeft: item.index > linePoints.length / 2 ? -110 : 10 }]}>
                    <View style={[styles.pointerLabel, { backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                        <Text style={[type.captionMedium, { color: ds.text2 }]}>{fullLabel(p)}</Text>
                        <Text style={[type.captionNum, type.captionMedium, { color: ds.text }]}>{value}</Text>
                        {view === 'PERCENT' && format.isOpen && (
                            <Text style={[type.captionNum, { color: ds.text2 }]}>{format.money(p.netWorth)}</Text>
                        )}
                    </View>
                </View>
            );
        },
    }), [ds, linePoints, first, view, format]);

    const renderLine = () => {
        if (percentUnavailable) {
            return (
                <View style={[styles.notice, { height: CHART_HEIGHT }]}>
                    <Text style={[type.small, styles.center, { color: ds.text2 }]}>
                        A percentage needs a starting net worth above zero. Try Cumulative or Growth.
                    </Text>
                </View>
            );
        }
        const n = lineValues.length;
        return (
            <View style={styles.chart}>
                <LineChart
                    data={lineValues.map((v, i) => ({ value: v - lineScale.lo, label: lineLabels[i], index: i }))}
                    height={CHART_HEIGHT - 30}
                    width={chartWidth}
                    initialSpacing={10}
                    endSpacing={10}
                    spacing={n > 1 ? (chartWidth - 20) / (n - 1) : 0}
                    thickness={1.5}
                    color={ds.accent}
                    curved
                    curveType={0}
                    hideDataPoints
                    areaChart
                    startFillColor={ds.accent}
                    endFillColor={ds.accent}
                    startOpacity={0.18}
                    endOpacity={0}
                    maxValue={lineScale.hi - lineScale.lo}
                    noOfSections={4}
                    hideRules
                    yAxisColor="transparent"
                    xAxisColor="transparent"
                    yAxisLabelWidth={showYAxis ? 48 : space[2]}
                    hideYAxisText={!showYAxis}
                    yAxisTextStyle={axisText}
                    xAxisLabelTextStyle={[axisText, styles.xLabel]}
                    formatYLabel={(label: string) => {
                        const real = Number(label) + lineScale.lo;
                        return view === 'PERCENT' ? `${Math.round(real)}%` : format.money(real, { compact: true });
                    }}
                    showReferenceLine1={view === 'PERCENT'}
                    referenceLine1Position={-lineScale.lo}
                    referenceLine1Config={{ color: ds.text3, thickness: 1, dashWidth: 4, dashGap: 4 }}
                    pointerConfig={pointerConfig}
                />
            </View>
        );
    };

    // ---------- Growth view (bars above and below zero) ----------
    const renderBars = () => {
        const maxUp = Math.max(0, ...growth.map(g => g.value));
        const maxDown = Math.max(0, ...growth.map(g => -g.value));
        const total = maxUp + maxDown || 1;
        const zeroFromTop = (maxUp / total) * BAR_HEIGHT;
        const labels = thinLabels(growth.map(g => monthLabel(g.point.date, withYear)));
        const pressed = pressedBar !== null ? growth[pressedBar] : null;
        const columnWidth = barsWidth / Math.max(growth.length, 1);
        const tipLeft = pressedBar !== null
            ? Math.min(Math.max(columnWidth * (pressedBar + 0.5) - TOOLTIP_WIDTH / 2, 0), Math.max(barsWidth - TOOLTIP_WIDTH, 0))
            : 0;
        const pressedHeight = pressed ? (Math.abs(pressed.value) / total) * BAR_HEIGHT : 0;

        return (
            <View style={styles.plot}>
                {format.isOpen && (
                    <View style={[styles.yAxis, { height: BAR_HEIGHT }]}>
                        {maxUp > 0 && <Text style={[type.captionNum, styles.yTick, { top: 0, color: ds.text2 }]} numberOfLines={1}>{format.money(maxUp, { compact: true })}</Text>}
                        <Text style={[type.captionNum, styles.yTick, { top: Math.min(Math.max(zeroFromTop - 8, 0), BAR_HEIGHT - 16), color: ds.text2 }]}>0</Text>
                        {maxDown > 0 && <Text style={[type.captionNum, styles.yTick, { bottom: 0, color: ds.text2 }]} numberOfLines={1}>{format.money(-maxDown, { compact: true })}</Text>}
                    </View>
                )}
                <View style={styles.flex}>
                    <View style={{ height: BAR_HEIGHT }} onLayout={e => setBarsWidth(e.nativeEvent.layout.width)}>
                        <View style={[styles.zero, { top: zeroFromTop, backgroundColor: ds.hairline }]} />
                        <View style={styles.bars}>
                            {growth.map((g, i) => {
                                const h = (Math.abs(g.value) / total) * BAR_HEIGHT;
                                const up = g.value >= 0;
                                return (
                                    <View key={i} style={styles.barColumn}>
                                        <TouchableOpacity
                                            activeOpacity={1}
                                            onPressIn={() => setPressedBar(i)}
                                            onPressOut={() => setPressedBar(null)}
                                            style={styles.barTouch}
                                        >
                                            <View style={[
                                                styles.bar,
                                                up ? styles.barUp : styles.barDown,
                                                up ? { bottom: BAR_HEIGHT - zeroFromTop } : { top: zeroFromTop },
                                                { height: Math.max(h, g.value === 0 ? 0 : 2), backgroundColor: up ? ds.success : ds.danger, opacity: pressedBar === i ? PRESSED_OPACITY : 1 },
                                            ]} />
                                        </TouchableOpacity>
                                    </View>
                                );
                            })}
                        </View>
                        {/* Drawn over the whole plot so a narrow column can't squeeze it */}
                        {pressed && (
                            <View
                                pointerEvents="none"
                                style={[styles.tooltip, {
                                    left: tipLeft,
                                    bottom: Math.min(BAR_HEIGHT - zeroFromTop + (pressed.value >= 0 ? pressedHeight : 0) + space[2], BAR_HEIGHT - (format.isOpen ? 62 : 44)),
                                    backgroundColor: ds.raised,
                                    borderColor: ds.hairline,
                                }]}
                            >
                                <Text style={[type.captionMedium, { color: ds.text }]}>{fullLabel(pressed.point)}</Text>
                                {format.isOpen && (
                                    <Text style={[type.captionNum, type.captionMedium, { color: toneColor(ds, toneOf(pressed.value)) }]}>
                                        {format.money(pressed.value, { signed: true })}
                                    </Text>
                                )}
                                <Text style={[type.captionNum, { color: format.isOpen ? ds.text2 : toneColor(ds, toneOf(pressed.value)) }]}>
                                    {`${formatPercent(pressed.pct, { signed: true, decimals: 1 })} that month`}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.barLabels}>
                        {labels.map((l, i) => (
                            <View key={i} style={styles.barColumn}>
                                <Text style={[type.caption, styles.barLabel, { color: ds.text2 }]} numberOfLines={1}>{l}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </View>
        );
    };

    const renderInfoModal = () => (
        <BottomModal visible={showInfo} onClose={() => setShowInfo(false)} title="Understanding your chart" maxHeight="85%">
            <ScrollView showsVerticalScrollIndicator={false}>
                <SectionHeader grouped title="Three views" />
                <Group>
                    <Row title="Cumulative" subtitle="Your net worth at the end of each month, ending with today." />
                    <Row title="Percentage" subtitle="How far your net worth has moved since the first month shown, as a %." />
                    <Row title="Growth" subtitle="How much your net worth went up or down in each month." last />
                </Group>

                <SectionHeader grouped title="Reading the chart" />
                <Group padded>
                    <View style={modalStyles.legend}>
                        <LegendLine label="Blue line" meaning="Your net worth (Cumulative) or its change since the start (Percentage)" color={ds.accent} />
                        <LegendLine label="Dashed line" meaning="0% on the Percentage view: above it, you're ahead of where you started" color={ds.text3} dashed />
                        <LegendLine label="Green bar" meaning="A month your net worth grew" color={ds.success} />
                        <LegendLine label="Red bar" meaning="A month your net worth shrank" color={ds.danger} />
                        <LegendLine label="Details" meaning="Touch or drag along the line, or press a bar, to see that month" color={ds.text2} />
                    </View>
                </Group>

                <SectionHeader grouped title="What counts as net worth" />
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        The same Projected Net Worth as Home: cash, investments at market value and savings goal balances, minus what
                        you owe on loans, including the interest still to come. Money you lent out counts once it&apos;s repaid.
                    </Text>
                </Group>

                <HowCalculated>
                    <Formula
                        title="Cumulative"
                        formula="Net worth at each month-end, then today"
                        explanation="Long ranges skip months to keep the line near 36 points."
                    />
                    <Formula
                        title="Percentage"
                        formula="(Net worth then − net worth at the start) ÷ net worth at the start × 100"
                        explanation="Needs a starting net worth above zero."
                    />
                    <Formula
                        title="Growth"
                        formula="Net worth at a month-end − net worth at the month-end before it"
                        explanation="This month's bar runs to today. Every month gets its own bar, whatever the range. Press a bar for its amount and its % of the month before."
                    />
                    <Formula
                        title="Weighted avg growth per month (3 years, all time)"
                        formula="Σ monthly growth ÷ Σ net worth at the start of those months × 100"
                        explanation="Shown on every view for 3 years and all time. Big months count more than small ones, so a jump from a tiny first balance doesn't swamp it. Months starting at zero or below are left out."
                    />
                </HowCalculated>
            </ScrollView>
        </BottomModal>
    );

    const header = (
        <SectionHeader grouped title="Net worth growth" menu={{ options: VIEWS, value: view, onSelect: key => handleViewChange(key as NetWorthView) }} />
    );

    const toolbar = (
        <View style={styles.toolbar}>
            <TimeRangeSelector value={timeRange} onChange={handleRangeChange} />
            <Pressable onPress={() => setShowInfo(true)} hitSlop={space[2]} accessibilityLabel="Understanding your chart">
                <Ionicons name="information-circle-outline" size={18} color={ds.text2} />
            </Pressable>
        </View>
    );

    if (!isLoading && points.length < 2) {
        return (
            <View>
                {header}
                <Group padded>
                    {toolbar}
                    <Text style={[type.small, styles.empty, { color: ds.text2 }]}>
                        Your net worth chart starts once you&apos;ve tracked past your first month.
                    </Text>
                </Group>
                {renderInfoModal()}
            </View>
        );
    }

    return (
        <View>
            {header}
            <Group padded>
                {toolbar}

                <View style={styles.summary}>
                    <Text style={[type.small, { color: ds.text2 }]}>{summary.label}</Text>
                    {isLoading ? <Skeleton width={120} height={26} /> : (
                        <>
                            <Text style={[type.titleNum, { color: ds.text }]} numberOfLines={1} adjustsFontSizeToFit>{summary.value}</Text>
                            <Text style={[type.smallNum, { color: toneColor(ds, summary.tone) }]} numberOfLines={1}>{summary.line}</Text>
                        </>
                    )}
                </View>

                {isLoading ? (
                    <Skeleton height={CHART_HEIGHT} width="100%" borderRadius={radius.md} />
                ) : format.isHidden ? (
                    <HiddenChart height={CHART_HEIGHT} />
                ) : view === 'GROWTH' ? renderBars() : renderLine()}
            </Group>
            {renderInfoModal()}
        </View>
    );
};

const styles = StyleSheet.create({
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: space[3],
    },
    summary: {
        gap: space[1],
        marginBottom: space[3],
    },
    empty: {
        textAlign: 'center',
        paddingVertical: space[5],
    },
    notice: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: space[4],
    },
    chart: {
        height: CHART_HEIGHT,
        marginLeft: -space[2],
    },
    xLabel: {
        width: 40,
        textAlign: 'center',
    },
    pointerLabelWrap: {
        width: 140,
        justifyContent: 'center',
        zIndex: 1000,
    },
    pointerLabel: {
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        gap: 2,
    },
    plot: {
        flexDirection: 'row',
        height: CHART_HEIGHT,
    },
    yAxis: {
        width: 52,
        marginRight: space[1],
    },
    yTick: {
        position: 'absolute',
        right: 0,
    },
    zero: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 1,
    },
    bars: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
    },
    barColumn: {
        flex: 1,
        alignItems: 'center',
    },
    barTouch: {
        width: '100%',
        height: '100%',
        alignItems: 'center',
    },
    bar: {
        position: 'absolute',
        width: '55%',
        maxWidth: 18,
    },
    barUp: {
        borderTopLeftRadius: 4,
        borderTopRightRadius: 4,
    },
    barDown: {
        borderBottomLeftRadius: 4,
        borderBottomRightRadius: 4,
    },
    barLabels: {
        flexDirection: 'row',
        marginTop: space[2],
    },
    barLabel: {
        width: 48,
        textAlign: 'center',
    },
    tooltip: {
        position: 'absolute',
        width: TOOLTIP_WIDTH,
        alignItems: 'center',
        padding: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        zIndex: 100,
    },
    center: {
        textAlign: 'center',
    },
    flex: {
        flex: 1,
    },
});

const modalStyles = StyleSheet.create({
    legend: {
        gap: space[2],
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[2],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
        marginTop: 5,
    },
    dash: {
        width: 10,
        height: 0,
        borderTopWidth: 1.5,
        borderStyle: 'dashed',
        marginTop: 8,
    },
    flex: {
        flex: 1,
    },
});

export default NetWorthGrowthChart;
