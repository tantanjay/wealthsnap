import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';

import { useTheme } from '@context/ThemeContext';
import { ScreenWrapper } from '@components/common/ScreenWrapper';
import BottomModal from '@components/common/BottomModal';
import { Card, Button } from '@components/index';
import { SavingsGoal, Transaction, RecurrenceRule, UserProfile } from '@types';
import * as Storage from '@services/core/storageService';
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
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { EXPENSE_CATEGORY_GROUPS } from '@constants/categories';
import { SavingsGoalForm } from '@components/savingsGoals/SavingsGoalForm';
import SavingsGoalOptionsModal from '@components/savingsGoals/SavingsGoalOptionsModal';
import SavingsGoalAmountModal from '@components/savingsGoals/SavingsGoalAmountModal';
import { SavingsGoalsInfoModal } from '@components/savingsGoals/SavingsGoalsInfoModal';

const SavingsGoalsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [goals, setGoals] = useState<SavingsGoal[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [recurrenceRules, setRecurrenceRules] = useState<RecurrenceRule[]>([]);

    const [formModalVisible, setFormModalVisible] = useState(false);
    const [editingGoal, setEditingGoal] = useState<SavingsGoal | undefined>(undefined);

    const [optionsGoal, setOptionsGoal] = useState<SavingsGoal | null>(null);
    const [amountModal, setAmountModal] = useState<{ mode: 'CONTRIBUTE' | 'WITHDRAW'; goal: SavingsGoal } | null>(null);
    const [infoModalVisible, setInfoModalVisible] = useState(false);

    const loadData = useCallback(async () => {
        const [p, t, gls, rules] = await Promise.all([
            Storage.getUserProfile(),
            getCachedTransactions(),
            getAllSavingsGoals(),
            getAllRecurrenceRules(),
        ]);
        setProfile(p);
        setTransactions(t);
        setGoals(gls);
        setRecurrenceRules(rules);
    }, []);

    useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

    const currency = profile?.currency || 'PHP';

    // Derived per-goal balance/progress/bucket, plus a total across all goals for the
    // summary header - pure derivation from goals/transactions, recomputed on every load.
    const { buckets, totalBalance } = useMemo(() => {
        const withDerived = goals.map(goal => {
            const balance = calculateGoalBalance(goal, transactions);
            const progress = calculateGoalProgress(goal.targetAmount, balance);
            const bucket = getGoalBucket(goal, balance);
            return { goal, balance, progress, bucket };
        });

        const grouped: Record<SavingsGoalBucket, typeof withDerived> = { ACTIVE: [], PAUSED: [], COMPLETED: [] };
        withDerived.forEach(item => grouped[item.bucket].push(item));

        const total = withDerived.reduce((sum, item) => sum.plus(item.balance), new BigNumber(0));
        return { buckets: grouped, totalBalance: total };
    }, [goals, transactions]);

    // O(1) lookup from a goal's recurrenceId to its rule, so cards can show "Next: <date>"
    // without re-scanning recurrenceRules per card.
    const recurrenceRulesById = useMemo(
        () => new Map(recurrenceRules.map(r => [r.id, r])),
        [recurrenceRules]
    );

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

    const handleWithdraw = (goal: SavingsGoal) => setAmountModal({ mode: 'WITHDRAW', goal });
    const handleAddFunds = (goal: SavingsGoal) => setAmountModal({ mode: 'CONTRIBUTE', goal });

    const handleAmountSubmit = async (amount: BigNumber) => {
        if (!amountModal) return;
        if (amountModal.mode === 'WITHDRAW') {
            await withdrawFromGoal(amountModal.goal, amount);
        } else {
            await contributeToGoal(amountModal.goal, amount, 'CONTRIBUTION', transactions);
        }
        await loadData();
    };

    // Mirrors BudgetManagementModal's getCategoryIcon - categories.ts has no shared lookup
    // helper of its own, every screen that needs a category's icon does this same scan.
    const getCategoryIcon = (categoryValue?: string): string => {
        if (!categoryValue) return 'ellipsis-horizontal';
        for (const group of EXPENSE_CATEGORY_GROUPS) {
            const cat = group.items.find(c => c.value === categoryValue);
            if (cat) return cat.icon;
        }
        return 'ellipsis-horizontal';
    };

    const renderGoalCard = (goal: SavingsGoal, balance: BigNumber, progress: number, bucket: SavingsGoalBucket) => {
        const fillPercent = Math.min(100, Math.max(0, progress));
        return (
            <Card key={goal.id} style={{ opacity: bucket === 'PAUSED' ? 0.7 : 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                        <View style={{
                            width: 30, height: 30, borderRadius: 15,
                            backgroundColor: colors.primary + '15',
                            justifyContent: 'center', alignItems: 'center',
                        }}>
                            <Ionicons name={getCategoryIcon(goal.category) as any} size={16} color={colors.primary} />
                        </View>
                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', flexShrink: 1 }} numberOfLines={1}>
                            {goal.name}
                        </Text>
                        {bucket === 'PAUSED' && <Ionicons name="pause-circle" size={16} color={colors.textSecondary} />}
                        {bucket === 'COMPLETED' && <Ionicons name="checkmark-circle" size={16} color={colors.success} />}
                    </View>
                    <TouchableOpacity onPress={() => setOptionsGoal(goal)} style={{ padding: 4 }}>
                        <Ionicons name="settings-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>

                <Text style={{ color: colors.text, fontSize: 22, fontWeight: 'bold' }}>
                    {formatCurrencyAmount(balance, currency)}
                    <Text style={{ color: colors.textSecondary, fontSize: 14, fontWeight: '400' }}>
                        {' '}/ {formatCurrencyAmount(goal.targetAmount, currency)}
                    </Text>
                </Text>

                <View style={{ height: 8, borderRadius: 4, backgroundColor: colors.border, marginTop: 10, overflow: 'hidden' }}>
                    <View style={{
                        height: '100%',
                        width: `${fillPercent}%`,
                        backgroundColor: bucket === 'COMPLETED' ? colors.success : colors.primary,
                        borderRadius: 4,
                    }} />
                </View>

                {goal.recurringAmount && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 8 }}>
                        {formatCurrencyAmount(goal.recurringAmount, currency)} / {goal.frequency?.toLowerCase()}
                        {goal.isPaused ? ' (paused)' : ''}
                        {!goal.isPaused && goal.recurrenceId && recurrenceRulesById.get(goal.recurrenceId) && (
                            ` · Next: ${new Date(recurrenceRulesById.get(goal.recurrenceId)!.nextDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                        )}
                    </Text>
                )}
            </Card>
        );
    };

    return (
        <ScreenWrapper scrollable={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={[styles.title, { color: colors.text }]}>Savings Goals</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Card style={{ backgroundColor: colors.primary }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text style={{ color: colors.white, opacity: 0.9 }}>Total Saved</Text>
                                <TouchableOpacity onPress={() => setInfoModalVisible(true)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                    <Ionicons name="information-circle-outline" size={16} color={colors.white} style={{ opacity: 0.9 }} />
                                </TouchableOpacity>
                            </View>
                            <Text style={{ color: colors.white, fontSize: 28, fontWeight: 'bold', marginTop: 4 }}>
                                {formatCurrencyAmount(totalBalance, currency)}
                            </Text>
                        </View>
                        <TouchableOpacity
                            onPress={handleAddNew}
                            style={{
                                backgroundColor: 'rgba(255,255,255,0.25)',
                                paddingVertical: 8,
                                paddingHorizontal: 12,
                                borderRadius: 10,
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 6,
                            }}
                        >
                            <Ionicons name="add-circle" size={20} color={colors.white} />
                            <Text style={{ color: colors.white, fontWeight: '700', fontSize: 13 }}>New Goal</Text>
                        </TouchableOpacity>
                    </View>
                </Card>

                {goals.length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 40 }}>
                        <Ionicons name="wallet-outline" size={48} color={colors.textSecondary} />
                        <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center', paddingHorizontal: 20 }}>
                            No savings goals yet. Create one to start earmarking cash for something specific.
                        </Text>
                        <Button title="New Savings Goal" onPress={handleAddNew} style={{ marginTop: 16 }} />
                    </View>
                )}

                {buckets.ACTIVE.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Active</Text>
                        {buckets.ACTIVE.map(({ goal, balance, progress, bucket }) => renderGoalCard(goal, balance, progress, bucket))}
                    </>
                )}

                {buckets.PAUSED.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Paused</Text>
                        {buckets.PAUSED.map(({ goal, balance, progress, bucket }) => renderGoalCard(goal, balance, progress, bucket))}
                    </>
                )}

                {buckets.COMPLETED.length > 0 && (
                    <>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed</Text>
                        {buckets.COMPLETED.map(({ goal, balance, progress, bucket }) => renderGoalCard(goal, balance, progress, bucket))}
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
                onWithdraw={handleWithdraw}
                onAddFunds={handleAddFunds}
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
        </ScreenWrapper>
    );
};

const styles = StyleSheet.create({
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    backButton: {
        marginRight: 15,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        flex: 1,
    },
    content: {
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 20,
        marginLeft: 4,
    },
});

export default SavingsGoalsScreen;
