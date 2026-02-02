import React, { useState, useEffect, useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ToastAndroid, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { InvestmentStats } from '@components/investments/InvestmentStats';
import { HoldingsList } from '@components/investments/HoldingsList';
import { SmartAdvisor, Suggestion } from '@components/investments/SmartAdvisor';
import { AllocationChart } from '@components/investments/AllocationChart';
import { DividendChart } from '@components/investments/DividendChart';
import { useTheme } from '@context/ThemeContext';
import { getAllAssets } from '@services/domain/assetService';
import { addPriceHistory } from '@services/domain/priceHistoryService';
import { getPortfolioStats, getPortfolioHoldings, PortfolioHolding } from '@services/domain/investmentService';
import { getSmartSuggestions, Priority } from '@services/domain/smartAdvisorService';
import { addDividendHistory, getProjectedDividends } from '@services/domain/dividendHistoryService';
import { fetchHistoricalPrices, AssetRequest, fetchDividendHistory } from '@services/integrations/geminiService';
import * as Storage from '@services/core/storageService';
import { usePrivacy } from '@context/PrivacyContext';
import { useAIConsent } from '@hooks/useAIConsent';

const InvestmentScreen = () => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const { checkConsent } = useAIConsent();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currency, setCurrency] = useState('PHP');

    // Menu Modal State
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const [modalStep, setModalStep] = useState<'selection' | 'options'>('selection');
    const [activeMode, setActiveMode] = useState<'price' | 'dividend'>('price');

    const [isFetching, setIsFetching] = useState(false);

    const [portfolioStats, setPortfolioStats] = useState({
        totalEquity: 0,
        realizedPL: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        totalDividends: 0
    });

    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activePriority, setActivePriority] = useState<Priority>('all');
    const [dividendChartData, setDividendChartData] = useState<{ labels: string[], data: number[] }>({ labels: [], data: [] });

    const loadStats = useCallback(async () => {
        try {
            const profile = await Storage.getUserProfile();
            if (profile?.currency) {
                setCurrency(profile.currency);
            }

            const stats = await getPortfolioStats();
            setPortfolioStats(stats);

            const portfolioHoldings = await getPortfolioHoldings();
            setHoldings(portfolioHoldings);

            // Fetch Dividend Projections
            const projectedDividends = await getProjectedDividends(portfolioHoldings);
            setDividendChartData(projectedDividends);

            // Initial Suggestions fetch
            const newSuggestions = await getSmartSuggestions(activePriority);
            setSuggestions(newSuggestions);
        } catch (error) {
            console.error("Failed to load investment stats", error);
        } finally {
            setIsLoading(false);
        }
    }, [activePriority]);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const updateSuggestions = async (priority: Priority) => {
        setActivePriority(priority);
        const newSuggestions = await getSmartSuggestions(priority);
        setSuggestions(newSuggestions);
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    }, [loadStats]);

    // --- AI Fetch Logic ---
    const handleOptionSelect = (mode: 'price' | 'dividend') => {
        setActiveMode(mode);
        setModalStep('options');
    };

    const handleBackToSelection = () => {
        setModalStep('selection');
    };

    const executeFetch = async (durationLabel: string) => {
        setIsMenuVisible(false); // Close modal immediately
        setModalStep('selection'); // Reset for next time

        // 1. Determine prompt duration string
        let durationPrompt = '';
        if (durationLabel === 'Today') durationPrompt = 'Today';
        else if (durationLabel === 'Last 3 days') durationPrompt = 'Last 3 days';
        else if (durationLabel === 'Last 7 days') durationPrompt = 'Last 7 days';
        else if (durationLabel === 'Last 14 days') durationPrompt = 'Last 14 days';
        else if (durationLabel === 'Last 31 days') durationPrompt = 'Last 31 days';
        else if (durationLabel === 'Last 3 months') durationPrompt = 'Last 3 months';
        else if (durationLabel === 'Last 6 months') durationPrompt = 'Last 6 months';
        else if (durationLabel === 'Last 1 year') durationPrompt = 'Last 1 year';
        else return;

        const context = activeMode === 'price' ? 'prices' : 'dividends';
        const msg = `Fetching ${context} for ${durationLabel}... This runs in background.`;
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);

        setIsFetching(true); // Start loading

        try {
            // 2. Prepare assets list
            const allAssets = await getAllAssets();
            const symbolMap = allAssets.reduce((acc, a) => {
                acc[a.symbol] = a;
                return acc;
            }, {} as any);

            const symbolsToFetch = Array.from(new Set(holdings.map(h => h.symbol)))
                .filter(s => symbolMap[s]?.type === 'STOCKS');

            if (symbolsToFetch.length === 0) {
                if (Platform.OS === 'android') ToastAndroid.show("No holdings to fetch for.", ToastAndroid.SHORT);
                setIsFetching(false);
                return;
            }

            const assetRequests: AssetRequest[] = symbolsToFetch.map(s => ({
                symbol: s,
                exchange: symbolMap[s]?.exchange || 'Unknown'
            }));

            // 3. Call AI Service (Background)
            if (activeMode === 'price') {
                fetchHistoricalPrices(assetRequests, durationPrompt).then(async (prices) => {
                    // 4. Save to DB
                    let savedCount = 0;
                    for (const p of prices) {
                        await addPriceHistory(p.symbol, p.price, {
                            high: p.high,
                            low: p.low,
                            volume: p.volume,
                            timestamp: p.date,
                            source: 'AI_FETCH'
                        });
                        savedCount++;
                    }

                    // 5. Notify Finish & Reload
                    const successMsg = `Updated ${savedCount} prices.`;
                    if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.SHORT);
                    loadStats(); // Refresh UI
                }).catch(err => {
                    console.error("Background fetch prices failed", err);
                    const errMsg = "Failed to update prices.";
                    if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
                }).finally(() => {
                    setIsFetching(false);
                });
            } else {
                // Fetch Dividends
                fetchDividendHistory(assetRequests, durationPrompt).then(async (dividends: any[]) => {
                    let savedCount = 0;
                    for (const d of dividends) {
                        await addDividendHistory({
                            symbol: d.symbol,
                            exDate: d.exDate,
                            paymentDate: d.paymentDate,
                            recordDate: d.recordDate,
                            amount: new BigNumber(d.amount),
                            type: d.type,
                            status: 'PAID',
                            source: 'AI_FETCH'
                        });
                        savedCount++;
                    }
                    const successMsg = `Updated ${savedCount} dividend records.`;
                    if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.SHORT);
                }).catch((err: any) => {
                    console.error("Background fetch dividends failed", err);
                    const errMsg = "Failed to update dividends.";
                    if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
                }).finally(() => {
                    setIsFetching(false);
                });
            }

        } catch (e) {
            console.error("Error initiating fetch", e);
            setIsFetching(false);
        }
    };


    return (
        <ScreenWrapper style={{ paddingHorizontal: 0 }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Title with Menu */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>As of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TouchableOpacity
                            onPress={togglePrivacy}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name={isPrivacyEnabled ? "eye-off" : "eye"} size={24} color={colors.text} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => {
                                checkConsent(() => {
                                    setModalStep('selection');
                                    setIsMenuVisible(true);
                                });
                            }}
                            disabled={isFetching}
                            style={{ padding: 8, marginLeft: 5 }}
                        >
                            {isFetching ? (
                                <ActivityIndicator size="small" color={colors.text} />
                            ) : (
                                <Ionicons name="sparkles" size={24} color={colors.text} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dashboard Stats */}
                <InvestmentStats
                    totalEquity={portfolioStats.totalEquity}
                    realizedPL={portfolioStats.realizedPL}
                    unrealizedPL={portfolioStats.unrealizedPL}
                    unrealizedPLPercent={portfolioStats.unrealizedPLPercent}
                    totalDividends={portfolioStats.totalDividends}
                    currency={currency}
                    isLoading={isLoading}
                    isPrivacyEnabled={isPrivacyEnabled}
                />

                {/* Smart Advisor */}
                <SmartAdvisor
                    suggestions={suggestions}
                    activePriority={activePriority}
                    onPriorityChange={updateSuggestions}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                />

                {/* Charts Area */}
                <AllocationChart
                    holdingsData={holdings}
                    isLoading={isLoading}
                    isPrivacyEnabled={isPrivacyEnabled}
                />
                <DividendChart
                    labels={dividendChartData.labels.length > 0 ? dividendChartData.labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                    data={dividendChartData.data.length > 0 ? dividendChartData.data : [0, 0, 0, 0, 0, 0]}
                    currency={currency}
                    isLoading={isLoading}
                    isPrivacyEnabled={isPrivacyEnabled}
                />

                {/* Holdings List */}
                <HoldingsList
                    holdings={holdings}
                    currency={currency}
                    totalPortfolioValue={portfolioStats.totalEquity}
                    isLoading={isLoading}
                    isPrivacyEnabled={isPrivacyEnabled}
                />

            </ScrollView>

            {/* AI Settings Modal */}
            <BottomModal
                visible={isMenuVisible}
                onClose={() => setIsMenuVisible(false)}
                title={modalStep === 'selection' ? "AI Options" : activeMode === 'price' ? "Fetch Price History" : "Fetch Dividend History"}
            >
                {modalStep === 'options' && (
                    <View style={{ marginBottom: 10 }}>
                        <TouchableOpacity onPress={handleBackToSelection} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                            <Ionicons name="arrow-back" size={20} color={colors.primary} />
                            <Text style={{ color: colors.primary, marginLeft: 5, fontSize: 16 }}>Back to Options</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <View>
                    {modalStep === 'selection' ? (
                        <View style={{ gap: 10 }}>
                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.surface,
                                    padding: 16,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                                onPress={() => handleOptionSelect('dividend')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="cash-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Dividend History</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    backgroundColor: colors.surface,
                                    padding: 16,
                                    borderRadius: 12,
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.border
                                }}
                                onPress={() => handleOptionSelect('price')}
                            >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Ionicons name="trending-up-outline" size={24} color={colors.primary} style={{ marginRight: 12 }} />
                                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Price History</Text>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: 12, borderRadius: 8, marginBottom: 15, flexDirection: 'row' }}>
                                <Ionicons name="warning-outline" size={20} color="#FF9800" style={{ marginRight: 8, marginTop: 2 }} />
                                <Text style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
                                    AI-fetched {activeMode === 'price' ? 'prices' : 'dividends'} are estimates and may vary from real-time official records.
                                </Text>
                            </View>

                            <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
                                {['Today', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 31 days', 'Last 3 months', 'Last 6 months', 'Last 1 year'].map((item, index, arr) => (
                                    <TouchableOpacity
                                        key={item}
                                        style={{
                                            padding: 16,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                                            borderBottomColor: colors.border
                                        }}
                                        onPress={() => executeFetch(item)}
                                    >
                                        <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                                        <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </BottomModal>

        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        paddingTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 14,
    }
});

export default InvestmentScreen;
