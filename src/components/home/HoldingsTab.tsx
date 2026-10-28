import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import { EmptyState } from '@components/common/EmptyState';
import { Hero, Row, SectionHeader, Tone } from '@components/ds';
import { SmartAdvisor, Suggestion } from '@components/investments/SmartAdvisor';
import { AllocationChart } from '@components/investments/AllocationChart';
import { DividendChart } from '@components/investments/DividendChart';
import { InvestmentHistoryModal } from '@components/investments/modals/InvestmentHistoryModal';
import InvestmentSettingsModal from '@components/investments/modals/InvestmentSettingsModal';
import { useTheme } from '@context/ThemeContext';
import { useAIConsent } from '@hooks/useAIConsent';
import { PrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { type, space } from '@styles/theme';
import * as Storage from '@services/core/storageService';
import { getPortfolioStats, getPortfolioHoldings, PortfolioHolding, getActualDividendsGrouped, MonthlyDividend } from '@services/domain/investmentService';
import { getSmartSuggestions, Priority } from '@services/domain/smartAdvisorService';
import { getProjectedDividends, getDividendCalendar, CalendarEvent } from '@services/domain/dividendHistoryService';
import { refreshStockHoldingPrices } from '@services/domain/marketDataService';

interface HoldingsTabProps {
    format: PrivacyFormat;
    currency: string;
    // Holdings settings (fetch price list).
    settingsVisible: boolean;
    onOpenSettings: () => void;
    onCloseSettings: () => void;
    onOpenRecord: () => void;
}

type PortfolioStats = Awaited<ReturnType<typeof getPortfolioStats>>;
type SortOption = 'ALLOCATION' | 'PL_PERCENT' | 'PL_AMOUNT' | 'YIELD' | 'ALPHABETICAL';
type ToolSheet = 'advisor' | 'dividends' | 'allocation';

// Same sort keys the Investment screen saves, cycled from the section header.
const SORTS: { key: SortOption; label: string }[] = [
    { key: 'ALLOCATION', label: 'By value' },
    { key: 'PL_PERCENT', label: 'By return' },
    { key: 'PL_AMOUNT', label: 'By P/L' },
    { key: 'YIELD', label: 'By yield' },
    { key: 'ALPHABETICAL', label: 'A–Z' },
];

const sortValue = (h: PortfolioHolding, key: SortOption): number => {
    switch (key) {
        case 'PL_PERCENT': return h.gainLossPercent ?? 0;
        case 'PL_AMOUNT': return h.gainLoss;
        case 'YIELD': return h.divYield;
        default: return h.totalValue;
    }
};

const typeLabel = (t?: string) => (t ? t.charAt(0) + t.slice(1).toLowerCase() : 'Other');

// Allocation bar segments: domainInvest at 100 / 60 / 30% (docs/DESIGN.md); a 4th type onward folds into "Other".
const SEGMENT_OPACITY = [1, 0.6, 0.3];

const HoldingsTab: React.FC<HoldingsTabProps> = ({ format: f, currency, settingsVisible, onOpenSettings, onCloseSettings, onOpenRecord }) => {
    const { ds } = useTheme();
    const { checkConsent } = useAIConsent();
    const [stats, setStats] = useState<PortfolioStats | null>(null);
    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [priority, setPriority] = useState<Priority>('all');
    const [projectedDividends, setProjectedDividends] = useState<{ labels: string[]; data: MonthlyDividend[] }>({ labels: [], data: [] });
    const [actualDividends, setActualDividends] = useState<Record<number, MonthlyDividend[]>>({});
    const [calendarData, setCalendarData] = useState<Record<number, CalendarEvent[]>>({});
    const [sort, setSort] = useState<SortOption>('ALLOCATION');
    // Kept after closing so the history sheet doesn't blank out while it slides away.
    const [historySymbol, setHistorySymbol] = useState('');
    const [isHistoryVisible, setIsHistoryVisible] = useState(false);
    const [toolSheet, setToolSheet] = useState<ToolSheet | null>(null);

    const loadData = useCallback(async () => {
        try {
            const [s, h] = await Promise.all([getPortfolioStats(), getPortfolioHoldings()]);
            setStats(s);
            setHoldings(h);
            const [projected, actual, calendar] = await Promise.all([
                getProjectedDividends(h),
                getActualDividendsGrouped(),
                getDividendCalendar(h),
            ]);
            setProjectedDividends(projected);
            setActualDividends(actual);
            setCalendarData(calendar);
        } catch (error) {
            console.error('Failed to load holdings:', error);
        }
    }, []);

    const loadSuggestions = useCallback(async () => {
        setSuggestions(await getSmartSuggestions(priority));
    }, [priority]);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));
    useFocusEffect(useCallback(() => { loadSuggestions(); }, [loadSuggestions]));

    const isInitialPrefsLoad = useRef(true);
    useEffect(() => {
        Promise.all([Storage.getInvestmentHoldingsSort(), Storage.getInvestmentAdvisorPriority()]).then(([savedSort, savedPriority]) => {
            if (savedSort && SORTS.some(s => s.key === savedSort.option)) setSort(savedSort.option as SortOption);
            if (savedPriority === 'div' || savedPriority === 'crash' || savedPriority === 'balance' || savedPriority === 'all') setPriority(savedPriority);
            isInitialPrefsLoad.current = false;
        });
    }, []);

    const cycleSort = () => {
        const next = SORTS[(SORTS.findIndex(s => s.key === sort) + 1) % SORTS.length].key;
        setSort(next);
        Storage.saveInvestmentHoldingsSort({ option: next, direction: next === 'ALPHABETICAL' ? 'ASC' : 'DESC' });
    };

    const changePriority = (p: Priority) => {
        setPriority(p);
        if (!isInitialPrefsLoad.current) Storage.saveInvestmentAdvisorPriority(p);
    };

    const handleFetchPrices = (duration: string) => {
        const showToast = (msg: string) => {
            if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
        };
        checkConsent(() => refreshStockHoldingPrices(holdings, duration, currency, showToast, loadData));
    };

    const total = stats?.totalEquity ?? 0;
    const weightOf = (value: number) => (total > 0 ? (value / total) * 100 : null);

    const sorted = useMemo(() => [...holdings].sort((a, b) => sort === 'ALPHABETICAL'
        ? a.symbol.localeCompare(b.symbol)
        : sortValue(b, sort) - sortValue(a, sort)), [holdings, sort]);

    const allocation = useMemo(() => {
        const byType: Record<string, number> = {};
        holdings.forEach(h => { byType[typeLabel(h.type)] = (byType[typeLabel(h.type)] || 0) + h.totalValue; });
        const entries = Object.entries(byType).sort((a, b) => b[1] - a[1]);
        const folded = entries.length > SEGMENT_OPACITY.length
            ? [...entries.slice(0, SEGMENT_OPACITY.length - 1), ['Other', entries.slice(SEGMENT_OPACITY.length - 1).reduce((s, e) => s + e[1], 0)] as [string, number]]
            : entries;
        const sum = folded.reduce((s, e) => s + e[1], 0);
        return sum > 0 ? folded.map(([label, value]) => ({ label, percent: (value / sum) * 100 })) : [];
    }, [holdings]);

    if (!stats) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={ds.accent} />
            </View>
        );
    }

    // Total return: unrealized + realized + dividends (docs/METRICS.md, Investment Return).
    const pct = stats.totalReturnPercent;
    const pl = stats.totalReturn;
    const topHolding = holdings.reduce((max, h) => Math.max(max, h.totalValue), 0);
    let change: string | undefined;
    let changeTone: Tone = 'neutral';
    if (f.isDiscreet) {
        change = holdings.length > 0 ? `All time · top holding ${formatPercent(weightOf(topHolding))}` : 'All time';
    } else if (pl !== 0) {
        const pctText = pct === null || f.isHidden ? '' : ` · ${formatPercent(Math.abs(pct), { decimals: 1 })}`;
        change = `${pl > 0 ? '▲' : '▼'} ${f.money(Math.abs(pl))}${pctText} all time`;
        if (!f.isHidden) changeTone = pl > 0 ? 'good' : 'bad';
    }

    const isPrivacyEnabled = !f.isOpen;

    return (
        <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {holdings.length === 0 ? (
                    <EmptyState
                        icon="trending-up"
                        title="Start growing your wealth"
                        subtitle="Every great portfolio starts with a single investment. Add yours from Record and it shows up here."
                        ctaLabel="Add your first investment"
                        onCtaPress={onOpenRecord}
                    />
                ) : (
                    <>
                        <Hero
                            label={f.show('Portfolio', 'Total return')}
                            value={f.show(f.money(total), formatPercent(pct, { signed: true, decimals: 1 }))}
                            change={change}
                            changeTone={changeTone}
                            stats={[
                                {
                                    label: 'Realized',
                                    value: f.show(f.money(stats.realizedPL, { signed: true, compact: true }), formatPercent(stats.realizedPLPercent, { signed: true, decimals: 1 })),
                                },
                                {
                                    label: 'Dividends',
                                    value: f.show(f.money(stats.totalDividends, { compact: true }), formatPercent(stats.dividendsPercent, { decimals: 1 })),
                                },
                            ]}
                            style={styles.hero}
                        />

                        {allocation.length > 0 && (
                            <>
                                <View style={styles.allocationBar}>
                                    {allocation.map((a, i) => (
                                        <View key={a.label} style={[styles.segment, { flex: a.percent, backgroundColor: ds.domainInvest, opacity: SEGMENT_OPACITY[i] }]} />
                                    ))}
                                </View>
                                <View style={styles.allocationLabels}>
                                    {allocation.map(a => (
                                        <Text key={a.label} style={[type.captionNum, { color: ds.text2 }]}>{a.label} {formatPercent(a.percent)}</Text>
                                    ))}
                                </View>
                            </>
                        )}

                        <SectionHeader title="Holdings" actionLabel={`${SORTS.find(s => s.key === sort)?.label} ⌄`} onAction={cycleSort} />
                        {sorted.map((h, i) => {
                            const weight = formatPercent(weightOf(h.totalValue));
                            const ret = h.gainLossPercent;
                            return (
                                <Row
                                    key={h.symbol}
                                    title={h.name || h.symbol}
                                    subtitle={`${h.name ? `${h.symbol} · ` : ''}${typeLabel(h.type)} · ${weight}`}
                                    value={f.show(f.money(h.totalValue), weight)}
                                    change={ret === null ? undefined : formatPercent(ret, { signed: true, decimals: 1 })}
                                    changeTone={ret === null || ret === 0 ? 'neutral' : ret > 0 ? 'good' : 'bad'}
                                    onPress={() => { setHistorySymbol(h.symbol); setIsHistoryVisible(true); }}
                                    last={i === sorted.length - 1}
                                />
                            );
                        })}

                        <SectionHeader title="Tools" />
                        <Row icon="add-circle-outline" title="Add an investment" subtitle="Buy, sell or dividend, from Record" chevron onPress={onOpenRecord} />
                        <Row icon="bulb-outline" title="Smart advisor" subtitle="Dip, dividend and rebalance ideas" chevron onPress={() => setToolSheet('advisor')} />
                        <Row icon="calendar-outline" title="Dividends" subtitle="Received, upcoming and projected" chevron onPress={() => setToolSheet('dividends')} />
                        <Row icon="pie-chart-outline" title="Allocation" subtitle="Treemap by holding" chevron onPress={() => setToolSheet('allocation')} />
                        <Row icon="cloud-download-outline" title="Fetch price list" subtitle="AI estimates for your stocks" chevron last onPress={onOpenSettings} />
                    </>
                )}
            </ScrollView>

            <BottomModal
                visible={!!toolSheet}
                onClose={() => setToolSheet(null)}
                title={toolSheet === 'advisor' ? 'Smart advisor' : toolSheet === 'dividends' ? 'Dividends' : 'Allocation'}
                maxHeight="85%"
            >
                <ScrollView>
                    {toolSheet === 'advisor' && (
                        <SmartAdvisor suggestions={suggestions} activePriority={priority} onPriorityChange={changePriority} currency={currency} isPrivacyEnabled={isPrivacyEnabled} />
                    )}
                    {toolSheet === 'dividends' && (
                        <DividendChart
                            projectedDividends={projectedDividends}
                            actualDividends={actualDividends}
                            calendarData={calendarData}
                            currency={currency}
                            isPrivacyEnabled={isPrivacyEnabled}
                        />
                    )}
                    {toolSheet === 'allocation' && <AllocationChart holdingsData={holdings} isPrivacyEnabled={isPrivacyEnabled} />}
                </ScrollView>
            </BottomModal>

            <InvestmentHistoryModal
                visible={isHistoryVisible}
                onClose={() => setIsHistoryVisible(false)}
                symbol={historySymbol}
                currency={currency}
                onDataChange={loadData}
            />

            <InvestmentSettingsModal visible={settingsVisible} onClose={onCloseSettings} onFetchPriceList={handleFetchPrices} />
        </>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    hero: {
        paddingTop: space[5],
    },
    allocationBar: {
        flexDirection: 'row',
        height: 6,
        gap: 2,
        marginTop: space[5],
    },
    segment: {
        height: '100%',
        borderRadius: 2,
    },
    allocationLabels: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[4],
        marginTop: space[2],
    },
    loading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[7] * 2,
    },
});

export default HoldingsTab;
