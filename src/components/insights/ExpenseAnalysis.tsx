import React from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components';
import { formatCurrencyAmount, formatCompactCurrency } from '../../utils/currencyUtils';
import { getBudgets, checkBudgetStatus, Budget } from '../../services/budgetService';
import CategoryTrendModal from '../modals/CategoryTrendModal';
import RecurringExpensesSummary from '../modals/RecurringExpensesSummary';
import { Ionicons } from '@expo/vector-icons';
import { Transaction } from '../../types';

interface ExpenseAnalysisProps {
    categoryBreakdown: {
        name: string;
        amount: number;
        percentage: number;
    }[];
    currency: string;
    isPrivacyEnabled: boolean;
    grouping: 'CATEGORY' | 'SUB_CATEGORY';
    onToggleGrouping: (grouping: 'CATEGORY' | 'SUB_CATEGORY') => void;
    transactions: Transaction[];
}

const ExpenseAnalysis: React.FC<ExpenseAnalysisProps> = ({ categoryBreakdown, currency, isPrivacyEnabled, grouping, onToggleGrouping, transactions }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const [budgets, setBudgets] = React.useState<Budget[]>([]);
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [showRecurringModal, setShowRecurringModal] = React.useState(false);

    React.useEffect(() => {
        loadBudgets();
    }, []);

    const loadBudgets = async () => {
        const data = await getBudgets();
        setBudgets(data);
    };

    // Fixed colors for categories to make it look decent
    const CHART_COLORS = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'
    ];

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: item.amount,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12
    }));

    const topCategory = categoryBreakdown[0];

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
                            onPress={() => onToggleGrouping('CATEGORY')}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: grouping === 'CATEGORY' ? colors.primary : 'transparent' }}
                        >
                            <Text style={{ color: grouping === 'CATEGORY' ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>Group</Text>
                        </TouchableOpacity>
                        <View style={{ width: 1, backgroundColor: colors.border }} />
                        <TouchableOpacity
                            onPress={() => onToggleGrouping('SUB_CATEGORY')}
                            style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: grouping === 'SUB_CATEGORY' ? colors.primary : 'transparent' }}
                        >
                            <Text style={{ color: grouping === 'SUB_CATEGORY' ? '#fff' : colors.text, fontSize: 12, fontWeight: '600' }}>Item</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {topCategory && (
                <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                    <Text style={{ color: colors.text, flex: 1 }}>
                        {isPrivacyEnabled
                            ? "Expense insights hidden in privacy mode."
                            : `${topCategory.name} accounts for ${Math.round(topCategory.percentage)}% of your total expenses.`
                        }
                    </Text>
                </View>
            )}

            <Card style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Category Breakdown</Text>
                {!isPrivacyEnabled ? (
                    pieData.length > 0 ? (
                        <PieChart
                            data={pieData}
                            width={screenWidth - 64}
                            height={220}
                            chartConfig={{
                                color: (opacity = 1) => colors.text,
                            }}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute={false}
                        />
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
                {categoryBreakdown.slice(0, 5).map((item, index) => {
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
                })}
            </Card>

            {/* Category Trend Modal */}
            <CategoryTrendModal
                visible={selectedCategory !== null}
                onClose={() => setSelectedCategory(null)}
                category={selectedCategory || ''}
                transactions={transactions}
                currency={currency}
            />

            {/* Recurring Expenses Summary Modal */}
            <RecurringExpensesSummary
                visible={showRecurringModal}
                onClose={() => setShowRecurringModal(false)}
                transactions={transactions}
                currency={currency}
            />
        </View>
    );
};

export default ExpenseAnalysis;
