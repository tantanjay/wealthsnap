import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet, TextStyle } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader } from '@components/ds';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius, fontFamily } from '@styles/theme';
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
    const { ds } = useTheme();
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

        if (frequency !== 'NONE') {
            const parsedRecurringCheck = new BigNumber(recurringAmount || 0);
            if (parsedRecurringCheck.isNaN() || parsedRecurringCheck.isLessThanOrEqualTo(0)) {
                showAlert('Invalid Amount', 'Recurring contribution amount must be greater than zero.');
                return;
            }
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

    const fieldInput: TextStyle[] = [type.body, styles.fieldInput, { color: ds.text }];
    const numInput: TextStyle[] = [type.bodyNum, styles.fieldInput, { color: ds.text }];

    return (
        // height: '100%' (not flex: 1) - this form is hosted inside BottomModal, which sizes
        // itself to content rather than providing a bounded flex context, so a flex:1 root
        // here collapses to ~0 height instead of expanding. See BudgetManagementModal.tsx for
        // the same pattern.
        <View style={{ height: '100%' }}>
            <View style={{ flex: 1 }}>
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: space[7] }}>
                <Text style={[type.title, { color: ds.text }]}>
                    {initialGoal ? 'Edit savings goal' : 'New savings goal'}
                </Text>

                <View style={styles.amountBlock}>
                    <Text style={[type.small, { color: ds.text2 }]}>Target amount</Text>
                    <TextInput
                        style={[styles.amountInput, { color: ds.text, borderBottomColor: ds.hairline }]}
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={ds.text3}
                    />
                </View>

                <View style={styles.group}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Name</Text>
                    <View style={[styles.field, { backgroundColor: ds.inset }]}>
                        <Ionicons name="create-outline" size={18} color={ds.text2} />
                        <TextInput
                            style={fieldInput}
                            value={name}
                            onChangeText={setName}
                            placeholder="e.g. Travel fund"
                            placeholderTextColor={ds.text3}
                        />
                    </View>
                </View>

                <View style={styles.group}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Category</Text>
                    <Pressable
                        onPress={() => setShowCategoryModal(true)}
                        style={[styles.field, { backgroundColor: ds.inset }]}
                    >
                        <Ionicons name="grid-outline" size={18} color={ds.text2} />
                        <Text style={[type.body, styles.fieldInput, { color: category ? ds.text : ds.text3 }]} numberOfLines={1}>
                            {category || 'Select a category'}
                        </Text>
                        <Ionicons name="chevron-forward" size={16} color={ds.text3} />
                    </Pressable>
                    <Text style={[type.small, styles.hint, { color: ds.text2 }]}>
                        Pre-fills onto any expense you fund from this goal (still editable per-expense).
                    </Text>
                </View>

                <SectionHeader title="Auto-contribution (optional)" />
                <View style={[styles.field, { backgroundColor: ds.inset, marginTop: space[2] }]}>
                    <Ionicons name="repeat-outline" size={18} color={ds.text2} />
                    <TextInput
                        style={numInput}
                        value={recurringAmount}
                        onChangeText={setRecurringAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={ds.text3}
                    />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipStrip}>
                    {RECURRENCE_OPTIONS.map((opt) => {
                        const isActive = frequency === opt.value;
                        return (
                            <Pressable
                                key={opt.value}
                                onPress={() => setFrequency(opt.value)}
                                style={[styles.chip, isActive && { backgroundColor: ds.inset }]}
                            >
                                <Text style={[type.smallMedium, { color: isActive ? ds.text : ds.text2 }]}>
                                    {opt.label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </ScrollView>
                {nextDuePreview && (
                    <Text style={[type.small, styles.hint, { color: ds.text2 }]}>
                        Next contribution: {nextDuePreview.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                )}

                {!initialGoal && (
                    <View style={[styles.group, { marginTop: space[6] }]}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Start with a lump sum today? (optional)</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="wallet-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={numInput}
                                value={initialContribution}
                                onChangeText={setInitialContribution}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                )}

                <View style={[styles.group, { marginTop: space[6] }]}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Notes (optional)</Text>
                    <View style={[styles.field, { backgroundColor: ds.inset }]}>
                        <Ionicons name="document-text-outline" size={18} color={ds.text2} />
                        <TextInput
                            style={fieldInput}
                            value={notes}
                            onChangeText={setNotes}
                            placeholder="Description"
                            placeholderTextColor={ds.text3}
                        />
                    </View>
                </View>

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

                {/* Inline actions: the host BottomModal doesn't pass a footer. */}
                <View style={[styles.actions, { borderTopColor: ds.hairline }]}>
                    <Pressable onPress={onCancel} style={styles.cancelButton}>
                        <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                    </Pressable>
                    <Pressable
                        onPress={handleSave}
                        disabled={isSaving}
                        style={[styles.primaryButton, { backgroundColor: ds.accent }]}
                    >
                        {isSaving
                            ? <ActivityIndicator color={ds.onAccent} />
                            : <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save goal</Text>}
                    </Pressable>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    amountBlock: {
        marginTop: space[5],
    },
    amountInput: {
        fontFamily: fontFamily.semibold,
        fontSize: 44,
        lineHeight: 52,
        fontVariant: ['tabular-nums'],
        borderBottomWidth: 1,
        paddingVertical: space[1],
        paddingHorizontal: 0,
    },
    group: {
        marginTop: space[5],
    },
    label: {
        marginBottom: space[1],
    },
    hint: {
        marginTop: space[2],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldInput: {
        flex: 1,
        padding: 0,
    },
    chipStrip: {
        marginTop: space[2],
    },
    chips: {
        gap: space[1],
    },
    chip: {
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    actions: {
        flexDirection: 'row',
        gap: space[3],
        paddingTop: space[3],
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    primaryButton: {
        flex: 2,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
