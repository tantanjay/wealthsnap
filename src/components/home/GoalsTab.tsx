import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { EmptyState } from '@components/common/EmptyState';
import { Hero, ProgressBar, Row, SectionHeader, Tone } from '@components/ds';
import { SavingsGoalForm } from '@components/savingsGoals/SavingsGoalForm';
import SavingsGoalOptionsModal from '@components/savingsGoals/SavingsGoalOptionsModal';
import SavingsGoalAmountModal from '@components/savingsGoals/SavingsGoalAmountModal';
import { SavingsGoalsInfoModal } from '@components/savingsGoals/SavingsGoalsInfoModal';
import { useTheme } from '@context/ThemeContext';
import { PrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
import { space } from '@styles/theme';
import { RecurrenceRule, SavingsGoal, Transaction } from '@types';
import {
    getAllSavingsGoals,
    contributeToGoal,
    withdrawFromGoal,
    deleteGoalWithSweep,
    toggleGoalPause,
} from '@services/domain/savingsGoalService';
import { getCachedTransactions } from '@services/domain/transactionService';
import { getAllRecurrenceRules } from '@services/domain/recurrenceService';
import { calculateGoalBalance, calculateGoalProgress, getGoalBucket, SavingsGoalBucket } from '@utils/savingsGoalMetrics';
import { calculateGoalsSnapshot } from '@utils/snapshotMetrics';

interface GoalsTabProps {
    format: PrivacyFormat;
}

const BUCKET_ORDER: SavingsGoalBucket[] = ['ACTIVE', 'PAUSED', 'COMPLETED'];

// "On track" per docs/METRICS.md (Goals Progress / On Track): reached, or not paused with a recurring contribution.
const goalStatus = (goal: SavingsGoal, bucket: SavingsGoalBucket): { text: string; tone: Tone } => {
    if (bucket === 'COMPLETED') return { text: 'Reached', tone: 'good' };
    if (bucket === 'PAUSED') return { text: 'Paused', tone: 'neutral' };
    if (goal.recurringAmount && goal.frequency) return { text: 'On track', tone: 'good' };
    return { text: 'No recurring plan', tone: 'warning' };
};

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const GoalsTab: React.FC<GoalsTabProps> = ({ format: f }) => {
    const { ds } = useTheme();
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);

    const [formModalVisible, setFormModalVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);
    const [optionsGoal, setOptionsGoal] = useState<SavingsGoal | null>(null);
    const [amountModal, setAmountModal] = useState<{ mode: 'CONTRIBUTE' | 'WITHDRAW'; goal: SavingsGoal } | null>(null);
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [t, gls, rules] = await Promise.all([getCachedTransactions(), getAllSavingsGoals(), getAllRecurrenceRules()]);
            setTransactions(t);
            setGoals(gls);
            setRecurrenceRules(rules);
        } catch (error) {
            console.error('Failed to load goals:', error);
        } finally {
            setHasLoaded(true);
        }
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const summary = useMemo(() => calculateGoalsSnapshot(transactions, goals), [transactions, goals]);
    const recurrenceRulesById = useMemo(() => new Map(recurrenceRules.map(r => [r.id, r])), [recurrenceRules]);

    const rows = useMemo(() => goals
        .map(goal => {
            const balance = calculateGoalBalance(goal, transactions);
            return { goal, balance, progress: calculateGoalProgress(goal.targetAmount, balance), bucket: getGoalBucket(goal, balance) };
        })
        .sort((a, b) => BUCKET_ORDER.indexOf(a.bucket) - BUCKET_ORDER.indexOf(b.bucket)), [goals, transactions]);

    const handleAddNew = () => { setEditingGoal(undefined); setFormModalVisible(true); };
    const handleEdit = (goal: SavingsGoal) => { setEditingGoal(goal); setFormModalVisible(true); };
    const handleFormSaved = () => { setFormModalVisible(false); loadData(); };

    const handleDelete = async (id: string) => {
        const goal = goals.find(g => g.id === id);
        if (!goal) return;
        await deleteGoalWithSweep(goal, transactions);
        await loadData();
    };

    const handleTogglePause = async (goal: SavingsGoal) => {
        await toggleGoalPause(goal, recurrenceRules);
        await loadData();
    };

    const handleAmountSubmit = async (amount: BigNumber) => {
        if (!amountModal) return;
        if (amountModal.mode === 'WITHDRAW') {
            await withdrawFromGoal(amountModal.goal, amount);
        } else {
            await contributeToGoal(amountModal.goal, amount, 'CONTRIBUTION', transactions);
        }
        await loadData();
    };

    const recurringLine = (goal: SavingsGoal): string | undefined => {
        if (!goal.recurringAmount || !goal.frequency || goal.isPaused) return undefined;
        const rule = goal.recurrenceId ? recurrenceRulesById.get(goal.recurrenceId) : undefined;
        const freq = goal.frequency.charAt(0) + goal.frequency.slice(1).toLowerCase().replace('_', '-');
        return rule ? `${freq} · next ${shortDate(rule.nextDueDate)}` : freq;
    };

    const hero = () => {
        const funded = summary.fundableCount > 0 ? `${summary.fundedCount} of ${summary.fundableCount} funded` : 'all reached';
        if (f.isDiscreet) {
            return {
                label: 'Overall progress',
                value: formatPercent(summary.progressPercent),
                change: summary.fundableCount > 0 ? `${funded} this month` : 'All goals reached',
                changeTone: (summary.onPlan === null ? 'neutral' : summary.onPlan ? 'good' : 'warning') as Tone,
            };
        }
        const net = summary.monthNetContributed;
        return {
            label: 'Saved in goals',
            value: f.money(summary.total),
            change: `${f.money(net, { signed: true })} this month · ${funded}`,
            changeTone: (f.isHidden || net.isZero() ? 'neutral' : net.gt(0) ? 'good' : 'bad') as Tone,
        };
    };

    if (!hasLoaded) {
        return (
            <View style={styles.loading}>
                <ActivityIndicator size="large" color={ds.accent} />
            </View>
        );
    }

    const h = hero();

    return (
        <>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                {goals.length === 0 ? (
                    <EmptyState
                        icon="flag-outline"
                        title="No savings goals yet"
                        subtitle="Create a goal to start earmarking cash for something specific. Its progress shows up here."
                        ctaLabel="New goal"
                        onCtaPress={handleAddNew}
                    />
                ) : (
                    <>
                        <Hero
                            label={h.label}
                            value={h.value}
                            change={h.change}
                            changeTone={h.changeTone}
                            actionLabel="How it works"
                            onAction={() => setInfoModalVisible(true)}
                            style={styles.hero}
                        />

                        <SectionHeader title="Your goals" actionLabel="New goal" onAction={handleAddNew} />
                        {rows.map(({ goal, balance, progress, bucket }, i) => {
                            const status = goalStatus(goal, bucket);
                            return (
                                <Row
                                    key={goal.id}
                                    title={goal.name}
                                    subtitle={f.isDiscreet ? recurringLine(goal) : `${f.money(balance)} of ${f.money(goal.targetAmount)}`}
                                    value={formatPercent(Math.min(100, progress))}
                                    change={status.text}
                                    changeTone={status.tone}
                                    onPress={() => setOptionsGoal(goal)}
                                    last={i === rows.length - 1}
                                >
                                    <ProgressBar percent={progress} domain="goals" />
                                </Row>
                            );
                        })}
                    </>
                )}
            </ScrollView>

            <BottomModal visible={formModalVisible} onClose={() => setFormModalVisible(false)} maxHeight="90%">
                <SavingsGoalForm
                    initialGoal={editingGoal}
                    existingRule={editingGoal?.recurrenceId ? recurrenceRulesById.get(editingGoal.recurrenceId) : undefined}
                    existingTransactions={transactions}
                    onSave={handleFormSaved}
                    onCancel={() => setFormModalVisible(false)}
                />
            </BottomModal>

            <SavingsGoalOptionsModal
                visible={!!optionsGoal}
                onClose={() => setOptionsGoal(null)}
                goal={optionsGoal}
                balance={optionsGoal ? calculateGoalBalance(optionsGoal, transactions) : new BigNumber(0)}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePause={handleTogglePause}
                onWithdraw={goal => setAmountModal({ mode: 'WITHDRAW', goal })}
                onAddFunds={goal => setAmountModal({ mode: 'CONTRIBUTE', goal })}
            />

            {amountModal && (
                <SavingsGoalAmountModal
                    visible={!!amountModal}
                    onClose={() => setAmountModal(null)}
                    mode={amountModal.mode}
                    goalName={amountModal.goal.name}
                    maxAmount={amountModal.mode === 'WITHDRAW' ? calculateGoalBalance(amountModal.goal, transactions) : undefined}
                    onSubmit={handleAmountSubmit}
                />
            )}

            <SavingsGoalsInfoModal visible={infoModalVisible} onClose={() => setInfoModalVisible(false)} />
        </>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingHorizontal: space[5],
        paddingBottom: space[7],
    },
    hero: {
        paddingTop: space[5],
    },
    loading: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: space[7] * 2,
    },
});

export default GoalsTab;
