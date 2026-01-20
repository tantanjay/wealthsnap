import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity, Dimensions, Platform } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import { saveTransaction, saveRecurrenceRule } from '../services/storageService';
import { Transaction, TransactionType, RecurrenceRule, RecurrenceFrequency } from '../types';
import { INCOME_CATEGORY_GROUPS, EXPENSE_CATEGORY_GROUPS, RECURRENCE_OPTIONS, getCategoryGroup } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import { CalculatorModal } from '../components/modals/CalculatorModal';
import { RecurringForm } from '../components/RecurringForm';
import { CategorySelectModal } from '../components/modals/CategorySelectModal';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { CommonActions, useFocusEffect } from '@react-navigation/native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RecordScreen = ({ navigation, route }: any) => {
    const { colors } = useTheme();
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [note, setNote] = useState('');
    const [transactionId, setTransactionId] = useState<string | null>(null);
    const [createdAt, setCreatedAt] = useState<string | null>(null);
    const [creationMethod, setCreationMethod] = useState<'MANUAL' | 'RECURRENCE'>('MANUAL');
    const [originalRecurrenceId, setOriginalRecurrenceId] = useState<string | undefined>(undefined);

    // Transaction Date State (default to now or existing date)
    const [transactionDate, setTransactionDate] = useState<Date>(new Date());
    const [showTransactionDatePicker, setShowTransactionDatePicker] = useState(false);
    const [showTransactionTimePicker, setShowTransactionTimePicker] = useState(false);

    const [isRecurring, setIsRecurring] = useState(false);
    // Recurring fields might need more complex handling if we support editing recurrence rules from here
    // For now let's assume valid transaction edits don't change recurrence rules deeply
    const [recurringLabel, setRecurringLabel] = useState('');
    const [frequency, setFrequency] = useState<string>('MONTHLY');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endsNever, setEndsNever] = useState(true);
    const [endDate, setEndDate] = useState<Date>(new Date());

    // Date picker state
    // Calculator state
    const [showCalculator, setShowCalculator] = useState(false);

    // Category modal state
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const categoryGroups = type === 'EXPENSE' ? EXPENSE_CATEGORY_GROUPS : INCOME_CATEGORY_GROUPS;

    useFocusEffect(
        React.useCallback(() => {
            const { transaction } = route.params || {};

            if (transaction) {
                // Load transaction for editing
                setTransactionId(transaction.id);
                setType(transaction.type);
                setAmount(transaction.amount.toString());
                setCategory(transaction.category);
                setSubCategory(transaction.subCategory || '');
                setNote(transaction.note || '');
                setIsRecurring(Boolean(transaction.isRecurring));
                setCreatedAt(transaction.createdAt);
                setCreationMethod(transaction.creationMethod || 'MANUAL');
                setOriginalRecurrenceId(transaction.recurrenceId);
                // Set the transaction date from the existing transaction
                if (transaction.date) {
                    setTransactionDate(new Date(transaction.date));
                }
            } else {
                // Reset form if no transaction passed (i.e. New Transaction)
                // We check if we ALREADY have a transactionId set, implying we were editing before.
                // If so, we must clear. If not, we are likely already clean, but a reset doesn't hurt.
                resetForm();
            }

            return () => {
                // Clear params on blur to ensure next visit is fresh (e.g. via Tab Bar)
                navigation.setParams({ transaction: undefined });
            };
        }, [route.params?.transaction])
    );

    const openCalculator = () => {
        setShowCalculator(true);
    };

    const resetForm = () => {
        setTransactionId(null);
        setCreatedAt(null);
        setCreationMethod('MANUAL');
        setOriginalRecurrenceId(undefined);

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

        // Reset transaction date to now
        setTransactionDate(new Date());
        // Maybe keep type as is, or reset to default? Let's keep type as is for convenience
    };

    const handleSave = async () => {
        if (!amount || !category) {
            Alert.alert('Missing Info', 'Please enter amount and category.');
            return;
        }

        const newId = transactionId || Date.now().toString();
        let recurrenceRuleId: string | undefined = originalRecurrenceId;

        if (isRecurring) {
            const ruleId = `rule_${Date.now()}`;
            // startDate is already a Date object
            const start = startDate;

            // Calculate the next due date (not today, since we're creating the first transaction now)
            const nextDue = new Date(start);
            switch (frequency) {
                case 'DAILY':
                    nextDue.setDate(nextDue.getDate() + 1);
                    break;
                case 'WEEKLY':
                    nextDue.setDate(nextDue.getDate() + 7);
                    break;
                case 'SEMI_MONTHLY':
                    nextDue.setDate(nextDue.getDate() + 15);
                    break;
                case 'MONTHLY':
                    nextDue.setMonth(nextDue.getMonth() + 1);
                    break;
                case 'QUARTERLY':
                    nextDue.setMonth(nextDue.getMonth() + 3);
                    break;
                case 'YEARLY':
                    nextDue.setFullYear(nextDue.getFullYear() + 1);
                    break;
            }

            const rule: RecurrenceRule = {
                id: ruleId,
                name: recurringLabel || undefined, // Label for the recurring transaction
                frequency: frequency as RecurrenceFrequency,
                startDate: start.toISOString(),
                endDate: !endsNever ? endDate.toISOString() : undefined,
                nextDueDate: nextDue.toISOString(), // Next occurrence, not today
                transactionTemplate: {
                    type,
                    amount: parseFloat(amount),
                    category,
                    subCategory: subCategory || undefined,
                    note: note || undefined,
                },
                isActive: true
            };

            try {
                await saveRecurrenceRule(rule);
                recurrenceRuleId = ruleId;
            } catch (error) {
                Alert.alert('Error', 'Failed to save recurrence rule.');
                return;
            }
        }

        const newTransaction: Transaction = {
            id: newId,
            type,
            amount: parseFloat(amount),
            category,

            subCategory: subCategory || undefined,
            note: note || undefined,
            date: transactionDate.toISOString(), // Use the user-selected date
            isRecurring,
            recurrenceId: recurrenceRuleId,
            creationMethod: creationMethod,
            createdAt: createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveTransaction(newTransaction);

        // Reset form immediately before navigation
        resetForm();

        Alert.alert('Success', 'Transaction saved!', [
            {
                text: 'OK',
                onPress: () => {
                    navigation.goBack();
                }
            }
        ]);
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 20 }}>
                    {transactionId ? 'Edit Transaction' : 'New Transaction'}
                </Text>

                {/* Date and Time Selection */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                    <TouchableOpacity
                        onPress={() => setShowTransactionDatePicker(true)}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.surface,
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border
                        }}
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Date</Text>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowTransactionTimePicker(true)}
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: colors.surface,
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: colors.border
                        }}
                    >
                        <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Time</Text>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {transactionDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {showTransactionDatePicker && (
                    <DateTimePicker
                        value={transactionDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                            setShowTransactionDatePicker(Platform.OS === 'ios');
                            if (date) {
                                // Preserve time, update date
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
                                // Preserve date, update time
                                const newDate = new Date(transactionDate);
                                newDate.setHours(date.getHours(), date.getMinutes());
                                setTransactionDate(newDate);
                            }
                        }}
                    />
                )}

                {/* Type Toggle */}
                <View style={{ flexDirection: 'row', marginBottom: 20, backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}>
                    <TouchableOpacity
                        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: type === 'EXPENSE' ? colors.error : 'transparent', borderRadius: 8 }}
                        onPress={() => setType('EXPENSE')}
                    >
                        <Text style={{ color: type === 'EXPENSE' ? '#FFF' : colors.text, fontWeight: 'bold' }}>Expense</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: type === 'INCOME' ? colors.success : 'transparent', borderRadius: 8 }}
                        onPress={() => setType('INCOME')}
                    >
                        <Text style={{ color: type === 'INCOME' ? '#FFF' : colors.text, fontWeight: 'bold' }}>Income</Text>
                    </TouchableOpacity>
                </View>

                {/* Amount */}
                <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={{ color: colors.textSecondary }}>Amount</Text>
                        <TouchableOpacity onPress={openCalculator} style={{ padding: 4 }}>
                            <Ionicons name="calculator" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={{ color: type === 'EXPENSE' ? colors.error : colors.success, fontSize: 32, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.gray300}
                    />
                </Card>

                {/* Category Selection Button */}
                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Category</Text>
                    <TouchableOpacity
                        onPress={() => {
                            setShowCategoryModal(true);
                        }}
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            backgroundColor: colors.background,
                            padding: 12,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: category ? colors.primary : colors.border,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            {category ? (
                                <>
                                    <View style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor: colors.primary + '20',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginRight: 12
                                    }}>
                                        <Ionicons
                                            name={categoryGroups.flatMap(g => g.items).find(c => c.value === category)?.icon as any || 'ellipsis-horizontal'}
                                            size={20}
                                            color={colors.primary}
                                        />
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{category}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{getCategoryGroup(category, type)}</Text>
                                    </View>
                                </>
                            ) : (
                                <Text style={{ color: colors.gray500, fontSize: 16 }}>Select a category</Text>
                            )}
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </Card>

                {/* Note */}
                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Note (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Description"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                {/* Recurring */}
                <RecurringForm
                    isRecurring={isRecurring}
                    setIsRecurring={setIsRecurring}
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

                <Button title="Save Transaction" onPress={handleSave} style={{ marginBottom: 40 }} />
            </ScrollView>

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
                onSelect={(cat) => {
                    setCategory(cat);
                    setSubCategory('');
                }}
                categoryGroups={categoryGroups}
            />
        </ScreenWrapper>
    );
};
export default RecordScreen;
