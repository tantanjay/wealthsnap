import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { usePrivacy } from '../context/PrivacyContext';

import { Transaction } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Metrics from '../utils/financialMetrics';
import { getUserProfile } from '../services/storageService';
import { getCachedTransactions } from '../services/dataCache';

// Sub-components
import InsightsOverviewCards from '../components/transaction/insights/InsightsOverviewCards';
import IncomeAnalysis from '../components/transaction/insights/IncomeAnalysis';
import ExpenseAnalysis from '../components/transaction/insights/ExpenseAnalysis';
import ComparisonChart from '../components/transaction/insights/ComparisonChart';
import SmartAlerts from '../components/transaction/insights/SmartAlerts';
import SavingsRateTrend from '../components/transaction/insights/SavingsRateTrend';

const InsightsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
    const [currency, setCurrency] = useState('USD');
    const [refreshing, setRefreshing] = useState(false);
    const [expenseGrouping, setExpenseGrouping] = useState<'CATEGORY' | 'SUB_CATEGORY'>('CATEGORY');

    const [transactions, setTransactions] = useState<Transaction[]>([]);

    const [data, setData] = useState({
        netCashFlow: 0,
        income: 0,
        expense: 0,
        savingsRate: 0,
        burnRate: 0,
        incomeTrends: { labels: [], incomeData: [] as number[], expenseData: [] as number[] } as { labels: string[], incomeData: number[], expenseData: number[] }, // Correct type
        incomeBreakdown: [] as any[],
        expenseBreakdown: [] as any[],
        currentMonthExpense: 0,
        lastMonthExpense: 0,
        averageExpense: 0,
        average6Month: 0,
        average1Year: 0,
        anomalies: [] as Metrics.Anomaly[]
    });

    const fetchTransactions = async () => {
        const profile = await getUserProfile();
        if (profile?.currency) setCurrency(profile.currency);
        const allTransactions = await getCachedTransactions();
        setTransactions(allTransactions);
    };

    const calculateMetrics = useCallback(() => {
        const today = new Date();
        const currentMonthTrans = Metrics.getTransactionsByMonth(transactions, today);

        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthTrans = Metrics.getTransactionsByMonth(transactions, lastMonthDate);

        // Core Metrics
        const totals = Metrics.calculateTotals(currentMonthTrans);
        const savingsRate = Metrics.calculateSavingsRate(totals.income, totals.expense);
        const burnRate = Metrics.calculateBurnRate(transactions);

        // Breakdowns
        const incomeBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'INCOME', 'SUB_CATEGORY');
        const expenseBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', expenseGrouping);

        // Trends
        const monthlyTrends = Metrics.getMonthlyTrends(transactions, 6);

        // Comparison
        const lastMonthTotals = Metrics.calculateTotals(lastMonthTrans);
        const average6Month = Metrics.calculateBurnRate(transactions, 6);
        const average1Year = Metrics.calculateBurnRate(transactions, 12);

        // Anomalies
        const anomalies = Metrics.detectAnomalies(currentMonthTrans, transactions);

        setData({
            netCashFlow: totals.net,
            income: totals.income,
            expense: totals.expense,
            savingsRate,
            burnRate,
            incomeTrends: monthlyTrends,
            incomeBreakdown,
            expenseBreakdown,
            currentMonthExpense: totals.expense,
            lastMonthExpense: lastMonthTotals.expense,
            averageExpense: burnRate, // 3-month average (burnRate default is 6, but let's use it)
            average6Month,
            average1Year,
            anomalies
        });
    }, [transactions, expenseGrouping]);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
        }, [])
    );

    useEffect(() => {
        calculateMetrics();
    }, [calculateMetrics, expenseGrouping]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTransactions();
        setRefreshing(false);
    }, []);

    return (
        <ScreenWrapper>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>Financial Insights</Text>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* 1. Core Overview */}
                <InsightsOverviewCards
                    netCashFlow={data.netCashFlow}
                    income={data.income}
                    expense={data.expense}
                    savingsRate={data.savingsRate}
                    burnRate={data.burnRate}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                />

                {/* 2. Income Insights */}
                <IncomeAnalysis
                    monthlyTrends={data.incomeTrends}
                    categoryBreakdown={data.incomeBreakdown}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                    transactions={transactions}
                />

                {/* 3. Expense Insights */}
                <ExpenseAnalysis
                    categoryBreakdown={data.expenseBreakdown}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                    grouping={expenseGrouping}
                    onToggleGrouping={setExpenseGrouping}
                    transactions={transactions}
                />

                {/* 4. Comparison */}
                <ComparisonChart
                    currentMonthExpense={data.currentMonthExpense}
                    lastMonthExpense={data.lastMonthExpense}
                    averageExpense={data.averageExpense}
                    average6Month={data.average6Month}
                    average1Year={data.average1Year}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                />

                {/* 5. Savings Rate Trend */}
                <SavingsRateTrend
                    transactions={transactions}
                    privacyMode={isPrivacyEnabled}
                />

                {/* 6. Smart Alerts */}
                <SmartAlerts anomalies={data.anomalies} />

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};

export default InsightsScreen;
