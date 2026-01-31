import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { InvestmentStats } from '@components/investment/InvestmentStats';
import { getPortfolioStats, getPortfolioHoldings, PortfolioHolding } from '@services/domain/investmentService';
import { HoldingsList } from '@components/investment/HoldingsList';
import { SmartAdvisor, Suggestion } from '@components/investment/SmartAdvisor';
import { AllocationChart } from '@components/investment/AllocationChart';
import { DividendChart } from '@components/investment/DividendChart';
import * as Storage from '@services/core/storageService';

import { getSmartSuggestions, Priority } from '@services/domain/smartAdvisorService';



const InvestmentScreen = () => {
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);
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
    }, [activePriority]); // Re-fetch when priority changes? Ideally separate effect.

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    // Separate effect for priority change to avoid reloading everything
    const updateSuggestions = async (priority: Priority) => {
        setActivePriority(priority);
        const newSuggestions = await getSmartSuggestions(priority);
        setSuggestions(newSuggestions);
    };

    // const allocationData = [
    //     { name: 'Banks', population: 321000, color: '#2563eb', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    //     { name: 'Property', population: 342000, color: '#f59e0b', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    //     { name: 'Service', population: 122500, color: '#8b5cf6', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    //     { name: 'Telco', population: 135000, color: '#ec4899', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    //     { name: 'Power', population: 114000, color: '#06b6d4', legendFontColor: colors.textSecondary, legendFontSize: 12 },
    // ];

    const dividendLabels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
    const dividendData = [1200, 3500, 800, 4500, 1500, 2200];

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
                {/* Header Title */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: colors.text }]}>Portfolio</Text>
                    <Text style={[styles.date, { color: colors.textSecondary }]}>As of Jan 31, 2026</Text>
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
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        paddingHorizontal: 20,
        paddingBottom: 10,
        paddingTop: 10
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
