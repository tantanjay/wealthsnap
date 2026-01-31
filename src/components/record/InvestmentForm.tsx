import React, { useState } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Button, Card } from '@components/index';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Investment, InvestmentType, InvestmentAction } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveInvestment } from '@services/domain/investmentService';

interface InvestmentFormProps {
    investmentType: InvestmentType;
    initialInvestment?: Investment;
    onSave: () => void;
    onCancel: () => void;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({
    investmentType,
    initialInvestment,
    onSave,
    onCancel
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();

    // Form state
    const [symbol, setSymbol] = useState(initialInvestment?.symbol || '');
    const [action, setAction] = useState<InvestmentAction>(initialInvestment?.action || 'BUY');
    const [quantity, setQuantity] = useState(initialInvestment?.quantity.toString() || '');
    const [price, setPrice] = useState(initialInvestment?.price.toString() || '');
    const [fees, setFees] = useState(initialInvestment?.fees?.toString() || '');
    const [notes, setNotes] = useState(initialInvestment?.notes || '');
    const [investmentDate, setInvestmentDate] = useState<Date>(
        initialInvestment?.date ? new Date(initialInvestment.date) : new Date()
    );

    // UI state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showPriceCalculator, setShowPriceCalculator] = useState(false);
    const [showFeesCalculator, setShowFeesCalculator] = useState(false);

    const handleSave = async () => {
        if (!symbol || !quantity || !price) {
            showAlert('Missing Info', 'Please enter symbol, quantity and price.');
            return;
        }

        const newInvestment: Investment = {
            id: initialInvestment?.id || generateUUID(),
            symbol: symbol.toUpperCase(),
            type: investmentType,
            action,
            quantity: new BigNumber(quantity),
            price: new BigNumber(price),
            fees: fees ? new BigNumber(fees) : undefined,
            notes: notes || undefined,
            date: investmentDate.toISOString(),
            isRecurring: false, // Per request: "dont do anything about the recurring"
            creationMethod: initialInvestment?.creationMethod || 'MANUAL',
            createdAt: initialInvestment?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        try {
            await saveInvestment(newInvestment);
            showAlert('Success', 'Investment saved!', [
                {
                    text: 'Add More',
                    onPress: () => {
                        setSymbol('');
                        setQuantity('');
                        setPrice('');
                        setFees('');
                        setNotes('');
                        // Keep action and date for rapid entry
                    },
                    style: 'default'
                },
                {
                    text: 'Home',
                    onPress: onSave,
                    style: 'cancel'
                }
            ], { cancelable: false });
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to save investment.');
        }
    };

    const actions: { label: string; value: InvestmentAction; color: string }[] = [
        { label: 'Buy', value: 'BUY', color: colors.success },
        { label: 'Sell', value: 'SELL', color: colors.error },
        { label: 'Dividend', value: 'DIVIDEND', color: colors.primary },
        { label: 'Interest', value: 'INTEREST', color: colors.primary },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>
                    {initialInvestment ? 'Edit Investment' : `New ${investmentType === 'STOCKS' ? 'Stock' : 'Investment'}`}
                </Text>

                {/* Date and Time Selection */}
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
                    <TouchableOpacity
                        onPress={() => setShowDatePicker(true)}
                        style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Ionicons name="calendar-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Date</Text>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {investmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => setShowTimePicker(true)}
                        style={[styles.inputRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                    >
                        <Ionicons name="time-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <View>
                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>Time</Text>
                            <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                                {investmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>

                {showDatePicker && (
                    <DateTimePicker
                        value={investmentDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                            setShowDatePicker(Platform.OS === 'ios');
                            if (date) {
                                const newDate = new Date(investmentDate);
                                newDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                                setInvestmentDate(newDate);
                            }
                        }}
                    />
                )}

                {showTimePicker && (
                    <DateTimePicker
                        value={investmentDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(event: DateTimePickerEvent, date?: Date) => {
                            setShowTimePicker(Platform.OS === 'ios');
                            if (date) {
                                const newDate = new Date(investmentDate);
                                newDate.setHours(date.getHours(), date.getMinutes());
                                setInvestmentDate(newDate);
                            }
                        }}
                    />
                )}

                {/* Action Toggle */}
                <View style={{ flexDirection: 'row', marginBottom: 10, backgroundColor: colors.surface, borderRadius: 12, padding: 4 }}>
                    {actions.map((item) => (
                        <TouchableOpacity
                            key={item.value}
                            style={{
                                flex: 1,
                                padding: 12,
                                alignItems: 'center',
                                backgroundColor: action === item.value ? item.color : 'transparent',
                                borderRadius: 8
                            }}
                            onPress={() => setAction(item.value)}
                        >
                            <Text style={{ color: action === item.value ? '#FFF' : colors.text, fontWeight: 'bold', fontSize: 10 }} numberOfLines={1}>
                                {item.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Symbol */}
                <Card style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.textSecondary }}>Symbol</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={symbol}
                        onChangeText={setSymbol}
                        autoCapitalize="characters"
                        placeholder="AAPL"
                        placeholderTextColor={colors.gray300}
                    />
                </Card>

                {/* Quantity and Price */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Card style={{ flex: 1 }}>
                        <Text style={{ color: colors.textSecondary }}>Quantity</Text>
                        <TextInput
                            style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.gray300}
                        />
                    </Card>
                    <Card style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>Price</Text>
                            <TouchableOpacity onPress={() => setShowPriceCalculator(true)} style={{ padding: 4 }}>
                                <Ionicons name="calculator" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                            value={price}
                            onChangeText={setPrice}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.gray300}
                        />
                    </Card>
                </View>

                {/* Fees and Total (Auto-calculated) */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <Card style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>Fees</Text>
                            <TouchableOpacity onPress={() => setShowFeesCalculator(true)} style={{ padding: 4 }}>
                                <Ionicons name="calculator" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                            value={fees}
                            onChangeText={setFees}
                            keyboardType="numeric"
                            placeholder="0.00"
                            placeholderTextColor={colors.gray300}
                        />
                    </Card>
                    <Card style={{ flex: 1, opacity: 0.8 }}>
                        <Text style={{ color: colors.textSecondary }}>Total</Text>
                        <Text style={{ color: colors.text, fontSize: 20, fontWeight: 'bold', padding: 8 }}>
                            {(() => {
                                const qty = new BigNumber(quantity || 0);
                                const prc = new BigNumber(price || 0);
                                const f = new BigNumber(fees || 0);
                                const total = qty.multipliedBy(prc).plus(f);
                                return total.isNaN() ? '0.00' : total.toFixed(2);
                            })()}
                        </Text>
                    </Card>
                </View>

                {/* Note */}
                <Card>
                    <Text style={{ color: colors.textSecondary }}>Note (Optional)</Text>
                    <TextInput
                        style={{ color: colors.text, fontSize: 16, borderBottomWidth: 1, borderBottomColor: colors.border, padding: 8 }}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Description"
                        placeholderTextColor={colors.gray500}
                    />
                </Card>

                {/* Price Calculator */}
                <CalculatorModal
                    visible={showPriceCalculator}
                    onClose={() => setShowPriceCalculator(false)}
                    initialValue={price}
                    onApply={setPrice}
                    type="INCOME" // Green color for calculator
                />

                {/* Fees Calculator */}
                <CalculatorModal
                    visible={showFeesCalculator}
                    onClose={() => setShowFeesCalculator(false)}
                    initialValue={fees}
                    onApply={setFees}
                    type="EXPENSE" // Red color for calculator
                />
            </ScrollView>

            {/* Fixed Footer Actions */}
            <View style={[styles.footer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
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

const styles = StyleSheet.create({
    inputRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        borderWidth: 1,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingTop: 16,
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderTopWidth: 1,
        flexDirection: 'row',
        gap: 12
    }
});
