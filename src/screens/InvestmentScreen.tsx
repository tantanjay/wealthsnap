import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, Platform, ToastAndroid } from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { Skeleton } from '@components/common/Skeleton';
import DraggableIconButton from '@components/common/DraggableIconButton';
import { InvestmentStats } from '@components/investments/InvestmentStats';
import { HoldingsList } from '@components/investments/HoldingsList';
import { SmartAdvisor, Suggestion } from '@components/investments/SmartAdvisor';
import { AllocationChart } from '@components/investments/AllocationChart';
import { DividendChart } from '@components/investments/DividendChart';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useFloatingGear } from '@context/FloatingGearContext';
import { getPortfolioStats, getPortfolioHoldings, PortfolioHolding, getActualDividendsGrouped } from '@services/domain/investmentService';
import { getSmartSuggestions, Priority } from '@services/domain/smartAdvisorService';
import { getProjectedDividends, getDividendCalendar, CalendarEvent } from '@services/domain/dividendHistoryService';
import { AssetRequest } from '@services/integrations/geminiService';
import { refreshAssetPrices } from '@services/domain/marketDataService';
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
    const { isDocked, registerSecondAction } = useFloatingGear();
    const routeName = useRoute().name;
    const { checkConsent } = useAIConsent();
    const [refreshing, setRefreshing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [currency, setCurrency] = useState('PHP');

    const [valuationDate, setValuationDate] = useState<string | null>(null);

    const [portfolioStats, setPortfolioStats] = useState<{
        totalEquity: number;
        realizedPL: number;
        realizedPLPercent: number | null;
        unrealizedPL: number;
        unrealizedPLPercent: number | null;
        totalDividends: number;
        thisMonthDividends: number;
        thisMonthInvested: number;
    }>({
        totalEquity: 0,
        realizedPL: 0,
        realizedPLPercent: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        totalDividends: 0,
        thisMonthDividends: 0,
        thisMonthInvested: 0
    });

    const [holdings, setHoldings] = useState<PortfolioHolding[]>([]);
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [activePriority, setActivePriority] = useState<Priority>('all');
    const [dividendChartData, setDividendChartData] = useState<{ labels: string[], data: any[] }>({ labels: [], data: [] });
    const [actualDividends, setActualDividends] = useState<Record<number, any>>({});
    const [calendarData, setCalendarData] = useState<Record<number, CalendarEvent[]>>({});

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

            // Determine Majority Date for Stocks
            const stockHoldings = portfolioHoldings.filter(h => h.type === 'STOCKS' || h.type === 'STOCK');
            if (stockHoldings.length > 0) {
                // Count frequencies of dates
                const dateCounts: Record<string, number> = {};
                stockHoldings.forEach(h => {
                    if (h.priceAsOf) {
                        // Extract just the date part YYYY-MM-DD
                        const datePart = h.priceAsOf.split('T')[0];
                        dateCounts[datePart] = (dateCounts[datePart] || 0) + 1;
                    }
                });

                // Find majority
                let maxCount = 0;
                let majorityDate = '';

                // If tie, pick latest
                Object.entries(dateCounts).forEach(([date, count]) => {
                    if (count > maxCount) {
                        maxCount = count;
                        majorityDate = date;
                    } else if (count === maxCount) {
                        // Tie-break: use latest date
                        if (new Date(date) > new Date(majorityDate)) {
                            majorityDate = date;
                        }
                    }
                });

                setValuationDate(majorityDate || null);

            } else {
                setValuationDate(null); // Fallback to current date in UI if null
            }

            // Fetch Dividend Projections
            const projectedDividends = await getProjectedDividends(portfolioHoldings);
            setDividendChartData(projectedDividends);

            // Fetch Actual Dividends
            const actualDivs = await getActualDividendsGrouped();
            setActualDividends(actualDivs);

            // Fetch Calendar Data
            const calData = await getDividendCalendar(portfolioHoldings);
            setCalendarData(calData);

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
    }, []); // Remove activePriority dependency

    // Kept separate from loadStats (a lighter, targeted fetch instead of a redundant full-stats
    // load), but hoisted into a stable callback so it can also run on focus below - otherwise
    // Smart Advisor's Crash/Dip/Dividend/Balance cards only refreshed on mount or when the
    // priority filter chip changed, going stale after navigating away and back.
    const fetchSuggestions = useCallback(async () => {
        const newSuggestions = await getSmartSuggestions(activePriority);
        setSuggestions(newSuggestions);
    }, [activePriority]);

    useEffect(() => {
        fetchSuggestions();
    }, [fetchSuggestions]);

    useFocusEffect(
        useCallback(() => {
            loadStats();
            fetchSuggestions();
        }, [loadStats, fetchSuggestions])
    );

    useEffect(() => {
        registerSecondAction(routeName, {
            label: 'Screen Settings',
            icon: 'options-outline',
            onPress: () => setShowSettings(true),
        });
        return () => registerSecondAction(routeName, null);
    }, [registerSecondAction, routeName]);

    // Restore the last-selected Smart Advisor priority filter on mount
    const isInitialPriorityLoad = React.useRef(true);
    React.useEffect(() => {
        const loadPriority = async () => {
            const saved = await Storage.getInvestmentAdvisorPriority();
            if (saved === 'div' || saved === 'crash' || saved === 'balance' || saved === 'all') {
                setActivePriority(saved);
            }
            isInitialPriorityLoad.current = false;
        };
        loadPriority();
    }, []);

    React.useEffect(() => {
        if (!isInitialPriorityLoad.current) {
            Storage.saveInvestmentAdvisorPriority(activePriority);
        }
    }, [activePriority]);

    const updateSuggestions = (priority: Priority) => {
        setActivePriority(priority);
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
        await Promise.all([
            loadStats(),
            getSmartSuggestions(activePriority).then(setSuggestions)
        ]);
        setRefreshing(false);
    }, [loadStats, activePriority]);

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
            refreshAssetPrices(requests, durationPrompt, currency).then((savedCount) => {
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


    const renderSection = (sectionId: string) => {
        switch (sectionId) {
            case 'stats_carousel':
                return (
                    <InvestmentStats
                        key="stats_carousel"
                        totalEquity={portfolioStats.totalEquity}
                        realizedPL={portfolioStats.realizedPL}
                        realizedPLPercent={portfolioStats.realizedPLPercent}
                        unrealizedPL={portfolioStats.unrealizedPL}
                        unrealizedPLPercent={portfolioStats.unrealizedPLPercent}
                        totalDividends={portfolioStats.totalDividends}
                        currency={currency}
                        isLoading={isLoading}
                        isPrivacyEnabled={isPrivacyEnabled}
                        cardOrder={statsOrder}
                        thisMonthDividends={portfolioStats.thisMonthDividends}
                        thisMonthInvested={portfolioStats.thisMonthInvested}
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
                        projectedDividends={dividendChartData}
                        actualDividends={actualDividends}
                        calendarData={calendarData}
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
        <ScreenWrapper style={{ paddingHorizontal: 0 }} scrollable={false}>
            <ScrollView
                contentContainerStyle={{ paddingBottom: 80 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Header Title with Menu */}
                <View style={styles.header}>
                    <View>
                        {isLoading ? (
                            <View style={{ marginBottom: 4, width: 120 }}>
                                <Skeleton width={120} height={16} />
                            </View>
                        ) : (
                            <Text style={[styles.date, { color: colors.textSecondary }]}>
                                As of {valuationDate
                                    ? new Date(valuationDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                    : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                }
                            </Text>
                        )}
                        <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
                    </View>
                    {isDocked && (
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <DraggableIconButton
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
                            </DraggableIconButton>
                            <DraggableIconButton
                                style={[styles.iconButton, { backgroundColor: colors.surface }]}
                                onPress={() => setShowSettings(true)}
                            >
                                <Ionicons name="options-outline" size={20} color={colors.text} />
                            </DraggableIconButton>
                        </View>
                    )}
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
        alignItems: 'center',
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
