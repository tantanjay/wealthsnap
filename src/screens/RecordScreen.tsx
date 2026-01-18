import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Alert, TouchableOpacity, Modal, Dimensions, Platform, TouchableWithoutFeedback } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Button, Card } from '../components';
import { saveTransaction, saveRecurrenceRule } from '../services/storageService';
import { Transaction, TransactionType, RecurrenceRule, RecurrenceFrequency } from '../types';
import { INCOME_CATEGORY_GROUPS, EXPENSE_CATEGORY_GROUPS, RECURRENCE_OPTIONS, getCategoryGroup } from '../constants/categories';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RecordScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [type, setType] = useState<TransactionType>('EXPENSE');
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState('');
    const [subCategory, setSubCategory] = useState('');
    const [note, setNote] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurringLabel, setRecurringLabel] = useState(''); // Label for recurring transaction
    const [frequency, setFrequency] = useState<string>('MONTHLY');
    const [startDate, setStartDate] = useState<Date>(new Date());
    const [endsNever, setEndsNever] = useState(true);
    const [endDate, setEndDate] = useState<Date>(new Date());

    // Date picker state
    const [showStartDatePicker, setShowStartDatePicker] = useState(false);
    const [showEndDatePicker, setShowEndDatePicker] = useState(false);

    // Calculator state
    const [showCalculator, setShowCalculator] = useState(false);
    const [calcDisplay, setCalcDisplay] = useState('0');
    const [calcOperator, setCalcOperator] = useState<string | null>(null);
    const [calcPrevValue, setCalcPrevValue] = useState<number | null>(null);
    const [calcWaitingForOperand, setCalcWaitingForOperand] = useState(false);

    // Category modal state
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
    const [categorySearch, setCategorySearch] = useState('');

    const categoryGroups = type === 'EXPENSE' ? EXPENSE_CATEGORY_GROUPS : INCOME_CATEGORY_GROUPS;

    // Filter categories based on search
    const filteredCategories = categorySearch.trim()
        ? categoryGroups.flatMap(g => g.items).filter(item =>
            item.label.toLowerCase().includes(categorySearch.toLowerCase()) ||
            item.value.toLowerCase().includes(categorySearch.toLowerCase())
        )
        : [];

    // Calculator functions
    const handleCalcDigit = (digit: string) => {
        if (calcWaitingForOperand) {
            setCalcDisplay(digit);
            setCalcWaitingForOperand(false);
        } else {
            setCalcDisplay(calcDisplay === '0' ? digit : calcDisplay + digit);
        }
    };

    const handleCalcDecimal = () => {
        if (calcWaitingForOperand) {
            setCalcDisplay('0.');
            setCalcWaitingForOperand(false);
        } else if (!calcDisplay.includes('.')) {
            setCalcDisplay(calcDisplay + '.');
        }
    };

    const handleCalcOperator = (op: string) => {
        const currentValue = parseFloat(calcDisplay);

        if (calcPrevValue !== null && calcOperator && !calcWaitingForOperand) {
            const result = performCalcOperation(calcPrevValue, currentValue, calcOperator);
            setCalcDisplay(String(result));
            setCalcPrevValue(result);
        } else {
            setCalcPrevValue(currentValue);
        }

        setCalcOperator(op);
        setCalcWaitingForOperand(true);
    };

    const performCalcOperation = (prev: number, current: number, op: string): number => {
        switch (op) {
            case '+': return prev + current;
            case '-': return prev - current;
            case '×': return prev * current;
            case '÷': return current !== 0 ? prev / current : 0;
            default: return current;
        }
    };

    const handleCalcEquals = () => {
        if (calcPrevValue !== null && calcOperator) {
            const currentValue = parseFloat(calcDisplay);
            const result = performCalcOperation(calcPrevValue, currentValue, calcOperator);
            setCalcDisplay(String(Math.round(result * 100) / 100)); // Round to 2 decimals
            setCalcPrevValue(null);
            setCalcOperator(null);
            setCalcWaitingForOperand(true);
        }
    };

    const handleCalcClear = () => {
        setCalcDisplay('0');
        setCalcPrevValue(null);
        setCalcOperator(null);
        setCalcWaitingForOperand(false);
    };

    const handleCalcApply = () => {
        const value = parseFloat(calcDisplay);
        if (!isNaN(value) && value > 0) {
            setAmount(String(Math.round(value * 100) / 100));
        }
        setShowCalculator(false);
        handleCalcClear();
    };

    const openCalculator = () => {
        if (amount) {
            setCalcDisplay(amount);
        } else {
            setCalcDisplay('0');
        }
        setShowCalculator(true);
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
        setCategorySearch('');
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
                            setSelectedGroup(null);
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
                <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.text, fontSize: 16 }}>Recurring Transaction?</Text>
                        <TouchableOpacity onPress={() => setIsRecurring(!isRecurring)}>
                            <Ionicons name={isRecurring ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    {isRecurring && (
                        <View style={{ marginTop: 10 }}>
                            <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Label (e.g. "Netflix Subscription")</Text>
                            <TextInput
                                style={{
                                    color: colors.text,
                                    fontSize: 16,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border,
                                    padding: 8,
                                    marginBottom: 16
                                }}
                                value={recurringLabel}
                                onChangeText={setRecurringLabel}
                                placeholder="Name this recurring transaction"
                                placeholderTextColor={colors.gray500}
                            />

                            <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Frequency</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                                {RECURRENCE_OPTIONS.filter(o => o.value !== 'NONE').map(opt => (
                                    <TouchableOpacity
                                        key={opt.value}
                                        onPress={() => setFrequency(opt.value)}
                                        style={{
                                            backgroundColor: frequency === opt.value ? colors.primary : colors.background,
                                            paddingVertical: 8,
                                            paddingHorizontal: 12,
                                            borderRadius: 8,
                                            marginRight: 8,
                                            marginBottom: 8,
                                            borderWidth: 1,
                                            borderColor: frequency === opt.value ? colors.primary : colors.border,
                                        }}
                                    >
                                        <Text style={{
                                            color: frequency === opt.value ? '#FFF' : colors.text,
                                            fontSize: 14,
                                        }}>
                                            {opt.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={{ color: colors.textSecondary, marginBottom: 5 }}>Start Date</Text>
                            <TouchableOpacity
                                onPress={() => setShowStartDatePicker(true)}
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: colors.background,
                                    padding: 12,
                                    borderRadius: 8,
                                    marginBottom: 16,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                }}
                            >
                                <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                                <Text style={{ color: colors.text, fontSize: 16 }}>
                                    {startDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                </Text>
                            </TouchableOpacity>
                            {showStartDatePicker && (
                                <DateTimePicker
                                    value={startDate}
                                    mode="date"
                                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                    onChange={(event: DateTimePickerEvent, date?: Date) => {
                                        setShowStartDatePicker(Platform.OS === 'ios');
                                        if (date) setStartDate(date);
                                    }}
                                />
                            )}

                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5 }}>
                                <Text style={{ color: colors.textSecondary, marginRight: 10 }}>Ends Never?</Text>
                                <TouchableOpacity onPress={() => setEndsNever(!endsNever)}>
                                    <Ionicons name={endsNever ? 'checkbox' : 'square-outline'} size={24} color={colors.primary} />
                                </TouchableOpacity>
                            </View>

                            {!endsNever && (
                                <>
                                    <Text style={{ color: colors.textSecondary, marginBottom: 5, marginTop: 10 }}>End Date</Text>
                                    <TouchableOpacity
                                        onPress={() => setShowEndDatePicker(true)}
                                        style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: colors.background,
                                            padding: 12,
                                            borderRadius: 8,
                                            marginBottom: 10,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                        }}
                                    >
                                        <Ionicons name="calendar" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                                        <Text style={{ color: colors.text, fontSize: 16 }}>
                                            {endDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                        </Text>
                                    </TouchableOpacity>
                                    {showEndDatePicker && (
                                        <DateTimePicker
                                            value={endDate}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            minimumDate={startDate}
                                            onChange={(event: DateTimePickerEvent, date?: Date) => {
                                                setShowEndDatePicker(Platform.OS === 'ios');
                                                if (date) setEndDate(date);
                                            }}
                                        />
                                    )}
                                </>
                            )}
                        </View>
                    )}
                </Card>

                <Button title="Save Transaction" onPress={handleSave} style={{ marginBottom: 40 }} />
            </ScrollView>

            {/* Calculator Modal */}
            <Modal
                visible={showCalculator}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCalculator(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowCalculator(false)}>
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'flex-end'
                    }}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={{
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                padding: 20,
                                paddingBottom: 40
                            }}>
                                {/* Calculator Header */}
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Calculator</Text>
                                    <TouchableOpacity onPress={() => setShowCalculator(false)}>
                                        <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Display */}
                                <View style={{
                                    backgroundColor: colors.background,
                                    borderRadius: 12,
                                    padding: 16,
                                    marginBottom: 16,
                                    minHeight: 70,
                                    justifyContent: 'center',
                                    alignItems: 'flex-end'
                                }}>
                                    <Text style={{
                                        color: type === 'EXPENSE' ? colors.error : colors.success,
                                        fontSize: 36,
                                        fontWeight: 'bold'
                                    }}>
                                        {calcDisplay}
                                    </Text>
                                    {calcOperator && (
                                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                                            {calcPrevValue} {calcOperator}
                                        </Text>
                                    )}
                                </View>

                                {/* Calculator Buttons */}
                                <View style={{ gap: 8 }}>
                                    {/* Row 1 */}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={handleCalcClear}
                                            style={{ flex: 1, backgroundColor: colors.error + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.error, fontSize: 20, fontWeight: 'bold' }}>C</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => setCalcDisplay(calcDisplay.slice(0, -1) || '0')}
                                            style={{ flex: 1, backgroundColor: colors.warning + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Ionicons name="backspace-outline" size={24} color={colors.warning} />
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleCalcOperator('÷')}
                                            style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>÷</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => handleCalcOperator('×')}
                                            style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>×</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Row 2 */}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {['7', '8', '9'].map(d => (
                                            <TouchableOpacity
                                                key={d}
                                                onPress={() => handleCalcDigit(d)}
                                                style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                            >
                                                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{d}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            onPress={() => handleCalcOperator('-')}
                                            style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>−</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Row 3 */}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {['4', '5', '6'].map(d => (
                                            <TouchableOpacity
                                                key={d}
                                                onPress={() => handleCalcDigit(d)}
                                                style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                            >
                                                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{d}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            onPress={() => handleCalcOperator('+')}
                                            style={{ flex: 1, backgroundColor: colors.primary + '30', borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.primary, fontSize: 20, fontWeight: 'bold' }}>+</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Row 4 */}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {['1', '2', '3'].map(d => (
                                            <TouchableOpacity
                                                key={d}
                                                onPress={() => handleCalcDigit(d)}
                                                style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                            >
                                                <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>{d}</Text>
                                            </TouchableOpacity>
                                        ))}
                                        <TouchableOpacity
                                            onPress={handleCalcEquals}
                                            style={{ flex: 1, backgroundColor: colors.success, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold' }}>=</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Row 5 */}
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        <TouchableOpacity
                                            onPress={() => handleCalcDigit('0')}
                                            style={{ flex: 2, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>0</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleCalcDecimal}
                                            style={{ flex: 1, backgroundColor: colors.background, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '600' }}>.</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={handleCalcApply}
                                            style={{ flex: 1, backgroundColor: colors.primary, borderRadius: 12, padding: 16, alignItems: 'center' }}
                                        >
                                            <Ionicons name="checkmark" size={24} color="#FFF" />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Category Selection Modal */}
            <Modal
                visible={showCategoryModal}
                transparent
                animationType="slide"
                onRequestClose={() => setShowCategoryModal(false)}
            >
                <TouchableWithoutFeedback onPress={() => {
                    setShowCategoryModal(false);
                    setCategorySearch('');
                }}>
                    <View style={{
                        flex: 1,
                        backgroundColor: 'rgba(0,0,0,0.5)',
                        justifyContent: 'flex-end'
                    }}>
                        <TouchableWithoutFeedback onPress={() => { }}>
                            <View style={{
                                backgroundColor: colors.surface,
                                borderTopLeftRadius: 24,
                                borderTopRightRadius: 24,
                                maxHeight: SCREEN_HEIGHT * 0.75,
                            }}>
                                {/* Modal Header */}
                                <View style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: 20,
                                    borderBottomWidth: 1,
                                    borderBottomColor: colors.border
                                }}>
                                    {selectedGroup ? (
                                        <TouchableOpacity
                                            onPress={() => setSelectedGroup(null)}
                                            style={{ flexDirection: 'row', alignItems: 'center' }}
                                        >
                                            <Ionicons name="arrow-back" size={24} color={colors.primary} />
                                            <Text style={{ color: colors.primary, fontSize: 16, marginLeft: 8 }}>Back</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                                            Select Category
                                        </Text>
                                    )}
                                    <TouchableOpacity onPress={() => {
                                        setShowCategoryModal(false);
                                        setCategorySearch('');
                                    }}>
                                        <Ionicons name="close-circle" size={28} color={colors.textSecondary} />
                                    </TouchableOpacity>
                                </View>

                                {/* Search Bar */}
                                {!selectedGroup && (
                                    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                                        <View style={{
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            backgroundColor: colors.background,
                                            borderRadius: 12,
                                            paddingHorizontal: 12,
                                            borderWidth: 1,
                                            borderColor: colors.border,
                                        }}>
                                            <Ionicons name="search" size={20} color={colors.textSecondary} />
                                            <TextInput
                                                style={{
                                                    flex: 1,
                                                    color: colors.text,
                                                    fontSize: 16,
                                                    padding: 12,
                                                }}
                                                value={categorySearch}
                                                onChangeText={setCategorySearch}
                                                placeholder="Search categories..."
                                                placeholderTextColor={colors.gray500}
                                            />
                                            {categorySearch.length > 0 && (
                                                <TouchableOpacity onPress={() => setCategorySearch('')}>
                                                    <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>
                                )}

                                {selectedGroup && (
                                    <View style={{ paddingHorizontal: 20, paddingTop: 12 }}>
                                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>{selectedGroup}</Text>
                                    </View>
                                )}

                                <ScrollView
                                    contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
                                    showsVerticalScrollIndicator={false}
                                >
                                    {/* Show search results */}
                                    {categorySearch.trim() && !selectedGroup ? (
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                            {filteredCategories.length > 0 ? (
                                                filteredCategories.map(item => (
                                                    <TouchableOpacity
                                                        key={item.value}
                                                        onPress={() => {
                                                            setCategory(item.value);
                                                            setSubCategory('');
                                                            setShowCategoryModal(false);
                                                            setSelectedGroup(null);
                                                            setCategorySearch('');
                                                        }}
                                                        style={{
                                                            width: '47%',
                                                            backgroundColor: category === item.value ? colors.primary : colors.background,
                                                            padding: 16,
                                                            borderRadius: 12,
                                                            alignItems: 'center',
                                                            borderWidth: 1,
                                                            borderColor: category === item.value ? colors.primary : colors.border,
                                                        }}
                                                    >
                                                        <View style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 20,
                                                            backgroundColor: category === item.value ? 'rgba(255,255,255,0.2)' : colors.primary + '20',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginBottom: 8
                                                        }}>
                                                            <Ionicons
                                                                name={item.icon as any}
                                                                size={22}
                                                                color={category === item.value ? '#FFF' : colors.primary}
                                                            />
                                                        </View>
                                                        <Text style={{
                                                            color: category === item.value ? '#FFF' : colors.text,
                                                            fontSize: 13,
                                                            fontWeight: '500',
                                                            textAlign: 'center'
                                                        }}>
                                                            {item.label}
                                                        </Text>
                                                        <Text style={{
                                                            color: category === item.value ? 'rgba(255,255,255,0.7)' : colors.textSecondary,
                                                            fontSize: 10,
                                                            marginTop: 2,
                                                            textAlign: 'center'
                                                        }}>
                                                            {getCategoryGroup(item.value, type)}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))
                                            ) : (
                                                <View style={{ flex: 1, alignItems: 'center', padding: 40 }}>
                                                    <Ionicons name="search-outline" size={48} color={colors.textSecondary} />
                                                    <Text style={{ color: colors.textSecondary, marginTop: 12, textAlign: 'center' }}>
                                                        No categories found for "{categorySearch}"
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    ) : !selectedGroup ? (
                                        // Show category groups
                                        <View style={{ gap: 12 }}>
                                            {categoryGroups.map(group => (
                                                <TouchableOpacity
                                                    key={group.group}
                                                    onPress={() => setSelectedGroup(group.group)}
                                                    style={{
                                                        flexDirection: 'row',
                                                        alignItems: 'center',
                                                        backgroundColor: colors.background,
                                                        padding: 16,
                                                        borderRadius: 12,
                                                        borderWidth: 1,
                                                        borderColor: colors.border,
                                                    }}
                                                >
                                                    <View style={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 22,
                                                        backgroundColor: colors.primary + '20',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        marginRight: 12
                                                    }}>
                                                        <Ionicons name={group.icon as any} size={24} color={colors.primary} />
                                                    </View>
                                                    <View style={{ flex: 1 }}>
                                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>{group.group}</Text>
                                                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                                                            {group.items.length} categories
                                                        </Text>
                                                    </View>
                                                    <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    ) : (
                                        // Show subcategories for selected group
                                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
                                            {categoryGroups
                                                .find(g => g.group === selectedGroup)
                                                ?.items.map(item => (
                                                    <TouchableOpacity
                                                        key={item.value}
                                                        onPress={() => {
                                                            setCategory(item.value);
                                                            setSubCategory('');
                                                            setShowCategoryModal(false);
                                                            setSelectedGroup(null);
                                                        }}
                                                        style={{
                                                            width: '47%',
                                                            backgroundColor: category === item.value ? colors.primary : colors.background,
                                                            padding: 16,
                                                            borderRadius: 12,
                                                            alignItems: 'center',
                                                            borderWidth: 1,
                                                            borderColor: category === item.value ? colors.primary : colors.border,
                                                        }}
                                                    >
                                                        <View style={{
                                                            width: 40,
                                                            height: 40,
                                                            borderRadius: 20,
                                                            backgroundColor: category === item.value ? 'rgba(255,255,255,0.2)' : colors.primary + '20',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            marginBottom: 8
                                                        }}>
                                                            <Ionicons
                                                                name={item.icon as any}
                                                                size={22}
                                                                color={category === item.value ? '#FFF' : colors.primary}
                                                            />
                                                        </View>
                                                        <Text style={{
                                                            color: category === item.value ? '#FFF' : colors.text,
                                                            fontSize: 13,
                                                            fontWeight: '500',
                                                            textAlign: 'center'
                                                        }}>
                                                            {item.label}
                                                        </Text>
                                                    </TouchableOpacity>
                                                ))}
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </ScreenWrapper>
    );
};
export default RecordScreen;
