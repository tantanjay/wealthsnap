import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';

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
import * as Storage from '@services/core/storageService';
import { Ionicons } from '@expo/vector-icons';
import InvestmentSettingsModal from '@components/investments/modals/InvestmentSettingsModal';
import ReorderModal from '@components/common/ReorderModal';

const InvestmentScreen = () => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
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
    const [showStatsReorder, setShowStatsReorder] = useState(false);
    const [showSectionReorder, setShowSectionReorder] = useState(false);

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
            if (currentStatsOrder) setStatsOrder(currentStatsOrder);

            const currentSectionOrder = await Storage.getInvestmentSectionOrder();
            if (currentSectionOrder) setSectionOrder(currentSectionOrder);

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

    const handleUpdateStatsOrder = async (newItems: any[]) => {
        const order = newItems.map(i => i.id);
        setStatsOrder(order);
        await Storage.saveInvestmentStatsOrder(order);
    };

    const handleUpdateSectionOrder = async (newItems: any[]) => {
        const order = newItems.map(i => i.id);
        setSectionOrder(order);
        await Storage.saveInvestmentSectionOrder(order);
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadStats();
        setRefreshing(false);
    }, [loadStats]);

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
                        <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
                        <Text style={[styles.date, { color: colors.textSecondary }]}>As of {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.iconButton, { backgroundColor: colors.surface }]}
                        onPress={() => setShowSettings(true)}
                    >
                        <Ionicons name="settings-outline" size={20} color={colors.text} />
                    </TouchableOpacity>
                </View>

                {/* Dynamic Sections */}
                {activeSectionOrder.map(sectionId => renderSection(sectionId))}

            </ScrollView>

            <InvestmentSettingsModal
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                onOpenStatsReorder={() => {
                    setShowSettings(false);
                    setShowStatsReorder(true);
                }}
                onOpenSectionReorder={() => {
                    setShowSettings(false);
                    setShowSectionReorder(true);
                }}
            />

            {/* Stats Reorder Modal */}
            <ReorderModal
                visible={showStatsReorder}
                onClose={() => {
                    setShowStatsReorder(false);
                    setShowSettings(true);
                }}
                title="Reorder Stats Cards"
                items={[
                    { id: 'equity', label: 'Total Equity' },
                    { id: 'realized', label: 'Realized P/L' },
                    { id: 'unrealized', label: 'Unrealized P/L' },
                    { id: 'dividends', label: 'Total Dividends' },
                ].sort((a, b) => {
                    if (!statsOrder || statsOrder.length === 0) return 0;
                    const indexA = statsOrder.indexOf(a.id);
                    const indexB = statsOrder.indexOf(b.id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                })}
                onReorder={handleUpdateStatsOrder}
            />

            {/* Section Reorder Modal */}
            <ReorderModal
                visible={showSectionReorder}
                onClose={() => {
                    setShowSectionReorder(false);
                    setShowSettings(true);
                }}
                title="Reorder Sections"
                items={[
                    { id: 'stats_carousel', label: 'Stats Cards' },
                    { id: 'smart_advisor', label: 'Smart Advisor' },
                    { id: 'allocation_chart', label: 'Allocation Chart' },
                    { id: 'dividend_chart', label: 'Dividend Projection' },
                    { id: 'holdings_list', label: 'Holdings List' },
                ].sort((a, b) => {
                    if (!sectionOrder || sectionOrder.length === 0) return 0;
                    const indexA = sectionOrder.indexOf(a.id);
                    const indexB = sectionOrder.indexOf(b.id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                })}
                onReorder={handleUpdateSectionOrder}
            />

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
