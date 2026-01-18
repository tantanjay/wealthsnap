import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import { saveTransaction, saveRecurrenceRule } from '../services/storageService';
import { Transaction, TransactionType, RecurrenceRule, RecurrenceFrequency } from '../types';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES, RECURRENCE_OPTIONS } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';

const RecordScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [note, setNote] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [frequency, setFrequency] = useState<string>('MONTHLY');
    const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [endsNever, setEndsNever] = useState(true);
    const [endDate, setEndDate] = useState('');

    const categories = type === 'EXPENSE' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

    const resetForm = () => {
        setAmount('');
        setCategory('');
        setSubCategory('');
        setNote('');
        setIsRecurring(false);
        setFrequency('MONTHLY');
        setStartDate(new Date().toISOString().split('T')[0]);
        setEndsNever(true);
        setEndDate('');
        // Maybe keep type as is, or reset to default? Let's keep type as is for convenience
    };

    const handleSave = async () => {
        if (!amount || !category) {
            Alert.alert('Missing Info', 'Please enter amount and category.');
            return;
        }

        const transactionId = Date.now().toString();
        let recurrenceRuleId: string | undefined;

        if (isRecurring) {
            const ruleId = `rule_${Date.now()}`;
            // Ensure start date is valid ISO
            const start = startDate ? new Date(startDate) : new Date();
            const nextDue = start.toISOString();

            const rule: RecurrenceRule = {
                id: ruleId,
                frequency: frequency as RecurrenceFrequency,
                startDate: nextDue,
                endDate: (!endsNever && endDate) ? new Date(endDate).toISOString() : undefined,
                nextDueDate: nextDue,
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

        const transaction: Transaction = {
            id: transactionId,
            type,
            amount: parseFloat(amount),
            category,
            subCategory: subCategory || undefined,
            note: note || undefined,
            date: new Date().toISOString(),
            isRecurring,
            recurrenceId: recurrenceRuleId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        await saveTransaction(transaction);

        Alert.alert('Success', 'Transaction saved!', [
            {
                text: 'OK',
                onPress: () => {
                    resetForm();
                    navigation.goBack();
                }
            }
        ]);
    };

    return (
        <ScreenWrapper>
            <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 20 }}>New Transaction</Text>

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
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Amount</Text>
                    <TextInput
                        style={{ color: type === 'EXPENSE' ? colors.error : colors.success, fontSize: 32, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.gray300}
                    />
                </Card>

                {/* Category Grid */}
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>Category</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat.value}
                            onPress={() => setCategory(cat.value)}
                            style={{
                                width: '30%',
                                backgroundColor: category === cat.value ? colors.primary : colors.surface,
                                padding: 12,
                                borderRadius: 12,
                                marginBottom: 12,
                                alignItems: 'center',
                                borderWidth: 1,
                                borderColor: category === cat.value ? colors.primary : colors.border
                            }}
                        >
                            <Ionicons name={cat.icon as any} size={24} color={category === cat.value ? '#FFF' : colors.text} />
                            <Text style={{ color: category === cat.value ? '#FFF' : colors.text, fontSize: 12, marginTop: 4, textAlign: 'center' }}>{cat.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Details */}
                <Card>
                    <Text style={{ color: colors.textSecondary, marginBottom: 8 }}>Sub Category (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8, marginBottom: 16 }}
                        value={subCategory}
                        onChangeText={setSubCategory}
                        placeholder="e.g. Water Bill"
                        placeholderTextColor={colors.gray500}
                    />

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
                <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 16 }}>Recurring Transaction?</Text>
                        <TouchableOpacity onPress={() => setIsRecurring(!isRecurring)}>
                            <Ionicons name={isRecurring ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {isRecurring && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Frequency</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                                {RECURRENCE_OPTIONS.filter(o => o.value !== 'NONE').map(opt => (
                                    <Text
                                        key={opt.value}
                                        onPress={() => setFrequency(opt.value)}
                                        style={{
                                            color: frequency === opt.value ? '#FFF' : colors.text,
                                            backgroundColor: frequency === opt.value ? colors.primary : colors.background,
                                            padding: 8,
                                            borderRadius: 8,
                                            marginRight: 8,
                                            marginBottom: 8,
                                            overflow: 'hidden'
                                        }}
                                    >
                                        {opt.label}
                                    </Text>
                                ))}
                            </View>

                            <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Start Date (YYYY-MM-DD)</Text>
                            <TextInput
                                style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8, marginBottom: 16 }}
                                value={startDate}
                                onChangeText={setStartDate}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor={colors.gray500}
                            />

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={{ color: colors.textSecondary, marginRight: 10 }}>Ends Never?</Text>
                                <TouchableOpacity onPress={() => setEndsNever(!endsNever)}>
                                    <Ionicons name={endsNever ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {!endsNever && (
                                <>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>End Date (YYYY-MM-DD)</Text>
                                    <TextInput
                                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8, marginBottom: 10 }}
                                        value={endDate}
                                        onChangeText={setEndDate}
                                        placeholder="YYYY-MM-DD"
                                        placeholderTextColor={colors.gray500}
                                    />
                                </>
                            )}
                        </View>
                    )}
                </Card>

                <Button title="Save Transaction" onPress={handleSave} style={{ marginBottom: 40 }} />
            </ScrollView>
        </ScreenWrapper>
    );
};
export default RecordScreen;
