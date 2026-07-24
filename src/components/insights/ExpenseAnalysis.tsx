import React from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import AllExpensesModal from '@components/insights/modals/AllExpensesModal';
import CategoryTrendModal from '@components/insights/modals/CategoryTrendModal';
import RecurringExpensesSummaryModal from '@components/insights/modals/RecurringExpensesSummaryModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { Budget, RecurrenceRule, Transaction } from '@types';
import { formatCompactCurrency } from '@utils/currencyUtils';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { checkBudgetStatus, getAllBudgets, } from '@services/domain/budgetService';

interface ExpenseAnalysisProps {
    categoryBreakdown: {
        name: string;
        amount: BigNumber;
        percentage: number;
    }[];
    currency: string;
    isPrivacyEnabled: boolean;
    grouping: 'GROUP' | 'ITEM';
    onToggleGrouping: (grouping: 'GROUP' | 'ITEM') => void;
    transactions: Transaction[];
    isLoading?: boolean;
    selectedDate?: Date;
}

const ExpenseAnalysis: React.FC<ExpenseAnalysisProps> = ({ categoryBreakdown, currency, isPrivacyEnabled, grouping, onToggleGrouping, transactions, isLoading = false, selectedDate = new Date() }) => {
    const { colors } = useTheme();
    const [budgets, setBudgets] = React.useState<Budget[]>([]);
    const [recurrences, setRecurrences] = React.useState<RecurrenceRule[]>([]);
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [showRecurringModal, setShowRecurringModal] = React.useState(false);
    const [showAllModal, setShowAllModal] = React.useState(false);

    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [budgetsData, recurrenceData] = await Promise.all([
            getAllBudgets(),
            getAllRecurrenceRules()
        ]);
        setBudgets(budgetsData);
        setRecurrences(recurrenceData);
    };

    // Category colors
    const CHART_COLORS = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'
    ];

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: BigNumber.isBigNumber(item.amount) ? item.amount.toNumber() : 0,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12
    }));

    const topCategory = categoryBreakdown[0];

    const sortedCategories = React.useMemo(() => {
        // budgets.amount is already BigNumber, so we just map it.
        const budgetMap = new Map(budgets.map(b => [b.category, b.amount]));

        return [...categoryBreakdown].sort((a, b) => {
            const budgetAmount = budgetMap.get(a.name);
            const targetBudgetAmount = budgetMap.get(b.name);

            // Both 'amount' and 'budgetAmount' are BigNumber objects
            const isOverA = budgetAmount ? a.amount.isGreaterThan(budgetAmount) : false;
            const isOverB = targetBudgetAmount ? b.amount.isGreaterThan(targetBudgetAmount) : false;

            // 1. Priority: Over Budget
            if (isOverA && !isOverB) return -1;
            if (!isOverA && isOverB) return 1;

            // 2. Priority: Has Budget
            const hasBudgetA = budgetAmount !== undefined;
            const hasBudgetB = targetBudgetAmount !== undefined;

            if (hasBudgetA && !hasBudgetB) return -1;
            if (!hasBudgetA && hasBudgetB) return 1;

            // 3. Fallback: Amount Descending
            return b.amount.comparedTo(a.amount) ?? 0;
        });
    }, [categoryBreakdown, budgets]);

    return (
        <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Expense Analysis</Text>

                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                    {/* Recurring Expenses Button */}
                    {!isPrivacyEnabled && (
                        <TouchableOpacity
                            onPress={() => setShowRecurringModal(true)}
                            style={{
                                padding: 8,
                                backgroundColor: colors.primary + '20',
                                borderRadius: 8
                            }}
                        >
                            <Ionicons name="repeat" size={18} color={colors.primary} />
                        </TouchableOpacity>
                    )}

                    {/* Simple Toggle */}
                    <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: colors.border }}>
                        <TouchableOpacity
                            onPress={() => onToggleGrouping('GROUP')}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: grouping === 'GROUP' ? colors.primary : 'transparent' }}
                        >
                            <Text style={{ color: grouping === 'GROUP' ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>Group</Text>
                        </TouchableOpacity>
                        <View style={{ width: 1, backgroundColor: colors.border }} />
                        <TouchableOpacity
                            onPress={() => onToggleGrouping('ITEM')}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: grouping === 'ITEM' ? colors.primary : 'transparent' }}
                        >
                            <Text style={{ color: grouping === 'ITEM' ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>Item</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {topCategory && (
                <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                    <Text style={{ color: colors.text, flex: 1 }}>
                        {isLoading ? (
                            <Skeleton width="90%" height={20} />
                        ) : isPrivacyEnabled
                            ? "Expense insights hidden in privacy mode."
                            : `${topCategory.name} accounts for ${Math.round(topCategory.percentage)}% of your total expenses.`
                        }
                    </Text>
                </View>
            )}

            <Card style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Category Breakdown</Text>
                {!isPrivacyEnabled ? (
                    isLoading ? (
                        <View style={{ height: 220, padding: 10, justifyContent: 'center', alignItems: 'center' }}>
                            <Skeleton width={180} height={180} borderRadius={90} />
                        </View>
                    ) : pieData.length > 0 ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            {/* Chart Section */}
                            <View style={{ flex: 6, alignItems: 'center' }}>
                                <PieChart
                                    data={pieData.map(d => ({
                                        value: d.population,
                                        color: d.color,
                                        text: '', // No text inside slices, moving to legend
                                    }))}
                                    radius={70} // Reduced radius to fit side-by-side
                                    donut
                                    innerCircleColor={colors.surface}
                                    innerRadius={40}
                                    centerLabelComponent={() => {
                                        return (
                                            <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 16, color: colors.text, fontWeight: 'bold' }}>
                                                    {categoryBreakdown.length}
                                                </Text>
                                                <Text style={{ fontSize: 8, color: colors.textSecondary }}>Categories</Text>
                                            </View>
                                        );
                                    }}
                                />
                            </View>

                            {/* Legend (Ledger) Section - Right Side */}
                            <View style={{ flex: 4, paddingLeft: 10 }}>
                                <View style={{ gap: 8 }}>
                                    {pieData.map((item, index) => {
                                        const totalPopulation = pieData.reduce((acc, curr) => acc + curr.population, 0);
                                        const percentage = ((item.population / totalPopulation) * 100).toFixed(0);
                                        return (
                                            <View key={index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color, marginRight: 8, marginTop: 2 }} />
                                                <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }}>
                                                    {item.name} <Text style={{ fontWeight: 'bold', color: colors.text }}>({percentage}%)</Text>
                                                </Text>
                                            </View>
                                        );
                                    })}
                                </View>
                            </View>
                        </View>
                    ) : (
                        <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No expense data available.</Text>
                    )
                ) : (
                    <View style={{
                        height: 220,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.border + '20',
                        borderRadius: 16,
                        marginVertical: 8
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>🔒 Chart hidden for privacy</Text>
                    </View>
                )}
            </Card>

            <Card>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Top Spending Categories</Text>
                {/* Show only top 3 items statically */}
                {isLoading ? (
                    <View style={{ gap: 12 }}>
                        {[1, 2, 3].map(i => (
                            <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    <Skeleton width={30} height={30} borderRadius={15} />
                                    <Skeleton width={100} height={16} />
                                </View>
                                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                                    <Skeleton width={60} height={16} />
                                    <Skeleton width={40} height={12} />
                                </View>
                            </View>
                        ))}
                    </View>
                ) : sortedCategories.length === 0 ? (
                    <Text style={{ color: colors.textSecondary, paddingVertical: 10, textAlign: 'center' }}>
                        No expense data available.
                    </Text>
                ) : (
                    sortedCategories.slice(0, 3).map((item, index) => {
                        const budget = budgets.find(b => b.category === item.name);
                        const budgetStatus = budget ? checkBudgetStatus(item.amount, budget.amount) : null;

                        return (
                            <View key={index} style={{ marginBottom: 12 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CHART_COLORS[index % CHART_COLORS.length], marginRight: 10 }} />
                                        <Text style={{ color: colors.text, fontSize: 14 }}>{item.name}</Text>
                                    </View>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                        <View style={{ alignItems: 'flex-end' }}>
                                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                                                {isPrivacyEnabled ? '***' : formatCompactCurrency(item.amount, currency)}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.percentage.toFixed(1)}%</Text>
                                        </View>
                                        {!isPrivacyEnabled && (
                                            <TouchableOpacity
                                                onPress={() => setSelectedCategory(item.name)}
                                                style={{
                                                    padding: 6,
                                                    backgroundColor: colors.primary + '20',
                                                    borderRadius: 6
                                                }}
                                            >
                                                <Ionicons name="trending-up" size={16} color={colors.primary} />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>

                                {/* Budget Progress Bar */}
                                {budget && !isPrivacyEnabled && (
                                    <View style={{ marginTop: 4, paddingLeft: 20 }}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                            <Text style={{ fontSize: 10, color: colors.textSecondary }}>
                                                Budget: {formatCompactCurrency(budget.amount, currency)}
                                            </Text>
                                            <Text style={{
                                                fontSize: 10,
                                                color: budgetStatus!.status === 'over' ? '#F44336' : budgetStatus!.status === 'warning' ? '#FF9800' : '#4CAF50',
                                                fontWeight: '600'
                                            }}>
                                                {budgetStatus!.percentage.toFixed(0)}%
                                            </Text>
                                        </View>
                                        <View style={{ height: 4, backgroundColor: colors.surface, borderRadius: 2, overflow: 'hidden' }}>
                                            <View style={{
                                                height: '100%',
                                                width: `${Math.min(budgetStatus!.percentage, 100)}%`,
                                                backgroundColor: budgetStatus!.status === 'over' ? '#F44336' : budgetStatus!.status === 'warning' ? '#FF9800' : '#4CAF50'
                                            }} />
                                        </View>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}

                {/* View All Button */}
                {categoryBreakdown.length > 3 && (
                    <TouchableOpacity
                        onPress={() => setShowAllModal(true)}
                        style={{
                            marginTop: 8,
                            paddingVertical: 10,
                            alignItems: 'center',
                            borderTopWidth: 1,
                            borderTopColor: colors.border
                        }}
                    >
                        <Text style={{ color: colors.primary, fontWeight: '600' }}>
                            View All {categoryBreakdown.length} Categories
                        </Text>
                    </TouchableOpacity>
                )}
            </Card>

            {/* Category Trend Modal */}
            <CategoryTrendModal
                visible={selectedCategory !== null}
                onClose={() => setSelectedCategory(null)}
                category={selectedCategory || ''}
                transactions={transactions}
                currency={currency}
                grouping={grouping}
                selectedDate={selectedDate}
            />

            {/* Recurring Expenses Summary Modal */}
            <RecurringExpensesSummaryModal
                visible={showRecurringModal}
                onClose={() => setShowRecurringModal(false)}
                recurrences={recurrences}
                currency={currency}
            />

            <AllExpensesModal
                visible={showAllModal}
                onClose={() => setShowAllModal(false)}
                categoryBreakdown={sortedCategories}
                budgets={budgets}
                currency={currency}
                isPrivacyEnabled={isPrivacyEnabled}
                onSelectCategory={setSelectedCategory}
            />
        </View>
    );
};

export default ExpenseAnalysis;
