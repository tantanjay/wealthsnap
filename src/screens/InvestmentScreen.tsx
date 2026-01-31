import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, ToastAndroid, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { InvestmentStats } from '@components/investment/InvestmentStats';
import { getPortfolioStats, getPortfolioHoldings, PortfolioHolding } from '@services/domain/investmentService';
import { HoldingsList } from '@components/investment/HoldingsList';
import { SmartAdvisor, Suggestion } from '@components/investment/SmartAdvisor';
import { AllocationChart } from '@components/investment/AllocationChart';
import { DividendChart } from '@components/investment/DividendChart';
import * as Storage from '@services/core/storageService';
import { usePrivacy } from '@context/PrivacyContext';
import BottomModal from '@components/common/BottomModal';
import { fetchHistoricalPrices, AssetRequest } from '@services/integrations/geminiService';
import { addPriceHistory } from '@services/domain/priceHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { getSmartSuggestions, Priority } from '@services/domain/smartAdvisorService';


const InvestmentScreen = () => {
    const { colors } = useTheme();
    // const { isPrivacyEnabled, togglePrivacy } = usePrivacy(); // Removed Eye Button
    const [refreshing, setRefreshing] = useState(false);
    const [currency, setCurrency] = useState('PHP');

    // Menu Modal State
    const [isMenuVisible, setIsMenuVisible] = useState(false);
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

            // Initial Suggestions fetch
            const newSuggestions = await getSmartSuggestions(activePriority);
            setSuggestions(newSuggestions);
        } catch (error) {
            console.error("Failed to load investment stats", error);
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

    // --- AI Price Fetch Logic ---
    const handleFetchPrices = async (durationLabel: string) => {
        setIsMenuVisible(false); // Close modal immediately

        // 1. Determine prompt duration string
        let durationPrompt = '';
        if (durationLabel === 'Today') durationPrompt = 'Today';
        else if (durationLabel === 'Last 3 days') durationPrompt = 'Last 3 days';
        else if (durationLabel === 'Last 7 days') durationPrompt = 'Last 7 days';
        else if (durationLabel === 'Last 14 days') durationPrompt = 'Last 14 days';
        else if (durationLabel === 'Last 31 days') durationPrompt = 'Last 31 days';
        else return;

        // Notify user start
        const msg = `Fetching prices for ${durationLabel}... This runs in background.`;
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);

        setIsFetching(true); // Start loading

        try {
            // 2. Prepare assets list
            const allAssets = await getAllAssets();
            const symbolMap = allAssets.reduce((acc, a) => {
                acc[a.symbol] = a;
                return acc;
            }, {} as any);

            const symbolsToFetch = Array.from(new Set(holdings.map(h => h.symbol)));

            if (symbolsToFetch.length === 0) {
                if (Platform.OS === 'android') ToastAndroid.show("No holdings to fetch prices for.", ToastAndroid.SHORT);
                setIsFetching(false);
                return;
            }

            const assetRequests: AssetRequest[] = symbolsToFetch.map(s => ({
                symbol: s,
                exchange: symbolMap[s]?.exchange || 'Unknown'
            }));

            // 3. Call AI Service (Background)
            fetchHistoricalPrices(assetRequests, durationPrompt).then(async (prices) => {
                console.log(`Fetched ${prices.length} price points.`);

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
                console.error("Background fetch failed", err);
                const errMsg = "Failed to update prices.";
                if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
            }).finally(() => {
                setIsFetching(false); // Stop loading
            });

        } catch (e) {
            console.error("Error initiating fetch", e);
            setIsFetching(false);
        }
    };
    const dividendLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const dividendData = [1200, 3500, 800, 4500, 1500, 2200];

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
                            onPress={() => setIsMenuVisible(true)}
                            disabled={isFetching}
                            style={{ padding: 8, marginLeft: 5 }}
                        >
                            {isFetching ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Ionicons name="cloud-download-outline" size={24} color={colors.text} />
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
                />

                {/* Smart Advisor */}
                <SmartAdvisor
                    suggestions={suggestions}
                    activePriority={activePriority}
                    onPriorityChange={updateSuggestions}
                    currency={currency}
                />

                {/* Charts Area */}
                <AllocationChart holdingsData={holdings} />
                <DividendChart labels={dividendLabels} data={dividendData} currency={currency} />

                {/* Holdings List */}
                <HoldingsList holdings={holdings} currency={currency} />

            </ScrollView>

            {/* Fetch Prices Modal */}
            <BottomModal
                visible={isMenuVisible}
                onClose={() => setIsMenuVisible(false)}
                title="Investment Settings"
            >
                <View>
                    <Text style={{ color: colors.textSecondary, fontSize: 13, textTransform: 'uppercase', marginBottom: 10, letterSpacing: 1 }}>
                        Fetch Prices (AI Powered)
                    </Text>

                    <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: 12, borderRadius: 8, marginBottom: 15, flexDirection: 'row' }}>
                        <Ionicons name="warning-outline" size={20} color="#FF9800" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
                            AI-fetched prices are estimates and may vary from real-time market data. They depend on the AI model's training data.
                        </Text>
                    </View>

                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
                        {['Today', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 31 days'].map((item, index, arr) => (
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
                                onPress={() => handleFetchPrices(item)}
                            >
                                <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                                <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        ))}
                    </View>
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
