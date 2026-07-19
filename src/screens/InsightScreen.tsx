import React, { useState, useCallback, useEffect, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, ScrollView, TouchableOpacity, Text, RefreshControl, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';


import InsightsOverviewCards from '@components/insights/InsightsOverviewCards';
import InsightsSettingsModal from '@components/insights/modals/InsightsSettingsModal';
import IncomeAnalysis from '@components/insights/IncomeAnalysis';
import ExpenseAnalysis from '@components/insights/ExpenseAnalysis';
import ComparisonChart from '@components/insights/ComparisonChart';
import SmartAlerts from '@components/insights/SmartAlerts';
import SavingsRateTrend from '@components/insights/SavingsRateTrend';
import CumulativeSpendingChart from '@components/insights/CumulativeSpendingChart';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import BottomModal from '@components/common/BottomModal';
import DraggableIconButton from '@components/common/DraggableIconButton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useFloatingGear } from '@context/FloatingGearContext';
import { Transaction } from '@types';
import { getAllBudgets } from '@services/domain/budgetService';
import { getAllDebts } from '@services/domain/debtService';
import * as Metrics from '@utils/financialMetrics';
import { calculateTotalDebtObligations } from '@utils/debtMetrics';
import * as Storage from '@services/core/storageService';
import { getCachedTransactions } from '@services/domain/transactionService';

// Valid IDs for validation/filtering
const VALID_CARD_IDS = [
    'financial-runway', 'budget-performance', 'net-cash-flow', 'savings-rate',
    'total-income', 'total-expense', 'burn-rate', 'avg-daily-spending',
    'annual-spending', 'largest-category'
];

const VALID_SECTION_IDS = [
    'overview', 'cumulative', 'comparison', 'expense',
    'income', 'savings', 'alerts'
];

const InsightScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const { isPrivacyEnabled, togglePrivacy } = usePrivacy();
    const { isDocked, registerSecondAction } = useFloatingGear();
    const [currency, setCurrency] = useState('PHP');
    const [refreshing, setRefreshing] = useState(false);
    const [expenseGrouping, setExpenseGrouping] = useState<'GROUP' | 'ITEM'>('ITEM');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [cardOrder, setCardOrder] = useState<string[]>([]);
    const [sectionOrder, setSectionOrder] = useState<string[]>([]);

    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<import('@types').Debt[]>([]);

    const selectedYear = selectedDate.getFullYear();
    // Update picker year when selected date changes (for external sync)
    useEffect(() => {
        setPickerYear(selectedYear);
    }, [selectedYear]);

    // Restore the last-selected Expense Analysis grouping (Group / Item) on mount
    const isInitialGroupingLoad = useRef(true);
    useEffect(() => {
        const loadGrouping = async () => {
            const saved = await Storage.getInsightsExpenseGrouping();
            if (saved === 'GROUP' || saved === 'ITEM') {
                setExpenseGrouping(saved);
            }
            isInitialGroupingLoad.current = false;
        };
        loadGrouping();
    }, []);

    useEffect(() => {
        if (!isInitialGroupingLoad.current) {
            Storage.saveInsightsExpenseGrouping(expenseGrouping);
        }
    }, [expenseGrouping]);

    const availableRange = React.useMemo(() => {
        if (transactions.length === 0) {
            const now = new Date();
            return { minYear: now.getFullYear(), minMonth: now.getMonth(), maxYear: now.getFullYear(), maxMonth: now.getMonth() };
        }

        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(); // Always allow up to current month

        return {
            minYear: minDate.getFullYear(),
            minMonth: minDate.getMonth(),
            maxYear: maxDate.getFullYear(),
            maxMonth: maxDate.getMonth()
        };
    }, [transactions]);

    const [data, setData] = useState({
        netCashFlow: new BigNumber(0),
        income: new BigNumber(0),
        expense: new BigNumber(0),
        savingsRate: new BigNumber(0),
        burnRate: new BigNumber(0),
        incomeTrends: { labels: [], fullLabels: [], incomeData: [], expenseData: [] } as { labels: string[], fullLabels: string[], incomeData: BigNumber[], expenseData: BigNumber[] },
        incomeBreakdown: [] as any[],
        expenseBreakdown: [] as any[],
        currentMonthExpense: new BigNumber(0),
        lastMonthExpense: new BigNumber(0),
        averageExpense: new BigNumber(0),
        average6Month: new BigNumber(0),
        average1Year: new BigNumber(0),
        anomalies: [] as Metrics.Anomaly[],
        currentBalance: new BigNumber(0),
        budgetPerformance: new BigNumber(0),
        topExpenseCategory: { name: 'None', amount: new BigNumber(0), percentage: new BigNumber(0) },
        daysInMonth: 30,
        dailyAverage: new BigNumber(0)
    });

    const calculateMetrics = useCallback(async (currentTransactions: Transaction[], currentDebts: import('@types').Debt[], grouping: 'GROUP' | 'ITEM', referenceDate: Date = new Date()) => {
        if (!currentTransactions || currentTransactions.length === 0) {
            setIsLoading(false);
            return;
        }

        const today = referenceDate;
        const currentMonthTrans = Metrics.getTransactionsByMonth(currentTransactions, today);
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthTrans = Metrics.getTransactionsByMonth(currentTransactions, lastMonthDate);

        // Core Totals
        const totals = Metrics.calculateTotals(currentMonthTrans);
        const lastMonthTotals = Metrics.calculateTotals(lastMonthTrans);

        // Breakdowns & Trends
        const incomeBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'INCOME', 'ITEM'); // Income always by Item (specific source)
        const expenseBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', grouping);
        const monthlyTrends = Metrics.getMonthlyTrends(currentTransactions, 6, today);

        // Averages for Runway/Burn Rate cards - always "as of today", since Runway is framed
        // as "if your income stopped today", regardless of which month is being browsed.
        const runwayAverage6Month = Metrics.calculateBurnRate(currentTransactions, 6);
        const runwayAverage3Month = Metrics.calculateBurnRate(currentTransactions, 3);

        // Burn Rate logic: Fallback hierarchy to ensure Runway doesn't show NaN
        let burnRate = runwayAverage6Month;
        if (burnRate.isLessThanOrEqualTo(0)) {
            burnRate = runwayAverage3Month.isGreaterThan(0) ? runwayAverage3Month : totals.expense;
        }

        // --- INJECT DEBT OBLIGATIONS ---
        const totalDebtObligations = calculateTotalDebtObligations(currentDebts);
        burnRate = burnRate.plus(totalDebtObligations);

        // Averages for the Spending Comparison chart - relative to the browsed month, so
        // "This Month" and "Avg 3M/6M/1Y" are comparing the same point in time.
        const average6Month = Metrics.calculateBurnRate(currentTransactions, 6, today);
        const average1Year = Metrics.calculateBurnRate(currentTransactions, 12, today);
        const average3Month = Metrics.calculateBurnRate(currentTransactions, 3, today);

        const allTimeTotals = Metrics.calculateTotals(currentTransactions);

        // Calculate Transfers for Liquid Balance
        let totalTransferIn = new BigNumber(0);
        let totalTransferOut = new BigNumber(0);

        currentTransactions.forEach(t => {
            if (t.type === 'TRANSFER_IN') {
                totalTransferIn = totalTransferIn.plus(t.amount.abs());
            } else if (t.type === 'TRANSFER_OUT') {
                totalTransferOut = totalTransferOut.plus(t.amount.abs());
            }
        });

        // Current Balance = (Income + Transfer In) - (Expense + Transfer Out)
        const currentBalance = allTimeTotals.income.plus(totalTransferIn)
            .minus(allTimeTotals.expense.plus(totalTransferOut));

        // Budget Performance
        const budgets = await getAllBudgets();
        let budgetPerformance = new BigNumber(0);
        if (budgets.length > 0) {
            const specificCategoryBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', 'ITEM');
            const budgetedCategorySpent = specificCategoryBreakdown
                .filter(cat => budgets.some(b => b.category === cat.name))
                .reduce((sum, cat) => sum.plus(cat.amount), new BigNumber(0));

            const totalBudget = budgets.reduce((sum, b) => sum.plus(b.amount), new BigNumber(0));
            budgetPerformance = totalBudget.isGreaterThan(0)
                ? budgetedCategorySpent.div(totalBudget).times(100)
                : new BigNumber(0);
        }

        const specificBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', 'ITEM');

        setData({
            netCashFlow: totals.net,
            income: totals.income,
            expense: totals.expense,
            savingsRate: Metrics.calculateSavingsRate(totals.income, totals.expense),
            burnRate,
            incomeTrends: monthlyTrends,
            incomeBreakdown,
            expenseBreakdown,
            currentMonthExpense: totals.expense,
            lastMonthExpense: lastMonthTotals.expense,
            averageExpense: average3Month,
            average6Month,
            average1Year,
            anomalies: Metrics.detectAnomalies(currentMonthTrans, currentTransactions, budgets),
            currentBalance,
            budgetPerformance,
            topExpenseCategory: specificBreakdown[0] || { name: 'None', amount: new BigNumber(0), percentage: new BigNumber(0) },
            daysInMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
            dailyAverage: totals.expense.dividedBy(Math.max(1, (today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear()) ? today.getDate() : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()))
        });
    }, []);

    const fetchAllData = useCallback(async (isManualRefresh = false) => {
        if (!isManualRefresh) setIsLoading(true);
        try {
            const [profile, savedCardOrder, savedSectionOrder, allTransactions, allDebts] = await Promise.all([
                Storage.getUserProfile(),
                Storage.getInsightsCardOrder(),
                Storage.getInsightsSectionOrder(),
                getCachedTransactions(),
                getAllDebts(),
            ]);

            if (profile?.currency) setCurrency(profile.currency);

            if (savedCardOrder) {
                const validOrder = savedCardOrder.filter((id: string) => VALID_CARD_IDS.includes(id));
                if (validOrder.length > 0) setCardOrder(validOrder);
            }

            if (savedSectionOrder) {
                const validOrder = savedSectionOrder.filter((id: string) => VALID_SECTION_IDS.includes(id));
                if (validOrder.length > 0) setSectionOrder(validOrder);
            }

            // Fallback if getTransactions returns null/undefined (though likely it returns empty array)
            const safeTransactions = allTransactions || [];

            setTransactions(safeTransactions);
            setDebts(allDebts);
            // We pass variables directly here to bypass the React state update delay
            await calculateMetrics(safeTransactions, allDebts, expenseGrouping, selectedDate);
        } catch (error) {
            console.error("Error loading insights:", error);
        } finally {
            setIsLoading(false);
        }
    }, [calculateMetrics, expenseGrouping, selectedDate]);

    useFocusEffect(
        useCallback(() => {
            fetchAllData();
        }, [fetchAllData])
    );

    useFocusEffect(
        useCallback(() => {
            registerSecondAction({
                label: 'Screen Settings',
                icon: 'options-outline',
                onPress: () => setIsSettingsModalVisible(true),
            });
            return () => registerSecondAction(null);
        }, [registerSecondAction])
    );

    // Only re-calculate breakdown if grouping or date changes specifically
    useEffect(() => {
        if (transactions.length > 0) {
            calculateMetrics(transactions, debts, expenseGrouping, selectedDate);
        }
    }, [expenseGrouping, calculateMetrics, transactions, debts, selectedDate]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchAllData(true);
        setRefreshing(false);
    }, [fetchAllData]);

    return (
        <ScreenWrapper scrollable={false}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>Financial Insights</Text>
                </View>
                {isDocked && (
                    <>
                        <DraggableIconButton
                            onPress={togglePrivacy}
                            style={[
                                styles.iconButton,
                                { backgroundColor: colors.surface, marginRight: 10 }
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
                            onPress={() => setIsSettingsModalVisible(true)}
                        >
                            <Ionicons name="options-outline" size={20} color={colors.text} />
                        </DraggableIconButton>
                    </>
                )}
            </View>

            {/* Month Selector */}
            <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: colors.surface,
                marginHorizontal: 4,
                marginBottom: 15,
                borderRadius: 12,
                paddingVertical: 10,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
            }}>
                <TouchableOpacity
                    onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() - 1);
                        setSelectedDate(newDate);
                    }}
                    style={{ padding: 8 }}
                >
                    <Ionicons name="chevron-back" size={24} color={colors.primary} />
                </TouchableOpacity>

                <View style={{ flex: 1, alignItems: 'center' }}>
                    <TouchableOpacity
                        onPress={() => setIsDatePickerVisible(true)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}
                    >
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                            {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </Text>
                        <Ionicons name="calendar-outline" size={18} color={colors.primary} />
                    </TouchableOpacity>
                    {(selectedDate.getMonth() !== new Date().getMonth() || selectedDate.getFullYear() !== new Date().getFullYear()) && (
                        <TouchableOpacity
                            onPress={() => setSelectedDate(new Date())}
                            style={{ marginTop: 2 }}
                        >
                            <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '600' }}>Back to Today</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <TouchableOpacity
                    onPress={() => {
                        const newDate = new Date(selectedDate);
                        newDate.setMonth(newDate.getMonth() + 1);
                        setSelectedDate(newDate);
                    }}
                    disabled={selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()}
                    style={{ padding: 8, opacity: (selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear()) ? 0.3 : 1 }}
                >
                    <Ionicons name="chevron-forward" size={24} color={colors.primary} />
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
                                dailyAverage={data.dailyAverage}
                                cardOrder={cardOrder}
                                selectedDate={selectedDate}
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
                                selectedDate={selectedDate}
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
                                transactions={transactions}
                                isLoading={isLoading}
                                selectedDate={selectedDate}
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
                                selectedDate={selectedDate}
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
                                selectedDate={selectedDate}
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
                                currency={currency}
                                selectedDate={selectedDate}
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
            <InsightsSettingsModal
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
                cardsOrder={cardOrder}
                insightsOrder={sectionOrder}
                onUpdateCardsOrder={async (newOrder) => {
                    setCardOrder(newOrder);
                    await Storage.saveInsightsCardOrder(newOrder);
                }}
                onUpdateInsightsOrder={async (newOrder) => {
                    setSectionOrder(newOrder);
                    await Storage.saveInsightsSectionOrder(newOrder);
                }}
            />
            {/* Month/Year Picker Modal */}
            <BottomModal
                visible={isDatePickerVisible}
                onClose={() => setIsDatePickerVisible(false)}
                title="Select Month & Year"
                maxHeight="60%"
            >
                <View style={{ padding: 16 }}>
                    {/* Year Selector */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                        <TouchableOpacity
                            onPress={() => setPickerYear(prev => prev - 1)}
                            disabled={pickerYear <= availableRange.minYear}
                            style={{ padding: 10, opacity: pickerYear <= availableRange.minYear ? 0.2 : 1 }}
                        >
                            <Ionicons name="chevron-back" size={28} color={colors.primary} />
                        </TouchableOpacity>

                        <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text }}>{pickerYear}</Text>

                        <TouchableOpacity
                            onPress={() => setPickerYear(prev => prev + 1)}
                            disabled={pickerYear >= availableRange.maxYear}
                            style={{ padding: 10, opacity: pickerYear >= availableRange.maxYear ? 0.2 : 1 }}
                        >
                            <Ionicons name="chevron-forward" size={28} color={colors.primary} />
                        </TouchableOpacity>
                    </View>

                    {/* Months Grid */}
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' }}>
                        {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                            const isSelected = selectedDate.getMonth() === index && selectedDate.getFullYear() === pickerYear;
                            const isFuture = pickerYear > availableRange.maxYear || (pickerYear === availableRange.maxYear && index > availableRange.maxMonth);
                            const isBeforeStart = pickerYear < availableRange.minYear || (pickerYear === availableRange.minYear && index < availableRange.minMonth);
                            const isDisabled = isFuture || isBeforeStart;

                            return (
                                <TouchableOpacity
                                    key={month}
                                    onPress={() => {
                                        const newDate = new Date(selectedDate);
                                        newDate.setFullYear(pickerYear);
                                        newDate.setMonth(index);
                                        setSelectedDate(newDate);
                                        setIsDatePickerVisible(false);
                                    }}
                                    disabled={isDisabled}
                                    style={{
                                        width: '22%',
                                        paddingVertical: 14,
                                        borderRadius: 12,
                                        backgroundColor: isSelected ? colors.primary : colors.surface,
                                        borderWidth: 1,
                                        borderColor: isSelected ? colors.primary : colors.border,
                                        alignItems: 'center',
                                        opacity: isDisabled ? 0.15 : 1
                                    }}
                                >
                                    <Text style={{
                                        color: isSelected ? '#fff' : isDisabled ? colors.textSecondary : colors.text,
                                        fontWeight: isSelected ? 'bold' : '500',
                                        fontSize: 14
                                    }}>
                                        {month}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <View style={{ height: 20 }} />
                </View>
            </BottomModal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
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

export default InsightScreen;
