import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { InvestmentStats } from '@components/investment/InvestmentStats';
import { getPortfolioStats } from '@services/domain/investmentService';
import { HoldingsList } from '@components/investment/HoldingsList';
import { SmartAdvisor, Suggestion } from '@components/investment/SmartAdvisor';
import { AllocationChart } from '@components/investment/AllocationChart';
import { DividendChart } from '@components/investment/DividendChart';

const InvestmentScreen = () => {
    const { colors } = useTheme();
    const [refreshing, setRefreshing] = useState(false);

    const [portfolioStats, setPortfolioStats] = useState({
        totalEquity: 0,
        realizedPL: 0,
        unrealizedPL: 0,
        unrealizedPLPercent: 0,
        totalDividends: 0
    });

    const loadStats = useCallback(async () => {
        try {
            const stats = await getPortfolioStats();
            setPortfolioStats(stats);
        } catch (error) {
            console.error("Failed to load investment stats", error);
        }
    }, []);

    useEffect(() => {
        loadStats();
    }, [loadStats]);

    const holdings = [
        { ticker: 'BDO', shares: 2000, price: 160.50, totalValue: 321000, gainLoss: 41000, gainLossPercent: 14.64, divYield: 4.5, sector: 'Banks' },
        { ticker: 'BPI', shares: 1500, price: 120.00, totalValue: 180000, gainLoss: 15000, gainLossPercent: 9.09, divYield: 3.8, sector: 'Banks' },
        { ticker: 'ALI', shares: 10000, price: 34.20, totalValue: 342000, gainLoss: -15000, gainLossPercent: -4.2, divYield: 1.2, sector: 'Property' },
        { ticker: 'SM', shares: 200, price: 950.00, totalValue: 190000, gainLoss: 5000, gainLossPercent: 2.70, divYield: 1.5, sector: 'Holding Firms' },
        { ticker: 'JFC', shares: 500, price: 245.00, totalValue: 122500, gainLoss: 12500, gainLossPercent: 11.36, divYield: 1.8, sector: 'Service' },
        { ticker: 'TEL', shares: 100, price: 1350.00, totalValue: 135000, gainLoss: 5000, gainLossPercent: 3.84, divYield: 6.5, sector: 'Telco' },
        { ticker: 'GLO', shares: 50, price: 1850.00, totalValue: 92500, gainLoss: -2500, gainLossPercent: -2.63, divYield: 5.8, sector: 'Telco' },
        { ticker: 'MER', shares: 300, price: 380.00, totalValue: 114000, gainLoss: -6000, gainLossPercent: -5.00, divYield: 3.2, sector: 'Power' },
        { ticker: 'ACEN', shares: 20000, price: 4.50, totalValue: 90000, gainLoss: -10000, gainLossPercent: -10.00, divYield: 0.0, sector: 'Power' },
        { ticker: 'DMC', shares: 5000, price: 10.20, totalValue: 51000, gainLoss: 1000, gainLossPercent: 2.00, divYield: 8.5, sector: 'Property' }
    ];

    const suggestions: Suggestion[] = [
        { ticker: 'MER', reason: '🔥 CRASH(-15.2%)', type: 'crash', price: 380.00, hasDivSoon: true },
        { ticker: 'GLO', reason: '🔻 DIP(-4.5%)', type: 'dip', price: 1850.00 },
        { ticker: 'AREIT', reason: '⚖️ BALANCE', type: 'balance', price: 34.50 },
        { ticker: 'DMC', reason: '📅 DIV SOON', type: 'balance', price: 10.20, hasDivSoon: true },
    ];

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
                />

                {/* Smart Advisor */}
                <SmartAdvisor suggestions={suggestions} />

                {/* Charts Area */}
                <AllocationChart holdingsData={holdings} />
                <DividendChart labels={dividendLabels} data={dividendData} />

                {/* Holdings List */}
                <HoldingsList holdings={holdings} />

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
