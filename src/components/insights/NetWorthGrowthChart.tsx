import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Dimensions, Pressable, ScrollView, StyleSheet, StyleProp, TextStyle, TouchableOpacity } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector, { TimeRange } from '@components/common/TimeRangeSelector';
import YearSelector from '@components/common/YearSelector';
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
const Y_AXIS_WIDTH = 44;
// Room kept at each end for the pointer dot; the end labels are anchored to their points instead.
const X_EDGE = 6;
const X_LABEL_WIDTH = 28;
// Percent labels ("-150%") need less room than compact amounts ("−₱120k").
const Y_AXIS_WIDTH_PERCENT = 36;

// Plain copies: gifted-charts deep-clones data items by writing to them, and StyleSheet styles are frozen in dev.
const plainStyle = (style: StyleProp<TextStyle>): TextStyle => JSON.parse(JSON.stringify(StyleSheet.flatten(style)));
const MAX_LINE_POINTS = 37;
// Ranges whose header shows the weighted monthly rate instead of the % since the first point.
const WEIGHTED_RANGES: TimeRange[] = ['3Y', 'ALL'];

const toneOf = (value: number): Tone => (value > 0 ? 'good' : value < 0 ? 'bad' : 'neutral');

// Change vs a base; null while the base is zero or below (a % of it means nothing).
const pctOf = (change: number, base: number): number | null => (base > 0 ? (change / base) * 100 : null);

// Axis labels are month names only, like the other charts; tooltips carry the year.
const monthLabel = (date: Date): string => date.toLocaleDateString('en-US', { month: 'short' });

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
    const [selectedYear, setSelectedYear] = useState(selectedDate.getFullYear());

    // Follow the month picker at the top of Insights; the arrows can still move off it.
    const pickerYear = selectedDate.getFullYear();
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- a default the arrows can override
        setSelectedYear(pickerYear);
    }, [pickerYear]);

    // Net worth carries on without new transactions, so every year from the first one to now counts.
    const availableYears = useMemo(() => {
        const thisYear = new Date().getFullYear();
        if (transactions.length === 0) return [thisYear];
        const firstYear = Math.min(...transactions.map(t => new Date(t.date).getFullYear()));
        return Array.from({ length: Math.max(thisYear - firstYear, 0) + 1 }, (_, i) => thisYear - i);
    }, [transactions]);

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
    // 1 year is a calendar year: from the end of the year before to December, or today for this year.
    const points = useMemo(() => {
        if (!priceAt) return [];
        if (timeRange === '1Y') {
            const now = new Date();
            const end = selectedYear >= now.getFullYear() ? now : new Date(selectedYear, 11, 1);
            return getNetWorthHistory(transactions, investments, debts, goals, priceAt, end, end.getMonth() + 1, true);
        }
        return getNetWorthHistory(transactions, investments, debts, goals, priceAt, selectedDate, RANGE_MONTHS[timeRange], true);
    }, [transactions, investments, debts, goals, priceAt, selectedDate, timeRange, selectedYear]);

    const first = points[0]?.netWorth ?? 0;
    const last = points[points.length - 1]?.netWorth ?? 0;
    const change = last - first;
    const changePct = pctOf(change, first);
    const startText = points[0] ? fullLabel(points[0]) : '';

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
        const rangeText = timeRange === '1Y' ? `in ${selectedYear}` : `over ${RANGE_TEXT[timeRange]}`;
        const pctText = formatPercent(changePct, { signed: true, decimals: 1 });
        // Over long ranges a % from an early, small balance means little, so every view shows the weighted monthly rate,
        // and amounts are per month too so both figures mean the same thing.
        if (WEIGHTED_RANGES.includes(timeRange)) {
            const weightedText = formatPercent(weightedMonthly, { signed: true, decimals: 1 });
            const upText = `${growth.filter(g => g.value > 0).length} of ${growth.length} months up`;
            const avgText = `Avg ${format.money(growth.length > 0 ? change / growth.length : 0, { signed: true })}/month`;
            if (view === 'CUMULATIVE' && format.isOpen) {
                return { label: 'Net worth', value: format.money(last), line: `${avgText} · ${weightedText}/month`, tone: toneOf(change) };
            }
            return {
                label: 'Weighted avg growth per month',
                value: weightedText,
                line: view === 'CUMULATIVE' ? `since ${startText}` : (format.isOpen ? `${avgText} · ${upText}` : upText),
                tone: toneOf(weightedMonthly ?? 0),
            };
        }
        // Each month's growth % already reads per month, so its header is the weighted monthly rate on every range.
        if (view === 'PERCENT') {
            const upText = `${growth.filter(g => g.value > 0).length} of ${growth.length} months up`;
            return {
                label: 'Weighted avg growth per month',
                value: formatPercent(weightedMonthly, { signed: true, decimals: 1 }),
                line: format.isOpen ? `${format.money(change, { signed: true })} ${rangeText} · ${upText}` : upText,
                tone: toneOf(weightedMonthly ?? 0),
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
    }, [view, timeRange, selectedYear, format, change, changePct, last, startText, growth, weightedMonthly]);

    // Charts run edge to edge across the card (past its side padding) to give long ranges room.
    const chartWidth = screenWidth - layout.groupInset * 2;
    const axisText = [type.caption, { color: ds.text2 }];

    // ---------- Line views (Cumulative, Percentage) ----------
    // Cumulative: net worth per point, long ranges keeping the first and every step-th month back from the last.
    // Percentage: each month's growth %, every month that started above 0.
    const lineSeries = useMemo((): { point: NetWorthPoint; value: number; amount: number | null }[] => {
        if (view === 'PERCENT') {
            return growth.filter(g => g.pct !== null).map(g => ({ point: g.point, value: g.pct as number, amount: g.value }));
        }
        const step = points.length <= MAX_LINE_POINTS ? 1 : Math.ceil((points.length - 1) / (MAX_LINE_POINTS - 1));
        return points
            .filter((_, i) => i === 0 || (points.length - 1 - i) % step === 0)
            .map(p => ({ point: p, value: p.netWorth, amount: null }));
    }, [view, points, growth]);
    const lineValues = useMemo(() => lineSeries.map(s => s.value), [lineSeries]);
    const percentUnavailable = view === 'PERCENT' && lineSeries.length < 2;

    // Values are shifted so the lowest sits at 0 (gifted-charts here can't draw below its baseline).
    const lineScale = useMemo(() => {
        if (lineValues.length === 0) return { lo: 0, hi: 1 };
        let lo = Math.min(...lineValues);
        let hi = Math.max(...lineValues);
        if (view === 'PERCENT') {
            // Fit typical months (Tukey fences): a jump off a tiny early balance would flatten the rest.
            if (lineValues.length >= 4) {
                const sorted = [...lineValues].sort((a, b) => a - b);
                const q = (p: number) => sorted[Math.round(p * (sorted.length - 1))];
                const iqr = q(0.75) - q(0.25);
                lo = Math.max(lo, q(0.25) - 1.5 * iqr);
                hi = Math.min(hi, q(0.75) + 1.5 * iqr);
            }
            lo = Math.min(lo, 0, weightedMonthly ?? 0);
            hi = Math.max(hi, 0, weightedMonthly ?? 0);
        }
        const pad = (hi - lo) * 0.1 || Math.abs(hi) * 0.1 || 1;
        const paddedLo = lo - pad;
        return { lo: view === 'CUMULATIVE' && lo >= 0 && paddedLo < 0 ? 0 : paddedLo, hi: hi + pad };
    }, [lineValues, view, weightedMonthly]);

    const showYAxis = view === 'PERCENT' || format.isOpen;
    const edgeLabels = useMemo(() => ({
        first: plainStyle([type.caption, { color: ds.text2 }, styles.xLabel, styles.xLabelFirst]),
        last: plainStyle([type.caption, { color: ds.text2 }, styles.xLabel, styles.xLabelLast]),
    }), [ds]);
    // A hidden axis hands its room back to the plot, so the line still reaches the right edge.
    const yAxisWidth = !showYAxis ? space[2] : view === 'PERCENT' ? Y_AXIS_WIDTH_PERCENT : Y_AXIS_WIDTH;
    const plotWidth = chartWidth - yAxisWidth;
    const lineLabels = thinLabels(lineSeries.map(s => monthLabel(s.point.date)));

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
            const s = lineSeries[item.index];
            if (!s) return null;
            const isRate = view === 'PERCENT';
            const value = isRate
                ? `${formatPercent(s.value, { signed: true, decimals: 1 })} that month`
                : format.isDiscreet
                    ? `${formatPercent(pctOf(s.value - first, first), { signed: true, decimals: 1 })} vs start`
                    : format.money(s.value);
            return (
                <View style={styles.pointerLabelWrap}>
                    <View style={[styles.pointerLabel, { backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                        <Text style={[type.captionMedium, { color: ds.text2 }]}>{fullLabel(s.point)}</Text>
                        <Text style={[type.captionNum, type.captionMedium, { color: isRate ? toneColor(ds, toneOf(s.value)) : ds.text }]}>{value}</Text>
                        {isRate && format.isOpen && s.amount !== null && (
                            <Text style={[type.captionNum, { color: ds.text2 }]}>{format.money(s.amount, { signed: true })}</Text>
                        )}
                    </View>
                </View>
            );
        },
    }), [ds, lineSeries, first, view, format]);

    const renderLine = () => {
        if (percentUnavailable) {
            return (
                <View style={[styles.notice, { height: CHART_HEIGHT }]}>
                    <Text style={[type.small, styles.center, { color: ds.text2 }]}>
                        Monthly growth % needs at least two months that started above zero. Try Cumulative or Growth.
                    </Text>
                </View>
            );
        }
        const n = lineValues.length;
        const isRate = view === 'PERCENT';
        return (
            <View>
            <View style={styles.chart}>
                <LineChart
                    data={lineValues.map((v, i) => ({
                        // Months beyond the axis are drawn at its edge; the tooltip still shows their real %.
                        value: Math.min(Math.max(v, lineScale.lo), lineScale.hi) - lineScale.lo,
                        label: lineLabels[i],
                        labelTextStyle: i === 0 ? edgeLabels.first : i === lineValues.length - 1 ? edgeLabels.last : undefined,
                        index: i,
                    }))}
                    height={CHART_HEIGHT - 30}
                    width={plotWidth}
                    initialSpacing={X_EDGE}
                    endSpacing={X_EDGE}
                    spacing={n > 1 ? (plotWidth - X_EDGE * 2) / (n - 1) : 0}
                    disableScroll
                    thickness={1.5}
                    color={ds.accent}
                    curved
                    curveType={0}
                    hideDataPoints
                    areaChart={!isRate}
                    startFillColor={ds.accent}
                    endFillColor={ds.accent}
                    startOpacity={0.18}
                    endOpacity={0}
                    maxValue={lineScale.hi - lineScale.lo}
                    noOfSections={4}
                    hideRules
                    yAxisColor="transparent"
                    xAxisColor="transparent"
                    yAxisLabelWidth={yAxisWidth}
                    hideYAxisText={!showYAxis}
                    yAxisTextStyle={axisText}
                    yAxisLabelContainerStyle={styles.yLabel}
                    xAxisLabelTextStyle={[axisText, styles.xLabel]}
                    formatYLabel={(label: string) => {
                        const real = Number(label) + lineScale.lo;
                        return isRate ? `${Number(real.toFixed(1))}%` : format.money(real, { compact: true });
                    }}
                    showReferenceLine1={isRate}
                    referenceLine1Position={-lineScale.lo}
                    referenceLine1Config={{ color: ds.text3, thickness: 1, dashWidth: 1, dashGap: 0 }}
                    showReferenceLine2={isRate && weightedMonthly !== null}
                    referenceLine2Position={(weightedMonthly ?? 0) - lineScale.lo}
                    referenceLine2Config={{ color: ds.text2, thickness: 1, dashWidth: 4, dashGap: 4 }}
                    pointerConfig={pointerConfig}
                />
            </View>
            {isRate && (
                <View style={styles.legend}>
                    <View style={styles.legendItem}>
                        <View style={[styles.swatch, { backgroundColor: ds.text3 }]} />
                        <Text style={[type.caption, { color: ds.text2 }]}>0%</Text>
                    </View>
                    {weightedMonthly !== null && (
                        <View style={styles.legendItem}>
                            <View style={[styles.swatch, styles.dashed, { borderColor: ds.text2 }]} />
                            <Text style={[type.captionNum, { color: ds.text2 }]}>
                                Weighted avg {formatPercent(weightedMonthly, { signed: true, decimals: 1 })}
                            </Text>
                        </View>
                    )}
                </View>
            )}
            </View>
        );
    };

    // ---------- Growth view (bars above and below zero) ----------
    const renderBars = () => {
        const maxUp = Math.max(0, ...growth.map(g => g.value));
        const maxDown = Math.max(0, ...growth.map(g => -g.value));
        const total = maxUp + maxDown || 1;
        const zeroFromTop = (maxUp / total) * BAR_HEIGHT;
        const labels = thinLabels(growth.map(g => monthLabel(g.point.date)));
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
                    <Row title="Percentage" subtitle="How much your net worth grew or shrank each month, as a % of what it was at the start of that month." />
                    <Row title="Growth" subtitle="How much your net worth went up or down in each month." last />
                </Group>

                <SectionHeader grouped title="Reading the chart" />
                <Group padded>
                    <View style={modalStyles.legend}>
                        <LegendLine label="Blue line" meaning="Your net worth (Cumulative) or each month's growth % (Percentage)" color={ds.accent} />
                        <LegendLine label="Grey line" meaning="0% on the Percentage view: above it, your net worth grew that month" color={ds.text3} />
                        <LegendLine label="Dashed line" meaning="Your weighted average growth per month: months above it beat your average" color={ds.text2} dashed />
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
                        explanation="Long ranges skip months to keep the line near 36 points. 1 year shows the calendar year picked with the arrows, starting from the end of the year before."
                    />
                    <Formula
                        title="Percentage"
                        formula="(Net worth at a month-end − net worth at the month-end before) ÷ net worth at the month-end before × 100"
                        explanation="One point per month. Months that started at zero or below are left out. The scale fits your typical months; an unusual spike, like a deposit into a tiny early balance, is drawn at the edge, and touching it shows its real %."
                    />
                    <Formula
                        title="Growth"
                        formula="Net worth at a month-end − net worth at the month-end before it"
                        explanation="This month's bar runs to today. Every month gets its own bar, whatever the range. Press a bar for its amount and its % of the month before."
                    />
                    <Formula
                        title="Weighted avg growth per month"
                        formula="Σ monthly growth ÷ Σ net worth at the start of those months × 100"
                        explanation="The Percentage header on every range, and every view's header for 3 years and all time, next to the average amount per month (total change ÷ months). Big months count more than small ones, so a jump from a tiny first balance doesn't swamp it. Months starting at zero or below are left out."
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

    const renderYearSelector = () =>
        timeRange === '1Y' ? <YearSelector years={availableYears} value={selectedYear} onChange={setSelectedYear} /> : null;

    if (!isLoading && points.length < 2) {
        return (
            <View>
                {header}
                <Group padded>
                    {toolbar}
                    {renderYearSelector()}
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
                {renderYearSelector()}

                <View style={styles.summary}>
                    <Text style={[type.small, { color: ds.text2 }]}>{summary.label}</Text>
                    {isLoading ? <Skeleton width={120} height={26} /> : (
                        <>
                            <Text style={[type.titleNum, { color: ds.text }]} numberOfLines={1} adjustsFontSizeToFit>{summary.value}</Text>
                            <Text style={[type.smallNum, { color: toneColor(ds, summary.tone) }]}>{summary.line}</Text>
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
        marginHorizontal: -layout.groupPadding,
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
    xLabel: {
        width: X_LABEL_WIDTH,
        textAlign: 'center',
    },
    // First and last labels start or end at their point, so the line can run to the edges.
    xLabelFirst: {
        textAlign: 'left',
        transform: [{ translateX: X_LABEL_WIDTH / 2 }],
    },
    xLabelLast: {
        textAlign: 'right',
        transform: [{ translateX: -X_LABEL_WIDTH / 2 }],
    },
    // The library centers y labels in a row; right-aligned, short ones sit next to the plot.
    yLabel: {
        justifyContent: 'flex-end',
        paddingRight: space[1],
    },
    pointerLabelWrap: {
        width: 140,
        height: 70,
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
        marginLeft: -layout.groupPadding,
        marginRight: -space[2],
    },
    yAxis: {
        width: Y_AXIS_WIDTH,
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
