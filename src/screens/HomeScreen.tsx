import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text, View, ScrollView, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { EmptyState } from '@components/common/EmptyState';
import { ReviewAppModal } from '@components/common/ReviewAppModal';
import { Row, SectionHeader, UnderlineTabs, UnderlineTab } from '@components/ds';
import HomeSettingsSheet from '@components/home/HomeSettingsSheet';
import SnapshotView, { SnapshotData } from '@components/home/SnapshotView';
import LedgerTab, { LedgerView } from '@components/home/LedgerTab';
import HoldingsTab from '@components/home/HoldingsTab';
import GoalsTab from '@components/home/GoalsTab';
import LoansTab from '@components/home/LoansTab';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useDataStatus } from '@context/DataStatusContext';
import { usePrivacyFormat } from '@hooks/usePrivacyFormat';
import { useReviewPrompt } from '@hooks/useReviewPrompt';
import { type, space, radius } from '@styles/theme';
import { UserProfile } from '@types';
import { calculateRunwayTrend } from '@utils/financialMetrics';
import { buildRecentTransactions } from '@utils/historyFeed';
import {
    buildPriceLookup,
    calculateCashKept,
    calculateGoalsSnapshot,
    calculateInvestmentSnapshot,
    calculateLoansSnapshot,
    calculateMonthCashFlow,
    calculateNetWorthChange,
} from '@utils/snapshotMetrics';
import { processRecurrenceRules } from '@services/domain/recurrenceService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getCachedInvestments } from '@services/domain/investmentService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllSavingsGoals, checkGoalReachedNotifications } from '@services/domain/savingsGoalService';
import { getPriceHistoryForSymbols } from '@services/domain/priceHistoryService';
import * as Storage from '@services/core/storageService';

const RECENT_COUNT = 3;

type HomeTab = 'snapshot' | 'ledger' | 'holdings' | 'goals' | 'loans';

const TABS: UnderlineTab<HomeTab>[] = [
    { key: 'snapshot', label: 'Snapshot' },
    { key: 'ledger', label: 'Ledger' },
    { key: 'holdings', label: 'Holdings' },
    { key: 'goals', label: 'Goals' },
    { key: 'loans', label: 'Loans' },
];

const ROW_DESTINATION: Record<Storage.SnapshotRowId, HomeTab> = {
    cash: 'ledger',
    investments: 'holdings',
    loans: 'loans',
    goals: 'goals',
};

const greeting = () => {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const HomeScreen = ({ navigation }: any) => {
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    const { isChecking: isStatusChecking, isNewUser, refresh: refreshDataStatus } = useDataStatus();

    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
    const [order, setOrder] = useState<Storage.SnapshotRowId[]>(Storage.DEFAULT_SNAPSHOT_ORDER);
    const [period, setPeriod] = useState<Storage.SnapshotPeriod>('overall');
    const [range, setRange] = useState<Storage.SnapshotRange>('6M');
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);
    const [hasLoaded, setHasLoaded] = useState(false);
    const [tab, setTab] = useState<HomeTab>('snapshot');
    const [ledgerView, setLedgerView] = useState<LedgerView>('LIST');
    const [isHoldingsSettingsVisible, setIsHoldingsSettingsVisible] = useState(false);
    const isLoading = useRef(false);

    const currency = profile?.currency || 'PHP';
    const format = usePrivacyFormat(currency);

    const loadData = async () => {
        if (isLoading.current) return;
        isLoading.current = true;
        try {
            setOrder(await Storage.getSnapshotOrder());
            setPeriod(await Storage.getSnapshotPeriod());
            const savedRange = await Storage.getSnapshotRange();
            setRange(savedRange);

            // Process recurring rules first so the snapshot includes anything they just generated.
            await processRecurrenceRules();

            const [p, t, inv, debts, goals] = await Promise.all([
                Storage.getUserProfile(),
                getCachedTransactions(),
                getCachedInvestments(),
                getAllDebts(),
                getAllSavingsGoals(),
            ]);

            // Catches a goal that just crossed its target via a recurring auto-contribution
            // generated above - that engine has no per-transaction hook of its own.
            checkGoalReachedNotifications(t).catch(err => console.error('Failed to check goal-reached notifications:', err));

            setProfile(p);
            if (t.length === 0 && inv.length === 0 && debts.length === 0 && goals.length === 0) {
                setSnapshot(null);
                return;
            }

            const symbols = Array.from(new Set(inv.map(i => i.symbol)));
            const priceAt = buildPriceLookup(await getPriceHistoryForSymbols(symbols));
            const now = new Date();

            setSnapshot({
                netWorth: calculateNetWorthChange(t, inv, debts, goals, priceAt, now, Storage.SNAPSHOT_RANGES.find(r => r.key === savedRange)?.months),
                runway: calculateRunwayTrend(t, debts, goals, now),
                cash: calculateCashKept(t, now),
                month: calculateMonthCashFlow(t, now),
                prevMonth: calculateMonthCashFlow(t, new Date(now.getFullYear(), now.getMonth() - 1, 1)),
                investments: calculateInvestmentSnapshot(inv, priceAt, now),
                loans: calculateLoansSnapshot(t, debts, now),
                goals: calculateGoalsSnapshot(t, goals, now),
                recent: buildRecentTransactions(t, RECENT_COUNT, now),
            });
        } catch (error) {
            console.error('Error loading HomeScreen data:', error);
        } finally {
            isLoading.current = false;
            setHasLoaded(true);
            refreshDataStatus();
        }
    };

    const { isReviewVisible, checkReviewEligibility, handleRate, handleLater, handleDecline } = useReviewPrompt();

    useFocusEffect(
        useCallback(() => {
            loadData();
            checkReviewEligibility();
        // loadData is recreated every render; listing it would re-run this (and reload all
        // data) on every render instead of once per screen focus.
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [checkReviewEligibility])
    );

    // Other tabs edit goals, loans and transactions, so the Snapshot reloads whenever it's shown again.
    const lastTab = useRef<HomeTab>(tab);
    useEffect(() => {
        if (tab === 'snapshot' && lastTab.current !== 'snapshot') loadData();
        lastTab.current = tab;
    // loadData is recreated every render; this should only fire on a tab change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    const openRecord = (params?: object) => navigation.navigate('Record', params);

    const togglePeriod = () => {
        const next = period === 'overall' ? 'month' : 'overall';
        setPeriod(next);
        Storage.saveSnapshotPeriod(next);
    };

    const changeRange = (next: Storage.SnapshotRange) => {
        setRange(next);
        // Saved first: the reload reads the range back from storage.
        Storage.saveSnapshotRange(next).then(() => loadData());
    };

    const changeOrder = (next: Storage.SnapshotRowId[]) => {
        setOrder(next);
        Storage.saveSnapshotOrder(next);
    };

    const settingsIcon = <Ionicons name="options-outline" size={22} color={ds.text2} />;

    const renderNewUser = () => (
        <View style={styles.newUser}>
            <EmptyState
                icon="cash-outline"
                title="No financial data yet"
                subtitle="Your net worth, cash, investments, loans and goals will show up here once you start logging money in and out."
                ctaLabel="Add Your First Transaction"
                onCtaPress={() => navigation.navigate('Record')}
            />
            <SectionHeader title="Get started" />
            <Row icon="receipt-outline" title="Add a transaction" chevron onPress={() => navigation.navigate('Record')} />
            <Row icon="trending-up-outline" title="Add an investment" chevron onPress={() => navigation.navigate('Record')} />
            <Row icon="flag-outline" title="Set a savings goal" chevron last onPress={() => setTab('goals')} />
        </View>
    );

    return (
        <ScreenWrapper scrollable={false} noPadding style={{ backgroundColor: ds.bg }}>
            <View style={styles.topBar}>
                <Pressable onPress={() => navigation.navigate('Profile')} style={styles.greeting}>
                    <Text style={[type.title, { color: ds.text }]} numberOfLines={1}>
                        {greeting()}{profile?.name ? `, ${profile.name}` : ''}
                    </Text>
                </Pressable>
                <View style={styles.actions}>
                    {mode !== 'open' && (
                        <View style={[styles.chip, { backgroundColor: ds.inset }]}>
                            <Text style={[type.captionMedium, { color: ds.text2 }]}>{mode === 'discreet' ? 'Discreet' : 'Hidden'}</Text>
                        </View>
                    )}
                    <Pressable onPress={() => setIsSettingsVisible(true)} style={styles.iconButton} accessibilityLabel="Home settings" hitSlop={space[2]}>
                        {settingsIcon}
                    </Pressable>
                </View>
            </View>

            {isStatusChecking || !hasLoaded ? (
                <View style={styles.loading}>
                    <ActivityIndicator size="large" color={ds.accent} />
                </View>
            ) : (
                <>
                    {/* Outside the tab's own scroll view, so it stays put under the top bar. */}
                    <UnderlineTabs tabs={TABS} value={tab} onChange={setTab} />
                    <View style={styles.body}>
                        {tab === 'snapshot' && (
                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                                {isNewUser || !snapshot ? (
                                    renderNewUser()
                                ) : (
                                    <SnapshotView
                                        data={snapshot}
                                        format={format}
                                        order={order}
                                        period={period}
                                        onTogglePeriod={togglePeriod}
                                        onDetails={() => navigation.navigate('Insights')}
                                        onRowPress={id => setTab(ROW_DESTINATION[id])}
                                        onSeeAllRecent={() => setTab('ledger')}
                                    />
                                )}
                            </ScrollView>
                        )}
                        {tab === 'ledger' && <LedgerTab format={format} view={ledgerView} onChangeView={setLedgerView} onOpenRecord={openRecord} />}
                        {tab === 'holdings' && (
                            <HoldingsTab
                                format={format}
                                currency={currency}
                                settingsVisible={isHoldingsSettingsVisible}
                                onOpenSettings={() => setIsHoldingsSettingsVisible(true)}
                                onCloseSettings={() => setIsHoldingsSettingsVisible(false)}
                                onOpenRecord={() => openRecord()}
                            />
                        )}
                        {tab === 'goals' && <GoalsTab format={format} />}
                        {tab === 'loans' && <LoansTab format={format} currency={currency} onOpenRecord={openRecord} />}
                    </View>
                </>
            )}

            <HomeSettingsSheet
                visible={isSettingsVisible}
                onClose={() => setIsSettingsVisible(false)}
                order={order}
                onChangeOrder={changeOrder}
                range={range}
                onChangeRange={changeRange}
            />

            <ReviewAppModal
                isVisible={isReviewVisible}
                onRate={handleRate}
                onLater={handleLater}
                onDecline={handleDecline}
            />
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space[3],
        paddingTop: space[1],
        paddingBottom: space[3],
        paddingHorizontal: space[5],
    },
    greeting: {
        flexShrink: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chip: {
        paddingVertical: 3,
        paddingHorizontal: space[2],
        borderRadius: radius.sm,
    },
    iconButton: {
        padding: space[1],
    },
    body: {
        flex: 1,
    },
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    loading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[7] * 2,
    },
    newUser: {
        paddingTop: space[5],
    },
});

export default HomeScreen;
