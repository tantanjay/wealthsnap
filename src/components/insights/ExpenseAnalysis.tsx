import React from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, StyleSheet } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

import AllExpensesModal from '@components/insights/modals/AllExpensesModal';
import CategoryTrendModal from '@components/insights/modals/CategoryTrendModal';
import RecurringExpensesSummaryModal from '@components/insights/modals/RecurringExpensesSummaryModal';
import { ProgressBar, Row, SectionHeader, Tone, toneColor } from '@components/ds';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Budget, RecurrenceRule, Transaction } from '@types';
import { type, space, radius } from '@styles/theme';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { checkBudgetStatus, getAllBudgets, } from '@services/domain/budgetService';

interface ExpenseAnalysisProps {
    categoryBreakdown: {
        name: string;
        amount: BigNumber;
        goalFundedAmount?: BigNumber;
        percentage: number;
    }[];
    currency: string;
    grouping: 'GROUP' | 'ITEM';
    onToggleGrouping: (grouping: 'GROUP' | 'ITEM') => void;
    transactions: Transaction[];
    isLoading?: boolean;
    selectedDate?: Date;
}

const PIE_HEIGHT = 160;

const GROUPINGS = [
    { key: 'GROUP', label: 'By group' },
    { key: 'ITEM', label: 'By item' },
];

const budgetTone = (status: string): Exclude<Tone, 'neutral'> =>
    status === 'over' ? 'bad' : status === 'warning' ? 'warning' : 'good';

// Hidden mode: same size, fill and copy as every other hidden chart.
const HiddenChart: React.FC<{ height: number }> = ({ height }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.hidden, { height, backgroundColor: ds.inset }]}>
            <Ionicons name="lock-closed-outline" size={18} color={ds.text2} />
            <Text style={[type.small, { color: ds.text2 }]}>Chart hidden for privacy</Text>
        </View>
    );
};

const ExpenseAnalysis: React.FC<ExpenseAnalysisProps> = ({ categoryBreakdown, currency, grouping, onToggleGrouping, transactions, isLoading = false, selectedDate = new Date() }) => {
    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);
    const [budgets, setBudgets] = React.useState<Budget[]>([]);
    const [recurrences, setRecurrences] = React.useState<RecurrenceRule[]>([]);
    const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
    const [showRecurringModal, setShowRecurringModal] = React.useState(false);
    const [showAllModal, setShowAllModal] = React.useState(false);

    const loadData = async () => {
        const [budgetsData, recurrenceData] = await Promise.all([
            getAllBudgets(),
            getAllRecurrenceRules()
        ]);
        setBudgets(budgetsData);
        setRecurrences(recurrenceData);
    };

    React.useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load on mount; see FIXES.md
        loadData();
    }, []);

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: BigNumber.isBigNumber(item.amount) ? item.amount.toNumber() : 0,
        // AllExpensesModal indexes ds.chart the same way, so its dots match these slices.
        color: ds.chart[index % ds.chart.length],
    }));

    const topCategory = categoryBreakdown[0];

    const sortedCategories = React.useMemo(() => {
        // budgets.amount is already BigNumber, so we just map it.
        const budgetMap = new Map(budgets.map(b => [b.category, b.amount]));

        return [...categoryBreakdown].sort((a, b) => {
            const budgetAmount = budgetMap.get(a.name);
            const targetBudgetAmount = budgetMap.get(b.name);

            // Both 'amount' and 'budgetAmount' are BigNumber objects
            // Goal-funded purchases were budgeted by their goal, not this category.
            const isOverA = budgetAmount ? a.amount.minus(a.goalFundedAmount ?? 0).isGreaterThan(budgetAmount) : false;
            const isOverB = targetBudgetAmount ? b.amount.minus(b.goalFundedAmount ?? 0).isGreaterThan(targetBudgetAmount) : false;

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

    const renderPie = () => {
        if (isLoading) return <Skeleton width="100%" height={PIE_HEIGHT} borderRadius={radius.md} />;
        if (format.isHidden) return <HiddenChart height={PIE_HEIGHT} />;
        if (pieData.length === 0) {
            return <Text style={[type.small, styles.empty, { color: ds.text2 }]}>No expense data available.</Text>;
        }

        const totalPopulation = pieData.reduce((acc, curr) => acc + curr.population, 0);
        return (
            <View style={styles.pie}>
                <View style={styles.pieChart}>
                    <PieChart
                        data={pieData.map(d => ({ value: d.population, color: d.color, text: '' }))}
                        radius={70}
                        donut
                        innerCircleColor={ds.bg}
                        innerRadius={40}
                        centerLabelComponent={() => (
                            <View style={styles.pieCenter}>
                                <Text style={[type.bodyNum, { color: ds.text }]}>{categoryBreakdown.length}</Text>
                                <Text style={[type.caption, { color: ds.text2 }]}>Categories</Text>
                            </View>
                        )}
                    />
                </View>

                {/* Shares are % of total, so the legend reads the same in every mode */}
                <View style={styles.pieLegend}>
                    {pieData.map((item, index) => (
                        <View key={index} style={styles.legendItem}>
                            <View style={[styles.dot, { backgroundColor: item.color }]} />
                            <Text style={[type.caption, styles.flex, { color: ds.text2 }]}>
                                {item.name} <Text style={[type.captionMedium, { color: ds.text }]}>({((item.population / totalPopulation) * 100).toFixed(0)}%)</Text>
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    const renderTopCategories = () => {
        if (isLoading) {
            return (
                <View style={styles.skeletonList}>
                    {[1, 2, 3].map(i => (
                        <View key={i} style={styles.skeletonRow}>
                            <Skeleton width={120} height={16} />
                            <Skeleton width={60} height={16} />
                        </View>
                    ))}
                </View>
            );
        }
        if (sortedCategories.length === 0) {
            return <Text style={[type.small, styles.empty, { color: ds.text2 }]}>No expense data available.</Text>;
        }

        const top = sortedCategories.slice(0, 3);
        return top.map((item, index) => {
            const budget = budgets.find(b => b.category === item.name);
            const budgetStatus = budget ? checkBudgetStatus(item.amount.minus(item.goalFundedAmount ?? 0), budget.amount) : null;
            const tone = budgetStatus ? budgetTone(budgetStatus.status) : 'good';
            const share = `${item.percentage.toFixed(1)}%`;
            // Discreet: the goal-funded part as % of the category.
            const goalShare = item.goalFundedAmount && item.amount.isGreaterThan(0)
                ? item.goalFundedAmount.dividedBy(item.amount).times(100).toNumber()
                : null;

            return (
                <Row
                    key={index}
                    // Rows are re-sorted by budget status; color by the pie's order so dots match slices.
                    leading={<View style={[styles.dot, { backgroundColor: ds.chart[categoryBreakdown.indexOf(item) % ds.chart.length] }]} />}
                    title={item.name}
                    subtitle={item.goalFundedAmount?.isGreaterThan(0)
                        ? `${format.show(format.money(item.goalFundedAmount, { compact: true }), formatPercent(goalShare))} from goals`
                        : undefined}
                    value={format.show(format.money(item.amount, { compact: true }), share)}
                    change={format.isDiscreet ? undefined : share}
                    chevron={!format.isHidden}
                    onPress={format.isHidden ? undefined : () => setSelectedCategory(item.name)}
                    last={index === top.length - 1 && !format.isOpen}
                >
                    {budget && budgetStatus && (
                        <View style={styles.budget}>
                            <View style={styles.budgetLine}>
                                <Text style={[type.captionNum, { color: ds.text2 }]}>
                                    {format.show(`Budget ${format.money(budget.amount, { compact: true })}`, 'Budget')}
                                </Text>
                                <Text style={[type.captionNum, type.captionMedium, { color: toneColor(ds, tone) }]}>
                                    {budgetStatus.percentage.toFixed(0)}%
                                </Text>
                            </View>
                            <ProgressBar percent={budgetStatus.percentage} tone={tone} style={styles.bar} />
                        </View>
                    )}
                </Row>
            );
        });
    };

    return (
        <View>
            <SectionHeader
                title="Expense analysis"
                menu={{ options: GROUPINGS, value: grouping, onSelect: key => onToggleGrouping(key as 'GROUP' | 'ITEM') }}
            />

            {topCategory && (
                isLoading ? (
                    <Skeleton width="90%" height={18} style={styles.subline} />
                ) : (
                    <Text style={[type.small, styles.subline, { color: ds.text2 }]}>
                        {`${topCategory.name} accounts for ${Math.round(topCategory.percentage)}% of your total expenses.`}
                    </Text>
                )
            )}

            {renderPie()}

            <SectionHeader
                title="Top spending categories"
                actionLabel={categoryBreakdown.length > 3 ? `See all ${categoryBreakdown.length}` : undefined}
                onAction={() => setShowAllModal(true)}
            />
            {renderTopCategories()}

            {/* The recurring summary lists amounts and isn't privacy-aware yet */}
            {format.isOpen && (
                <Row
                    icon="repeat-outline"
                    title="Recurring expenses"
                    chevron
                    onPress={() => setShowRecurringModal(true)}
                    last
                />
            )}

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
                onSelectCategory={setSelectedCategory}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    subline: {
        marginBottom: space[3],
    },
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    empty: {
        textAlign: 'center',
        paddingVertical: space[5],
    },
    pie: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pieChart: {
        flex: 6,
        alignItems: 'center',
    },
    pieCenter: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    pieLegend: {
        flex: 4,
        paddingLeft: space[2],
        gap: space[2],
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    flex: {
        flex: 1,
    },
    skeletonList: {
        gap: space[3],
        paddingVertical: space[3],
    },
    skeletonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    budget: {
        marginTop: space[2],
    },
    budgetLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    bar: {
        marginTop: space[1],
    },
});

export default ExpenseAnalysis;
