import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '@components/index';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Transaction, TransferAccount } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveTransaction } from '@services/domain';

interface TransferFormProps {
    onSave: () => void;
    onCancel: () => void;
    initialTransaction?: Transaction;
    initialType?: 'TRANSFER_IN' | 'TRANSFER_OUT';
}

type TransferDirection = 'IN' | 'OUT';

const DEST_CONFIG: Record<TransferAccount, { icon: string; label: string }> = {
    OTHER_ACCOUNT: { icon: 'swap-horizontal', label: 'Account' },
    INVESTMENTS: { icon: 'trending-up', label: 'Invest' },
    DEBT: { icon: 'card-outline', label: 'Debt' },
    CASH_ATM: { icon: 'cash-outline', label: 'ATM/Cash' },
    DIGITAL_WALLET: { icon: 'wallet-outline', label: 'E-Wallet' },
    CRYPTO: { icon: 'logo-bitcoin', label: 'Crypto' },
    RECEIVABLE: { icon: 'people-outline', label: 'Lent' },
    TIME_DEPOSIT: { icon: 'lock-closed-outline', label: 'Locked' },
};
export const TransferForm: React.FC<TransferFormProps> = ({
    onSave,
    onCancel,
    initialTransaction,
    initialType
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    const getInitialDirection = (): TransferDirection => {
        if (initialTransaction) {
            if (initialTransaction.type === 'TRANSFER_IN') return 'IN';
            if (initialTransaction.type === 'TRANSFER_OUT') return 'OUT';
        }
        if (initialType === 'TRANSFER_IN') return 'IN';
        return 'OUT';
    };

    // Form state
    const [direction, setDirection] = useState<TransferDirection>(getInitialDirection());
    const [destination, setDestination] = useState<TransferAccount | null>(initialTransaction?.transferAccount || null);

    // Default destination if switching to OUT and none selected
    const [selectedDestOption, setSelectedDestOption] = useState<TransferAccount>(
        initialTransaction?.transferAccount || 'OTHER_ACCOUNT'
    );

    const [amount, setAmount] = useState(initialTransaction?.amount.toString() || '');
    const [note, setNote] = useState(initialTransaction?.note || '');
    const [transactionDate, setTransactionDate] = useState<Date>(
        initialTransaction?.date ? new Date(initialTransaction.date) : new Date()
    );

    // UI state
    const [showTransactionDatePicker, setShowTransactionDatePicker] = useState(false);
    const [showTransactionTimePicker, setShowTransactionTimePicker] = useState(false);
    const [showCalculator, setShowCalculator] = useState(false);

    const handleSave = async () => {
        if (!amount) {
            showAlert('Missing Info', 'Please enter an amount.');
            return;
        }

        const newId = initialTransaction?.id || generateUUID();

        const newTransaction: Transaction = {
            id: newId,
            type: direction === 'IN' ? 'TRANSFER_IN' : 'TRANSFER_OUT',
            amount: new BigNumber(amount),
            category: 'Transfer', // Default category for transfers
            subCategory: direction === 'IN' ? 'Incoming' : 'Outgoing',
            note: note || undefined,
            date: transactionDate.toISOString(),
            isRecurring: false, // Initial version doesn't support recurring transfers yet
            creationMethod: initialTransaction?.creationMethod || 'MANUAL',
            transferAccount: (destination || selectedDestOption),
            createdAt: initialTransaction?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveTransaction(newTransaction);

            showAlert('Success', 'Transfer saved!', [
                {
                    text: 'OK',
                    onPress: onSave
                }
            ]);
        } catch (error) {
            console.error('Failed to save transfer', error);
            showAlert('Error', 'Failed to save transfer');
        }
    };

    const handleDirectionChange = (newDir: TransferDirection) => {
        setDirection(newDir);
        if (newDir === 'IN') {
            setDestination(null);
        } else {
            setDestination(selectedDestOption);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>
                    {initialTransaction ? 'Edit Transfer' : 'New Transfer'}
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

                {/* Direction Toggle */}
                <View style={{ flexDirection: 'row', marginBottom: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}>
                    <TouchableOpacity
                        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: direction === 'OUT' ? colors.error : 'transparent', borderRadius: 8 }}
                        onPress={() => handleDirectionChange('OUT')}
                    >
                        <Text style={{ color: direction === 'OUT' ? '#FFF' : colors.text, fontWeight: 'bold' }}>Send</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={{ flex: 1, padding: 12, alignItems: 'center', backgroundColor: direction === 'IN' ? colors.success : 'transparent', borderRadius: 8 }}
                        onPress={() => handleDirectionChange('IN')}
                    >
                        <Text style={{ color: direction === 'IN' ? '#FFF' : colors.text, fontWeight: 'bold' }}>Receive</Text>
                    </TouchableOpacity>
                </View>

                <Card style={{ marginBottom: 10, paddingHorizontal: 16 }}>
                    <Text style={{
                        color: colors.textSecondary,
                        fontSize: 12,
                        textTransform: 'uppercase',
                        letterSpacing: 1,
                        marginBottom: 16
                    }}>
                        Transfer Destination
                    </Text>

                    <View style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'space-between'
                    }}>
                        {(Object.keys(DEST_CONFIG) as TransferAccount[]).map((opt) => {
                            const isActive = selectedDestOption === opt;
                            const config = DEST_CONFIG[opt];

                            return (
                                <TouchableOpacity
                                    key={opt}
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        setSelectedDestOption(opt);
                                        setDestination(opt);
                                    }}
                                    style={{
                                        width: '23%', // 4 columns; change to '31%' for 3 columns
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
                                        name={config.icon as any}
                                        size={22}
                                        color={isActive ? colors.primary : colors.textSecondary}
                                    />
                                    <Text style={{
                                        color: isActive ? colors.primary : colors.text,
                                        fontSize: 10,
                                        fontWeight: isActive ? '700' : '500',
                                        marginTop: 6,
                                        textAlign: 'center'
                                    }}>
                                        {config.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </Card>

                {/* Amount */}
                <Card>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ color: colors.textSecondary }}>Amount</Text>
                        <TouchableOpacity onPress={() => setShowCalculator(true)} style={{ padding: 4 }}>
                            <Ionicons name="calculator" size={24} color={colors.primary} />
                        </TouchableOpacity>
                    </View>
                    <TextInput
                        style={{ color: direction === 'OUT' ? colors.error : colors.success, fontSize: 32, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0.00"
                        placeholderTextColor={colors.gray300}
                    />
                </Card>

                {/* Note */}
                <Card>
                    <Text style={{ color: colors.textSecondary }}>Note (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Check reference, bank transfer ID, etc."
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                {/* Modals */}
                <CalculatorModal
                    visible={showCalculator}
                    onClose={() => setShowCalculator(false)}
                    initialValue={amount}
                    onApply={setAmount}
                    type={direction === 'IN' ? 'INCOME' : 'EXPENSE'} // Reuse income/expense styling for calculator
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
                    title="Save Transfer"
                    onPress={handleSave}
                    style={{ flex: 1 }}
                />
            </View>
        </View>
    );
};
