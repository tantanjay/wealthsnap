import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, ActivityIndicator, StyleSheet, TextStyle } from 'react-native';
import { BigNumber } from 'bignumber.js';
import { Ionicons } from '@expo/vector-icons';

import { Group, Row, SectionHeader } from '@components/ds';
import BottomModal from '@components/common/BottomModal';
import { CategoryPicker } from '@components/record/CategorySelectModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius } from '@styles/theme';
import { SavingsGoal, Transaction, RecurrenceRule, RecurrenceFrequency } from '@types';
import { generateUUID } from '@utils/uuid';
import { EXPENSE_CATEGORY_GROUPS, RECURRENCE_OPTIONS } from '@constants/categories';
import { saveSavingsGoal, contributeToGoal } from '@services/domain/savingsGoalService';
import { saveRecurrenceRule, deleteRecurrenceRule, calculateNextDueDate } from '@services/domain/recurrenceService';

interface SavingsGoalFormProps {
    visible: boolean;
    initialGoal?: SavingsGoal;
    existingRule?: RecurrenceRule; // the goal's current auto-contribution rule, if any - lets
    // save() tell "still the same schedule" apart from "just turned recurring on/changed it"
    existingTransactions: Transaction[]; // needed for contributeToGoal's balance-before check
    onSave: () => void;
    onCancel: () => void;
}

export const SavingsGoalForm: React.FC<SavingsGoalFormProps> = ({ visible, initialGoal, existingRule, existingTransactions, onSave, onCancel }) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    const [name, setName] = useState(initialGoal?.name || '');
    const [targetAmount, setTargetAmount] = useState(initialGoal?.targetAmount?.toString() || '');
    const [category, setCategory] = useState(initialGoal?.category || '');
    const [subCategory, setSubCategory] = useState(initialGoal?.subCategory || '');
    // Picking a category expands inline: a second modal on top of this sheet isn't allowed.
    const [isPickingCategory, setIsPickingCategory] = useState(false);
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

    const footer = (
        <View style={styles.actions}>
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
    );

    return (
        <BottomModal
            visible={visible}
            onClose={onCancel}
            title={initialGoal ? 'Edit savings goal' : 'New savings goal'}
            maxHeight="90%"
            footer={footer}
        >
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]}>Target amount</Text>
                    <TextInput
                        style={[type.recordAmount, styles.amountInput, { color: ds.text }]}
                        value={targetAmount}
                        onChangeText={setTargetAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={ds.text3}
                    />
                </Group>

                <SectionHeader title="Details" grouped />
                <Group padded>
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

                    <Text style={[type.small, styles.label, styles.fieldGap, { color: ds.text2 }]}>Notes (optional)</Text>
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
                </Group>

                <SectionHeader title="Category" grouped />
                <Group>
                    <Row
                        icon="grid-outline"
                        title={category || 'Select a category'}
                        subtitle="Pre-fills onto any expense you fund from this goal (still editable per-expense)."
                        trailing={<Ionicons name={isPickingCategory ? 'chevron-up' : 'chevron-down'} size={16} color={ds.text3} />}
                        onPress={() => setIsPickingCategory(v => !v)}
                        last
                    />
                </Group>
                {isPickingCategory && (
                    <View style={styles.picker}>
                        <CategoryPicker
                            scroll={false}
                            categoryGroups={EXPENSE_CATEGORY_GROUPS}
                            onSelect={(cat: string) => {
                                setCategory(cat);
                                setSubCategory('');
                                setIsPickingCategory(false);
                            }}
                        />
                    </View>
                )}

                <SectionHeader title="Auto-contribution (optional)" grouped />
                <Group padded>
                    <View style={[styles.field, { backgroundColor: ds.inset }]}>
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
                </Group>

                {!initialGoal && (
                    <>
                        <SectionHeader title="Start with a lump sum today? (optional)" grouped />
                        <Group padded>
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
                        </Group>
                    </>
                )}

            </ScrollView>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    picker: {
        marginTop: space[2],
    },
    amountInput: {
        paddingTop: space[1],
        paddingBottom: 0,
        paddingHorizontal: 0,
    },
    label: {
        marginBottom: space[1],
    },
    fieldGap: {
        marginTop: space[3],
    },
    hint: {
        marginTop: space[2],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        padding: space[3],
        borderRadius: radius.md,
    },
    fieldInput: {
        flex: 1,
        padding: 0,
    },
    chipStrip: {
        marginTop: space[3],
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
