import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert, Platform } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
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
    const { colors } = useTheme();
    const [isLoading, setIsLoading] = useState(false);

    // Form State
    const [date, setDate] = useState(new Date());
    const [price, setPrice] = useState('');
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Init with existing data if editing
    useEffect(() => {
        if (visible) {
            if (existingItem) {
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
            Alert.alert("Invalid Input", "Please enter a valid price.");
            return;
        }

        setIsLoading(true);
        try {
            if (existingItem) {
                await updatePriceHistory(existingItem.id, price, {
                    timestamp: date.toISOString(),
                    source: 'MANUAL' // Keep it manual or force manual? existingItem.source? If editing, likely stays manual.
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
            Alert.alert("Error", "Failed to save price entry.");
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
            title={existingItem ? "Edit Price" : "Add Price"}
            maxHeight="60%"
        >
            <View style={styles.content}>
                {/* Date Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Date</Text>
                    <TouchableOpacity
                        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={{ color: colors.text }}>{date.toLocaleDateString()}</Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={date}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={onDateChange}
                            maximumDate={new Date()} // Future prices? maybe not.
                        />
                    )}
                </View>

                {/* Price Input */}
                <View style={styles.inputGroup}>
                    <Text style={[styles.label, { color: colors.textSecondary }]}>Price</Text>
                    <TextInput
                        style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface, color: colors.text }]}
                        value={price}
                        onChangeText={setPrice}
                        placeholder="0.00"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="numeric"
                    />
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

export default PriceHistoryFormModal;
