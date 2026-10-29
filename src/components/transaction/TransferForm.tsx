import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, Pressable, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Group, SectionHeader, SegmentedControl } from '@components/ds';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { DebtType, Transaction, TransferAccount } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveTransaction } from '@services/domain/transactionService';
import { type, space, radius, layout } from '@styles/theme';

interface TransferFormProps {
    onSave: () => void;
    onCancel: () => void;
    initialTransaction?: Transaction;
    initialType?: 'TRANSFER_IN' | 'TRANSFER_OUT';
}

type TransferDirection = 'IN' | 'OUT';

// Excludes 'SAVINGS_GOAL': that transferAccount value is only ever stamped programmatically
// by savingsGoalService (contribution/withdrawal/sweep), always paired with a specific
// savingsGoalId - it's not a generic manual-transfer destination a user picks here.
const DEST_CONFIG: Record<Exclude<TransferAccount, 'SAVINGS_GOAL'>, { icon: string; label: string }> = {
    OTHER_ACCOUNT: { icon: 'swap-horizontal-outline', label: 'Account' },
    INVESTMENTS: { icon: 'trending-up-outline', label: 'Invest' },
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
    const { ds } = useTheme();
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
    const [destination, setDestination] = useState<TransferAccount | DebtType | null>(initialTransaction?.transferAccount || null);

    // Default destination if switching to OUT and none selected
    const [selectedDestOption, setSelectedDestOption] = useState<TransferAccount | DebtType>(
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

        await saveTransaction(newTransaction);

        setAmount('');
        setNote('');

        if (initialTransaction) {
            onSave();
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

    const fieldLabel = [type.small, styles.fieldLabel, { color: ds.text2 }];
    const fieldBox = [styles.field, { backgroundColor: ds.inset }];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[type.title, styles.title, { color: ds.text }]}>
                    {initialTransaction ? 'Edit transfer' : 'New transfer'}
                </Text>

                <SegmentedControl
                    options={[{ key: 'OUT', label: 'Send' }, { key: 'IN', label: 'Receive' }]}
                    value={direction}
                    onChange={handleDirectionChange}
                />

                {/* Amount */}
                <Group padded style={styles.firstGroup}>
                    <View style={styles.amountLabelRow}>
                        <Text style={[type.small, { color: ds.text2 }]}>Amount</Text>
                        <Pressable onPress={() => setShowCalculator(true)} hitSlop={space[2]} accessibilityRole="button" accessibilityLabel="Open calculator">
                            <Ionicons name="calculator-outline" size={22} color={ds.text2} />
                        </Pressable>
                    </View>
                    <TextInput
                        style={[type.recordAmount, styles.amountInput, { color: ds.text }]}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={ds.text3}
                    />
                </Group>

                <SectionHeader title="Transfer destination" grouped />
                <Group padded>
                    <View style={styles.tileGrid}>
                        {(Object.keys(DEST_CONFIG) as Exclude<TransferAccount, 'SAVINGS_GOAL'>[]).map((opt) => {
                            const isActive = selectedDestOption === opt;
                            const config = DEST_CONFIG[opt];

                            return (
                                <Pressable
                                    key={opt}
                                    onPress={() => {
                                        setSelectedDestOption(opt);
                                        setDestination(opt);
                                    }}
                                    style={[styles.tile, { backgroundColor: isActive ? ds.accentSoft : ds.inset }]}
                                >
                                    <Ionicons name={config.icon as any} size={20} color={isActive ? ds.accent : ds.text2} />
                                    <Text style={[type.small, { color: isActive ? ds.accent : ds.text }]} numberOfLines={1}>
                                        {config.label}
                                    </Text>
                                </Pressable>
                            );
                        })}
                    </View>
                </Group>

                {/* Date, Time and Note */}
                <SectionHeader title="Details" grouped />
                <Group padded>
                    <View style={styles.dateRow}>
                        <View style={styles.dateCol}>
                            <Text style={fieldLabel}>Date</Text>
                            <Pressable onPress={() => setShowTransactionDatePicker(true)} style={fieldBox}>
                                <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                                <Text style={[type.body, { color: ds.text }]} numberOfLines={1}>
                                    {transactionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                </Text>
                            </Pressable>
                        </View>
                        <View style={styles.dateCol}>
                            <Text style={fieldLabel}>Time</Text>
                            <Pressable onPress={() => setShowTransactionTimePicker(true)} style={fieldBox}>
                                <Ionicons name="time-outline" size={18} color={ds.text2} />
                                <Text style={[type.body, { color: ds.text }]} numberOfLines={1}>
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
                            style={[type.body, styles.fieldInput, { color: ds.text }]}
                            value={note}
                            onChangeText={setNote}
                            placeholder="Check reference, bank transfer ID, etc."
                            placeholderTextColor={ds.text3}
                        />
                    </View>
                </Group>

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
            <View style={[styles.footer, { backgroundColor: ds.group, borderTopColor: ds.hairline }]}>
                <Pressable onPress={onCancel} style={styles.cancelButton} accessibilityRole="button">
                    <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                </Pressable>
                <Pressable onPress={handleSave} style={[styles.saveButton, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save transfer</Text>
                </Pressable>
            </View>
        </View>
    );
};

const FOOTER_HEIGHT = space[3] + 48 + space[4] + 1;

const styles = StyleSheet.create({
    // Bottom padding clears the fixed footer.
    content: {
        paddingHorizontal: layout.groupInset,
        paddingBottom: FOOTER_HEIGHT + space[6],
    },
    title: {
        marginTop: space[4],
        marginBottom: space[4],
        paddingHorizontal: layout.groupPadding,
    },
    firstGroup: {
        marginTop: space[4],
    },
    amountLabelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    amountInput: {
        paddingTop: space[1],
        paddingBottom: 0,
        paddingHorizontal: 0,
    },
    // 4 columns; '23%' + space-between leaves the gutters between tiles.
    tileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        rowGap: space[2],
    },
    tile: {
        width: '23%',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[1],
        paddingVertical: space[3],
        paddingHorizontal: space[1],
        borderRadius: radius.md,
    },
    dateRow: {
        flexDirection: 'row',
        gap: space[3],
    },
    dateCol: {
        flex: 1,
    },
    fieldLabel: {
        marginBottom: space[1],
    },
    fieldGap: {
        marginTop: space[3],
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
        paddingHorizontal: layout.groupInset,
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
