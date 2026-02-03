import React, { useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { DividendHistory } from '@types';
import { addDividendHistory, updateDividendHistory } from '@services/domain/dividendHistoryService';

interface DividendHistoryFormModalProps {
    visible: boolean;
    onClose: () => void;
    symbol: string;
    existingItem?: DividendHistory | null;
    onSuccess: () => void;
}

const DividendHistoryFormModal: React.FC<DividendHistoryFormModalProps> = ({
    visible,
    onClose,
    symbol,
    existingItem,
    onSuccess
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [exDate, setExDate] = useState(new Date());
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'CASH' | 'STOCK' | 'SPECIAL' | 'PROPERTY'>('CASH');
    const [status, setStatus] = useState<'DECLARED' | 'PAID' | 'PROJECTED'>('PAID');

    // Date Picker State
    const [showExDatePicker, setShowExDatePicker] = useState(false);
    const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

    // Init with existing data if editing
    useEffect(() => {
        if (visible) {
            if (existingItem) {
                setExDate(new Date(existingItem.exDate));
                setPaymentDate(existingItem.paymentDate ? new Date(existingItem.paymentDate) : undefined);
                setAmount(existingItem.amount.toString());
                setType(existingItem.type);
                setStatus(existingItem.status);
            } else {
                setExDate(new Date());
                setPaymentDate(new Date());
                setAmount('');
                setType('CASH');
                setStatus('PAID');
            }
        }
    }, [visible, existingItem]);

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            showAlert("Invalid Input", "Please enter a valid amount.");
            return;
        }

        setIsLoading(true);
        try {
            const data = {
                symbol,
                exDate: exDate.toISOString(),
                paymentDate: paymentDate?.toISOString(),
                amount: new BigNumber(amount), // Service expects BigNumber/string depending on impl. addDividendHistory takes Omit<DividendHistory...> where amount is BigNumber.
                type,
                status,
                source: 'MANUAL' as const
            };

            if (existingItem) {
                await updateDividendHistory(existingItem.id, data);
            } else {
                await addDividendHistory(data);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to save dividend history", error);
            showAlert("Error", "Failed to save dividend entry.");
        } finally {
            setIsLoading(false);
        }
    };

    const onExDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        const currentDate = selectedDate || exDate;
        setShowExDatePicker(Platform.OS === 'ios');
        setExDate(currentDate);
    };

    const onPaymentDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        const currentDate = selectedDate || paymentDate;
        setShowPaymentDatePicker(Platform.OS === 'ios');
        setPaymentDate(currentDate);
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={existingItem ? "Edit Dividend" : "Add Dividend"}
            maxHeight="90%"
        >
            <View style={styles.content}>

                {/* Ex-Date */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Ex-Date</Text>
                    <TouchableOpacity
                        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => setShowExDatePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>{exDate.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showExDatePicker && (
                        <DateTimePicker
                            value={exDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onExDateChange}
                        />
                    )}
                </View>

                {/* Payment Date */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Payment Date</Text>
                    <TouchableOpacity
                        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => setShowPaymentDatePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>{paymentDate ? paymentDate.toLocaleDateString() : 'Select Date'}</Text>
                    </TouchableOpacity>
                    {showPaymentDatePicker && (
                        <DateTimePicker
                            value={paymentDate || new Date()}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onPaymentDateChange}
                        />
                    )}
                </View>

                {/* Amount */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Amount</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                        value={amount}
                        onChangeText={setAmount}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                    />
                </View>

                {/* Type & Status Row */}
                <View style={styles.row}>
                    <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
                        <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                            <Picker
                                selectedValue={type}
                                onValueChange={(itemValue) => setType(itemValue)}
                                style={{ color: colors.text }}
                                dropdownIconColor={colors.text}
                            >
                                <Picker.Item label="Cash" value="CASH" />
                                <Picker.Item label="Stock" value="STOCK" />
                                <Picker.Item label="Special" value="SPECIAL" />
                                <Picker.Item label="Property" value="PROPERTY" />
                            </Picker>
                        </View>
                    </View>

                    <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={[styles.label, { color: colors.textSecondary }]}>Status</Text>
                        <View style={[styles.pickerContainer, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                            <Picker
                                selectedValue={status}
                                onValueChange={(itemValue) => setStatus(itemValue)}
                                style={{ color: colors.text }}
                                dropdownIconColor={colors.text}
                            >
                                <Picker.Item label="Paid" value="PAID" />
                                <Picker.Item label="Declared" value="DECLARED" />
                                <Picker.Item label="Projected" value="PROJECTED" />
                            </Picker>
                        </View>
                    </View>
                </View>

                {/* Save Button */}
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: colors.primary }]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <Text style={styles.saveButtonText}>Save</Text>
                    )}
                </TouchableOpacity>
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    content: {
        paddingVertical: 10
    },
    inputGroup: {
        marginBottom: 16
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    label: {
        fontSize: 12,
        marginBottom: 8,
        fontWeight: '600'
    },
    input: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16
    },
    pickerContainer: {
        borderWidth: 1,
        borderRadius: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        height: 50 // Fixed height for alignment
    },
    saveButton: {
        marginTop: 10,
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center'
    },
    saveButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold'
    }
});

export default DividendHistoryFormModal;
