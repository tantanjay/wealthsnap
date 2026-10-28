import React, { useState, useEffect } from 'react';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { BigNumber } from 'bignumber.js';
import { View, Text, TextInput, ScrollView, TouchableOpacity, Platform, StyleSheet, ActivityIndicator, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import BottomModal from '@components/common/BottomModal';
import { CalculatorModal } from '@components/record/CalculatorModal';
import { Row, SectionHeader, SegmentedControl, SegmentOption } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { Investment, InvestmentType, InvestmentAction, Transaction, TransactionType, Asset } from '@types';
import { generateUUID } from '@utils/uuid';
import { saveInvestment, getAllInvestments } from '@services/domain/investmentService';
import { fetchExchangeRate } from '@services/integrations/currencyService';
import { getAllAssets } from '@services/domain/assetService';
import { addPriceHistory } from '@services/domain/priceHistoryService';
import { saveTransaction, getAllTransactions } from '@services/domain/transactionService';
import { calculatePortfolioMetrics } from '@utils/investmentMetrics';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { type, space, radius } from '@styles/theme';

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
    const { ds } = useTheme();
    const { showAlert } = useAlert();

    // Helper to get initial values (converting back to native if needed)
    const getInitialValue = (val: BigNumber | undefined, rate: BigNumber | undefined): string => {
        if (!val) return '';
        if (initialInvestment?.currency && initialInvestment.currency !== currency && rate && rate.isGreaterThan(0)) {
            // Convert Profile Currency -> Native Currency (Value / Rate)
            return val.dividedBy(rate).decimalPlaces(4).toString();
        }
        return val.toString();
    };

    const initialRate = initialInvestment?.exchangeRate ? new BigNumber(initialInvestment.exchangeRate) : undefined;

    // Form state
    const [symbol, setSymbol] = useState(initialInvestment?.symbol || '');
    const [action, setAction] = useState<InvestmentAction>(initialInvestment?.action || 'BUY');
    const [quantity, setQuantity] = useState(initialInvestment?.quantity.toString() || '');

    // Initialize price and fees in Native Currency if applicable
    const [price, setPrice] = useState(() => getInitialValue(initialInvestment?.price, initialRate));
    const [fees, setFees] = useState(() => getInitialValue(initialInvestment?.fees, initialRate));

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
    const [useNativeCurrency, setUseNativeCurrency] = useState(() => {
        if (initialInvestment && initialInvestment.currency) {
            // If editing, and investment has a currency different from standard profile currency
            return initialInvestment.currency !== currency;
        }
        return false;
    });


    // Exchange Rate State
    const [exchangeRate, setExchangeRate] = useState(initialInvestment?.exchangeRate?.toString() || '1');
    const [isFetchingRate, setIsFetchingRate] = useState(false);

    // Derived state for selected asset
    const selectedAsset = assets.find(a => a.symbol === symbol);
    const assetCurrency = selectedAsset?.currency;
    const showCurrencyCheckbox = assetCurrency && assetCurrency !== currency;

    // Reset checkbox when symbol changes (if not editing or if symbol changed from initial)
    useEffect(() => {
        if (!initialInvestment || initialInvestment.symbol !== symbol) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- resets form default when symbol changes; see FIXES.md
            setUseNativeCurrency(false);
            setExchangeRate('1');
        }
    }, [symbol, initialInvestment]);

    // Fetch Exchange Rate when useNativeCurrency is enabled
    useEffect(() => {
        const getRate = async () => {
            if (useNativeCurrency && assetCurrency && currency && assetCurrency !== currency) {
                // If editing and we already have a saved rate, don't overwrite it automatically unless user asks?
                // For now, let's fetch if current rate is 1 or empty.
                if (exchangeRate !== '1' && exchangeRate !== '') return;

                setIsFetchingRate(true);
                try {
                    const rate = await fetchExchangeRate(assetCurrency, currency);
                    if (rate) {
                        setExchangeRate(rate.toString());
                    }
                } catch (error) {
                    console.error('Failed to fetch exchange rate:', error);
                    // Fallback/Silent fail - user can edit manually
                } finally {
                    setIsFetchingRate(false);
                }
            }
        };

        if (useNativeCurrency) {
            getRate();
        }
    }, [useNativeCurrency, assetCurrency, exchangeRate, currency]);


    useEffect(() => {
        const fetchAssets = async () => {
            setLoadingAssets(true);
            try {
                const data = await getAllAssets();
                // Filter assets by type to match the selection from RecordMenu (e.g., STOCKS, FUNDS)
                const filteredData = data.filter(asset => asset.type === investmentType);
                setAssets(filteredData);

                // If editing, symbol is already set. If new and data exists, set first available asset
                if (!initialInvestment && filteredData.length > 0) {
                    setSymbol(prev => prev || filteredData[0].symbol);
                }
            } catch (error) {
                console.error('Failed to load assets for picker:', error);
                showAlert('Error', 'Failed to load assets dictionary.');
            } finally {
                setLoadingAssets(false);
            }
        };
        fetchAssets();
    }, [initialInvestment, showAlert, investmentType]);

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
    useEffect(() => {
        if (action !== 'SELL' || !quantity || !price) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- clears a now-invalid derived field; see FIXES.md
            if (realizedPL !== '') setRealizedPL(''); // clear if invalid
            return;
        }

        try {
            const qty = new BigNumber(quantity);
            let prc = new BigNumber(price);
            let f = new BigNumber(fees || 0);

            // Convert input to Profile Currency if using Native Currency
            // precise calculation for PL
            if (useNativeCurrency) {
                const rate = new BigNumber(exchangeRate || 1);
                prc = prc.multipliedBy(rate);
                f = f.multipliedBy(rate);
            }

            // Proceeds = (Price * Qty) - Fees
            const proceeds = qty.multipliedBy(prc).minus(f);

            // Cost Basis = AvgPrice * Qty (AvgPrice is already in Profile Currency)
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
    }, [quantity, price, fees, averageCost, action, realizedPL, useNativeCurrency, exchangeRate]);

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

        // Prepare Exchange Rate
        const finalExchangeRate = useNativeCurrency ? new BigNumber(exchangeRate || 1) : new BigNumber(1);

        // Convert values to Profile Currency if using Native Currency input
        const finalPrice = useNativeCurrency ? new BigNumber(price).multipliedBy(finalExchangeRate) : new BigNumber(price);
        const finalFees = fees
            ? (useNativeCurrency ? new BigNumber(fees).multipliedBy(finalExchangeRate) : new BigNumber(fees))
            : undefined;

        const newInvestment: Investment = {
            id: invId,
            symbol: symbol.toUpperCase(),
            type: investmentType,
            action,
            quantity: new BigNumber(quantity),
            price: finalPrice,
            currency: (useNativeCurrency && assetCurrency) ? assetCurrency : currency,
            exchangeRate: finalExchangeRate,
            fees: finalFees,
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
                        source: 'MANUAL',
                        currency: newInvestment.currency,
                        exchangeRate: newInvestment.exchangeRate,
                    }
                );
            }

            // Create corresponding transaction if checked
            if (createTransaction) {
                const totalAmount = newInvestment.quantity.multipliedBy(newInvestment.price);
                const feeAmount = newInvestment.fees || new BigNumber(0);

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

                // Note: finalAmount is derived from newInvestment.price which is ALREADY converted to Profile Currency.

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
                        // Realized PL is derived in effect above (Profile Currency)
                        let plValue = new BigNumber(realizedPL);

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
                                investmentId: invId,
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

    const actions: SegmentOption<InvestmentAction>[] = [
        { key: 'BUY', label: 'Buy' },
        { key: 'SELL', label: 'Sell' },
        { key: 'DIVIDEND', label: 'Dividend' },
    ];

    const title = initialInvestment
        ? 'Edit investment'
        : `New ${investmentType === 'STOCKS' ? 'stock' : investmentType === 'FUNDS' ? 'fund' : investmentType === 'CRYPTO' ? 'crypto' : 'investment'}`;

    const pl = parseFloat(realizedPL) || 0;
    const inputStyle = [type.bodyNum, styles.input, { color: ds.text }];

    return (
        <View style={[styles.page, { backgroundColor: ds.bg }]}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
                <Text style={[type.title, styles.title, { color: ds.text }]}>{title}</Text>

                <SegmentedControl options={actions} value={action} onChange={setAction} />

                {/* Asset */}
                <Text style={[type.small, styles.label, styles.groupLabel, { color: ds.text2 }]}>
                    {investmentType === 'FUNDS' ? 'Fund' : investmentType === 'CRYPTO' ? 'Coin' : 'Symbol'}
                </Text>
                <View style={[styles.field, { backgroundColor: ds.inset }]}>
                    <Ionicons name="pricetag-outline" size={18} color={ds.text2} />
                    {loadingAssets ? (
                        <ActivityIndicator color={ds.text2} style={styles.input} />
                    ) : (
                        <Picker
                            selectedValue={symbol}
                            onValueChange={(itemValue) => setSymbol(itemValue)}
                            style={[styles.picker, { color: ds.text }]}
                            dropdownIconColor={ds.text3}
                        >
                            <Picker.Item label="Select asset..." value="" enabled={false} />
                            {assets.map((asset) => (
                                <Picker.Item
                                    key={asset.symbol}
                                    label={`${asset.symbol} - ${asset.name || 'Unnamed'}`}
                                    value={asset.symbol}
                                />
                            ))}
                        </Picker>
                    )}
                </View>
                {assets.length === 0 && !loadingAssets && (
                    <Text style={[type.small, styles.hint, { color: ds.text2 }]}>
                        No assets found. Add one in Profile settings.
                    </Text>
                )}

                {/* Native currency */}
                {showCurrencyCheckbox && (
                    <>
                        <Row
                            title={useNativeCurrency ? `Using native currency (${assetCurrency})` : `Use native currency (${assetCurrency})`}
                            subtitle={useNativeCurrency
                                ? 'Investment kept in native. Transferred value converted using the rate below.'
                                : 'Save this investment in its original currency.'}
                            trailing={
                                <Switch
                                    value={useNativeCurrency}
                                    onValueChange={setUseNativeCurrency}
                                    trackColor={{ true: ds.accent }}
                                />
                            }
                            last
                        />
                        {useNativeCurrency && (
                            <>
                                <Text style={[type.small, styles.label, { color: ds.text2 }]}>
                                    Exchange rate (1 {assetCurrency} in {currency})
                                </Text>
                                <View style={[styles.field, { backgroundColor: ds.inset }]}>
                                    <Ionicons name="swap-horizontal-outline" size={18} color={ds.text2} />
                                    <TextInput
                                        style={inputStyle}
                                        value={exchangeRate}
                                        onChangeText={setExchangeRate}
                                        keyboardType="numeric"
                                        placeholder="1.0"
                                        placeholderTextColor={ds.text3}
                                    />
                                    {isFetchingRate && <ActivityIndicator size="small" color={ds.text2} />}
                                    <Text style={[type.body, { color: ds.text2 }]}>{currency}</Text>
                                </View>
                            </>
                        )}
                    </>
                )}

                {/* Date and time */}
                <View style={styles.pair}>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Date</Text>
                        <TouchableOpacity onPress={() => setShowDatePicker(true)} style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="calendar-outline" size={18} color={ds.text2} />
                            <Text style={[type.bodyNum, { color: ds.text }]}>
                                {investmentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Time</Text>
                        <TouchableOpacity onPress={() => setShowTimePicker(true)} style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="time-outline" size={18} color={ds.text2} />
                            <Text style={[type.bodyNum, { color: ds.text }]}>
                                {investmentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                        </TouchableOpacity>
                    </View>
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

                <SectionHeader title="Amounts" />

                {/* Quantity and price */}
                <View style={styles.pair}>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Quantity</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="layers-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={inputStyle}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ds.text3}
                            />
                        </View>
                    </View>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Price</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="pricetags-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={inputStyle}
                                value={price}
                                onChangeText={setPrice}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ds.text3}
                            />
                            <TouchableOpacity onPress={() => setShowPriceCalculator(true)} hitSlop={space[2]}>
                                <Ionicons name="calculator-outline" size={18} color={ds.text2} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Fees and total (auto-calculated) */}
                <View style={styles.pair}>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Fees</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="receipt-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={inputStyle}
                                value={fees}
                                onChangeText={setFees}
                                keyboardType="numeric"
                                placeholder="0.00"
                                placeholderTextColor={ds.text3}
                            />
                            <TouchableOpacity onPress={() => setShowFeesCalculator(true)} hitSlop={space[2]}>
                                <Ionicons name="calculator-outline" size={18} color={ds.text2} />
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.pairItem}>
                        <Text style={[type.small, styles.label, { color: ds.text2 }]}>Total</Text>
                        <Text style={[type.bodyNum, styles.readOnly, { color: ds.text }]} numberOfLines={1}>
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
                    </View>
                </View>

                {/* Realized P/L (sell only) */}
                {action === 'SELL' && (
                    <>
                        <Text style={[type.small, styles.label, styles.groupLabel, { color: ds.text2 }]}>Realized P/L</Text>
                        <View style={[styles.field, { backgroundColor: ds.inset }]}>
                            <Ionicons name="trending-up-outline" size={18} color={ds.text2} />
                            <TextInput
                                style={[type.bodyNum, styles.input, { color: pl >= 0 ? ds.success : ds.danger }]}
                                value={realizedPL}
                                onChangeText={setRealizedPL}
                                keyboardType="numeric" // Note: iOS numeric keyboard doesn't always have minus sign!
                                placeholder="0.00"
                                placeholderTextColor={ds.text3}
                            />
                            <TouchableOpacity onPress={() => setShowPLCalculator(true)} hitSlop={space[2]}>
                                <Ionicons name="calculator-outline" size={18} color={ds.text2} />
                            </TouchableOpacity>
                        </View>

                        {quantity && price && (
                            <View style={styles.hint}>
                                {(() => {
                                    const qty = new BigNumber(quantity);
                                    const prc = new BigNumber(price);
                                    const f = new BigNumber(fees || 0);
                                    const proceeds = qty.multipliedBy(prc).minus(f);

                                    return (
                                        <View style={styles.hintRow}>
                                            <Text style={[type.smallNum, { color: ds.text2 }]}>
                                                Avg cost: {formatCurrencyAmount(averageCost)}
                                            </Text>
                                            <Text style={[type.smallNum, { color: ds.text2 }]}>
                                                Proceeds: {formatCurrencyAmount(proceeds)}
                                            </Text>
                                        </View>
                                    );
                                })()}
                                <Text style={[type.small, { color: ds.text2 }]}>
                                    Auto-calculated. Edit if needed.
                                </Text>
                                {pl < 0 && (
                                    <Text style={[type.small, { color: ds.text2 }]}>
                                        Loss includes {formatCurrencyAmount(new BigNumber(fees || 0))} fees + price difference.
                                    </Text>
                                )}
                                {(pl > 0 && (parseFloat(fees) || 0) > 0) && (
                                    <Text style={[type.small, { color: ds.text2 }]}>
                                        Net gain after deducting {formatCurrencyAmount(new BigNumber(fees || 0))} fees.
                                    </Text>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* Note */}
                <Text style={[type.small, styles.label, styles.groupLabel, { color: ds.text2 }]}>Note</Text>
                <View style={[styles.field, { backgroundColor: ds.inset }]}>
                    <Ionicons name="create-outline" size={18} color={ds.text2} />
                    <TextInput
                        style={[type.body, styles.input, { color: ds.text }]}
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Optional"
                        placeholderTextColor={ds.text3}
                    />
                </View>

                {/* Linked transaction */}
                <SectionHeader title="Cash flow" />
                <Row
                    title={initialInvestment ? 'Linked transaction' : 'Record a transaction'}
                    subtitle={(() => {
                        if (initialInvestment) return 'Auto-updated with investment changes';
                        if (!createTransaction) return 'No transaction will be recorded';

                        switch (action) {
                            case 'BUY': return 'Will record as Transfer Out (cash out)';
                            case 'SELL': return 'Will record as Transfer In (cash in)';
                            case 'DIVIDEND': return 'Will record as Income';
                            default: return 'Will record a transaction';
                        }
                    })()}
                    trailing={
                        <View style={styles.trailing}>
                            <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={space[2]}>
                                <Ionicons name="information-circle-outline" size={20} color={ds.text2} />
                            </TouchableOpacity>
                            <Switch
                                value={createTransaction}
                                onValueChange={toggleCreateTransaction}
                                disabled={!!initialInvestment}
                                trackColor={{ true: ds.accent }}
                            />
                        </View>
                    }
                    last
                />

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
                    <Text style={[type.small, { color: ds.text2 }]}>
                        WealthSnap treats your finances as a connected ecosystem. When you buy or sell assets, money doesn&apos;t disappear—it moves.
                    </Text>

                    {/* Money flow: Cash ⇄ Portfolio */}
                    <View style={[styles.flow, { backgroundColor: ds.inset }]}>
                        <View style={styles.flowNode}>
                            <Ionicons name="cash-outline" size={20} color={ds.text2} />
                            <Text style={[type.smallMedium, { color: ds.text }]}>Cash / bank</Text>
                        </View>
                        <View style={styles.flowNode}>
                            <Ionicons name="swap-horizontal-outline" size={20} color={ds.text3} />
                            <Text style={[type.caption, { color: ds.text2 }]}>Transaction</Text>
                        </View>
                        <View style={styles.flowNode}>
                            <Ionicons name="bar-chart-outline" size={20} color={ds.text2} />
                            <Text style={[type.smallMedium, { color: ds.text }]}>Portfolio</Text>
                        </View>
                    </View>

                    <SectionHeader title="What happens if checked?" />
                    <Row
                        icon="log-out-outline"
                        title="Buying (transfer out)"
                        subtitle={`We deduct cash from your "Transfer Account" so you don't double-count your net worth (Cash + Asset).`}
                    />
                    <Row
                        icon="log-in-outline"
                        title="Selling (transfer in)"
                        subtitle={`Proceeds are added back to your cash balance. If you don't record this, the money effectively vanishes!`}
                    />
                    <Row
                        icon="add-circle-outline"
                        title="Dividends (income)"
                        subtitle={`"New money" entering your ecosystem. We record this as Income.`}
                        last
                    />

                    <View style={styles.tip}>
                        <Ionicons name="bulb-outline" size={20} color={ds.text2} />
                        <Text style={[type.small, styles.tipText, { color: ds.text2 }]}>
                            <Text style={[type.smallStrong, { color: ds.text }]}>Pro tip: </Text>
                            Uncheck this box only if you are manually correcting old data or if the transaction was already recorded separately.
                        </Text>
                    </View>
                </ScrollView>
            </BottomModal>

            {/* Fixed Footer Actions */}
            <View style={[styles.footer, { backgroundColor: ds.inset, borderTopColor: ds.hairline }]}>
                <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
                    <Text style={[type.body, { color: ds.text2 }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={[styles.saveButton, { backgroundColor: ds.accent }]}>
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Save investment</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const FOOTER_HEIGHT = space[3] + 48 + space[4] + 1;

const styles = StyleSheet.create({
    // RecordScreen adds no padding, so the page color and footer run edge to edge.
    page: {
        flex: 1,
    },
    content: {
        paddingHorizontal: space[5],
        paddingBottom: FOOTER_HEIGHT + space[6],
    },
    title: {
        marginTop: space[4],
        marginBottom: space[4],
    },
    label: {
        marginTop: space[3],
        marginBottom: space[1],
    },
    groupLabel: {
        marginTop: space[6],
    },
    field: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
        padding: space[3],
        borderRadius: radius.md,
    },
    // Android TextInput adds its own padding; zero it so typed fields match the pressable ones.
    input: {
        flex: 1,
        padding: 0,
    },
    // Android's Picker brings its own height and side padding; trim it to the field's size.
    picker: {
        flex: 1,
        marginVertical: -space[3],
        marginRight: -space[2],
    },
    readOnly: {
        paddingVertical: space[3],
    },
    pair: {
        flexDirection: 'row',
        gap: space[3],
    },
    pairItem: {
        flex: 1,
    },
    hint: {
        marginTop: space[2],
        gap: space[1],
    },
    hintRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[2],
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        gap: space[3],
        paddingTop: space[3],
        paddingHorizontal: space[5],
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
    flow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderRadius: radius.md,
        padding: space[4],
        marginTop: space[4],
    },
    flowNode: {
        flex: 1,
        alignItems: 'center',
        gap: space[1],
    },
    tip: {
        flexDirection: 'row',
        gap: space[3],
        marginTop: space[4],
    },
    tipText: {
        flex: 1,
    },
});
