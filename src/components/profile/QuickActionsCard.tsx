import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { Group, Row, SectionHeader } from '@components/ds';
import { getAllBudgets } from '@services/domain/budgetService';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { getAllReminders } from '@services/domain/reminderService';

interface QuickActionsCardProps {
    onAssetsPress: () => void;
    onRecurringPress: () => void;
    onBudgetPress: () => void;
    onRemindersPress: () => void;
    // Bumped when one of the opened modals closes, so the counts refresh.
    refreshSignal?: number;
}

const countLabel = (n: number, noun: string) => (n === 0 ? 'None set' : `${n} ${noun}`);

// Profile → Money setup.
const QuickActionsCard: React.FC<QuickActionsCardProps> = ({
    onAssetsPress,
    onRecurringPress,
    onBudgetPress,
    onRemindersPress,
    refreshSignal,
}) => {
    const [counts, setCounts] = useState<{ budgets: number; rules: number; reminders: number } | null>(null);

    const loadCounts = useCallback(async () => {
        try {
            const [budgets, rules, reminders] = await Promise.all([getAllBudgets(), getAllRecurrenceRules(), getAllReminders()]);
            setCounts({
                budgets: budgets.length,
                // Goal auto-contributions are managed from the goal, not the Recurring rules list.
                rules: rules.filter(r => r.isActive && !r.transactionTemplate?.savingsGoalId).length,
                reminders: reminders.filter(r => r.isActive).length,
            });
        } catch (error) {
            console.error('Failed to load money setup counts:', error);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            loadCounts();
        }, [loadCounts])
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- async storage read after a modal closes
        if (refreshSignal) loadCounts();
    }, [refreshSignal, loadCounts]);

    return (
        <>
            <SectionHeader grouped title="Money setup" />
            <Group>
                <Row
                    icon="pie-chart-outline"
                    title="Budgets"
                    subtitle={counts ? countLabel(counts.budgets, counts.budgets === 1 ? 'category budgeted' : 'categories budgeted') : undefined}
                    chevron
                    onPress={onBudgetPress}
                />
                <Row
                    icon="repeat-outline"
                    title="Recurring rules"
                    subtitle={counts ? countLabel(counts.rules, 'active') : undefined}
                    chevron
                    onPress={onRecurringPress}
                />
                <Row
                    icon="notifications-outline"
                    title="Reminders"
                    subtitle={counts ? countLabel(counts.reminders, 'active') : undefined}
                    chevron
                    onPress={onRemindersPress}
                />
                <Row
                    icon="list-outline"
                    title="Asset dictionary"
                    subtitle="Manage asset definitions"
                    chevron
                    onPress={onAssetsPress}
                    last
                />
            </Group>
        </>
    );
};

export default QuickActionsCard;
