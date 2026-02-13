import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, ToastAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { getAllInvestments, deleteInvestment } from '@services/domain/investmentService';
import { getAllTransactions, deleteTransaction } from '@services/domain/transactionService';
import { getPriceHistory, deleteAllPriceHistory, addPriceHistory, deletePriceHistory } from '@services/domain/priceHistoryService';
import { getDividendHistory, deleteAutoDividendHistory, deleteDividendHistory } from '@services/domain/dividendHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { AssetRequest } from '@services/integrations/geminiService';
import { refreshAssetPrices, refreshAssetDividends } from '@services/domain/marketDataService';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { DividendHistory, PriceHistory, Investment, Transaction, Asset } from '@types';
import PriceHistoryFormModal from '@components/investments/modals/PriceHistoryFormModal';
import DividendHistoryFormModal from '@components/investments/modals/DividendHistoryFormModal';
import { useAIConsent } from '@hooks/useAIConsent';
import InvestmentOptionsModal from '@components/investments/modals/InvestmentOptionsModal';
import { useNavigation } from '@react-navigation/native';

interface InvestmentHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    symbol: string;
    currency: string;
    onDataChange?: () => void;
}

interface HistoryItem {
    id: string;
    date: string;
    type: 'BUY' | 'SELL' | 'DIVIDEND' | 'CAPITAL_GAIN' | 'CAPITAL_LOSS';
    amount: number;
    price?: number;
    shares?: number;
    note?: string;
    originalInvestment?: Investment;
}

type TabType = 'POSITIONS' | 'PRICES' | 'DIVIDENDS';

export const InvestmentHistoryModal: React.FC<InvestmentHistoryModalProps> = ({
    visible,
    onClose,
    symbol,
    currency,
    onDataChange
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const { checkConsent } = useAIConsent();
    const navigation = useNavigation<any>();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('POSITIONS');

    // Data states
    const [transactions, setTransactions] = useState<HistoryItem[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
    const [dividendHistory, setDividendHistory] = useState<DividendHistory[]>([]);
    const [asset, setAsset] = useState<Asset | null>(null);

    // Summary states
    const [realizedPL, setRealizedPL] = useState(0);

    // Edit Modal States
    const [priceFormVisible, setPriceFormVisible] = useState(false);
    const [dividendFormVisible, setDividendFormVisible] = useState(false);
    const [editingPrice, setEditingPrice] = useState<PriceHistory | null>(null);
    const [editingDividend, setEditingDividend] = useState<DividendHistory | null>(null);
    const [showManualOnly, setShowManualOnly] = useState(false);

    // AI Fetch State
    const [isFetchMenuVisible, setIsFetchMenuVisible] = useState(false);
    const [activeFetchMode, setActiveFetchMode] = useState<'price' | 'dividend'>('price');
    const [isFetching, setIsFetching] = useState(false);

    // Investment Options Modal State
    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [linkedTransaction, setLinkedTransaction] = useState<Transaction | null>(null);

    // Data Loading Functions
    const loadPositions = useCallback(async () => {
        // 1. Fetch all investments for this symbol to get their IDs
        const allInvestments = await getAllInvestments();
        const symbolInvestments = allInvestments.filter(inv => inv.symbol === symbol);
        const investmentIds = new Set(symbolInvestments.map(inv => inv.id));

        // Map investments to history items
        const investmentItems: HistoryItem[] = symbolInvestments.map(inv => ({
            id: inv.id,
            date: inv.date,
            type: inv.action === 'INTEREST' ? 'DIVIDEND' : inv.action,
            amount: inv.price.times(inv.quantity).toNumber(),
            price: inv.price.toNumber(),
            shares: inv.quantity.toNumber(),
            note: inv.notes,
            originalInvestment: inv
        }));

        // 2. Fetch all transactions to look for CAPITAL_GAIN/LOSS linked to these investments
        const allTransactions = await getAllTransactions();
        const linkedTransactions = allTransactions.filter(txn =>
            txn.investmentId && investmentIds.has(txn.investmentId) &&
            (txn.type === 'CAPITAL_GAIN' || txn.type === 'CAPITAL_LOSS')
        );

        // Calculate Realized P/L
        let totalPL = 0;
        const plItems: HistoryItem[] = linkedTransactions.map(txn => {
            const val = txn.amount.toNumber();
            if (txn.type === 'CAPITAL_GAIN') totalPL += val;
            if (txn.type === 'CAPITAL_LOSS') totalPL -= val;

            return {
                id: txn.id,
                date: txn.date,
                type: txn.type as 'CAPITAL_GAIN' | 'CAPITAL_LOSS',
                amount: val,
                note: txn.note
            };
        });

        setRealizedPL(totalPL);

        // Merge and sort by date descending
        const combinedHistory = [...investmentItems, ...plItems].sort((a, b) =>
            new Date(b.date).getTime() - new Date(a.date).getTime()
        );

        setTransactions(combinedHistory);
    }, [symbol]);

    const loadPrices = useCallback(async () => {
        const prices = await getPriceHistory(symbol);
        setPriceHistory(prices);
    }, [symbol]);

    const loadDividends = useCallback(async () => {
        const dividends = await getDividendHistory(symbol);
        setDividendHistory(dividends);
    }, [symbol]);

    const loadAsset = useCallback(async () => {
        const allAssets = await getAllAssets();
        const found = allAssets.find(a => a.symbol === symbol);
        setAsset(found || null);
    }, [symbol]);

    const loadAllHistory = useCallback(async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadPositions(),
                loadPrices(),
                loadDividends(),
                loadAsset()
            ]);
        } catch (error) {
            console.error("Failed to load investment history", error);
        } finally {
            setIsLoading(false);
        }
    }, [loadPositions, loadPrices, loadDividends, loadAsset]);

    useEffect(() => {
        if (visible && symbol) {
            loadAllHistory();
            setActiveTab('POSITIONS'); // Reset tab on open
        }
    }, [visible, symbol, loadAllHistory]);

    // Handlers
    const handleClearPrices = async () => {
        showAlert(
            "Clear Price History",
            "This will delete ALL price history for this symbol and regenerate it solely from your Investment records. This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear & Restore",
                    style: "destructive",
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            // 1. Delete all history
                            await deleteAllPriceHistory(symbol);

                            // 2. Fetch investments
                            const allInvestments = await getAllInvestments();
                            const symbolInvestments = allInvestments.filter(inv => inv.symbol === symbol);

                            // 3. Re-populate from investments
                            for (const inv of symbolInvestments) {
                                if (inv.price.isGreaterThan(0)) {
                                    await addPriceHistory(symbol, inv.price, {
                                        timestamp: inv.date,
                                        source: 'MANUAL',
                                        currency: inv.currency,
                                        exchangeRate: inv.exchangeRate
                                    });
                                }
                            }

                            await loadPrices();
                            onDataChange?.();

                        } catch (error) {
                            console.error("Failed to clear/restore prices", error);
                            showAlert("Error", "Failed to restore price history.");
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleClearAutoDividends = async () => {
        showAlert(
            "Clear Dividends History",
            "This will remove all auto-fetched dividends. Manual entries will be kept.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Clear Auto",
                    style: "destructive",
                    onPress: async () => {
                        setIsLoading(true);
                        try {
                            await deleteAutoDividendHistory(symbol);
                            await loadDividends();
                            onDataChange?.();
                        } catch (error) {
                            console.error("Failed to clear auto dividends", error);
                            showAlert("Error", "Failed to clear auto dividends.");
                        } finally {
                            setIsLoading(false);
                        }
                    }
                }
            ]
        );
    };

    // --- AI Fetch Handlers ---

    const openFetchMenu = async (mode: 'price' | 'dividend') => {
        // Validate Asset Type (Stock or Crypto Only)
        // Check local transactions first for efficiency or fetch asset info
        let isSupportedAsset = false;
        const position = transactions.find(t =>
            t.originalInvestment?.type === 'STOCKS' ||
            t.originalInvestment?.type === 'CRYPTO'
        );

        if (position) {
            isSupportedAsset = true;
        } else {
            // Fallback: Check Asset Service
            try {
                const allAssets = await getAllAssets();
                const asset = allAssets.find(a => a.symbol === symbol);
                if (asset?.type === 'STOCKS' || asset?.type === 'CRYPTO') {
                    isSupportedAsset = true;
                }
            } catch (e) {
                console.warn("Failed to verify asset type", e);
            }
        }

        if (!isSupportedAsset) {
            const msg = "AI Fetch is only available for Stocks and Crypto.";
            if (Platform.OS === 'android') {
                ToastAndroid.show(msg, ToastAndroid.SHORT);
            } else {
                showAlert("Not Available", msg);
            }
            return;
        }

        checkConsent(() => {
            setActiveFetchMode(mode);
            setIsFetchMenuVisible(true);
        });
    };

    const executeFetch = async (durationLabel: string) => {
        setIsFetchMenuVisible(false);

        // 1. Determine prompt duration string
        let durationPrompt = '';

        // Handle Price relative dates
        if (activeFetchMode === 'price') {
            if (durationLabel === 'Today') durationPrompt = 'Today';
            else if (durationLabel === 'Last 3 days') durationPrompt = 'Last 3 days';
            else if (durationLabel === 'Last 7 days') durationPrompt = 'Last 7 days';
            else if (durationLabel === 'Last 14 days') durationPrompt = 'Last 14 days';
            else if (durationLabel === 'Last 31 days') durationPrompt = 'Last 31 days';
            else if (durationLabel === 'Last 3 months') durationPrompt = 'Last 3 months';
            else if (durationLabel === 'Last 6 months') durationPrompt = 'Last 6 months';
            else if (durationLabel === 'Last 1 year') durationPrompt = 'Last 1 year';
            else return;
        } else {
            // Handle Dividend years
            const currentYear = new Date().getFullYear();
            let targetYear = currentYear;

            if (durationLabel === 'This Year') {
                targetYear = currentYear;
            } else {
                const parsedYear = parseInt(durationLabel);
                if (!isNaN(parsedYear)) {
                    targetYear = parsedYear;
                } else {
                    return; // Invalid
                }
            }

            durationPrompt = `From January 1, ${targetYear} to Present`;
        }

        const context = activeFetchMode === 'price' ? 'prices' : 'dividends';
        const displayLabel = activeFetchMode === 'dividend' ? durationPrompt : durationLabel;
        const msg = `Fetching ${context} for ${displayLabel}...`;
        if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.LONG);

        setIsFetching(true);

        try {
            // 2. Prepare Asset Request
            const allAssets = await getAllAssets();
            const assetInfo = allAssets.find(a => a.symbol === symbol);

            const assetRequest: AssetRequest = {
                symbol: symbol,
                exchange: assetInfo?.exchange || 'Unknown'
            };

            // 3. Call Market Data Service
            if (activeFetchMode === 'price') {
                try {
                    const savedCount = await refreshAssetPrices([assetRequest], durationPrompt, currency);
                    const successMsg = `Processed ${savedCount} prices.`;
                    if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.SHORT);
                    loadPrices();
                    onDataChange?.();
                } catch (err) {
                    console.error("Background fetch prices failed", err);
                    const errMsg = "Failed to update prices.";
                    if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
                } finally {
                    setIsFetching(false);
                }
            } else {
                try {
                    const savedCount = await refreshAssetDividends([assetRequest], durationPrompt);
                    const successMsg = `Processed ${savedCount} dividend records.`;
                    if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.SHORT);
                    loadDividends();
                    onDataChange?.();
                } catch (err) {
                    console.error("Background fetch dividends failed", err);
                    const errMsg = "Failed to update dividends.";
                    if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
                } finally {
                    setIsFetching(false);
                }
            }
        } catch (e) {
            console.error("Error initiating fetch", e);
            setIsFetching(false);
        }
    };

    // --- CRUD Handlers ---

    // Prices
    const handleAddPrice = () => {
        setEditingPrice(null);
        setPriceFormVisible(true);
    };

    const handleEditPrice = (item: PriceHistory) => {
        setEditingPrice(item);
        setPriceFormVisible(true);
    };

    const handleDeletePrice = async (id: string) => {
        showAlert(
            "Delete Price",
            "Are you sure you want to delete this price entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deletePriceHistory(id);
                            loadPrices();
                            onDataChange?.();
                        } catch (error) {
                            console.error("Failed to delete price", error);
                        }
                    }
                }
            ]
        );
    };

    // Dividends
    const handleAddDividend = () => {
        setEditingDividend(null);
        setDividendFormVisible(true);
    };

    const handleEditDividend = (item: DividendHistory) => {
        setEditingDividend(item);
        setDividendFormVisible(true);
    };

    const handleDeleteDividend = async (id: string) => {
        showAlert(
            "Delete Dividend",
            "Are you sure you want to delete this dividend entry?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDividendHistory(id);
                            loadDividends();
                            onDataChange?.();
                        } catch (error) {
                            console.error("Failed to delete dividend", error);
                        }
                    }
                }
            ]
        );
    };

    // Render Helpers
    const handlePositionPress = async (item: HistoryItem) => {
        if (!item.originalInvestment) return;

        // Find linked transaction if any
        const allTxs = await getAllTransactions();
        const linked = allTxs.find(t => t.investmentId === item.originalInvestment?.id);

        setSelectedInvestment(item.originalInvestment);
        setLinkedTransaction(linked || null);
    };

    const renderRightActions = (onDelete: () => void) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={onDelete}
            >
                <Ionicons name="trash-outline" size={24} color="#FFF" />
            </TouchableOpacity>
        );
    };

    const renderPositionsItem = ({ item }: { item: HistoryItem }) => {
        const isGain = item.type === 'CAPITAL_GAIN';
        const isLoss = item.type === 'CAPITAL_LOSS';

        let iconName: any = "help-circle";
        let color = colors.text;
        let sign = '';

        if (item.type === 'BUY') {
            iconName = "arrow-up-circle-outline";
            color = colors.success;
        } else if (item.type === 'SELL') {
            iconName = "arrow-down-circle-outline";
            color = colors.error;
            sign = '-';
        } else if (item.type === 'DIVIDEND') {
            iconName = "gift-outline";
            color = colors.primary;
            sign = '+';
        } else if (isGain) {
            iconName = "trending-up";
            color = colors.success;
            sign = '+';
        } else if (isLoss) {
            iconName = "trending-down";
            color = colors.error;
            sign = '-';
        }

        // Calculate Native Amount if Investment has Exchange Rate
        let displayAmountValue = new BigNumber(item.amount);
        let displayCurrency = currency; // Default to profile currency

        // Check if this item is part of an investment with exchange rate
        if (item.originalInvestment) {
            const inv = item.originalInvestment;
            displayCurrency = inv.currency || currency; // Use investment currency (e.g. USD)

            if (inv.exchangeRate && new BigNumber(inv.exchangeRate).isGreaterThan(1)) {
                displayAmountValue = displayAmountValue.dividedBy(inv.exchangeRate);
            }
        }

        const displayAmount = formatCurrencyAmount(displayAmountValue, displayCurrency);

        return (
            <TouchableOpacity
                style={[styles.itemContainer, { backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }]}
                onPress={() => handlePositionPress(item)}
                disabled={!item.originalInvestment}
            >
                <View style={[styles.iconContainer, { backgroundColor: color + '15' }]}>
                    <Ionicons name={iconName} size={20} color={color} />
                </View>

                <View style={styles.itemLeft}>
                    <Text style={[styles.itemType, { color: colors.text }]}>
                        {item.type === 'CAPITAL_GAIN' ? 'Realized Gain' :
                            item.type === 'CAPITAL_LOSS' ? 'Realized Loss' :
                                item.type.replace('_', ' ')}
                    </Text>
                    <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
                        {new Date(item.date).toLocaleDateString()}
                        {(item.shares !== undefined) && item.originalInvestment && (
                            <Text> • {item.shares} @ {formatCurrencyAmount(
                                item.price
                                    ? (item.originalInvestment.exchangeRate && new BigNumber(item.originalInvestment.exchangeRate).isGreaterThan(1)
                                        ? new BigNumber(item.price).dividedBy(item.originalInvestment.exchangeRate)
                                        : item.price)
                                    : 0,
                                displayCurrency
                            )}</Text>
                        )}
                    </Text>
                </View>

                <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: color }]}>
                        {sign}{displayAmount}
                    </Text>
                </View>

                {item.originalInvestment && (
                    <Ionicons name="chevron-forward" size={16} color={colors.textSecondary} style={{ marginLeft: 8 }} />
                )}
            </TouchableOpacity>
        );
    };



    const renderPriceItem = ({ item }: { item: PriceHistory }) => {
        const isManual = item.source === 'MANUAL';
        const isAiFetch = item.source === 'AI_FETCH';
        const canDelete = isManual || isAiFetch;

        // Calculate Native Price if applicable
        let displayPrice = item.price;
        let displayCurrency = currency;

        if (asset && asset.currency && asset.currency !== currency) {
            // Check if we have a valid exchange rate to convert back
            const rate = item.exchangeRate ? new BigNumber(item.exchangeRate) : new BigNumber(1);

            // Only convert if rate is NOT 1 (implies conversion happened or explicit rate exists)
            // If rate is 1, we assume parity or default (no conversion info), so likely safer to show stored info OR shows stored info is 1:1.
            // But user requested "compute to native".
            if (!rate.isEqualTo(1)) {
                displayPrice = item.price.dividedBy(rate);
                displayCurrency = asset.currency;
            }
        }

        const content = (
            <TouchableOpacity
                style={[styles.itemContainer, { backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }]}
                disabled={!isManual}
                onLongPress={() => isManual && handleEditPrice(item)}
                delayLongPress={500}
            >
                <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
                    {item.source === 'AI_FETCH' ? (
                        <Ionicons name="sparkles" size={18} color={colors.primary} />
                    ) : (
                        <Ionicons name="pricetag-outline" size={18} color={colors.primary} />
                    )}
                </View>

                <View style={styles.itemLeft}>
                    <Text style={[styles.itemType, { color: colors.text }]}>
                        {formatCurrencyAmount(displayPrice.toNumber(), displayCurrency)}
                    </Text>
                    <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
                        {new Date(item.timestamp).toLocaleDateString()}
                        {item.high && item.low && ` • H: ${item.high.toNumber()} L: ${item.low.toNumber()}`}
                    </Text>
                </View>

                {canDelete && (
                    <TouchableOpacity
                        style={{ padding: 8, marginLeft: 8 }}
                        onPress={() => handleDeletePrice(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );

        if (canDelete) {
            return (
                <Swipeable renderRightActions={() => renderRightActions(() => handleDeletePrice(item.id))}>
                    {content}
                </Swipeable>
            );
        }

        return content;
    };

    const renderDividendItem = ({ item }: { item: DividendHistory }) => {
        const isManual = item.source === 'MANUAL';
        const isAiFetch = item.source === 'AI_FETCH';
        const canDelete = isManual || isAiFetch;

        const content = (
            <TouchableOpacity
                style={[styles.itemContainer, { backgroundColor: colors.surface, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border }]}
                disabled={!isManual}
                onLongPress={() => isManual && handleEditDividend(item)}
                delayLongPress={500}
            >
                <View style={[styles.iconContainer, { backgroundColor: colors.success + '15' }]}>
                    {item.source === 'AI_FETCH' ? (
                        <Ionicons name="sparkles" size={18} color={colors.success} />
                    ) : (
                        <Ionicons name="cash-outline" size={18} color={colors.success} />
                    )}
                </View>

                <View style={styles.itemLeft}>
                    <Text style={[styles.itemType, { color: colors.text }]}>
                        {formatCurrencyAmount(item.amount.toNumber(), currency)}
                    </Text>
                    <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
                        Ex: {new Date(item.exDate).toLocaleDateString()}
                        {item.paymentDate && ` • Pay: ${new Date(item.paymentDate).toLocaleDateString()}`}
                    </Text>
                </View>

                <View style={styles.itemRight}>
                    <View style={{ backgroundColor: colors.success + '20', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}>
                        <Text style={{ color: colors.success, fontSize: 10, fontWeight: 'bold' }}>{item.type}</Text>
                    </View>
                </View>

                {canDelete && (
                    <TouchableOpacity
                        style={{ padding: 8, marginLeft: 8 }}
                        onPress={() => handleDeleteDividend(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );

        if (canDelete) {
            return (
                <Swipeable renderRightActions={() => renderRightActions(() => handleDeleteDividend(item.id))}>
                    {content}
                </Swipeable>
            );
        }

        return content;
    };

    const renderTabButton = (tab: TabType, label: string) => (
        <TouchableOpacity
            style={[
                styles.tabButton,
                activeTab === tab && { backgroundColor: colors.primary }
            ]}
            onPress={() => setActiveTab(tab)}
        >
            <Text style={[
                styles.tabText,
                { color: activeTab === tab ? '#FFF' : colors.text }
            ]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <>
            <InvestmentOptionsModal
                visible={!!selectedInvestment}
                investment={selectedInvestment}
                linkedTransaction={linkedTransaction}
                onClose={() => setSelectedInvestment(null)}
                currency={currency}
                onEdit={(inv) => {
                    setSelectedInvestment(null);
                    onClose();

                    // Serialize BigNumber fields to strings for navigation
                    const serializedInvestment = {
                        ...inv,
                        quantity: inv.quantity.toString(),
                        price: inv.price.toString(),
                        fees: inv.fees ? inv.fees.toString() : undefined,
                        exchangeRate: inv.exchangeRate ? inv.exchangeRate.toString() : undefined
                    };
                    navigation.navigate('Record', { investment: serializedInvestment });
                }}
                onDelete={async (id, deleteLinked) => {
                    try {
                        setIsLoading(true);
                        // Cascade delete logic (similar to HistoryScreen)
                        await deleteInvestment(id);
                        if (deleteLinked) {
                            // Fetch current transactions to be sure we get all linked ones
                            const currentTxs = await getAllTransactions();
                            const linkedTxs = currentTxs.filter(t => t.investmentId === id);
                            for (const tx of linkedTxs) {
                                await deleteTransaction(tx.id);
                            }
                        }

                        await loadAllHistory();
                        onDataChange?.();
                        setSelectedInvestment(null);
                    } catch (error) {
                        console.error('Failed to delete investment', error);
                        showAlert('Error', 'Failed to delete investment.');
                    } finally {
                        setIsLoading(false);
                    }
                }}
            />

            <BottomModal
                visible={visible}
                onClose={onClose}
                title={`${symbol} History`}
                maxHeight="85%"
            >
                <View style={styles.content}>
                    {/* Tabs */}
                    <View style={[styles.tabContainer, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                        {renderTabButton('POSITIONS', 'Positions')}
                        {renderTabButton('PRICES', 'Prices')}
                        {renderTabButton('DIVIDENDS', 'Dividends')}
                    </View>

                    {activeTab === 'POSITIONS' && (
                        <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Realized P/L</Text>
                            <Text style={[
                                styles.summaryValue,
                                { color: realizedPL >= 0 ? colors.success : colors.error }
                            ]}>
                                {realizedPL >= 0 ? '+' : ''}{formatCurrencyAmount(realizedPL, currency)}
                            </Text>
                        </View>
                    )}

                    {isLoading ? (
                        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <View style={{ flex: 1 }}>
                            {activeTab === 'POSITIONS' && (
                                <FlatList
                                    data={transactions}
                                    renderItem={renderPositionsItem}
                                    keyExtractor={item => item.id}
                                    contentContainerStyle={styles.listContent}
                                    ListEmptyComponent={
                                        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                            No position history found.
                                        </Text>
                                    }
                                />
                            )}
                            {activeTab === 'PRICES' && (
                                <View style={{ flex: 1 }}>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.filterButton}
                                            onPress={() => setShowManualOnly(!showManualOnly)}
                                        >
                                            <Ionicons
                                                name={showManualOnly ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={colors.primary}
                                            />
                                            <Text style={[styles.filterText, { color: colors.text }]}>Manual</Text>
                                        </TouchableOpacity>

                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={handleAddPrice}
                                            >
                                                <Ionicons name="add" size={18} color={colors.success} />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => openFetchMenu('price')}
                                                disabled={isFetching}
                                            >
                                                {isFetching && activeFetchMode === 'price' ? (
                                                    <ActivityIndicator size="small" color={colors.primary} />
                                                ) : (
                                                    <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={handleClearPrices}>
                                                <Ionicons name="trash-outline" size={18} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <FlatList
                                        data={priceHistory.filter(p => !showManualOnly || p.source === 'MANUAL')}
                                        renderItem={renderPriceItem}
                                        keyExtractor={item => item.id}
                                        contentContainerStyle={styles.listContent}
                                        ListEmptyComponent={
                                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                                {showManualOnly ? 'No manual price history found.' : 'No price history found.'}
                                            </Text>
                                        }
                                    />
                                </View>
                            )}
                            {activeTab === 'DIVIDENDS' && (
                                <View style={{ flex: 1 }}>
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.filterButton}
                                            onPress={() => setShowManualOnly(!showManualOnly)}
                                        >
                                            <Ionicons
                                                name={showManualOnly ? "checkbox" : "square-outline"}
                                                size={20}
                                                color={colors.primary}
                                            />
                                            <Text style={[styles.filterText, { color: colors.text }]}>Manual</Text>
                                        </TouchableOpacity>

                                        <View style={{ flexDirection: 'row', gap: 4 }}>
                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={handleAddDividend}
                                            >
                                                <Ionicons name="add" size={18} color={colors.success} />
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => openFetchMenu('dividend')}
                                                disabled={isFetching}
                                            >
                                                {isFetching && activeFetchMode === 'dividend' ? (
                                                    <ActivityIndicator size="small" color={colors.primary} />
                                                ) : (
                                                    <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={handleClearAutoDividends}>
                                                <Ionicons name="trash-outline" size={18} color={colors.error} />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <FlatList
                                        data={dividendHistory.filter(d => !showManualOnly || d.source === 'MANUAL')}
                                        renderItem={renderDividendItem}
                                        keyExtractor={item => item.id}
                                        contentContainerStyle={styles.listContent}
                                        ListEmptyComponent={
                                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                                {showManualOnly ? 'No manual dividend history found.' : 'No dividend history found.'}
                                            </Text>
                                        }
                                    />
                                </View>
                            )}
                        </View>
                    )}
                </View>
            </BottomModal>

            <PriceHistoryFormModal
                visible={priceFormVisible}
                onClose={() => setPriceFormVisible(false)}
                symbol={symbol}
                existingItem={editingPrice}
                onSuccess={() => {
                    loadPrices();
                    onDataChange?.();
                }}
            />

            <DividendHistoryFormModal
                visible={dividendFormVisible}
                onClose={() => setDividendFormVisible(false)}
                symbol={symbol}
                existingItem={editingDividend}
                onSuccess={() => {
                    loadDividends();
                    onDataChange?.();
                }}
            />

            {/* Fetch Duration Modal */}
            <BottomModal
                visible={isFetchMenuVisible}
                onClose={() => setIsFetchMenuVisible(false)}
                title={`Fetch ${activeFetchMode === 'price' ? 'Prices' : 'Dividends'}`}
            >
                <View>
                    <View style={{ backgroundColor: 'rgba(255, 152, 0, 0.1)', padding: 12, borderRadius: 8, marginBottom: 15, flexDirection: 'row' }}>
                        <Ionicons name="warning-outline" size={20} color="#FF9800" style={{ marginRight: 8, marginTop: 2 }} />
                        <Text style={{ color: colors.text, fontSize: 13, flex: 1, lineHeight: 18 }}>
                            AI-fetched {activeFetchMode === 'price' ? 'prices' : 'dividends'} are estimates and may vary from real-time official records.
                        </Text>
                    </View>

                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
                        {activeFetchMode === 'price' ? (
                            // Price Options (Relative Days)
                            ['Today', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 31 days'].map((item, index, arr) => (
                                <TouchableOpacity
                                    key={item}
                                    style={{
                                        padding: 16,
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                                        borderBottomColor: colors.border
                                    }}
                                    onPress={() => executeFetch(item)}
                                >
                                    <Text style={{ color: colors.text, fontSize: 16 }}>{item}</Text>
                                    <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
                                </TouchableOpacity>
                            ))
                        ) : (
                            // Dividend Options (Years)
                            (() => {
                                const currentYear = new Date().getFullYear();
                                const years = [];
                                for (let i = 0; i < 5; i++) {
                                    years.push(currentYear - i);
                                }

                                return years.map((year, index, arr) => {
                                    const label = year === currentYear ? 'This Year' : year.toString();
                                    return (
                                        <TouchableOpacity
                                            key={year}
                                            style={{
                                                padding: 16,
                                                flexDirection: 'row',
                                                justifyContent: 'space-between',
                                                alignItems: 'center',
                                                borderBottomWidth: index < arr.length - 1 ? 1 : 0,
                                                borderBottomColor: colors.border
                                            }}
                                            onPress={() => executeFetch(label)}
                                        >
                                            <Text style={{ color: colors.text, fontSize: 16 }}>{label}</Text>
                                            <Ionicons name="cloud-download-outline" size={20} color={colors.primary} />
                                        </TouchableOpacity>
                                    );
                                });
                            })()
                        )}
                    </View>
                </View>
            </BottomModal>
        </>
    );
};

const styles = StyleSheet.create({
    content: {
        width: '100%',
        height: '90%',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
        borderRadius: 8,
        marginBottom: 16,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 6,
    },
    tabText: {
        fontSize: 13,
        fontWeight: '600',
    },
    summaryCard: {
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    summaryLabel: {
        fontSize: 14,
        marginBottom: 4,
    },
    summaryValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 20
    },
    itemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    itemLeft: {
        flex: 1,
    },
    itemRight: {
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    itemType: {
        fontSize: 16,
        fontWeight: '600',
        textTransform: 'capitalize',
        marginBottom: 2,
    },
    itemDate: {
        fontSize: 12,
    },
    itemDetails: {
        fontSize: 12,
        marginTop: 2
    },
    itemSubDetail: {
        fontSize: 10,
        marginTop: 2
    },
    itemAmount: {
        fontSize: 15,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        gap: 8,
    },
    filterButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 8,
    },
    filterText: {
        fontSize: 14,
        fontWeight: '500',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        gap: 4
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '600'
    },
    deleteAction: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    }
});
