import React from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { ProgressBar, Row, Tone, toneColor } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { Budget } from '@types';
import { checkBudgetStatus } from '@services/domain/budgetService';
import { type, space, radius } from '@styles/theme';

interface AllExpensesModalProps {
    visible: boolean;
    onClose: () => void;
    categoryBreakdown: {
        name: string;
        amount: BigNumber;
        goalFundedAmount?: BigNumber;
        percentage: number;
    }[];
    budgets: Budget[];
    currency: string;
    onSelectCategory: (category: string) => void;
}

// Same slice colors as the spending pie in ExpenseAnalysis, so each dot maps to its slice.
const CHART_COLORS = [
    '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
    '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'
];

const budgetTone = (status: string): Exclude<Tone, 'neutral'> =>
    status === 'over' ? 'bad' : status === 'warning' ? 'warning' : 'good';

const AllExpensesModal: React.FC<AllExpensesModalProps> = ({
    visible,
    onClose,
    categoryBreakdown,
    budgets,
    currency,
    onSelectCategory
}) => {
    const { ds } = useTheme();
    const format = usePrivacyFormat(currency);

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title="All spending categories"
            subtitle="Full breakdown of your expenses"
        >
            <ScrollView showsVerticalScrollIndicator={false}>
                {categoryBreakdown.map((item, index) => {
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
                            leading={<View style={[styles.dot, { backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }]} />}
                            title={item.name}
                            subtitle={item.goalFundedAmount?.isGreaterThan(0)
                                ? `${format.show(format.money(item.goalFundedAmount, { compact: true }), formatPercent(goalShare))} from goals`
                                : undefined}
                            value={format.show(format.money(item.amount, { compact: true }), share)}
                            change={format.isDiscreet ? undefined : share}
                            chevron={!format.isHidden}
                            onPress={format.isHidden ? undefined : () => {
                                onSelectCategory(item.name);
                                onClose();
                            }}
                            last={index === categoryBreakdown.length - 1}
                        >
                            {budget && budgetStatus && (
                                <View style={styles.budget}>
                                    <View style={styles.budgetLine}>
                                        <Text style={[type.captionNum, { color: ds.text2 }]}>
                                            {format.show(`Budget ${format.money(budget.amount, { compact: true })}`, 'Budget')}
                                        </Text>
                                        <Text style={[type.captionNum, type.captionMedium,{ color: toneColor(ds, tone) }]}>
                                            {budgetStatus.percentage.toFixed(0)}%
                                        </Text>
                                    </View>
                                    <ProgressBar percent={budgetStatus.percentage} tone={tone} style={styles.bar} />
                                </View>
                            )}
                        </Row>
                    );
                })}
            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
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

export default AllExpensesModal;
