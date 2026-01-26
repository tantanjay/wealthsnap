import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, TouchableOpacity, Text, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

import BottomModal from '@components/common/BottomModal';
import ReorderModal from '@components/common/ReorderModal';
import InsightsOverviewCards from '@components/transaction/insights/InsightsOverviewCards';
import IncomeAnalysis from '@components/transaction/insights/IncomeAnalysis';
import ExpenseAnalysis from '@components/transaction/insights/ExpenseAnalysis';
import ComparisonChart from '@components/transaction/insights/ComparisonChart';
import SmartAlerts from '@components/transaction/insights/SmartAlerts';
import SavingsRateTrend from '@components/transaction/insights/SavingsRateTrend';
import CumulativeSpendingChart from '@components/transaction/insights/CumulativeSpendingChart';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { Transaction } from '@types';
import { getAllBudgets } from '@services/domain';
import * as Metrics from '@utils/financialMetrics';
import * as Storage from '@services/core/storageService';

const InsightsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
    const [currency, setCurrency] = useState('USD');
    const [refreshing, setRefreshing] = useState(false);
    const [expenseGrouping, setExpenseGrouping] = useState<'CATEGORY' | 'SUB_CATEGORY'>('CATEGORY');
    const [isLoading, setIsLoading] = useState(true);

    const [cardOrder, setCardOrder] = useState<string[]>([]);
    const [sectionOrder, setSectionOrder] = useState<string[]>([]);

    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [isCardReorderVisible, setIsCardReorderVisible] = useState(false);
    const [isSectionReorderVisible, setIsSectionReorderVisible] = useState(false);

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
        currentBalance: 0,
        budgetPerformance: 0,
        topExpenseCategory: { name: 'None', amount: 0, percentage: 0 },
        daysInMonth: 30
    });

    const fetchTransactions = async () => {
        setIsLoading(true);
        try {
            const profile = await Storage.getUserProfile();
            if (profile?.currency) setCurrency(profile.currency);
            const allTransactions = await Storage.getCachedTransactions();
            setTransactions(allTransactions);

            // Explicitly calculate metrics with the new data
            await calculateMetrics(allTransactions);

            // Load orders
            const savedCardOrder = await Storage.getInsightsCardOrder();
            if (savedCardOrder) setCardOrder(savedCardOrder);

            const savedSectionOrder = await Storage.getInsightsSectionOrder();
            if (savedSectionOrder) setSectionOrder(savedSectionOrder);
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

        // Calculate current balance (all-time income - all-time expense)
        const allTimeTotals = Metrics.calculateTotals(currentTransactions);
        const currentBalance = allTimeTotals.income - allTimeTotals.expense;

        // Budget Performance (always use SUB_CATEGORY for budgets)
        const specificCategoryBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', 'SUB_CATEGORY');
        const budgets = await getAllBudgets();
        let budgetPerformance = 0;
        if (budgets.length > 0) {
            // Calculate total spent in budgeted categories using the specific breakdown
            const budgetedCategorySpent = specificCategoryBreakdown
                .filter(cat => budgets.some(b => b.category === cat.name))
                .reduce((sum, cat) => sum + cat.amount, 0);

            const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);
            budgetPerformance = totalBudget > 0 ? (budgetedCategorySpent / totalBudget) * 100 : 0;
        }

        // Top Expense Category (always use individual category for better insight)
        const topExpenseCategory = specificCategoryBreakdown.length > 0
            ? specificCategoryBreakdown[0]
            : { name: 'None', amount: 0, percentage: 0 };

        // Days in current month
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
            currentBalance,
            budgetPerformance,
            topExpenseCategory,
            daysInMonth
        });
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
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', flex: 1 }}>Financial Insights</Text>
                <TouchableOpacity onPress={() => setIsSettingsModalVisible(true)}>
                    <Ionicons name="settings-outline" size={24} color={colors.text} />
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
                }
            >
                {/* Sections Mapping */}
                {[
                    {
                        id: 'overview',
                        component: (
                            <InsightsOverviewCards
                                key="overview"
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
                                cardOrder={cardOrder}
                            />
                        )
                    },
                    {
                        id: 'cumulative',
                        component: (
                            <CumulativeSpendingChart
                                key="cumulative"
                                transactions={transactions}
                                currency={currency}
                                isPrivacyEnabled={isPrivacyEnabled}
                                isLoading={isLoading}
                            />
                        )
                    },
                    {
                        id: 'comparison',
                        component: (
                            <ComparisonChart
                                key="comparison"
                                currentMonthExpense={data.currentMonthExpense}
                                lastMonthExpense={data.lastMonthExpense}
                                averageExpense={data.averageExpense}
                                average6Month={data.average6Month}
                                average1Year={data.average1Year}
                                currency={currency}
                                isPrivacyEnabled={isPrivacyEnabled}
                                isLoading={isLoading}
                            />
                        )
                    },
                    {
                        id: 'expense',
                        component: (
                            <ExpenseAnalysis
                                key="expense"
                                categoryBreakdown={data.expenseBreakdown}
                                currency={currency}
                                isPrivacyEnabled={isPrivacyEnabled}
                                grouping={expenseGrouping}
                                onToggleGrouping={setExpenseGrouping}
                                transactions={transactions}
                                isLoading={isLoading}
                            />
                        )
                    },
                    {
                        id: 'income',
                        component: (
                            <IncomeAnalysis
                                key="income"
                                monthlyTrends={data.incomeTrends}
                                categoryBreakdown={data.incomeBreakdown}
                                currency={currency}
                                isPrivacyEnabled={isPrivacyEnabled}
                                transactions={transactions}
                                isLoading={isLoading}
                            />
                        )
                    },
                    {
                        id: 'savings',
                        component: (
                            <SavingsRateTrend
                                key="savings"
                                transactions={transactions}
                                privacyMode={isPrivacyEnabled}
                                isLoading={isLoading}
                            />
                        )
                    },
                    {
                        id: 'alerts',
                        component: (
                            <SmartAlerts
                                key="alerts"
                                anomalies={data.anomalies}
                                hasHistory={transactions.length > 10}
                            />
                        )
                    }
                ].sort((a, b) => {
                    if (!sectionOrder || sectionOrder.length === 0) return 0;
                    const indexA = sectionOrder.indexOf(a.id);
                    const indexB = sectionOrder.indexOf(b.id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                }).map(section => section.component)}

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Settings Modal */}
            <BottomModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
                title="Insights Settings"
            >
                <View style={{ gap: 10, paddingBottom: 20 }}>
                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            justifyContent: 'space-between'
                        }}
                        onPress={() => {
                            setIsSettingsModalVisible(false);
                            setIsCardReorderVisible(true);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="grid-outline" size={24} color={colors.primary} />
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>Cards Reorder</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            padding: 16,
                            backgroundColor: colors.surface,
                            borderRadius: 12,
                            justifyContent: 'space-between'
                        }}
                        onPress={() => {
                            setIsSettingsModalVisible(false);
                            setIsSectionReorderVisible(true);
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                            <Ionicons name="list-outline" size={24} color={colors.primary} />
                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '500' }}>Insights Reorder</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </BottomModal>

            {/* Cards Reorder Modal */}
            <ReorderModal
                visible={isCardReorderVisible}
                onClose={() => {
                    setIsCardReorderVisible(false);
                    setIsSettingsModalVisible(true);
                }}
                title="Reorder Cards"
                items={[
                    { id: 'financial-runway', label: 'Financial Runway' },
                    { id: 'budget-performance', label: 'Budget Health' },
                    { id: 'net-cash-flow', label: 'Net Cash Flow' },
                    { id: 'savings-rate', label: 'Savings Rate' },
                    { id: 'total-income', label: 'Total Income' },
                    { id: 'total-expense', label: 'Total Expense' },
                    { id: 'burn-rate', label: 'Burn Rate' },
                    { id: 'avg-daily-spending', label: 'Daily Average' },
                    { id: 'annual-spending', label: 'Annualized Exp.' },
                    { id: 'largest-category', label: 'Top Category' }
                ].sort((a, b) => {
                    if (!cardOrder || cardOrder.length === 0) return 0;
                    const indexA = cardOrder.indexOf(a.id);
                    const indexB = cardOrder.indexOf(b.id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                })}
                onReorder={async (newItems) => {
                    const newOrder = newItems.map(i => i.id);
                    setCardOrder(newOrder);
                    await Storage.saveInsightsCardOrder(newOrder);
                }}
            />

            {/* Insights Reorder Modal */}
            <ReorderModal
                visible={isSectionReorderVisible}
                onClose={() => {
                    setIsSectionReorderVisible(false);
                    setIsSettingsModalVisible(true);
                }}
                title="Reorder Insights"
                items={[
                    { id: 'overview', label: 'Summary Cards' },
                    { id: 'cumulative', label: 'Cumulative Spending' },
                    { id: 'comparison', label: 'Spending Comparison' },
                    { id: 'expense', label: 'Expense Analysis' },
                    { id: 'income', label: 'Income Analysis' },
                    { id: 'savings', label: 'Savings Rate' },
                    { id: 'alerts', label: 'Smart Alerts' }
                ].sort((a, b) => {
                    if (!sectionOrder || sectionOrder.length === 0) return 0;
                    const indexA = sectionOrder.indexOf(a.id);
                    const indexB = sectionOrder.indexOf(b.id);
                    if (indexA === -1 && indexB === -1) return 0;
                    if (indexA === -1) return 1;
                    if (indexB === -1) return -1;
                    return indexA - indexB;
                })}
                onReorder={async (newItems) => {
                    const newOrder = newItems.map(i => i.id);
                    setSectionOrder(newOrder);
                    await Storage.saveInsightsSectionOrder(newOrder);
                }}
            />
        </ScreenWrapper>
    );
};

export default InsightsScreen;
