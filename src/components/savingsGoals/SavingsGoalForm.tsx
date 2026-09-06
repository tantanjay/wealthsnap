import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '@components/index';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { SavingsGoal, Transaction, RecurrenceRule, RecurrenceFrequency } from '@types';
import { generateUUID } from '@utils/uuid';
import { EXPENSE_CATEGORY_GROUPS, RECURRENCE_OPTIONS } from '@constants/categories';
import { saveSavingsGoal, contributeToGoal } from '@services/domain/savingsGoalService';
import { saveRecurrenceRule, deleteRecurrenceRule, calculateNextDueDate } from '@services/domain/recurrenceService';

interface SavingsGoalFormProps {
    initialGoal?: SavingsGoal;
    existingRule?: RecurrenceRule; // the goal's current auto-contribution rule, if any - lets
    // save() tell "still the same schedule" apart from "just turned recurring on/changed it"
    existingTransactions: Transaction[]; // needed for contributeToGoal's balance-before check
    onSave: () => void;
    onCancel: () => void;
}

export const SavingsGoalForm: React.FC<SavingsGoalFormProps> = ({ initialGoal, existingRule, existingTransactions, onSave, onCancel }) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    const [name, setName] = useState(initialGoal?.name || '');
    const [targetAmount, setTargetAmount] = useState(initialGoal?.targetAmount?.toString() || '');
    const [category, setCategory] = useState(initialGoal?.category || '');
    const [subCategory, setSubCategory] = useState(initialGoal?.subCategory || '');
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [notes, setNotes] = useState(initialGoal?.notes || '');

    const [recurringAmount, setRecurringAmount] = useState(initialGoal?.recurringAmount?.toString() || '');
    const [frequency, setFrequency] = useState<string>(initialGoal?.frequency || 'NONE');

    // Initial Funding (Ramp Up) - creation only, mirrors DebtForm's "money already moved"
    // flow but simpler: creating a goal never itself moves money, only this explicit field does.
    const [initialContribution, setInitialContribution] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    // Preview of when the first/next auto-contribution will actually fire, shown so the
    // user isn't left guessing - mirrors the same "existing schedule vs. new/changed
    // schedule" branch handleSave uses when it actually builds the rule.
    const nextDuePreview = frequency !== 'NONE'
        ? (existingRule && existingRule.frequency === frequency
            ? new Date(existingRule.nextDueDate)
            : calculateNextDueDate(new Date(), frequency as RecurrenceFrequency))
        : null;

    const handleSave = async () => {
        if (!name.trim() || !targetAmount || !category) {
            showAlert('Missing Info', 'Please enter a name, target amount, and category.');
            return;
        }

        const parsedTarget = new BigNumber(targetAmount);
        if (parsedTarget.isNaN() || parsedTarget.isLessThanOrEqualTo(0)) {
            showAlert('Invalid Amount', 'Target amount must be greater than zero.');
            return;
        }

        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const goalId = initialGoal?.id || generateUUID();
            let recurrenceId = initialGoal?.recurrenceId;

            const wantsRecurring = frequency !== 'NONE' && !!recurringAmount;
            const parsedRecurring = wantsRecurring ? new BigNumber(recurringAmount) : undefined;

            if (wantsRecurring && parsedRecurring) {
                // Keep the existing schedule (startDate/nextDueDate) untouched when nothing
                // that affects timing changed - only the contribution amount/category, say.
                // Otherwise (brand new rule, or the frequency itself changed) the first
                // contribution is due one full period from today, not today: a rule with
                // nextDueDate === now would fire immediately on the very next
                // processRecurrenceRules() pass (e.g. next time Home loads), which reads as
                // an unwanted instant auto-contribution the moment the goal is created.
                const scheduleUnchanged = !!existingRule && existingRule.frequency === frequency;
                const startDate = scheduleUnchanged ? (existingRule.startDate || now) : now;
                const nextDueDate = scheduleUnchanged
                    ? existingRule.nextDueDate
                    : calculateNextDueDate(new Date(now), frequency as RecurrenceFrequency).toISOString();

                const rule: RecurrenceRule = {
                    id: recurrenceId || generateUUID(),
                    name: `Savings Goal: ${name.trim()}`,
                    frequency: frequency as RecurrenceFrequency,
                    startDate,
                    nextDueDate,
                    transactionTemplate: {
                        type: 'TRANSFER_OUT',
                        amount: parsedRecurring,
                        category,
                        subCategory: 'CONTRIBUTION',
                        transferAccount: 'SAVINGS_GOAL',
                        savingsGoalId: goalId,
                    },
                    isActive: !initialGoal?.isPaused,
                };
                await saveRecurrenceRule(rule);
                recurrenceId = rule.id;
            } else if (recurrenceId) {
                // User turned recurring off on an existing goal - remove the now-stale rule.
                await deleteRecurrenceRule(recurrenceId);
                recurrenceId = undefined;
            }

            const goal: SavingsGoal = {
                id: goalId,
                name: name.trim(),
                targetAmount: parsedTarget,
                recurringAmount: parsedRecurring,
                frequency: wantsRecurring ? (frequency as RecurrenceFrequency) : undefined,
                category,
                subCategory: subCategory || undefined,
                isPaused: initialGoal?.isPaused || false,
                recurrenceId,
                currency: initialGoal?.currency,
                notes: notes || undefined,
                goalReachedNotifiedAt: initialGoal?.goalReachedNotifiedAt,
                createdAt: initialGoal?.createdAt || now,
                updatedAt: now,
            };
            await saveSavingsGoal(goal);

            if (!initialGoal && initialContribution) {
                const parsedInitial = new BigNumber(initialContribution);
                if (!parsedInitial.isNaN() && parsedInitial.isGreaterThan(0)) {
                    await contributeToGoal(goal, parsedInitial, 'INITIAL_FUNDING', existingTransactions);
                }
            }

            onSave();
        } catch (error) {
            console.error('Error saving savings goal:', error);
            showAlert('Error', 'Failed to save savings goal.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        // height: '100%' (not flex: 1) - this form is hosted inside BottomModal, which sizes
        // itself to content rather than providing a bounded flex context, so a flex:1 root
        // here collapses to ~0 height instead of expanding. See BudgetManagementModal.tsx for
        // the same pattern.
        <View style={{ height: '100%' }}>
            <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>
                    {initialGoal ? 'Edit Savings Goal' : 'New Savings Goal'}
                </Text>

                <Card>
                    <Text style={{ color: colors.textSecondary }}>Name</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 18, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={name}
                        onChangeText={setName}
                        placeholder="e.g. Travel Fund"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                <Card>
                    <Text style={{ color: colors.textSecondary }}>Target Amount</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 32, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.gray300}
                    />
                </Card>

                <View style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>Category</Text>
                    <TouchableOpacity
                        onPress={() => setShowCategoryModal(true)}
                        style={{
                            padding: 14,
                            borderRadius: 12,
                            backgroundColor: colors.surface,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <Text style={{ color: category ? colors.text : colors.gray500, fontSize: 15 }}>
                            {category || 'Select a category'}
                        </Text>
                        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
                    </TouchableOpacity>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, marginLeft: 4 }}>
                        Pre-fills onto any expense you fund from this goal (still editable per-expense).
                    </Text>
                </View>

                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Recurring Auto-Contribution (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 20, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8, marginBottom: 10 }}
                        value={recurringAmount}
                        onChangeText={setRecurringAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.gray300}
                    />
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
                        {RECURRENCE_OPTIONS.map((opt) => {
                            const isActive = frequency === opt.value;
                            return (
                                <TouchableOpacity
                                    key={opt.value}
                                    onPress={() => setFrequency(opt.value)}
                                    style={{
                                        paddingVertical: 8,
                                        paddingHorizontal: 12,
                                        borderRadius: 10,
                                        borderWidth: 1.5,
                                        borderColor: isActive ? colors.primary : 'transparent',
                                        backgroundColor: isActive ? colors.primary + '15' : colors.background,
                                    }}
                                >
                                    <Text style={{ color: isActive ? colors.primary : colors.text, fontSize: 12, fontWeight: isActive ? '700' : '500' }}>
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>
                    {nextDuePreview && (
                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 10 }}>
                            Next contribution: {nextDuePreview.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </Text>
                    )}
                </Card>

                {!initialGoal && (
                    <Card>
                        <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Start with a lump sum today? (Optional)</Text>
                        <TextInput
                            style={{ color: colors.text, fontSize: 20, fontWeight: '600', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                            value={initialContribution}
                            onChangeText={setInitialContribution}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.gray300}
                        />
                    </Card>
                )}

                <Card>
                    <Text style={{ color: colors.textSecondary }}>Notes (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Description"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                <CategorySelectModal
                    visible={showCategoryModal}
                    onClose={() => setShowCategoryModal(false)}
                    onSelect={(cat: string) => {
                        setCategory(cat);
                        setSubCategory('');
                        setShowCategoryModal(false);
                    }}
                    categoryGroups={EXPENSE_CATEGORY_GROUPS}
                />
                </ScrollView>

                <View style={{ flexDirection: 'row', gap: 12, paddingTop: 8 }}>
                    <Button title="Cancel" variant="outline" onPress={onCancel} style={{ flex: 1 }} />
                    <Button title="Save" onPress={handleSave} loading={isSaving} style={{ flex: 1 }} />
                </View>
            </View>
        </View>
    );
};
