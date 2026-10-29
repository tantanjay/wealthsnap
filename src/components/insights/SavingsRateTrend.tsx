import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, Dimensions, Pressable, ScrollView, StyleSheet } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { LinearGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import TimeRangeSelector from '@components/common/TimeRangeSelector';
import { Group, Row, SectionHeader } from '@components/ds';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatMoney, formatPercent } from '@hooks/usePrivacyFormat';
import { Transaction } from '@types';
import { type, space, radius, layout } from '@styles/theme';
import { getSavingsRateTrend } from '@utils/financialMetrics';
import { saveInsightsSavingsTab, getInsightsSavingsTab, saveInsightsSavingsTimeRange, getInsightsSavingsTimeRange } from '@services/core/storageService';

interface SavingsRateTrendProps {
    transactions: Transaction[];
    isLoading?: boolean;
    currency: string;
    selectedDate?: Date;
}

type SavingsTab = 'RATE' | 'AMOUNT' | 'CASH';

// Rate: % of income kept. Saved: raw amount kept, including money moved into investments
// (a BUY isn't an "expense"). Cash Flow: what's actually left in cash after everything left
// your wallet, including investments and other transfers out.
const SAVINGS_TAB_META: Record<SavingsTab, { label: string; metricLabel: string }> = {
    RATE: { label: 'Rate', metricLabel: 'Savings Rate' },
    AMOUNT: { label: 'Saved', metricLabel: 'Amount Saved' },
    CASH: { label: 'Cash flow', metricLabel: 'Cash Flow' },
};
const TAB_OPTIONS = (['RATE', 'AMOUNT', 'CASH'] as SavingsTab[]).map(key => ({ key, label: SAVINGS_TAB_META[key].label }));

const CHART_HEIGHT = 220;

type SavingsMonth = { month: string; rate: number; income: BigNumber; expense: BigNumber; savings: BigNumber; cashFlow: BigNumber };

const getMetricValue = (d: SavingsMonth, tab: SavingsTab): number => {
    if (tab === 'RATE') return d.rate;
    if (tab === 'AMOUNT') return d.savings.toNumber();
    return d.cashFlow.toNumber();
};

// Round up to a "nice" chart boundary for currency amounts (1 / 2 / 5 x10^n)
const getNiceCurrencyBoundary = (value: number): number => {
    if (value <= 0) return 100;
    const magnitude = 10 ** Math.floor(Math.log10(value));
    const normalized = value / magnitude;
    let niceNormalized = 10;
    if (normalized <= 1) niceNormalized = 1;
    else if (normalized <= 2) niceNormalized = 2;
    else if (normalized <= 5) niceNormalized = 5;
    return niceNormalized * magnitude;
};

// Discreet: an amount as % of that income ("—" without income).
const formatShare = (value: number, income: number): string =>
    formatPercent(income > 0 ? (value / income) * 100 : null, { decimals: 1 });

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

// Sample stat tile for the info sheet; colored like the real tile under the chart.
const ExampleTile: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => {
    const { ds } = useTheme();
    return (
        <View style={[modalStyles.tile, { backgroundColor: ds.inset }]}>
            <Text style={[type.small, { color: ds.text2 }]}>{label}</Text>
            <Text style={[type.titleNum, { color }]}>{value}</Text>
        </View>
    );
};

const LegendLine: React.FC<{ label: string; meaning: string; color: string }> = ({ label, meaning, color }) => {
    const { ds } = useTheme();
    return (
        <View style={modalStyles.legendRow}>
            <View style={[modalStyles.dot, modalStyles.legendDot, { backgroundColor: color }]} />
            <Text style={[type.small, modalStyles.flex, { color: ds.text2 }]}>
                <Text style={{ color: ds.text }}>{label}: </Text>{meaning}
            </Text>
        </View>
    );
};

const SavingsRateTrend: React.FC<SavingsRateTrendProps> = ({ transactions, isLoading = false, currency, selectedDate = new Date() }) => {
    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);
    const screenWidth = Dimensions.get('window').width;

    const [timeRange, setTimeRange] = React.useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');
    const [activeTab, setActiveTab] = React.useState<SavingsTab>('RATE');
    const [showInfoModal, setShowInfoModal] = React.useState(false);

    // Restore the last-selected tab (Rate / Saved / Cash Flow) and time range on mount.
    // isInitialPrefLoad is flipped false either when the load resolves OR the instant the
    // user taps a tab/range (see handleTabChange/handleTimeRangeChange below) - without that
    // second path, a tap made before the still-in-flight AsyncStorage read resolves would get
    // silently reverted by the load once it completes, since it applied its result unconditionally.
    const isInitialPrefLoad = useRef(true);
    useEffect(() => {
        const loadPrefs = async () => {
            const [savedTab, savedRange] = await Promise.all([
                getInsightsSavingsTab(),
                getInsightsSavingsTimeRange()
            ]);
            if (isInitialPrefLoad.current) {
                if (savedTab === 'RATE' || savedTab === 'AMOUNT' || savedTab === 'CASH') setActiveTab(savedTab);
                if (savedRange === '6M' || savedRange === '1Y' || savedRange === '3Y' || savedRange === 'ALL') setTimeRange(savedRange);
            }
            isInitialPrefLoad.current = false;
        };
        loadPrefs();
    }, []);

    const handleTabChange = (tab: SavingsTab) => {
        isInitialPrefLoad.current = false;
        setActiveTab(tab);
    };

    const handleTimeRangeChange = (range: '6M' | '1Y' | '3Y' | 'ALL') => {
        isInitialPrefLoad.current = false;
        setTimeRange(range);
    };

    useEffect(() => {
        if (!isInitialPrefLoad.current) saveInsightsSavingsTab(activeTab);
    }, [activeTab]);

    useEffect(() => {
        if (!isInitialPrefLoad.current) saveInsightsSavingsTimeRange(timeRange);
    }, [timeRange]);

    const isPercent = activeTab === 'RATE';
    const activeMeta = SAVINGS_TAB_META[activeTab];
    // Discreet amount tabs show each value as % of that month's income.
    const asShareOfIncome = format.isDiscreet && !isPercent;

    const formatValue = useCallback((value: number): string => {
        return isPercent ? `${value.toFixed(1)}%` : format.money(value, { compact: true });
    }, [isPercent, format]);


    // Calculate how many months of data to load based on selection
    const monthsToLoad = useMemo(() => {
        if (timeRange === '6M') return 6;
        if (timeRange === '1Y') return 12;
        if (timeRange === '3Y') return 36;

        // For 'ALL', calculate months since first transaction
        if (transactions.length === 0) return 6;
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const today = selectedDate;
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6); // Ensure at least 6 months shown even if data is new
    }, [timeRange, transactions, selectedDate]);

    const savingsData = useMemo(() => {
        const data = getSavingsRateTrend(transactions, monthsToLoad, selectedDate);

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
            labels,
            rawData: data
        };
    }, [transactions, monthsToLoad, selectedDate]);

    // The metric series for whichever tab is active (Rate %, Amount Saved, or Cash Flow)
    const activeValues = useMemo(() => {
        return savingsData.rawData.map(d => getMetricValue(d, activeTab));
    }, [savingsData.rawData, activeTab]);

    // Pointer Config for Tap & Drag
    const pointerConfig = useMemo(() => ({
        pointerStripHeight: 160,
        pointerStripColor: ds.hairline,
        pointerStripWidth: 1,
        pointerColor: ds.accent,
        radius: 6,
        pointerLabelWidth: 140, // Ensure width is known for positioning calculations if needed
        pointerLabelHeight: 100,
        // Require long press to activate tooltip so scrolling (drag) works
        activatePointersOnLongPress: true,
        autoAdjustPointerLabelPosition: true,
        pointerComponent: (items: any) => {
            const safeItems = Array.isArray(items) ? items : [items].filter(Boolean);
            const item = safeItems[0];
            if (!item) return <View />;

            return (
                <View style={[styles.pointer, { backgroundColor: item.originalValue >= 0 ? ds.success : ds.danger, borderColor: ds.group }]} />
            );
        },
        pointerLabelComponent: (items: any) => {
            const safeItems = Array.isArray(items) ? items : [items].filter(Boolean);
            const item = safeItems[0];
            if (!item) return null;

            // X-Axis Positioning: Always avoid center to prevent finger overlap
            const index = item.index || 0;
            const totalItems = savingsData.rawData.length;
            // If we are in the right half of the chart, show tooltip on the left
            const marginLeft = index > totalItems / 2 ? -100 : 10;
            const tone = item.originalValue >= 0 ? ds.success : ds.danger;

            return (
                <View style={[styles.pointerLabelWrap, { marginLeft }]}>
                    <View style={[styles.pointerLabel, { backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                        <Text style={[type.captionMedium, styles.center, { color: ds.text2 }]}>{item.month}</Text>

                        <View style={styles.pointerRow}>
                            <Text style={[type.caption, { color: ds.text2 }]}>{asShareOfIncome ? 'Of income' : activeMeta.metricLabel}</Text>
                            <Text style={[type.captionNum, type.captionMedium, { color: tone }]}>
                                {asShareOfIncome ? formatShare(item.originalValue, Number(item.income)) : formatValue(item.originalValue)}
                            </Text>
                        </View>

                        {/* Income and expense are amounts only */}
                        {format.isOpen && (
                            <>
                                <View style={[styles.pointerDivider, { backgroundColor: ds.hairline }]} />
                                <View style={styles.pointerRow}>
                                    <Text style={[type.caption, { color: ds.text2 }]}>Income</Text>
                                    <Text style={[type.captionNum, { color: ds.text }]}>{format.money(Number(item.income), { compact: true })}</Text>
                                </View>
                                <View style={styles.pointerRow}>
                                    <Text style={[type.caption, { color: ds.text2 }]}>Expense</Text>
                                    <Text style={[type.captionNum, { color: ds.text }]}>{format.money(Number(item.expense), { compact: true })}</Text>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            );
        },
    }), [ds, format, savingsData.rawData, activeMeta, formatValue, asShareOfIncome]);

    // Calculate average for the active metric
    const avgValue = useMemo(() => {
        if (activeValues.length === 0) return 0;
        const sum = activeValues.reduce((acc, v) => acc.plus(v), new BigNumber(0));
        const avg = sum.dividedBy(activeValues.length);
        return isPercent ? avg.dp(1, BigNumber.ROUND_HALF_UP).toNumber() : avg.toNumber();
    }, [activeValues, isPercent]);

    // Calculate chart bounds for Symmetric Y-Axis
    const chartStats = useMemo(() => {
        if (activeValues.length === 0) return { min: -100, max: 100, zeroOffset: 0.5, step: 25 };

        const dataMax = Math.max(...activeValues);
        const dataMin = Math.min(...activeValues);

        // Create symmetric chart boundary based on max absolute value
        const absMax = Math.max(Math.abs(dataMax), Math.abs(dataMin));

        // Round up to nearest nice number
        let boundary: number;
        if (isPercent) {
            if (absMax <= 10) boundary = 10;
            else if (absMax <= 25) boundary = 25;
            else if (absMax <= 50) boundary = 50;
            else if (absMax <= 100) boundary = 100;
            else boundary = Math.ceil(absMax / 50) * 50;
        } else {
            boundary = getNiceCurrencyBoundary(absMax);
        }

        const min = -boundary;
        const max = boundary;

        // 8 sections for symmetry around zero
        const sections = 8;
        const step = (max - min) / sections;

        return { min, max, zeroOffset: 0.5, step };
    }, [activeValues, isPercent]);

    const latestValue = activeValues[activeValues.length - 1] || 0;

    // Calculate consecutive positive/negative streak (based on the active metric)
    const streak = useMemo(() => {
        // Filter out months with no transaction data
        const data = savingsData.rawData.filter(d => !d.income.isZero() || !d.expense.isZero());
        if (data.length === 0) return { count: 0, type: 'neutral' as const };

        const lastValue = getMetricValue(data[data.length - 1], activeTab);
        let count = 0;
        const currentType = lastValue >= 0 ? 'positive' : 'negative';

        // Count backwards
        for (let i = data.length - 1; i >= 0; i--) {
            const value = getMetricValue(data[i], activeTab);
            const monthType = value >= 0 ? 'positive' : 'negative';

            if (monthType === currentType) {
                count++;
            } else {
                break;
            }
        }

        return { count, type: currentType };
    }, [savingsData.rawData, activeTab]);

    // Calculate historical stats for selected range (based on the active metric)
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
            const value = getMetricValue(item, activeTab);
            if (value >= 0) {
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
    }, [savingsData.rawData, activeTab]);

    const exampleValue = isPercent ? '25%' : formatMoney(25000, currency);

    const ratesActive = activeTab === 'RATE' || activeTab === 'AMOUNT';

    const renderInfoModal = () => (
        <BottomModal
            visible={showInfoModal}
            onClose={() => setShowInfoModal(false)}
            title="Understanding your chart"
            maxHeight="85%"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Mirrors the stat tiles under the chart */}
                <Group padded>
                    <View style={modalStyles.grid}>
                        <ExampleTile label="Current" value={exampleValue} color={ds.success} />
                        <ExampleTile label="Streak" value="5📈" color={ds.success} />
                        <ExampleTile label="Positive" value="8 / 5" color={ds.success} />
                        <ExampleTile label="Negative" value="3 / 2" color={ds.danger} />
                    </View>
                </Group>

                <SectionHeader grouped title="Rate, saved & cash flow" />
                <Group>
                    <Row
                        title="Rate"
                        subtitle="The % of your income you kept each month. Debt principal payments count as spending here; money moved into a savings goal counts as kept."
                    />
                    <Row title="Saved" subtitle="The raw amount you kept, including money moved into investments." />
                    <Row
                        title="Cash flow"
                        subtitle="What's actually left in cash after everything, including investments and other transfers out."
                        last
                    />
                </Group>

                <SectionHeader grouped title="How they relate" />
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        Every month, your income splits into three pieces. Each tab measures a different slice:
                    </Text>
                    <View style={[modalStyles.block, { backgroundColor: ds.inset }]}>
                        <Text style={[type.caption, modalStyles.center, { color: ds.text2 }]}>Monthly income</Text>

                        <View style={modalStyles.stack}>
                            <View style={{ flex: 5, backgroundColor: ds.danger }} />
                            <View style={{ flex: 2, backgroundColor: ds.domainInvest }} />
                            <View style={{ flex: 3, backgroundColor: ds.success }} />
                        </View>

                        <View style={modalStyles.stackLegend}>
                            {([['Expenses', ds.danger], ['Invested', ds.domainInvest], ['Cash left', ds.success]] as const).map(([label, color]) => (
                                <View key={label} style={modalStyles.legendItem}>
                                    <View style={[modalStyles.dot, { backgroundColor: color }]} />
                                    <Text style={[type.caption, { color: ds.text2 }]}>{label}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Rate & Saved = Invested + Cash left (right 50%); Cash flow = Cash left only (right 30%) */}
                        <View style={modalStyles.bracketRow}>
                            <View style={{ flex: 5 }} />
                            <View style={[modalStyles.bracket, { flex: 5, borderColor: ratesActive ? ds.accent : ds.hairline }]}>
                                <Text style={[type.captionMedium, modalStyles.center, { color: ratesActive ? ds.accent : ds.text2 }]}>Rate & saved</Text>
                            </View>
                        </View>
                        <View style={modalStyles.bracketRow}>
                            <View style={{ flex: 7 }} />
                            <View style={[modalStyles.bracket, { flex: 3, borderColor: activeTab === 'CASH' ? ds.accent : ds.hairline }]}>
                                <Text style={[type.captionMedium, modalStyles.center, { color: activeTab === 'CASH' ? ds.accent : ds.text2 }]}>Cash flow</Text>
                            </View>
                        </View>
                    </View>
                    <Text style={[type.small, modalStyles.paragraph, { color: ds.text2 }]}>
                        <Text style={{ color: ds.text }}>Rate</Text> and <Text style={{ color: ds.text }}>Saved</Text> count money moved into investments as kept.{"\n"}
                        <Text style={{ color: ds.text }}>Cash flow</Text> only counts what&apos;s actually left in your wallet.
                    </Text>
                </Group>

                <SectionHeader grouped title="Reading the chart" />
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        The line chart shows your {activeMeta.metricLabel.toLowerCase()} trend over time. Here&apos;s what it means:
                    </Text>
                    <View style={modalStyles.pair}>
                        <View style={[modalStyles.tile, { backgroundColor: ds.inset }]}>
                            <View style={[modalStyles.miniChart, { backgroundColor: ds.raised }]}>
                                <View style={[modalStyles.zeroLine, { backgroundColor: ds.hairline }]} />
                                <View style={[modalStyles.point, { bottom: 10, left: 10, backgroundColor: ds.success }]} />
                                <View style={[modalStyles.point, { bottom: 18, left: '40%', backgroundColor: ds.success }]} />
                                <View style={[modalStyles.point, { bottom: 25, right: 10, backgroundColor: ds.success }]} />
                            </View>
                            <Text style={[type.smallMedium, modalStyles.center, { color: ds.success }]}>Saving money</Text>
                            <Text style={[type.caption, modalStyles.center, { color: ds.text2 }]}>Line above zero (green)</Text>
                        </View>
                        <View style={[modalStyles.tile, { backgroundColor: ds.inset }]}>
                            <View style={[modalStyles.miniChart, { backgroundColor: ds.raised }]}>
                                <View style={[modalStyles.zeroLine, { backgroundColor: ds.hairline }]} />
                                <View style={[modalStyles.point, { top: 35, left: 10, backgroundColor: ds.danger }]} />
                                <View style={[modalStyles.point, { top: 40, left: '40%', backgroundColor: ds.danger }]} />
                                <View style={[modalStyles.point, { top: 43, right: 10, backgroundColor: ds.danger }]} />
                            </View>
                            <Text style={[type.smallMedium, modalStyles.center, { color: ds.danger }]}>Overspending</Text>
                            <Text style={[type.caption, modalStyles.center, { color: ds.text2 }]}>Line below zero (red)</Text>
                        </View>
                    </View>
                    <View style={modalStyles.legend}>
                        {([
                            ['Zero line', 'The horizontal line in the middle', ds.hairline],
                            ['Green line', "Above zero = You're saving", ds.success],
                            ['Red line', 'Below zero = Spending more than earning', ds.danger],
                            ['Dots', 'Each represents one month', ds.text2],
                            ['Higher is better', 'More savings = further above zero', ds.text2],
                        ] as const).map(([label, meaning, color]) => (
                            <LegendLine key={label} label={label} meaning={meaning} color={color} />
                        ))}
                    </View>
                </Group>

                <SectionHeader grouped title={`Current ${activeMeta.metricLabel.toLowerCase()}`} />
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        Your {activeMeta.metricLabel.toLowerCase()} for the most recent month:
                    </Text>
                    <View style={modalStyles.legend}>
                        <LegendLine label={isPercent ? 'Positive %' : 'Positive amount'} meaning="You saved money" color={ds.success} />
                        <LegendLine label={isPercent ? 'Negative %' : 'Negative amount'} meaning="You overspent" color={ds.danger} />
                    </View>
                </Group>

                <SectionHeader grouped title="Streak" />
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>
                        Consecutive months with the same trend. Higher streaks show consistency.
                    </Text>
                    <View style={modalStyles.pair}>
                        <ExampleTile label="5 months of saving" value="5📈" color={ds.success} />
                        <ExampleTile label="2 months overspending" value="2📉" color={ds.danger} />
                    </View>
                </Group>

                <SectionHeader grouped title="Understanding the “8 / 5” format" />
                <Group>
                    <Text style={[type.small, modalStyles.groupIntro, { color: ds.text2 }]}>
                        This shows <Text style={{ color: ds.text }}>two separate numbers</Text>, not division:
                    </Text>
                    <Row
                        leading={<View style={[modalStyles.dot, { backgroundColor: ds.success }]} />}
                        title="Positive: 8 / 5"
                        subtitle={'8 = Total positive months\n5 = Best consecutive streak'}
                    />
                    <Row
                        leading={<View style={[modalStyles.dot, { backgroundColor: ds.danger }]} />}
                        title="Negative: 3 / 2"
                        subtitle={'3 = Total negative months\n2 = Worst consecutive streak'}
                        last
                    />
                </Group>

                <SectionHeader grouped title="Other metrics" />
                <Group>
                    <Row title="Average" subtitle={`Average ${activeMeta.metricLabel.toLowerCase()} across all months`} />
                    <Row title="Best & worst month" subtitle="Highest and lowest values in the period" last />
                </Group>
            </ScrollView>
        </BottomModal>
    );

    // --- Center-zero workaround for gifted-charts (older versions) ---

    const yBoundary = chartStats.max; // symmetric boundary
    const yOffset = yBoundary;        // shift zero to center

    const shiftedChartData = activeValues.map((val) => ({
        value: val + yOffset, // shift
        originalValue: val,   // keep real value for labels/colors
        dataPointColor: val < 0 ? ds.danger : ds.success,
    }));

    // Summary figures: Discreet amount tabs swap amounts for % of income, or the month itself.
    const rawData = savingsData.rawData;
    const latest = rawData[rawData.length - 1];
    const totalIncome = rawData.reduce((sum, d) => sum + d.income.toNumber(), 0);
    const bestIndex = activeValues.indexOf(Math.max(...activeValues));
    const worstIndex = activeValues.indexOf(Math.min(...activeValues));
    const currentText = asShareOfIncome ? formatShare(latestValue, latest ? latest.income.toNumber() : 0) : formatValue(latestValue);
    const averageText = asShareOfIncome ? formatShare(avgValue * rawData.length, totalIncome) : formatValue(avgValue);
    const bestText = asShareOfIncome ? rawData[bestIndex]?.month ?? '—' : formatValue(Math.max(...activeValues));
    const worstText = asShareOfIncome ? rawData[worstIndex]?.month ?? '—' : formatValue(Math.min(...activeValues));

    const showYAxis = isPercent || format.isOpen;
    // Group content runs 28 from each screen edge, 8 narrower per side than the old 20 gutter.
    const chartWidth = screenWidth - 80 - (layout.groupInset + layout.groupPadding - space[5]) * 2;
    const axisText = [type.caption, { color: ds.text2 }];

    const header = (
        <SectionHeader
            grouped
            title="Savings trend"
            menu={{ options: TAB_OPTIONS, value: activeTab, onSelect: key => handleTabChange(key as SavingsTab) }}
        />
    );

    const toolbar = (
        <View style={styles.toolbar}>
            <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
            <Pressable onPress={() => setShowInfoModal(true)} hitSlop={space[2]}>
                <Ionicons name="information-circle-outline" size={18} color={ds.text2} />
            </Pressable>
        </View>
    );

    if (!isLoading && savingsData.rawData.length === 0) {
        return (
            <View>
                {header}
                <Group padded>
                    {toolbar}
                    <Text style={[type.small, styles.empty, { color: ds.text2 }]}>
                        No data yet. Start tracking income and expenses!
                    </Text>
                </Group>
                {renderInfoModal()}
            </View>
        );
    }

    const renderStat = (label: string, value: string, color: string, align: 'flex-start' | 'center' | 'flex-end' = 'flex-start') => (
        <View style={{ alignItems: align }}>
            <Text style={[type.caption, { color: ds.text2 }]}>{label}</Text>
            {isLoading ? (
                <Skeleton width={50} height={20} />
            ) : (
                <Text style={[type.bodyNum, { color }]}>{value}</Text>
            )}
        </View>
    );

    return (
        <View>
            {header}

            <Group padded>
                {toolbar}

                {/* Counts and % read the same in every mode */}
                <View style={styles.stats}>
                    <View style={styles.statGroup}>
                        {renderStat('Streak', `${streak.count}${streak.type === 'positive' ? '📈' : '📉'}`, streak.type === 'positive' ? ds.success : ds.danger)}
                        {renderStat('Positive', `${historicalStats.positiveCount} / ${historicalStats.longestPositiveStreak}`, ds.success)}
                        {renderStat('Negative', `${historicalStats.negativeCount} / ${historicalStats.longestNegativeStreak}`, ds.danger)}
                    </View>
                    {renderStat(asShareOfIncome ? 'Of income' : 'Current', currentText, latestValue >= 0 ? ds.success : ds.danger, 'flex-end')}
                </View>

                {isLoading ? (
                    <Skeleton height={CHART_HEIGHT} width="100%" borderRadius={radius.md} />
                ) : format.isHidden ? (
                    <HiddenChart height={CHART_HEIGHT} />
                ) : (
                    <View style={styles.chart}>
                        {/* MANUAL REFERENCE LINE (0%) - Rendered BEHIND chart to avoid tooltip overlap */}
                        <View style={[styles.zeroLine, {
                            left: showYAxis ? 50 : space[5],
                            top: CHART_HEIGHT * (1 - (yOffset / (yBoundary * 2))),
                            borderColor: ds.text3,
                        }]} />

                        <LineChart
                            data={shiftedChartData.map((d, index) => ({
                                value: d.value,
                                dataPointColor: d.dataPointColor,
                                label: savingsData.labels[index],
                                // Metadata for tooltip
                                originalValue: d.originalValue,
                                month: savingsData.rawData[index].month,
                                income: savingsData.rawData[index].income.toString(),
                                expense: savingsData.rawData[index].expense.toString(),
                                index: index,
                            }))}

                            height={200}
                            width={chartWidth}
                            spacing={chartWidth / Math.max(shiftedChartData.length, 1)}
                            initialSpacing={20}
                            thickness={1.5}
                            curved
                            curveType={0}

                            /* ---- SCALE (IMPORTANT) ---- */
                            maxValue={yBoundary * 2}
                            noOfSections={4}

                            hideRules

                            /* ---- AXIS ---- */
                            yAxisColor="transparent"
                            xAxisColor="transparent"
                            yAxisLabelWidth={showYAxis ? 45 : space[5]}
                            hideYAxisText={!showYAxis}

                            yAxisTextStyle={axisText}
                            xAxisLabelTextStyle={[axisText, styles.xLabel]}

                            /* ---- LINE GRADIENT: above zero is good, below is bad ---- */
                            lineGradient
                            lineGradientId="g_savings"
                            lineGradientComponent={() => (
                                <LinearGradient id="g_savings" x1="0" y1="0" x2="0" y2="1">
                                    <Stop offset="0%" stopColor={ds.success} stopOpacity="1" />
                                    <Stop offset="50%" stopColor={ds.success} stopOpacity="1" />
                                    <Stop offset="50%" stopColor={ds.danger} stopOpacity="1" />
                                    <Stop offset="100%" stopColor={ds.danger} stopOpacity="1" />
                                </LinearGradient>
                            )}

                            /* ---- LABEL FIX (UNSHIFT VALUES) ---- */
                            formatYLabel={(value: string) => {
                                const realValue = Number(value) - yOffset;
                                return isPercent ? `${realValue.toFixed(0)}%` : format.money(realValue, { compact: true });
                            }}
                            pointerConfig={pointerConfig}
                        />
                    </View>
                )}

                {savingsData.rawData.length > 1 ? (
                    <View style={[styles.summary, { borderTopColor: ds.hairline }]}>
                        {renderStat('Average', averageText, avgValue >= 0 ? ds.success : ds.danger, 'center')}
                        {renderStat('Best month', bestText, ds.success, 'center')}
                        {renderStat('Worst month', worstText, ds.danger, 'center')}
                    </View>
                ) : (
                    <View style={[styles.summary, { borderTopColor: ds.hairline }]}>
                        <Text style={[type.small, styles.center, styles.flex, { color: ds.text2 }]}>
                            Track more months to see your best and worst ratios!
                        </Text>
                    </View>
                )}
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
    empty: {
        textAlign: 'center',
        paddingVertical: space[5],
    },
    stats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: space[2],
    },
    statGroup: {
        flexDirection: 'row',
        gap: space[4],
    },
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    chart: {
        height: CHART_HEIGHT,
        marginLeft: -space[2],
    },
    zeroLine: {
        position: 'absolute',
        right: 0,
        height: 1,
        borderTopWidth: 1,
        borderStyle: 'dashed',
        zIndex: -1,
    },
    xLabel: {
        width: 30,
        textAlign: 'center',
    },
    summary: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: space[3],
        paddingTop: space[3],
        borderTopWidth: 1,
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
        marginTop: -30,
        zIndex: 1000,
    },
    pointerLabel: {
        paddingHorizontal: space[3],
        paddingVertical: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        gap: space[1],
    },
    pointerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: space[2],
    },
    pointerDivider: {
        height: 1,
    },
    center: {
        textAlign: 'center',
    },
    flex: {
        flex: 1,
    },
});

const modalStyles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[3],
    },
    tile: {
        flexGrow: 1,
        flexBasis: '40%',
        gap: space[1],
        padding: space[4],
        borderRadius: radius.md,
    },
    pair: {
        flexDirection: 'row',
        gap: space[3],
        marginTop: space[3],
    },
    block: {
        padding: space[3],
        borderRadius: radius.sm,
        marginTop: space[3],
    },
    stack: {
        flexDirection: 'row',
        height: 24,
        borderRadius: radius.sm,
        overflow: 'hidden',
        marginVertical: space[2],
    },
    stackLegend: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: space[3],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[1],
    },
    bracketRow: {
        flexDirection: 'row',
        marginBottom: space[1],
    },
    bracket: {
        borderTopWidth: 2,
        paddingTop: space[1],
    },
    miniChart: {
        height: 60,
        borderRadius: radius.sm,
        overflow: 'hidden',
        marginBottom: space[1],
    },
    zeroLine: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 1,
    },
    point: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    legend: {
        gap: space[2],
        marginTop: space[3],
    },
    legendRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: space[2],
    },
    legendDot: {
        marginTop: 5,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    flex: {
        flex: 1,
    },
    center: {
        textAlign: 'center',
    },
    paragraph: {
        marginTop: space[2],
    },
    groupIntro: {
        paddingTop: space[3],
    },
});

export default SavingsRateTrend;
