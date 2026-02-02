import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';

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
                    onUpdate={loadStats}
                />

            </ScrollView>

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
