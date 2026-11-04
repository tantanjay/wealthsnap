import React, { useEffect, useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { Group } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius } from '@styles/theme';
import { PriceHistory } from '@types';
import { addPriceHistory, updatePriceHistory } from '@services/domain/priceHistoryService';

interface PriceHistoryFormModalProps {
    visible: boolean;
    onClose: () => void;
    symbol: string;
    existingItem?: PriceHistory | null;
    onSuccess: () => void;
}

const PriceHistoryFormModal: React.FC<PriceHistoryFormModalProps> = ({
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
    const [date, setDate] = useState(new Date());
    const [price, setPrice] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Init with existing data if editing
    useEffect(() => {
        if (visible) {
            if (existingItem) {
                // eslint-disable-next-line react-hooks/set-state-in-effect -- initializes form fields from the item being edited on open; see FIXES.md
                setDate(new Date(existingItem.timestamp));
                setPrice(existingItem.price.toString());
            } else {
                setDate(new Date());
                setPrice('');
            }
        }
    }, [visible, existingItem]);

    const handleSave = async () => {
        if (!price || isNaN(parseFloat(price))) {
            showAlert("Invalid Input", "Please enter a valid price.", undefined, { severity: 'error' });
            return;
        }

        setIsLoading(true);
        try {
            if (existingItem) {
                await updatePriceHistory(existingItem.id, price, {
                    timestamp: date.toISOString(),
                    source: 'MANUAL'
                });
            } else {
                await addPriceHistory(symbol, price, {
                    timestamp: date.toISOString(),
                    source: 'MANUAL'
                });
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to save price history", error);
            showAlert("Error", "Failed to save price entry.");
        } finally {
            setIsLoading(false);
        }
    };

    const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
    };

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={existingItem ? "Edit price" : "Add price"}
            maxHeight="60%"
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
            <Group padded>
                <View style={styles.inputGroup}>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Date</Text>
                    <TouchableOpacity
                        style={[styles.input, { backgroundColor: ds.inset }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={[type.bodyNum, { color: ds.text }]}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()}
                        />
                    )}
                </View>

                <View>
                    <Text style={[type.small, styles.label, { color: ds.text2 }]}>Price</Text>
                    <TextInput
                        style={[type.bodyNum, styles.input, { backgroundColor: ds.inset, color: ds.text }]}
                        value={price}
                        onChangeText={setPrice}
                        placeholder="0.00"
                        placeholderTextColor={ds.text3}
                        keyboardType="numeric"
                    />
                </View>
            </Group>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    inputGroup: {
        marginBottom: space[3],
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
});

export default PriceHistoryFormModal;
