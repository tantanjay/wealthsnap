import React, { useState, useEffect } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import BottomModal from '@components/common/BottomModal';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { Button, Card } from '@components/index';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Investment, InvestmentType, InvestmentAction, Transaction, TransactionType, Asset } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveInvestment, getAllInvestments } from '@services/domain/investmentService';
import { getAllAssets } from '@services/domain/assetService';
import { addPriceHistory } from '@services/domain/priceHistoryService';
import { saveTransaction, getAllTransactions } from '@services/domain/transactionService';
import { calculatePortfolioMetrics } from '@utils/investmentMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface InvestmentFormProps {
    investmentType: InvestmentType;
    initialInvestment?: Investment;
    currency: string;
    onSave: () => void;
    onCancel: () => void;
}

export const InvestmentForm: React.FC<InvestmentFormProps> = ({
    investmentType,
    initialInvestment,
    currency,
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
    const [createTransaction, setCreateTransaction] = useState(true);
    const [linkedTransactionId, setLinkedTransactionId] = useState<string | null>(null);
    const [showInfoModal, setShowInfoModal] = useState(false);

    // P/L State
    const [averageCost, setAverageCost] = useState<BigNumber>(new BigNumber(0));
    const [realizedPL, setRealizedPL] = useState('');
    const [showPLCalculator, setShowPLCalculator] = useState(false);

    // Asset fetching state
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loadingAssets, setLoadingAssets] = useState(false);

    // Currency state
    const [useNativeCurrency, setUseNativeCurrency] = useState(
        initialInvestment && initialInvestment.currency && initialInvestment.currency !== currency
            ? true
            : false
    );

    // Derived state for selected asset
    const selectedAsset = assets.find(a => a.symbol === symbol);
    const assetCurrency = selectedAsset?.currency;
    const showCurrencyCheckbox = assetCurrency && assetCurrency !== currency;

    // Reset checkbox when symbol changes (if not editing or if symbol changed from initial)
    useEffect(() => {
        if (!initialInvestment || initialInvestment.symbol !== symbol) {
            setUseNativeCurrency(false);
        }
    }, [symbol]);

    useEffect(() => {
        const fetchAssets = async () => {
            setLoadingAssets(true);
            try {
                const data = await getAllAssets();
                setAssets(data);

                // If editing, symbol is already set. If new and data exists, maybe set first?
                // Using functional update to avoid adding 'symbol' to dependency array/loop
                if (!initialInvestment && data.length > 0) {
                    setSymbol(prev => prev || data[0].symbol);
                }
            } catch (error) {
                console.error('Failed to load assets for picker:', error);
                showAlert('Error', 'Failed to load assets dictionary.');
            } finally {
                setLoadingAssets(false);
            }
        };
        fetchAssets();
    }, [initialInvestment, showAlert]);

    // Check for linked transaction
    useEffect(() => {
        const checkLinked = async () => {
            if (initialInvestment) {
                const txs = await getAllTransactions();
                const linked = txs.find(t => t.investmentId === initialInvestment.id);
                if (linked) {
                    setLinkedTransactionId(linked.id);
                    setCreateTransaction(true);
                }
            }
        };
        checkLinked();
    }, [initialInvestment]);

    // Calculate Average Cost when symbol changes
    useEffect(() => {
        const fetchAvgCost = async () => {
            if (!symbol) return;
            try {
                // We need all investments for this symbol to calc avg cost
                // Optimization: Maybe create a service method to just get avg cost?
                // For now, fetching all investments is checking the cache mostly.
                const allInvestments = await getAllInvestments();
                const symbolInvestments = allInvestments.filter(i => i.symbol === symbol);

                if (symbolInvestments.length > 0) {
                    const metrics = calculatePortfolioMetrics(symbolInvestments);
                    setAverageCost(metrics.averagePrice);
                } else {
                    setAverageCost(new BigNumber(0));
                }
            } catch (e) {
                console.error("Error calculating avg cost", e);
            }
        };
        fetchAvgCost();
    }, [symbol]);

    // Auto-calculate Realized P/L when inputs change (only if not manually overridden?) 
    // For simplicity, we just calculate it. If user edits it, they can. 
    // But if inputs change afterwards, it might overwrite? 
    // Standard UX: Auto-calc unless dirtied. But simpler: Just Auto-calc always on input change.
    useEffect(() => {
        if (action !== 'SELL' || !quantity || !price) {
            if (realizedPL !== '') setRealizedPL(''); // clear if invalid
            return;
        }

        try {
            const qty = new BigNumber(quantity);
            const prc = new BigNumber(price);
            const f = new BigNumber(fees || 0);

            // Proceeds = (Price * Qty) - Fees
            const proceeds = qty.multipliedBy(prc).minus(f);

            // Cost Basis = AvgPrice * Qty
            const costBasis = qty.multipliedBy(averageCost);

            const calcPL = proceeds.minus(costBasis);
            const newValue = calcPL.toFixed(2);

            // Only update if the calculated value is different to avoid cursor jumping/loops
            if (realizedPL !== newValue) {
                setRealizedPL(newValue);
            }
        } catch {
            // ignore parsing errors
        }
    }, [quantity, price, fees, averageCost, action, realizedPL]);

    // UI state
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [showPriceCalculator, setShowPriceCalculator] = useState(false);
    const [showFeesCalculator, setShowFeesCalculator] = useState(false);

    const toggleCreateTransaction = () => {
        if (createTransaction) {
            // Unchecking - show warning
            let message = '';
            switch (action) {
                case 'BUY':
                    message = 'This will not deduct from your total assets (cash/accounts).';
                    break;
                case 'SELL':
                    message = 'This will not add to your total assets. The funds will vanish.';
                    break;
                case 'DIVIDEND':
                    message = 'This will not be recorded as INCOME in your financial records.';
                    break;
            }

            showAlert('Are you sure?', message, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Yes, Skip', onPress: () => setCreateTransaction(false), style: 'destructive' }
            ]);
        } else {
            setCreateTransaction(true);
        }
    };

    const handleSave = async () => {
        if (!symbol || !quantity || !price) {
            showAlert('Missing Info', 'Please enter symbol, quantity and price.');
            return;
        }

        const invId = initialInvestment?.id || generateUUID();

        const newInvestment: Investment = {
            id: invId,
            symbol: symbol.toUpperCase(),
            type: investmentType,
            action,
            quantity: new BigNumber(quantity),
            price: new BigNumber(price),
            currency: (useNativeCurrency && assetCurrency) ? assetCurrency : currency,
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

            // Add to price history if purchasing or selling
            if (action === 'BUY' || action === 'SELL') {
                await addPriceHistory(
                    newInvestment.symbol,
                    newInvestment.price,
                    {
                        timestamp: newInvestment.date,
                        source: 'MANUAL'
                    }
                );
            }

            // Create corresponding transaction if checked
            if (createTransaction) {
                const totalAmount = newInvestment.quantity.multipliedBy(newInvestment.price);
                const feeAmount = newInvestment.fees ? new BigNumber(fees) : new BigNumber(0);

                // Effective Amount Logic:
                // BUY: Cost = (Price * Qty) + Fees
                // SELL: Proceeds = (Price * Qty) - Fees
                // DIVIDEND: Income = (Price * Qty) - Fees (Tax usually)
                let finalAmount: BigNumber;
                let txnType: TransactionType = 'EXPENSE'; // Default safety
                let transferAccount: any = undefined;

                if (action === 'BUY') {
                    finalAmount = totalAmount.plus(feeAmount);
                    txnType = 'TRANSFER_OUT';
                    transferAccount = 'INVESTMENTS';
                } else if (action === 'SELL') {
                    finalAmount = totalAmount.minus(feeAmount);
                    txnType = 'TRANSFER_IN';
                    transferAccount = 'INVESTMENTS';
                } else if (action === 'DIVIDEND') {
                    finalAmount = totalAmount.minus(feeAmount);
                    txnType = 'INCOME';
                } else {
                    finalAmount = totalAmount; // Fallback
                }

                if (finalAmount.isGreaterThan(0)) {
                    // 1. Primary Transaction (Cash Movement)
                    const newTxn: Transaction = {
                        id: linkedTransactionId || generateUUID(), // Use existing ID if updating
                        date: newInvestment.date,
                        amount: finalAmount,
                        type: txnType,
                        category: action === 'DIVIDEND' ? 'Dividend' : 'Investment',
                        note: `Auto-generated from Investment (${symbol} ${action})`,
                        creationMethod: 'MANUAL',
                        isRecurring: false,
                        transferAccount: transferAccount,
                        investmentId: invId,
                        createdAt: initialInvestment ? (initialInvestment.createdAt || new Date().toISOString()) : new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    };
                    await saveTransaction(newTxn);

                    // 2. Secondary Transaction (Realized Gain/Loss) - ONLY FOR SELL
                    if (action === 'SELL' && realizedPL) {
                        const plValue = new BigNumber(realizedPL);

                        // We only record if there is a P/L (not zero)
                        if (!plValue.isZero()) {
                            const isGain = plValue.isGreaterThan(0);
                            const plAmount = plValue.abs();

                            const plTxn: Transaction = {
                                id: generateUUID(),
                                date: newInvestment.date,
                                amount: plAmount,
                                type: isGain ? 'CAPITAL_GAIN' : 'CAPITAL_LOSS',
                                category: 'Investment',
                                subCategory: isGain ? 'Realized Gain' : 'Realized Loss',
                                note: `Realized ${isGain ? 'Gain' : 'Loss'} from selling ${symbol} ${newInvestment.quantity.toFixed(4)} qty`,
                                creationMethod: 'MANUAL',
                                isRecurring: false,
                                investmentId: invId, // Link to same investment
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                            };
                            await saveTransaction(plTxn);
                        }
                    }
                }
            }

            setSymbol('');
            setQuantity('');
            setPrice('');
            setFees('');
            setNotes('');
            setCreateTransaction(true);

            if (initialInvestment) {
                onSave();
            }
        } catch (error) {
            console.error(error);
            showAlert('Error', 'Failed to save investment.');
        }
    };

    const actions: { label: string; value: InvestmentAction; color: string }[] = [
        { label: 'Buy', value: 'BUY', color: colors.success },
        { label: 'Sell', value: 'SELL', color: colors.error },
        { label: 'Dividend', value: 'DIVIDEND', color: colors.primary },
    ];

    return (
        <View style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold', marginVertical: 10 }}>
                    {initialInvestment ? 'Edit Investment' : `New ${investmentType === 'STOCKS' ? 'Stock' : investmentType === 'FUNDS' ? 'Fund' : 'Investment'}`}
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

                {/* Transaction Checkbox */}
                <TouchableOpacity
                    onPress={initialInvestment ? undefined : toggleCreateTransaction}
                    activeOpacity={initialInvestment ? 0.6 : 0.7}
                    style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 8, opacity: initialInvestment ? 0.6 : 1 }}
                >
                    <Ionicons
                        name={createTransaction ? "checkbox" : "square-outline"}
                        size={24}
                        color={createTransaction ? colors.primary : colors.textSecondary}
                        style={{ marginRight: 8 }}
                    />
                    <Text style={{ color: colors.text, fontSize: 14, flex: 1 }}>
                        {initialInvestment ? "Linked Transaction (Auto-updated)" : "Add corresponding transaction?"}
                    </Text>
                    <TouchableOpacity onPress={() => setShowInfoModal(true)}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </TouchableOpacity>

                {/* Symbol Selection */}
                <Card style={{ marginBottom: 10 }}>
                    <Text style={{ color: colors.textSecondary }}>{investmentType === 'FUNDS' ? 'Select Asset' : 'Select Symbol'}</Text>
                    {loadingAssets ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 10 }} />
                    ) : (
                        <View style={{ marginHorizontal: -10 }}>
                            <Picker
                                selectedValue={symbol}
                                onValueChange={(itemValue) => setSymbol(itemValue)}
                                style={{ color: colors.text }}
                                dropdownIconColor={colors.text}
                            >
                                <Picker.Item label="Select Asset..." value="" enabled={false} />
                                {assets.map((asset) => (
                                    <Picker.Item
                                        key={asset.symbol}
                                        label={`${asset.symbol} - ${asset.name || 'Unnamed'}`}
                                        value={asset.symbol}
                                    />
                                ))}
                            </Picker>
                        </View>
                    )}
                    {assets.length === 0 && !loadingAssets && (
                        <Text style={{ color: colors.error, fontSize: 12, marginTop: 4 }}>
                            No assets found. Please add in Profile Settings.
                        </Text>
                    )}
                </Card>

                {/* Currency Checkbox - Premium Style */}
                {showCurrencyCheckbox && (
                    <TouchableOpacity
                        onPress={() => setUseNativeCurrency(!useNativeCurrency)}
                        activeOpacity={0.8}
                        style={{
                            marginBottom: 16,
                            borderRadius: 16,
                            borderWidth: 1,
                            borderColor: useNativeCurrency ? colors.primary : colors.border,
                            backgroundColor: useNativeCurrency ? colors.primary + '10' : colors.surface,
                            overflow: 'hidden'
                        }}
                    >
                        {/* Status Bar Decorator */}
                        {useNativeCurrency && (
                            <View style={{ height: 4, backgroundColor: colors.primary, width: '100%' }} />
                        )}

                        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                            <View style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: useNativeCurrency ? colors.primary : colors.surface,
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginRight: 12
                            }}>
                                <Ionicons
                                    name={useNativeCurrency ? "swap-horizontal" : "radio-button-off"}
                                    size={20}
                                    color={useNativeCurrency ? '#FFF' : colors.textSecondary}
                                />
                            </View>

                            <View style={{ flex: 1 }}>
                                <Text style={{
                                    color: useNativeCurrency ? colors.primary : colors.text,
                                    fontWeight: 'bold',
                                    fontSize: 14,
                                    marginBottom: 2
                                }}>
                                    {useNativeCurrency ? `Using Native Currency (${assetCurrency})` : `Switch to Native Currency (${assetCurrency})`}
                                </Text>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    {useNativeCurrency
                                        ? "Investment will be saved in its original currency."
                                        : "Tap to save this investment in its original currency."}
                                </Text>
                            </View>

                            {useNativeCurrency && (
                                <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                            )}
                        </View>
                    </TouchableOpacity>
                )}

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

                                const displayCurrency = (useNativeCurrency && assetCurrency) ? assetCurrency : currency;

                                return total.isNaN()
                                    ? formatCurrencyAmount(0, displayCurrency)
                                    : formatCurrencyAmount(total, displayCurrency);
                            })()}
                        </Text>
                    </Card>
                </View>

                {/* Realized P/L Display (Only for SELL) */}
                {action === 'SELL' && (
                    <Card style={{ marginTop: 10 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={{ color: colors.textSecondary }}>Realized P/L</Text>
                            <TouchableOpacity onPress={() => setShowPLCalculator(true)} style={{ padding: 4 }}>
                                <Ionicons name="calculator" size={20} color={colors.primary} />
                            </TouchableOpacity>
                        </View>
                        <TextInput
                            style={{
                                color: (parseFloat(realizedPL) || 0) >= 0 ? colors.success : colors.error,
                                fontSize: 20,
                                fontWeight: 'bold',
                                borderBottomWidth: 1,
                                borderBottomColor: colors.border,
                                padding: 8
                            }}
                            value={realizedPL}
                            onChangeText={setRealizedPL}
                            keyboardType="numeric" // Note: iOS numeric keyboard doesn't always have minus sign!
                            placeholder="0.00"
                            placeholderTextColor={colors.gray300}
                        />

                        {/* Info Footer */}
                        {quantity && price && (
                            <View style={{ marginTop: 8 }}>
                                {(() => {
                                    const qty = new BigNumber(quantity);
                                    const prc = new BigNumber(price);
                                    const f = new BigNumber(fees || 0);
                                    const proceeds = qty.multipliedBy(prc).minus(f);

                                    return (
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                Avg Cost: {formatCurrencyAmount(averageCost)}
                                            </Text>
                                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                Proceeds: {formatCurrencyAmount(proceeds)}
                                            </Text>
                                        </View>
                                    );
                                })()}
                                <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4, fontStyle: 'italic' }}>
                                    * Auto-calculated. Edit if needed.
                                </Text>
                                {(parseFloat(realizedPL) || 0) < 0 && (
                                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>
                                        * Loss includes {formatCurrencyAmount(new BigNumber(fees || 0))} fees + price difference
                                    </Text>
                                )}
                                {((parseFloat(realizedPL) || 0) > 0 && (parseFloat(fees) || 0) > 0) && (
                                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>
                                        * Net gain after deducting {formatCurrencyAmount(new BigNumber(fees || 0))} fees
                                    </Text>
                                )}
                            </View>
                        )}
                    </Card>
                )}

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

                {/* P/L Calculator */}
                <CalculatorModal
                    visible={showPLCalculator}
                    onClose={() => setShowPLCalculator(false)}
                    initialValue={realizedPL}
                    onApply={setRealizedPL}
                    type="INCOME"
                    allowNegative={true}
                    allowZero={true}
                />
            </ScrollView>

            <BottomModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Syncing Your Cash Flow"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 22, marginBottom: 20 }}>
                        WealthSnap treats your finances as a connected ecosystem. When you buy or sell assets, money doesn&apos;t disappear—it moves.
                    </Text>

                    {/* Visual Flow Diagram */}
                    <View style={{ backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: colors.border }}>
                        <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' }}>🔄 The Money Flow</Text>

                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <Ionicons name="wallet" size={24} color={colors.primary} />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Cash / Bank</Text>
                            </View>

                            <View style={{ flex: 1, alignItems: 'center' }}>
                                <Ionicons name="swap-horizontal" size={24} color={colors.textSecondary} />
                                <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 4 }}>Transaction</Text>
                            </View>

                            <View style={{ alignItems: 'center', flex: 1 }}>
                                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFD700' + '20', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                                    <Ionicons name="bar-chart" size={24} color="#F59E0B" />
                                </View>
                                <Text style={{ color: colors.text, fontSize: 12, fontWeight: '600' }}>Portfolio</Text>
                            </View>
                        </View>
                    </View>

                    <Text style={{ color: colors.text, fontSize: 16, fontWeight: 'bold', marginBottom: 12 }}>What happens if checked?</Text>

                    {/* Scenario: BUY */}
                    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                        <View style={{ width: 4, backgroundColor: colors.success, borderRadius: 2, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Buying (Transfer Out)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                                We deduct cash from your &quot;Transfer Account&quot; so you don&apos;t double-count your net worth (Cash + Asset).
                            </Text>
                        </View>
                    </View>

                    {/* Scenario: SELL */}
                    <View style={{ flexDirection: 'row', marginBottom: 16 }}>
                        <View style={{ width: 4, backgroundColor: colors.error, borderRadius: 2, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Selling (Transfer In)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                                Proceeds are added back to your cash balance. If you don&apos;t record this, the money effectively vanishes!
                            </Text>
                        </View>
                    </View>

                    {/* Scenario: DIVIDEND */}
                    <View style={{ flexDirection: 'row', marginBottom: 24 }}>
                        <View style={{ width: 4, backgroundColor: colors.primary, borderRadius: 2, marginRight: 12 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14 }}>Dividends (Income)</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
                                &quot;New money&quot; entering your ecosystem. We record this as Income.
                            </Text>
                        </View>
                    </View>

                    <View style={{ backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8, flexDirection: 'row' }}>
                        <Ionicons name="bulb-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.primary, fontSize: 12, flex: 1, lineHeight: 18 }}>
                            <Text style={{ fontWeight: 'bold' }}>Pro Tip:</Text> Uncheck this box only if you are manually correcting old data or if the transaction was already recorded separately.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </BottomModal>

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
