import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, ScrollView, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';


import IncomeAnalysis from '@components/insights/IncomeAnalysis';
import ExpenseAnalysis from '@components/insights/ExpenseAnalysis';
import ComparisonChart from '@components/insights/ComparisonChart';
import SmartAlerts from '@components/insights/SmartAlerts';
import SavingsRateTrend from '@components/insights/SavingsRateTrend';
import CumulativeSpendingChart from '@components/insights/CumulativeSpendingChart';
import FinancialHealthGrid from '@components/insights/FinancialHealthGrid';
import FinancialHealthSheet, { HealthSheetTarget } from '@components/insights/FinancialHealthSheet';
import InsightsSettingsSheet, { InsightsSectionId, normalizeSectionOrder, DEFAULT_SECTION_ORDER } from '@components/insights/InsightsSettingsSheet';
import BudgetsSection, { BudgetLine } from '@components/insights/BudgetsSection';
import { buildHealthEntries, InsightsMonthData } from '@components/insights/financialHealthPool';
import { Row, SectionHeader } from '@components/ds';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useAIConsent } from '@hooks/useAIConsent';
import { useFinancialHealth } from '@hooks/useFinancialHealth';
import { usePrivacyFormat } from '@hooks/usePrivacyFormat';
import { type, space, radius } from '@styles/theme';
import { Transaction } from '@types';
import { getAllBudgets } from '@services/domain/budgetService';
import { getAllDebts } from '@services/domain/debtService';
import { getAllSavingsGoals } from '@services/domain/savingsGoalService';
import * as Metrics from '@utils/financialMetrics';
import * as Storage from '@services/core/storageService';
import { getCachedTransactions } from '@services/domain/transactionService';

const InsightScreen = ({ navigation }: any) => {
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    const { checkConsent } = useAIConsent();
    const [currency, setCurrency] = useState('PHP');
    const format = usePrivacyFormat(currency);
    const { data: health, load: loadHealth, scenario } = useFinancialHealth(format.isDiscreet);
    const [expenseGrouping, setExpenseGrouping] = useState<'GROUP' | 'ITEM'>('ITEM');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    const [grid, setGrid] = useState<Storage.HealthMetricId[]>(Storage.DEFAULT_HEALTH_GRID);
    const [sectionOrder, setSectionOrder] = useState<InsightsSectionId[]>(DEFAULT_SECTION_ORDER);
    const [healthSheet, setHealthSheet] = useState<HealthSheetTarget | null>(null);

    const [isSettingsModalVisible, setIsSettingsModalVisible] = useState(false);
    const [isDatePickerVisible, setIsDatePickerVisible] = useState(false);
    const [pickerYear, setPickerYear] = useState(new Date().getFullYear());

    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<import('@types').Debt[]>([]);
    const [goals, setGoals] = useState<import('@types').SavingsGoal[]>([]);

    const selectedYear = selectedDate.getFullYear();
    // Update picker year when selected date changes (for external sync)
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- resyncs picker default; see FIXES.md
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
        goalFundedExpense: new BigNumber(0),
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
        dailyAverage: new BigNumber(0),
        averageIncome: new BigNumber(0),
        burnAverageIncome: new BigNumber(0),
        hasBudgets: false,
        budgetLines: [] as BudgetLine[]
    });

    const calculateMetrics = useCallback(async (currentTransactions: Transaction[], currentDebts: import('@types').Debt[], currentGoals: import('@types').SavingsGoal[], grouping: 'GROUP' | 'ITEM', referenceDate: Date = new Date()) => {
        if (!currentTransactions || currentTransactions.length === 0) {
            setIsLoading(false);
            return;
        }

        const today = referenceDate;
        const currentMonthTrans = Metrics.getTransactionsByMonth(currentTransactions, today);
        const lastMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthTrans = Metrics.getTransactionsByMonth(currentTransactions, lastMonthDate);
        const currentMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59);

        // Core Totals
        const totals = Metrics.calculateTotals(currentMonthTrans);

        // Goal-excluded expense feeds every expense KPI, rate, and budget figure below; goal-funded
        // purchases are shown separately (Total Expense's "+ from goals" line, category breakdown).
        const nonGoalCurrentMonthTrans = currentMonthTrans.filter(t => !(t.type === 'EXPENSE' && t.savingsGoalId));
        const nonGoalCurrentMonthExpense = Metrics.calculateTotals(nonGoalCurrentMonthTrans).expense;
        const goalFundedExpense = totals.expense.minus(nonGoalCurrentMonthExpense);
        const nonGoalLastMonthExpense = Metrics.calculateTotals(
            lastMonthTrans.filter(t => !(t.type === 'EXPENSE' && t.savingsGoalId))
        ).expense;

        // Breakdowns & Trends
        const incomeBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'INCOME', 'ITEM'); // Income always by Item (specific source)
        const expenseBreakdown = Metrics.getCategoryBreakdown(currentMonthTrans, 'EXPENSE', grouping);
        const monthlyTrends = Metrics.getMonthlyTrends(currentTransactions, 6, today);

        // Runway/Burn Rate cards are always "as of today", since Runway is framed as "if your
        // income stopped today", regardless of which month is being browsed.
        const burnRate = Metrics.calculateMonthlyBurnRate(currentTransactions, currentDebts, currentGoals).total;

        const nonGoalTransactions = currentTransactions.filter(t => !t.savingsGoalId);

        // Averages for the Spending Comparison chart - relative to the browsed month, so
        // "This Month" and "Avg 3M/6M/1Y" are comparing the same point in time. Uses
        // nonGoalTransactions so a lump-sum goal purchase can't inflate these averages
        // either, consistent with currentMonthExpense/lastMonthExpense below excluding it
        // from the "This Month"/"Last Month" bars they're compared against.
        const average6Month = Metrics.calculateBurnRate(nonGoalTransactions, 6, today);
        const average1Year = Metrics.calculateBurnRate(nonGoalTransactions, 12, today);
        const average3Month = Metrics.calculateBurnRate(nonGoalTransactions, 3, today);

        const currentBalance = Metrics.calculateBalance(currentTransactions);

        // Budget Performance
        const budgets = await getAllBudgets();
        let budgetPerformance = new BigNumber(0);
        let budgetLines: BudgetLine[] = [];
        if (budgets.length > 0) {
            // A goal was the budget for its own purchases - they never count against a category budget.
            const specificCategoryBreakdown = Metrics.getCategoryBreakdown(nonGoalCurrentMonthTrans, 'EXPENSE', 'ITEM');
            budgetLines = budgets
                .filter(b => b.amount.gt(0))
                .map(b => {
                    const spent = specificCategoryBreakdown.find(cat => cat.name === b.category)?.amount ?? new BigNumber(0);
                    return { category: b.category, spent, budget: b.amount, percent: spent.div(b.amount).times(100).toNumber() };
                })
                .sort((a, b) => b.percent - a.percent);
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
            // totals.net (income - expense) ignores TRANSFER_IN/OUT entirely, so a goal
            // contribution or spend would swing it even though real liquid cash didn't move
            // (the Auto-Offset pair nets to ₱0). calculateBalance nets transfers correctly.
            netCashFlow: Metrics.calculateBalance(currentMonthTrans, currentMonthEnd),
            income: totals.income,
            expense: nonGoalCurrentMonthExpense,
            goalFundedExpense,
            // Debt principal repaid counts as spent - same formula as the Savings Rate Trend chart.
            savingsRate: Metrics.calculateSavingsRate(totals.income, nonGoalCurrentMonthExpense.plus(Metrics.calculateDebtPrincipalRepaid(currentMonthTrans))),
            burnRate,
            incomeTrends: monthlyTrends,
            incomeBreakdown,
            expenseBreakdown,
            currentMonthExpense: nonGoalCurrentMonthExpense,
            lastMonthExpense: nonGoalLastMonthExpense,
            averageExpense: average3Month,
            average6Month,
            average1Year,
            anomalies: Metrics.detectAnomalies(currentMonthTrans, currentTransactions, budgets, currentDebts, currentGoals),
            currentBalance,
            budgetPerformance,
            topExpenseCategory: specificBreakdown[0] || { name: 'None', amount: new BigNumber(0), percentage: new BigNumber(0) },
            daysInMonth: new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate(),
            // Avg Daily Spending - goal-excluded, same reasoning as currentMonthExpense above.
            dailyAverage: nonGoalCurrentMonthExpense.dividedBy(Math.max(1, (today.getMonth() === new Date().getMonth() && today.getFullYear() === new Date().getFullYear()) ? today.getDate() : new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate())),
            // Discreet comparisons (docs/METRICS.md, Financial Health grid). Burn rate's is as of today, like Burn rate itself.
            averageIncome: Metrics.calculateAverageIncome(currentTransactions, 6, today),
            burnAverageIncome: Metrics.calculateAverageIncome(currentTransactions, 6),
            hasBudgets: budgets.length > 0,
            budgetLines
        });
    }, []);

    // Read through refs so browsing months or regrouping doesn't re-run the focus fetch (and Financial Health's reload);
    // the effect below recalculates for those.
    const viewRef = useRef({ selectedDate, expenseGrouping });
    useEffect(() => { viewRef.current = { selectedDate, expenseGrouping }; }, [selectedDate, expenseGrouping]);

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [profile, savedGrid, savedSectionOrder, allTransactions, allDebts, allGoals] = await Promise.all([
                Storage.getUserProfile(),
                Storage.getHealthGrid(),
                Storage.getInsightsSectionOrder(),
                getCachedTransactions(),
                getAllDebts(),
                getAllSavingsGoals(),
            ]);

            if (profile?.currency) setCurrency(profile.currency);

            setGrid(savedGrid);
            setSectionOrder(normalizeSectionOrder(savedSectionOrder));
            loadHealth();

            // Fallback if getTransactions returns null/undefined (though likely it returns empty array)
            const safeTransactions = allTransactions || [];

            setTransactions(safeTransactions);
            setDebts(allDebts);
            setGoals(allGoals);
            // We pass variables directly here to bypass the React state update delay
            await calculateMetrics(safeTransactions, allDebts, allGoals, viewRef.current.expenseGrouping, viewRef.current.selectedDate);
        } catch (error) {
            console.error("Error loading insights:", error);
        } finally {
            setIsLoading(false);
        }
    }, [calculateMetrics, loadHealth]);

    useFocusEffect(
        useCallback(() => {
            fetchAllData();
        }, [fetchAllData])
    );

    // Only re-calculate breakdown if grouping or date changes specifically
    useEffect(() => {
        if (transactions.length > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- calculateMetrics does a real await getAllBudgets() call, not a pure computation; see FIXES.md
            calculateMetrics(transactions, debts, goals, expenseGrouping, selectedDate);
        }
    }, [expenseGrouping, calculateMetrics, transactions, debts, goals, selectedDate]);

    const isCurrentMonth = selectedDate.getMonth() === new Date().getMonth() && selectedDate.getFullYear() === new Date().getFullYear();
    const shortMonth = selectedDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });

    const monthData: InsightsMonthData = useMemo(() => ({
        monthLabel: isCurrentMonth ? 'this month' : shortMonth,
        netCashFlow: data.netCashFlow,
        income: data.income,
        expense: data.expense,
        goalFundedExpense: data.goalFundedExpense,
        savingsRate: data.savingsRate,
        averageIncome: data.averageIncome,
        averageExpense: data.averageExpense,
        dailyAverage: data.dailyAverage,
        burnRate: data.burnRate,
        burnAverageIncome: data.burnAverageIncome,
        hasBudgets: data.hasBudgets,
        budgetPerformance: data.budgetPerformance,
        topExpenseCategory: data.topExpenseCategory,
    }), [data, isCurrentMonth, shortMonth]);

    const entries = useMemo(() => buildHealthEntries(monthData, health, format), [monthData, health, format]);

    const changeGrid = (next: Storage.HealthMetricId[]) => {
        setGrid(next);
        Storage.saveHealthGrid(next);
    };

    const changeSectionOrder = (next: InsightsSectionId[]) => {
        setSectionOrder(next);
        Storage.saveInsightsSectionOrder(next);
    };

    const openChat = () => checkConsent(() => navigation.navigate('Chat'));

    const sections: Record<InsightsSectionId, React.ReactNode> = {
        cumulative: (
            <CumulativeSpendingChart
                transactions={transactions}
                currency={currency}
                isLoading={isLoading}
                selectedDate={selectedDate}
            />
        ),
        comparison: (
            <ComparisonChart
                currentMonthExpense={data.currentMonthExpense}
                lastMonthExpense={data.lastMonthExpense}
                averageExpense={data.averageExpense}
                average6Month={data.average6Month}
                average1Year={data.average1Year}
                currency={currency}
                transactions={transactions}
                isLoading={isLoading}
                selectedDate={selectedDate}
            />
        ),
        expense: (
            <ExpenseAnalysis
                categoryBreakdown={data.expenseBreakdown}
                currency={currency}
                grouping={expenseGrouping}
                onToggleGrouping={setExpenseGrouping}
                transactions={transactions}
                isLoading={isLoading}
                selectedDate={selectedDate}
            />
        ),
        income: (
            <IncomeAnalysis
                monthlyTrends={data.incomeTrends}
                categoryBreakdown={data.incomeBreakdown}
                currency={currency}
                transactions={transactions}
                isLoading={isLoading}
                selectedDate={selectedDate}
            />
        ),
        savings: (
            <SavingsRateTrend
                transactions={transactions}
                isLoading={isLoading}
                currency={currency}
                selectedDate={selectedDate}
            />
        ),
        budgets: (
            <BudgetsSection
                lines={data.budgetLines}
                monthLabel={isCurrentMonth ? selectedDate.toLocaleDateString('en-US', { month: 'long' }) : shortMonth}
                format={format}
            />
        ),
        alerts: <SmartAlerts anomalies={data.anomalies} hasHistory={transactions.length > 10} />,
    };

    const settingsIcon = <Ionicons name="options-outline" size={22} color={ds.text2} />;

    return (
        <ScreenWrapper scrollable={false} noPadding style={{ backgroundColor: ds.bg }}>
            <View style={styles.topBar}>
                <Text style={[type.title, styles.title, { color: ds.text }]} numberOfLines={1}>Insights</Text>
                <View style={styles.actions}>
                    {mode !== 'open' && (
                        <View style={[styles.chip, { backgroundColor: ds.inset }]}>
                            <Text style={[type.captionMedium, { color: ds.text2 }]}>{mode === 'discreet' ? 'Discreet' : 'Hidden'}</Text>
                        </View>
                    )}
                    <Pressable onPress={() => setIsSettingsModalVisible(true)} style={styles.iconButton} accessibilityLabel="Insights settings" hitSlop={space[2]}>
                        {settingsIcon}
                    </Pressable>
                </View>
            </View>

            {/* Month selector: the month-based numbers and sections follow it; Financial Health's four are as of today. */}
            <View style={styles.monthBar}>
                <Pressable
                    onPress={() => {
                        // Day pinned to 1: setMonth() from the 29th-31st overflows into the wrong month.
                        setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
                    }}
                    accessibilityLabel="Previous month"
                    hitSlop={space[2]}
                    style={styles.monthArrow}
                >
                    <Ionicons name="chevron-back" size={18} color={ds.accent} />
                </Pressable>
                <Pressable onPress={() => setIsDatePickerVisible(true)} style={styles.monthLabel} accessibilityLabel="Pick a month">
                    <Text style={[type.smallStrong, { color: ds.text }]}>
                        {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={ds.text2} />
                </Pressable>
                {!isCurrentMonth && (
                    <Pressable onPress={() => setSelectedDate(new Date())} hitSlop={space[2]}>
                        <Text style={[type.smallMedium, { color: ds.accent }]}>Today</Text>
                    </Pressable>
                )}
                <Pressable
                    onPress={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))}
                    disabled={isCurrentMonth}
                    accessibilityLabel="Next month"
                    hitSlop={space[2]}
                    style={[styles.monthArrow, isCurrentMonth && styles.disabled]}
                >
                    <Ionicons name="chevron-forward" size={18} color={ds.accent} />
                </Pressable>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.content}
            >
                <FinancialHealthGrid
                    grid={grid}
                    entries={entries}
                    isHidden={format.isHidden}
                    onShowAll={() => setHealthSheet('all')}
                    onSelect={setHealthSheet}
                    onOpenSettings={() => setIsSettingsModalVisible(true)}
                />

                <View style={styles.sections}>
                    {sectionOrder.map(id => <React.Fragment key={id}>{sections[id]}</React.Fragment>)}
                </View>

                <SectionHeader title="Ask" />
                <Row
                    title="Ask about your money"
                    subtitle="Chat with WealthSnap AI"
                    leading={<Ionicons name="sparkles-outline" size={20} color={ds.accent} />}
                    chevron
                    last
                    onPress={openChat}
                />
            </ScrollView>

            <FinancialHealthSheet
                target={healthSheet}
                onClose={() => setHealthSheet(null)}
                onSelect={setHealthSheet}
                entries={entries}
                grid={grid}
                health={health}
                scenario={scenario}
                format={format}
            />

            <InsightsSettingsSheet
                visible={isSettingsModalVisible}
                onClose={() => setIsSettingsModalVisible(false)}
                grid={grid}
                onChangeGrid={changeGrid}
                sectionOrder={sectionOrder}
                onChangeSectionOrder={changeSectionOrder}
            />
            {/* Month/Year Picker Modal */}
            <BottomModal
                visible={isDatePickerVisible}
                onClose={() => setIsDatePickerVisible(false)}
                title="Select month and year"
                maxHeight="60%"
            >
                <View style={styles.yearRow}>
                    <Pressable
                        onPress={() => setPickerYear(prev => prev - 1)}
                        disabled={pickerYear <= availableRange.minYear}
                        accessibilityLabel="Previous year"
                        hitSlop={space[2]}
                        style={styles.monthArrow}
                    >
                        <Ionicons name="chevron-back" size={22} color={pickerYear <= availableRange.minYear ? ds.text3 : ds.accent} />
                    </Pressable>
                    <Text style={[type.titleNum, { color: ds.text }]}>{pickerYear}</Text>
                    <Pressable
                        onPress={() => setPickerYear(prev => prev + 1)}
                        disabled={pickerYear >= availableRange.maxYear}
                        accessibilityLabel="Next year"
                        hitSlop={space[2]}
                        style={styles.monthArrow}
                    >
                        <Ionicons name="chevron-forward" size={22} color={pickerYear >= availableRange.maxYear ? ds.text3 : ds.accent} />
                    </Pressable>
                </View>

                <View style={styles.monthGrid}>
                    {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, index) => {
                        const isSelected = selectedDate.getMonth() === index && selectedDate.getFullYear() === pickerYear;
                        const isFuture = pickerYear > availableRange.maxYear || (pickerYear === availableRange.maxYear && index > availableRange.maxMonth);
                        const isBeforeStart = pickerYear < availableRange.minYear || (pickerYear === availableRange.minYear && index < availableRange.minMonth);
                        const isDisabled = isFuture || isBeforeStart;

                        return (
                            <Pressable
                                key={month}
                                onPress={() => {
                                    setSelectedDate(new Date(pickerYear, index, 1));
                                    setIsDatePickerVisible(false);
                                }}
                                disabled={isDisabled}
                                style={[styles.monthCell, { backgroundColor: isSelected ? ds.accent : ds.inset }]}
                            >
                                <Text style={[isSelected ? type.bodyStrong : type.body, { color: isSelected ? ds.onAccent : isDisabled ? ds.text3 : ds.text }]}>
                                    {month}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </BottomModal>
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        paddingTop: space[1],
        paddingBottom: space[2],
        paddingHorizontal: space[5],
    },
    title: {
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    chip: {
        paddingVertical: 3,
        paddingHorizontal: space[2],
        borderRadius: radius.sm,
    },
    iconButton: {
        padding: space[1],
    },
    monthBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingHorizontal: space[5],
        paddingBottom: space[2],
    },
    monthArrow: {
        padding: space[1],
    },
    monthLabel: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
    },
    disabled: {
        opacity: 0.3,
    },
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    sections: {
        marginTop: space[6],
    },
    yearRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: space[4],
    },
    monthGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[3],
        justifyContent: 'center',
    },
    monthCell: {
        width: '22%',
        paddingVertical: space[3],
        borderRadius: radius.md,
        alignItems: 'center',
    },
});

export default InsightScreen;
