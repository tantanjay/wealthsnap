import React, { useState, useEffect, useRef } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SectionHeader, SegmentedControl } from '@components/ds';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import { RecurringOptions } from '@components/transaction/RecurringOptions';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Transaction, TransactionType, RecurrenceRule, RecurrenceFrequency, SavingsGoal } from '@types';
import { generateUUID } from '@utils/uuid';
import { INCOME_CATEGORY_GROUPS, EXPENSE_CATEGORY_GROUPS } from '@constants/categories';
import { getRecentCategories, saveTransaction, saveTransactionsAtomically, getCachedTransactions } from '@services/domain/transactionService';
import { saveRecurrenceRule, calculateNextDueDate } from '@services/domain/recurrenceService';
import { getAllSavingsGoals } from '@services/domain/savingsGoalService';
import { calculateGoalBalance } from '@utils/savingsGoalMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { type as typeScale, space, radius } from '@styles/theme';

interface TransactionFormProps {
    transactionType: TransactionType;
    initialTransaction?: Transaction;
    onSave: () => void;
    onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
    transactionType,
    initialTransaction,
    onSave,
    onCancel
}) => {
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    // Form state
    const [type, setType] = useState<TransactionType>(initialTransaction?.type || transactionType);
    const [amount, setAmount] = useState(initialTransaction?.amount.toString() || '');
    const [category, setCategory] = useState(initialTransaction?.category || '');
    const [subCategory, setSubCategory] = useState(initialTransaction?.subCategory || '');
    const [note, setNote] = useState(initialTransaction?.note || '');
    const [transactionDate, setTransactionDate] = useState<Date>(
        initialTransaction?.date ? new Date(initialTransaction.date) : new Date()
    );

    // Recurring state
    const [isRecurring, setIsRecurring] = useState(initialTransaction?.isRecurring || false);
    const [recurringLabel, setRecurringLabel] = useState('');
    const [frequency, setFrequency] = useState<string>('MONTHLY');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endsNever, setEndsNever] = useState(true);
    const [endDate, setEndDate] = useState<Date>(new Date());

    // UI state
    const [showTransactionDatePicker, setShowTransactionDatePicker] = useState(false);
    const [showTransactionTimePicker, setShowTransactionTimePicker] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const [recentCategories, setRecentCategories] = useState<string[]>([]);
    const categoryScrollRef = useRef<ScrollView>(null);

    // Funding Source (Savings Goals). Only offered when creating a new EXPENSE - editing an
    // existing transaction doesn't re-run the Auto-Offset/Split-Funding creation logic below
    // (mirrors how the recurring-rule block above only builds a *new* rule on create too).
    const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([]);
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [fundingGoalId, setFundingGoalId] = useState<string | undefined>(undefined);
    const canPickFundingSource = type === 'EXPENSE' && !initialTransaction;

    const ITEM_WIDTH = 90;
    const ITEM_GAP = 8;

    const categoryGroups = type === 'EXPENSE' ? EXPENSE_CATEGORY_GROUPS : INCOME_CATEGORY_GROUPS;

    useEffect(() => {
        const fetchRecent = async () => {
            const categories = await getRecentCategories(type);
            setRecentCategories(categories);
        };
        fetchRecent();
    }, [type]);

    useEffect(() => {
        if (!canPickFundingSource) return;
        (async () => {
            const [goals, txns] = await Promise.all([getAllSavingsGoals(), getCachedTransactions()]);
            setSavingsGoals(goals);
            setAllTransactions(txns);
        })();
        // canPickFundingSource only flips true/false based on `type`/`initialTransaction`,
        // neither of which changes mid-session for this form instance - fine to load once.
    }, [canPickFundingSource]);

    // Forcing isRecurring off the moment a goal is picked (and clearing the goal the moment
    // Recurring is turned on) is the only thing stopping both from being true at once -
    // nothing else in this form or in RecurrenceRule.transactionTemplate prevents it, and a
    // rule left with a stale savingsGoalId would silently keep re-spawning goal-tagged
    // transactions forever.
    const handleSelectFundingGoal = (goal: SavingsGoal | null) => {
        if (goal) {
            setFundingGoalId(goal.id);
            setCategory(goal.category);
            setSubCategory(goal.subCategory || '');
            setIsRecurring(false);
        } else {
            setFundingGoalId(undefined);
        }
    };

    const handleSetIsRecurring = (value: boolean) => {
        if (value) setFundingGoalId(undefined);
        setIsRecurring(value);
    };

    const scrollToCategory = (cat: string) => {
        if (categoryScrollRef.current) {
            const categoriesToDisplay = [...recentCategories];
            if (!categoriesToDisplay.includes(cat)) {
                categoriesToDisplay.unshift(cat);
            }

            const index = categoriesToDisplay.indexOf(cat);
            if (index !== -1) {
                // index * (ITEM_WIDTH + ITEM_GAP) ensures the item BEFORE the selected one stays in view (often Search button)
                const offset = index * (ITEM_WIDTH + ITEM_GAP);
                categoryScrollRef.current.scrollTo({ x: offset, animated: true });
            }
        }
    };

    const resetForm = () => {
        setAmount('');
        setCategory('');
        setSubCategory('');
        setNote('');
        setIsRecurring(false);
        setRecurringLabel('');
        setFrequency('MONTHLY');
        setStartDate(new Date());
        setEndsNever(true);
        setEndDate(new Date());
        setFundingGoalId(undefined);
    };

    /**
     * Auto-Offset + Split-Funding: saves the EXPENSE(s) + linked TRANSFER_IN for a
     * goal-funded expense as one atomic write, then resets form state and refreshes the
     * in-memory transaction list. Bypasses the normal single-saveTransaction path below
     * entirely - a goal-funded expense is never also a recurring transaction (enforced by
     * handleSelectFundingGoal/handleSetIsRecurring above).
     */
    const saveGoalFundedExpense = async (goal: SavingsGoal, enteredAmount: BigNumber): Promise<{ goalPortion: BigNumber; remainder: BigNumber }> => {
        const now = new Date().toISOString();
        const goalBalance = calculateGoalBalance(goal, allTransactions);
        const goalPortion = BigNumber.minimum(enteredAmount, goalBalance);
        const remainder = enteredAmount.minus(goalPortion);
        const toSave: Transaction[] = [];

        if (goalPortion.isGreaterThan(0)) {
            const expenseId = generateUUID();
            const expense: Transaction = {
                id: expenseId,
                type: 'EXPENSE',
                amount: goalPortion,
                category,
                subCategory: subCategory || undefined,
                note: note || undefined,
                date: transactionDate.toISOString(),
                isRecurring: false,
                savingsGoalId: goal.id,
                creationMethod: 'MANUAL',
                createdAt: now,
                updatedAt: now,
            };
            const offset: Transaction = {
                id: generateUUID(),
                type: 'TRANSFER_IN',
                amount: goalPortion,
                category,
                subCategory: 'GOAL_SPEND',
                date: transactionDate.toISOString(),
                isRecurring: false,
                transferAccount: 'SAVINGS_GOAL',
                savingsGoalId: goal.id,
                linkedTransactionId: expenseId,
                createdAt: now,
                updatedAt: now,
            };
            toSave.push(expense, offset);
        }

        // Split Funding: whatever the goal's balance couldn't cover comes out of general
        // cash as a fully separate, untagged expense - never merged into the row above.
        if (remainder.isGreaterThan(0)) {
            const plainExpense: Transaction = {
                id: generateUUID(),
                type: 'EXPENSE',
                amount: remainder,
                category,
                subCategory: subCategory || undefined,
                note: note || undefined,
                date: transactionDate.toISOString(),
                isRecurring: false,
                creationMethod: 'MANUAL',
                createdAt: now,
                updatedAt: now,
            };
            toSave.push(plainExpense);
        }

        await saveTransactionsAtomically(toSave);

        // Refresh the in-memory ledger so a second goal-funded expense logged without closing
        // this modal sees the spend that was just saved, instead of computing its split off a
        // stale pre-save balance.
        const refreshed = await getCachedTransactions();
        setAllTransactions(refreshed);

        return { goalPortion, remainder };
    };

    const handleSave = async () => {
        if (!amount || !category) {
            showAlert('Missing Info', 'Please enter amount and category.');
            return;
        }

        const selectedGoal = fundingGoalId ? savingsGoals.find(g => g.id === fundingGoalId) : undefined;
        if (selectedGoal) {
            const enteredAmount = new BigNumber(amount);
            const goalBalance = calculateGoalBalance(selectedGoal, allTransactions);
            const finish = async () => {
                await saveGoalFundedExpense(selectedGoal, enteredAmount);
                resetForm();
                if (initialTransaction) onSave();
            };

            // Split Funding: the goal can't cover the whole amount, so this would otherwise
            // drive its balance negative. Explain the split before committing, since it's
            // not obvious from the amount field alone that part of this will land as a
            // separate, untagged expense against general cash.
            if (enteredAmount.isGreaterThan(goalBalance)) {
                const remainder = enteredAmount.minus(goalBalance);
                showAlert(
                    'Not Enough in This Goal',
                    `"${selectedGoal.name}" only has ${formatCurrencyAmount(goalBalance)} left. This expense will drain the goal to ${formatCurrencyAmount(new BigNumber(0))} and charge the remaining ${formatCurrencyAmount(remainder)} to your general funds as a separate expense.`,
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Continue', onPress: finish },
                    ]
                );
                return;
            }

            await finish();
            return;
        }

        const newId = initialTransaction?.id || generateUUID();
        let recurrenceRuleId: string | undefined = initialTransaction?.recurrenceId;

        if (isRecurring) {
            const ruleId = initialTransaction?.recurrenceId || generateUUID();
            const start = startDate;

            const nextDue = calculateNextDueDate(start, frequency as RecurrenceFrequency);

            const rule: RecurrenceRule = {
                id: ruleId,
                name: recurringLabel || undefined,
                frequency: frequency as RecurrenceFrequency,
                startDate: start.toISOString(),
                endDate: !endsNever ? endDate.toISOString() : undefined,
                nextDueDate: nextDue.toISOString(),
                transactionTemplate: {
                    type,
                    amount: new BigNumber(amount),
                    category,
                    subCategory: subCategory || undefined,
                    note: note || undefined,
                },
                isActive: true
            };

            try {
                await saveRecurrenceRule(rule);
                recurrenceRuleId = ruleId;
            } catch {
                showAlert('Error', 'Failed to save recurrence rule.');
                return;
            }
        }

        const newTransaction: Transaction = {
            id: newId,
            type,
            amount: new BigNumber(amount),
            category,
            subCategory: subCategory || undefined,
            note: note || undefined,
            date: transactionDate.toISOString(),
            isRecurring,
            recurrenceId: recurrenceRuleId,
            creationMethod: initialTransaction?.creationMethod || 'MANUAL',
            // Editing an existing tagged transaction here (reachable today for a debt
            // principal repayment, per HistoryListItem's isDebtRepayment tap-gating) must
            // not silently drop its entity tag - this form has no UI for these, so just
            // carry whatever was already there straight through.
            investmentId: initialTransaction?.investmentId,
            debtId: initialTransaction?.debtId,
            savingsGoalId: initialTransaction?.savingsGoalId,
            createdAt: initialTransaction?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveTransaction(newTransaction);
        resetForm();

        if (initialTransaction) {
            onSave();
        }
    };

    const fieldLabel = [typeScale.small, styles.fieldLabel, { color: ds.text2 }];
    const fieldBox = [styles.field, { backgroundColor: ds.inset }];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[typeScale.title, styles.title, { color: ds.text }]}>
                    {initialTransaction ? 'Edit transaction' : 'New transaction'}
                </Text>

                <SegmentedControl
                    options={[{ key: 'EXPENSE', label: 'Expense' }, { key: 'INCOME', label: 'Income' }]}
                    value={type}
                    onChange={setType}
                />

                {/* Amount */}
                <View style={styles.amountBlock}>
                    <View style={styles.amountLabelRow}>
                        <Text style={[typeScale.small, { color: ds.text2 }]}>Amount</Text>
                        <Pressable onPress={() => setShowCalculator(true)} hitSlop={space[2]} accessibilityRole="button" accessibilityLabel="Open calculator">
                            <Ionicons name="calculator-outline" size={22} color={ds.text2} />
                        </Pressable>
                    </View>
                    <TextInput
                        style={[typeScale.recordAmount, styles.amountInput, { color: ds.text, borderBottomColor: ds.hairline }]}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={ds.text3}
                    />
                </View>

                {/* Category Selection */}
                <SectionHeader title="Category" />
                <ScrollView
                    ref={categoryScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.tileStrip, { gap: ITEM_GAP }]}
                >
                    {/* Search Button */}
                    <Pressable
                        onPress={() => setShowCategoryModal(true)}
                        style={[styles.tile, { width: ITEM_WIDTH, backgroundColor: ds.inset }]}
                    >
                        <Ionicons name="search-outline" size={20} color={ds.text2} />
                        <Text style={[typeScale.small, { color: ds.text }]}>Search</Text>
                    </Pressable>

                    {/* Recent Categories */}
                    {(() => {
                        const categoriesToDisplay = [...recentCategories];
                        if (category && !categoriesToDisplay.includes(category)) {
                            categoriesToDisplay.unshift(category);
                        }

                        return categoriesToDisplay.map((cat) => {
                            const isActive = category === cat;
                            const catGroupItem = categoryGroups.flatMap(g => g.items).find(c => c.value === cat);
                            const icon = catGroupItem?.icon || 'ellipsis-horizontal';

                            return (
                                <Pressable
                                    key={cat}
                                    onPress={() => {
                                        setCategory(cat);
                                        setSubCategory('');
                                    }}
                                    style={[styles.tile, { width: ITEM_WIDTH, backgroundColor: isActive ? ds.accentSoft : ds.inset }]}
                                >
                                    <Ionicons name={icon as any} size={20} color={isActive ? ds.accent : ds.text2} />
                                    <Text style={[typeScale.small, { color: isActive ? ds.accent : ds.text }]} numberOfLines={1}>
                                        {cat}
                                    </Text>
                                </Pressable>
                            );
                        });
                    })()}
                </ScrollView>

                {/* Funding Source (Savings Goals) */}
                {canPickFundingSource && savingsGoals.length > 0 && (
                    <>
                        <SectionHeader title="Funding source" />
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipStrip}>
                            <Pressable
                                onPress={() => handleSelectFundingGoal(null)}
                                style={[styles.chip, !fundingGoalId && { backgroundColor: ds.inset }]}
                            >
                                <Text style={[typeScale.smallMedium, { color: !fundingGoalId ? ds.text : ds.text2 }]}>
                                    General funds
                                </Text>
                            </Pressable>

                            {savingsGoals.map((goal) => {
                                const isActive = fundingGoalId === goal.id;
                                return (
                                    <Pressable
                                        key={goal.id}
                                        onPress={() => handleSelectFundingGoal(goal)}
                                        style={[styles.chip, isActive && { backgroundColor: ds.inset }]}
                                    >
                                        <Text style={[typeScale.smallMedium, { color: isActive ? ds.text : ds.text2 }]} numberOfLines={1}>
                                            {goal.name}
                                        </Text>
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                        {fundingGoalId && (
                            <Text style={[typeScale.small, styles.hint, { color: ds.text2 }]}>
                                This still logs as a normal expense - it just draws from the goal instead of general cash.
                            </Text>
                        )}
                    </>
                )}

                {/* Date, Time and Note */}
                <SectionHeader title="Details" />
                <View style={styles.dateRow}>
                    <View style={styles.dateCol}>
                        <Text style={fieldLabel}>Date</Text>
                        <Pressable onPress={() => setShowTransactionDatePicker(true)} style={fieldBox}>
                            <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                            <Text style={[typeScale.body, { color: ds.text }]} numberOfLines={1}>
                                {transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </Pressable>
                    </View>
                    <View style={styles.dateCol}>
                        <Text style={fieldLabel}>Time</Text>
                        <Pressable onPress={() => setShowTransactionTimePicker(true)} style={fieldBox}>
                            <Ionicons name="time-outline" size={18} color={ds.text2} />
                            <Text style={[typeScale.body, { color: ds.text }]} numberOfLines={1}>
                                {transactionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </Pressable>
                    </View>
                </View>

                {showTransactionDatePicker && (
                    <DateTimePicker
                        value={transactionDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                            setShowTransactionDatePicker(Platform.OS === 'ios');
                            if (date) {
                                const newDate = new Date(transactionDate);
                                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                setTransactionDate(newDate);
                            }
                        }}
                    />
                )}

                {showTransactionTimePicker && (
                    <DateTimePicker
                        value={transactionDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                            setShowTransactionTimePicker(Platform.OS === 'ios');
                            if (date) {
                                const newDate = new Date(transactionDate);
                                newDate.setHours(date.getHours(), date.getMinutes());
                                setTransactionDate(newDate);
                            }
                        }}
                    />
                )}

                <Text style={[fieldLabel, styles.fieldGap]}>Note (optional)</Text>
                <View style={fieldBox}>
                    <Ionicons name="create-outline" size={18} color={ds.text2} />
                    <TextInput
                        style={[typeScale.body, styles.fieldInput, { color: ds.text }]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Description"
                        placeholderTextColor={ds.text3}
                    />
                </View>

                {/* Recurring - hidden while a goal is selected as funding source, since a
                    goal-funded expense is never also a recurring transaction */}
                {!fundingGoalId && (
                    <RecurringOptions
                        isRecurring={isRecurring}
                        setIsRecurring={handleSetIsRecurring}
                        recurringLabel={recurringLabel}
                        setRecurringLabel={setRecurringLabel}
                        frequency={frequency}
                        setFrequency={setFrequency}
                        startDate={startDate}
                        setStartDate={setStartDate}
                        endsNever={endsNever}
                        setEndsNever={setEndsNever}
                        endDate={endDate}
                        setEndDate={setEndDate}
                    />
                )}

                {/* Modals */}
                <CalculatorModal
                    visible={showCalculator}
                    onClose={() => setShowCalculator(false)}
                    initialValue={amount}
                    onApply={setAmount}
                    type={type}
                />

                <CategorySelectModal
                    visible={showCategoryModal}
                    onClose={() => setShowCategoryModal(false)}
                    onSelect={(cat: string) => {
                        setCategory(cat);
                        setSubCategory('');
                        scrollToCategory(cat);
                    }}
                    categoryGroups={categoryGroups}
                />
            </ScrollView>

            {/* Fixed Footer Actions */}
            <View style={[styles.footer, { backgroundColor: ds.inset, borderTopColor: ds.hairline }]}>
                <Pressable onPress={onCancel} style={styles.cancelButton} accessibilityRole="button">
                    <Text style={[typeScale.body, { color: ds.text2 }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={[styles.saveButton, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[typeScale.bodyStrong, { color: ds.onAccent }]}>
                        {type === 'INCOME' ? 'Save income' : 'Save expense'}
                    </Text>
                </Pressable>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    // Bottom padding clears the fixed footer.
    content: {
        paddingHorizontal: space[5],
        paddingBottom: 120,
    },
    title: {
        marginTop: space[4],
        marginBottom: space[5],
    },
    amountBlock: {
        marginTop: space[6],
    },
    amountLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amountInput: {
        borderBottomWidth: 1,
        paddingVertical: space[2],
        paddingHorizontal: 0,
    },
    tileStrip: {
        paddingTop: space[2],
    },
    tile: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
        paddingVertical: space[3],
        paddingHorizontal: space[2],
        borderRadius: radius.md,
    },
    chipStrip: {
        gap: space[1],
        paddingTop: space[2],
    },
    chip: {
        paddingVertical: space[2],
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    hint: {
        marginTop: space[2],
    },
    dateRow: {
        flexDirection: 'row',
        gap: space[3],
        paddingTop: space[2],
    },
    dateCol: {
        flex: 1,
    },
    fieldLabel: {
        marginBottom: space[1],
    },
    fieldGap: {
        marginTop: space[4],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        padding: space[3],
        borderRadius: radius.md,
    },
    // Android TextInput adds its own padding; zero it so typed fields match the pressable ones.
    fieldInput: {
        flex: 1,
        padding: 0,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: space[3],
        paddingTop: space[3],
        paddingHorizontal: space[5],
        paddingBottom: space[4],
        borderTopWidth: 1,
    },
    cancelButton: {
        flex: 1,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveButton: {
        flex: 2,
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});
