import React, { useState, useCallback } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { InvestmentStats } from '@components/investments/InvestmentStats';
import { HoldingsList } from '@components/investments/HoldingsList';
import { SmartAdvisor, Suggestion } from '@components/investments/SmartAdvisor';
import { AllocationChart } from '@components/investments/AllocationChart';
import { DividendChart } from '@components/investments/DividendChart';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { getPortfolioStats, getPortfolioHoldings, PortfolioHolding } from '@services/domain/investmentService';
import { getSmartSuggestions, Priority } from '@services/domain/smartAdvisorService';
import { getProjectedDividends } from '@services/domain/dividendHistoryService';
import { AssetRequest, fetchHistoricalPrices } from '@services/integrations/geminiService';
import { addPriceHistory, getPriceHistory, updatePriceHistory } from '@services/domain/priceHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import * as Storage from '@services/core/storageService';
import { Ionicons } from '@expo/vector-icons';
import InvestmentSettingsModal from '@components/investments/modals/InvestmentSettingsModal';
import { useAIConsent } from '@hooks/useAIConsent';

// Valid IDs for validation
const VALID_STATS_IDS = ['equity', 'realized', 'unrealized', 'dividends'];
const VALID_SECTION_IDS = ['stats_carousel', 'smart_advisor', 'allocation_chart', 'dividend_chart', 'holdings_list'];

const InvestmentScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const { checkConsent } = useAIConsent();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currency, setCurrency] = useState('PHP');

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

    // Layout Settings
    const [showSettings, setShowSettings] = useState(false);

    const [statsOrder, setStatsOrder] = useState<string[]>([]);
    const [sectionOrder, setSectionOrder] = useState<string[]>([]);

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

            // Load layout preferences
            const currentStatsOrder = await Storage.getInvestmentStatsOrder();
            if (currentStatsOrder) {
                const validOrder = currentStatsOrder.filter(id => VALID_STATS_IDS.includes(id));
                // Only set if we have valid items, otherwise fallback to default
                if (validOrder.length > 0) setStatsOrder(validOrder);
            }

            const currentSectionOrder = await Storage.getInvestmentSectionOrder();
            if (currentSectionOrder) {
                const validOrder = currentSectionOrder.filter(id => VALID_SECTION_IDS.includes(id));
                if (validOrder.length > 0) setSectionOrder(validOrder);
            }

        } catch (error) {
            console.error("Failed to load investment stats", error);
        } finally {
            setIsLoading(false);
        }
    }, [activePriority]);

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [loadStats])
    );

    const updateSuggestions = async (priority: Priority) => {
        setActivePriority(priority);
        const newSuggestions = await getSmartSuggestions(priority);
        setSuggestions(newSuggestions);
    };

    const handleUpdateStatsOrder = async (newOrder: string[]) => {
        setStatsOrder(newOrder);
        await Storage.saveInvestmentStatsOrder(newOrder);
    };

    const handleUpdateSectionOrder = async (newOrder: string[]) => {
        setSectionOrder(newOrder);
        await Storage.saveInvestmentSectionOrder(newOrder);
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    }, [loadStats]);



    // --- Bulk Fetch Logic ---
    const handleBulkFetchPrices = async (durationLabel: string) => {
        // Background process
        const showToast = (msg: string) => {
            if (Platform.OS === 'android') {
                ToastAndroid.show(msg, ToastAndroid.SHORT);
            }
        };

        if (holdings.length === 0) {
            showToast("No holdings to fetch prices for.");
            return;
        }

        showToast(`Fetching prices for ${durationLabel}...`);

        try {
            // 1. Identify Stock Holdings
            // We use 'type' from holdings (which comes from Asset or Investment)
            // HoldingsList uses `type` field.
            // Let's filter holdings where type is close to 'STOCK' or 'STOCKS' or check Asset Service for more precision if needed.
            // For now, relies on holding.type (which comes from asset?.type)
            const stockHoldings = holdings.filter(h =>
                h.type === 'STOCKS' || h.type === 'STOCK' // Cover potential variations
            );

            if (stockHoldings.length === 0) {
                showToast("No Stock holdings found.");
                return;
            }

            // 2. Prepare Asset Requests
            const allAssets = await getAllAssets();
            const requests: AssetRequest[] = stockHoldings.map(h => {
                const asset = allAssets.find(a => a.symbol === h.symbol);
                return {
                    symbol: h.symbol,
                    exchange: asset?.exchange || 'Unknown'
                };
            });

            // 3. Determine Duration
            let durationPrompt = 'Last 7 days';
            if (durationLabel === 'Today') durationPrompt = 'Today';
            else if (durationLabel === 'Last 3 days') durationPrompt = 'Last 3 days';

            // 4. Fetch
            fetchHistoricalPrices(requests, durationPrompt).then(async (prices) => {
                let savedCount = 0;
                for (const p of prices) {
                    // We need to check existing price history to avoid duplicates or update them
                    // This is expensive if we do it one by one against DB.
                    // Optimization: Check against what we have in memory? We don't have all price history in memory here.
                    // We will query DB for each symbol's history? Or just Try Insert/Update.
                    // `addPriceHistory` adds new. `updatePriceHistory` updates.

                    // Strategy: Get existing history for this symbol first (limited range?)
                    // `getPriceHistory` gets all.
                    // Let's just fetch all history for the symbol. It might be heavy if history is long.
                    // But for correctness, we should.
                    const existingHistory = await getPriceHistory(p.symbol);
                    const existing = existingHistory.find(eh => eh.timestamp.startsWith(p.date));

                    if (existing) {
                        // Update if AI_FETCH or just update. 
                        // If source is MANUAL, we preserve it?
                        // The requirement said: "make sure existing AI_FETCH records if they already exist... add new if no existing... manual entries preserved".
                        if (existing.source === 'AI_FETCH') {
                            await updatePriceHistory(existing.id, new BigNumber(p.price), {
                                high: p.high ? new BigNumber(p.high) : undefined,
                                low: p.low ? new BigNumber(p.low) : undefined,
                                volume: p.volume ? new BigNumber(p.volume) : undefined,
                                timestamp: existing.timestamp,
                                source: 'AI_FETCH'
                            });
                            savedCount++;
                        }
                        // If MANUAL, do nothing.
                    } else {
                        await addPriceHistory(p.symbol, new BigNumber(p.price), {
                            high: p.high ? new BigNumber(p.high) : undefined,
                            low: p.low ? new BigNumber(p.low) : undefined,
                            volume: p.volume ? new BigNumber(p.volume) : undefined,
                            timestamp: p.date,
                            source: 'AI_FETCH'
                        });
                        savedCount++;
                    }
                }

                if (savedCount > 0) {
                    showToast(`Updated ${savedCount} prices.`);
                    loadStats(); // Refresh UI
                } else {
                    showToast("No new prices to update.");
                }

            }).catch(err => {
                console.error("Bulk fetch failed", err);
                showToast("Failed to fetch prices.");
            });


        } catch (e) {
            console.error("Error preparing bulk fetch", e);
            showToast("Error initiating fetch.");
        }
    };

    // --- Dynamic Section Rendering ---

    const renderSection = (sectionId: string) => {
        switch (sectionId) {
            case 'stats_carousel':
                return (
                    <InvestmentStats
                        key="stats_carousel"
                        totalEquity={portfolioStats.totalEquity}
                        realizedPL={portfolioStats.realizedPL}
                        unrealizedPL={portfolioStats.unrealizedPL}
                        unrealizedPLPercent={portfolioStats.unrealizedPLPercent}
                        totalDividends={portfolioStats.totalDividends}
                        currency={currency}
                        isLoading={isLoading}
                        isPrivacyEnabled={isPrivacyEnabled}
                        cardOrder={statsOrder}
                    />
                );
            case 'smart_advisor':
                return (
                    <SmartAdvisor
                        key="smart_advisor"
                        suggestions={suggestions}
                        activePriority={activePriority}
                        onPriorityChange={updateSuggestions}
                        currency={currency}
                        isPrivacyEnabled={isPrivacyEnabled}
                    />
                );
            case 'allocation_chart':
                return (
                    <AllocationChart
                        key="allocation_chart"
                        holdingsData={holdings}
                        isLoading={isLoading}
                        isPrivacyEnabled={isPrivacyEnabled}
                    />
                );
            case 'dividend_chart':
                return (
                    <DividendChart
                        key="dividend_chart"
                        labels={dividendChartData.labels.length > 0 ? dividendChartData.labels : ["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
                        data={dividendChartData.data.length > 0 ? dividendChartData.data : [0, 0, 0, 0, 0, 0]}
                        currency={currency}
                        isLoading={isLoading}
                        isPrivacyEnabled={isPrivacyEnabled}
                    />
                );
            case 'holdings_list':
                return (
                    <HoldingsList
                        key="holdings_list"
                        holdings={holdings}
                        currency={currency}
                        totalPortfolioValue={portfolioStats.totalEquity}
                        isLoading={isLoading}
                        isPrivacyEnabled={isPrivacyEnabled}
                        onUpdate={loadStats}
                    />
                );
            default:
                return null;
        }
    };

    // Default Section Order
    const defaultSectionOrder = ['stats_carousel', 'smart_advisor', 'allocation_chart', 'dividend_chart', 'holdings_list'];
    const activeSectionOrder = sectionOrder.length > 0 ? sectionOrder : defaultSectionOrder;

    return (
        <ScreenWrapper style={{ paddingHorizontal: 0 }}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Title with Menu */}
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>As of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                        <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                        <TouchableOpacity
                            onPress={togglePrivacy}
                            style={[
                                styles.iconButton,
                                { backgroundColor: colors.surface }
                            ]}
                        >
                            <Ionicons
                                name={isPrivacyEnabled ? 'eye-off' : 'eye'}
                                size={20}
                                color={colors.text}
                            />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.iconButton, { backgroundColor: colors.surface }]}
                            onPress={() => setShowSettings(true)}
                        >
                            <Ionicons name="options-outline" size={20} color={colors.text} />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Dynamic Sections */}
                {activeSectionOrder.map(sectionId => renderSection(sectionId))}

            </ScrollView>

            <InvestmentSettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                onFetchPriceList={(duration) => {
                    checkConsent(() => {
                        handleBulkFetchPrices(duration);
                    });
                }}
                statsOrder={statsOrder}
                sectionOrder={sectionOrder}
                onUpdateStatsOrder={handleUpdateStatsOrder}
                onUpdateSectionOrder={handleUpdateSectionOrder}
            />

            {/* Stats Reorder Modal */}


        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 16,
        marginBottom: 20,
        marginTop: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    date: {
        fontSize: 14,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    }
});

export default InvestmentScreen;
