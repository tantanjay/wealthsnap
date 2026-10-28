import React, { useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius } from '@styles/theme';
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
    const { ds } = useTheme();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [exDate, setExDate] = useState(new Date());
    const [paymentDate, setPaymentDate] = useState<Date | undefined>(new Date());
    const [amount, setAmount] = useState('');
    const [divType, setDivType] = useState<'CASH' | 'STOCK' | 'SPECIAL' | 'PROPERTY'>('CASH');
    const [status, setStatus] = useState<'DECLARED' | 'PAID' | 'PROJECTED'>('PAID');

    // Date Picker State
    const [showExDatePicker, setShowExDatePicker] = useState(false);
    const [showPaymentDatePicker, setShowPaymentDatePicker] = useState(false);

    // Init with existing data if editing
    useEffect(() => {
        if (visible) {
            if (existingItem) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- initializes form fields from the item being edited on open; see FIXES.md
                setExDate(new Date(existingItem.exDate));
                setPaymentDate(existingItem.paymentDate ? new Date(existingItem.paymentDate) : undefined);
                setAmount(existingItem.amount.toString());
                setDivType(existingItem.type);
                setStatus(existingItem.status);
            } else {
                setExDate(new Date());
                setPaymentDate(new Date());
                setAmount('');
                setDivType('CASH');
                setStatus('PAID');
            }
        }
    }, [visible, existingItem]);

    const handleSave = async () => {
        if (!amount || isNaN(parseFloat(amount))) {
            showAlert("Invalid Input", "Please enter a valid amount.", undefined, { severity: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            const data = {
                symbol,
                exDate: exDate.toISOString(),
                paymentDate: paymentDate?.toISOString(),
                amount: new BigNumber(amount), // Service expects BigNumber/string depending on impl. addDividendHistory takes Omit<DividendHistory...> where amount is BigNumber.
                type: divType,
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
            title={existingItem ? "Edit dividend" : "Add dividend"}
            maxHeight="85%"
            footer={
                <TouchableOpacity
                    style={[styles.saveButton, { backgroundColor: ds.accent }]}
                    onPress={handleSave}
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <ActivityIndicator color={ds.onAccent} />
                    ) : (
                        <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save</Text>
                    )}
                </TouchableOpacity>
            }
        >
            <View style={styles.inputGroup}>
                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Ex-date</Text>
                <TouchableOpacity
                    style={[styles.input, { backgroundColor: ds.inset }]}
                    onPress={() => setShowExDatePicker(true)}
                >
                    <Text style={[type.bodyNum, { color: ds.text }]}>{exDate.toLocaleDateString()}</Text>
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

            <View style={styles.inputGroup}>
                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Payment date</Text>
                <TouchableOpacity
                    style={[styles.input, { backgroundColor: ds.inset }]}
                    onPress={() => setShowPaymentDatePicker(true)}
                >
                    <Text style={[type.bodyNum, { color: paymentDate ? ds.text : ds.text3 }]}>{paymentDate ? paymentDate.toLocaleDateString() : 'Select date'}</Text>
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

            <View style={styles.inputGroup}>
                <Text style={[type.small, styles.label, { color: ds.text2 }]}>Amount</Text>
                <TextInput
                    style={[type.bodyNum, styles.input, { backgroundColor: ds.inset, color: ds.text }]}
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0.00"
                    placeholderTextColor={ds.text3}
                    keyboardType="numeric"
                />
            </View>

            <View style={styles.pickerRow}>
                <View style={[styles.inputGroup, styles.pickerGroup]}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Type</Text>
                    <View style={[styles.pickerContainer, { backgroundColor: ds.inset }]}>
                        <Picker
                            selectedValue={divType}
                            onValueChange={(itemValue) => setDivType(itemValue)}
                            style={{ color: ds.text }}
                            dropdownIconColor={ds.text2}
                        >
                            <Picker.Item label="Cash" value="CASH" />
                            <Picker.Item label="Stock" value="STOCK" />
                            <Picker.Item label="Special" value="SPECIAL" />
                            <Picker.Item label="Property" value="PROPERTY" />
                        </Picker>
                    </View>
                </View>

                <View style={[styles.inputGroup, styles.pickerGroup]}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Status</Text>
                    <View style={[styles.pickerContainer, { backgroundColor: ds.inset }]}>
                        <Picker
                            selectedValue={status}
                            onValueChange={(itemValue) => setStatus(itemValue)}
                            style={{ color: ds.text }}
                            dropdownIconColor={ds.text2}
                        >
                            <Picker.Item label="Paid" value="PAID" />
                            <Picker.Item label="Declared" value="DECLARED" />
                            <Picker.Item label="Projected" value="PROJECTED" />
                        </Picker>
                    </View>
                </View>
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: space[4],
    },
    label: {
        marginBottom: space[2],
    },
    input: {
        borderRadius: radius.md,
        padding: space[3],
    },
    saveButton: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
    pickerRow: {
        flexDirection: 'row',
        gap: space[4],
    },
    pickerGroup: {
        flex: 1,
    },
    pickerContainer: {
        borderRadius: radius.md,
        overflow: 'hidden',
        justifyContent: 'center',
        height: 50, // Fixed height so both pickers line up
    },
});

export default DividendHistoryFormModal;
