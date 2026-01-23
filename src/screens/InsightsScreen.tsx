import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { ScreenWrapper } from '../components/common/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { usePrivacy } from '../context/PrivacyContext';

import { Transaction } from '../types';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Metrics from '../utils/financialMetrics';
import { getUserProfile, getCachedTransactions } from '../services/storageService';
import { getBudgets } from '../services/budgetService';

// Sub-components
import InsightsOverviewCards from '../components/transaction/insights/InsightsOverviewCards';
import IncomeAnalysis from '../components/transaction/insights/IncomeAnalysis';
import ExpenseAnalysis from '../components/transaction/insights/ExpenseAnalysis';
import ComparisonChart from '../components/transaction/insights/ComparisonChart';
import SmartAlerts from '../components/transaction/insights/SmartAlerts';

import SavingsRateTrend from '../components/transaction/insights/SavingsRateTrend';
import CumulativeSpendingChart from '../components/transaction/insights/CumulativeSpendingChart';

const InsightsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
    const [currency, setCurrency] = useState('USD');
    const [refreshing, setRefreshing] = useState(false);
    const [expenseGrouping, setExpenseGrouping] = useState<'CATEGORY' | 'SUB_CATEGORY'>('CATEGORY');
    const [isLoading, setIsLoading] = useState(true);

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
        anomalies: [] as Metrics.Anomaly[],
        // New metrics for additional cards
        currentBalance: 0,
        budgetPerformance: 0,
        topExpenseCategory: { name: 'None', amount: 0, percentage: 0 },
        daysInMonth: 30
    });

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const profile = await getUserProfile();
            if (profile?.currency) setCurrency(profile.currency);
            const allTransactions = await getCachedTransactions();
            setTransactions(allTransactions);

            // Explicitly calculate metrics with the new data
            await calculateMetrics(allTransactions);
        } catch (error) {
            console.error("Error loading insights:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const calculateMetrics = useCallback(async (currentTransactions: Transaction[] = transactions) => {
        const today = new Date();
        const currentMonthTrans = Metrics.getTransactionsByMonth(currentTransactions, today);

        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthTrans = Metrics.getTransactionsByMonth(currentTransactions, lastMonthDate);

        // Core Metrics
        const totals = Metrics.calculateTotals(currentMonthTrans);
        const savingsRate = Metrics.calculateSavingsRate(totals.income, totals.expense);
        const burnRate = Metrics.calculateBurnRate(currentTransactions);

        // Breakdowns
        const incomeBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'INCOME', 'SUB_CATEGORY');
        const expenseBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', expenseGrouping);

        // Trends
        const monthlyTrends = Metrics.getMonthlyTrends(currentTransactions, 6);

        // Comparison
        const lastMonthTotals = Metrics.calculateTotals(lastMonthTrans);
        const average6Month = Metrics.calculateBurnRate(currentTransactions, 6);
        const average1Year = Metrics.calculateBurnRate(currentTransactions, 12);

        // Anomalies
        const anomalies = Metrics.detectAnomalies(currentMonthTrans, currentTransactions);

        // NEW: Calculate current balance (all-time income - all-time expense)
        const allTimeTotals = Metrics.calculateTotals(currentTransactions);
        const currentBalance = allTimeTotals.income - allTimeTotals.expense;

        // NEW: Budget Performance (always use SUB_CATEGORY for budgets)
        const specificCategoryBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', 'SUB_CATEGORY');
        const budgets = await getBudgets();
        let budgetPerformance = 0;
        if (budgets.length > 0) {
            // Calculate total spent in budgeted categories using the specific breakdown
            const budgetedCategorySpent = specificCategoryBreakdown
                .filter(cat => budgets.some(b => b.category === cat.name))
                .reduce((sum, cat) => sum + cat.amount, 0);

            const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
            budgetPerformance = totalBudget > 0 ? (budgetedCategorySpent / totalBudget) * 100 : 0;
        }

        // NEW: Top Expense Category (always use individual category for better insight)
        const topExpenseCategory = specificCategoryBreakdown.length > 0
            ? specificCategoryBreakdown[0]
            : { name: 'None', amount: 0, percentage: 0 };

        // NEW: Days in current month
        const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

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
            averageExpense: Metrics.calculateBurnRate(currentTransactions, 3), // 3-month average
            average6Month,
            average1Year,
            anomalies,
            // New metrics
            currentBalance,
            budgetPerformance,
            topExpenseCategory,
            daysInMonth
        });
        // Removed setIsLoading(false) from here since it's now handled by fetchTransactions
    }, [transactions, expenseGrouping]);

    useFocusEffect(
        useCallback(() => {
            fetchTransactions();
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [])
    );

    // Re-calculate when grouping changes (but not on mount as fetchTransactions handles that)
    useEffect(() => {
        const recalc = async () => {
            await calculateMetrics();
        };
        recalc();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expenseGrouping]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchTransactions();
        setRefreshing(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                    isLoading={isLoading}
                    currentBalance={data.currentBalance}
                    budgetPerformance={data.budgetPerformance}
                    topExpenseCategory={data.topExpenseCategory}
                    daysInMonth={data.daysInMonth}
                />

                {/* 2. Cumulative Spending */}
                <CumulativeSpendingChart
                    transactions={transactions}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                />

                {/* 3. Comparison */}
                <ComparisonChart
                    currentMonthExpense={data.currentMonthExpense}
                    lastMonthExpense={data.lastMonthExpense}
                    averageExpense={data.averageExpense}
                    average6Month={data.average6Month}
                    average1Year={data.average1Year}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                    isLoading={isLoading}
                />

                {/* 4. Expense Insights */}
                <ExpenseAnalysis
                    categoryBreakdown={data.expenseBreakdown}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                    grouping={expenseGrouping}
                    onToggleGrouping={setExpenseGrouping}
                    transactions={transactions}
                    isLoading={isLoading}
                />

                {/* 5. Income Insights */}
                <IncomeAnalysis
                    monthlyTrends={data.incomeTrends}
                    categoryBreakdown={data.incomeBreakdown}
                    currency={currency}
                    isPrivacyEnabled={isPrivacyEnabled}
                    transactions={transactions}
                    isLoading={isLoading}
                />

                {/* 6. Savings Rate Trend */}
                <SavingsRateTrend
                    transactions={transactions}
                    privacyMode={isPrivacyEnabled}
                    isLoading={isLoading}
                />

                {/* 7. Smart Alerts */}
                <SmartAlerts
                    anomalies={data.anomalies}
                    hasHistory={transactions.length > 10}
                />

                <View style={{ height: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};

export default InsightsScreen;
