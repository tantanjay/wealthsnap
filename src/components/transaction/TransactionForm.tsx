import React, { useState, useEffect } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '@components/index';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { CategorySelectModal } from '@components/record/CategorySelectModal';
import { RecurringOptions } from '@components/transaction/RecurringOptions';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Transaction, TransactionType, RecurrenceRule, RecurrenceFrequency } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveTransaction, saveRecurrenceRule, getRecentCategories } from '@services/domain';
import { INCOME_CATEGORY_GROUPS, EXPENSE_CATEGORY_GROUPS, getCategoryGroup } from '@constants/categories';

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
    const { colors } = useTheme();
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

    const categoryGroups = type === 'EXPENSE' ? EXPENSE_CATEGORY_GROUPS : INCOME_CATEGORY_GROUPS;

    useEffect(() => {
        const fetchRecent = async () => {
            const categories = await getRecentCategories(type);
            setRecentCategories(categories);
        };
        fetchRecent();
    }, [type]);

    const handleSave = async () => {
        if (!amount || !category) {
            showAlert('Missing Info', 'Please enter amount and category.');
            return;
        }

        const newId = initialTransaction?.id || generateUUID();
        let recurrenceRuleId: string | undefined = initialTransaction?.recurrenceId;

        if (isRecurring) {
            const ruleId = initialTransaction?.recurrenceId || generateUUID();
            const start = startDate;

            // Calculate the next due date
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
            createdAt: initialTransaction?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveTransaction(newTransaction);

        showAlert('Success', 'Transaction saved!', [
            {
                text: 'Add More',
                onPress: () => {
                    setAmount('');
                    setCategory('');
                    setSubCategory('');
                    setNote('');
                    // Keep type and date for rapid entry
                    setIsRecurring(false);
                    setRecurringLabel('');
                    setFrequency('MONTHLY');
                    setStartDate(new Date());
                    setEndsNever(true);
                    setEndDate(new Date());
                },
                style: 'default'
            },
            {
                text: 'Home',
                onPress: onSave,
                style: 'cancel'
            }
        ], { cancelable: false });
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>
                    {initialTransaction ? 'Edit Transaction' : 'New Transaction'}
                </Text>

                {/* Date and Time Selection */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
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

                {/* Type Toggle */}
                <View style={{ flexDirection: 'row', marginBottom: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}>
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
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary }}>Amount</Text>
                        <TouchableOpacity onPress={() => setShowCalculator(true)} style={{ padding: 4 }}>
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

                {/* Category Selection */}
                <View style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8, marginLeft: 4 }}>Category</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ gap: 8 }}
                    >
                        {/* Search Button */}
                        <TouchableOpacity
                            onPress={() => setShowCategoryModal(true)}
                            style={{
                                width: 90,
                                paddingVertical: 12,
                                justifyContent: 'center',
                                alignItems: 'center',
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: 'transparent',
                                backgroundColor: colors.surface,
                            }}
                        >
                            <Ionicons name="search" size={22} color={colors.textSecondary} />
                            <Text style={{
                                color: colors.text,
                                fontSize: 10,
                                fontWeight: '700',
                                marginTop: 6,
                                textAlign: 'center'
                            }}>Search</Text>
                        </TouchableOpacity>

                        {/* Recent Categories */}
                        {(() => {
                            const params = [category];
                            const categoriesToDisplay = [...recentCategories];
                            if (category && !categoriesToDisplay.includes(category)) {
                                categoriesToDisplay.unshift(category);
                            }

                            return categoriesToDisplay.map((cat) => {
                                const isActive = category === cat;
                                const catGroupItem = categoryGroups.flatMap(g => g.items).find(c => c.value === cat);
                                const icon = catGroupItem?.icon || 'ellipsis-horizontal';

                                return (
                                    <TouchableOpacity
                                        key={cat}
                                        onPress={() => {
                                            setCategory(cat);
                                            setSubCategory('');
                                        }}
                                        style={{
                                            width: 90,
                                            paddingVertical: 12,
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            borderRadius: 12,
                                            borderWidth: 1.5,
                                            borderColor: isActive ? colors.primary : 'transparent',
                                            backgroundColor: isActive ? colors.primary + '15' : colors.surface || '#f5f5f5',
                                        }}
                                    >
                                        <Ionicons
                                            name={icon as any}
                                            size={22}
                                            color={isActive ? colors.primary : colors.textSecondary}
                                        />
                                        <Text style={{
                                            color: isActive ? colors.primary : colors.text,
                                            fontSize: 10,
                                            fontWeight: isActive ? '700' : '500',
                                            marginTop: 6,
                                            textAlign: 'center'
                                        }} numberOfLines={1}>
                                            {cat}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            });
                        })()}
                    </ScrollView>
                </View>

                {/* Note */}
                <Card>
                    <Text style={{ color: colors.textSecondary }}>Note (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Description"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                {/* Recurring */}
                <RecurringOptions
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
                    }}
                    categoryGroups={categoryGroups}
                />
            </ScrollView>

            {/* Fixed Footer Actions */}
            <View style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                paddingTop: 16,
                paddingHorizontal: 16,
                paddingBottom: 16,
                backgroundColor: colors.surface,
                borderTopWidth: 1,
                borderColor: colors.border,
                flexDirection: 'row',
                gap: 12
            }}>
                <Button
                    title="Cancel"
                    variant="outline"
                    onPress={onCancel}
                    style={{ flex: 1 }}
                />
                <Button
                    title="Save"
                    onPress={handleSave}
                    style={{ flex: 1 }}
                />
            </View>
        </View>
    );
};
