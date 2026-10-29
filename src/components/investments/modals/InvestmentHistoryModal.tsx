import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Pressable, Platform, ToastAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { Disclaimer } from '@components/common/Disclaimer';
import { Group, IconName, Row, SegmentedControl, Tone } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { usePrivacy } from '@context/PrivacyContext';
import { useAlert } from '@context/AlertContext';
import { type, space, radius, layout } from '@styles/theme';
import { getAllInvestments, deleteInvestment } from '@services/domain/investmentService';
import { getAllTransactions, deleteTransaction } from '@services/domain/transactionService';
import { getPriceHistory, deleteAllPriceHistory, addPriceHistory, deletePriceHistory } from '@services/domain/priceHistoryService';
import { getDividendHistory, deleteAutoDividendHistory, deleteDividendHistory } from '@services/domain/dividendHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { AssetRequest } from '@services/integrations/geminiService';
import { EmptyState } from '@components/common/EmptyState';
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

const TABS: { key: TabType; label: string }[] = [
    { key: 'POSITIONS', label: 'Positions' },
    { key: 'PRICES', label: 'Prices' },
    { key: 'DIVIDENDS', label: 'Dividends' },
];

const POSITION_LABELS: Record<HistoryItem['type'], string> = {
    BUY: 'Buy',
    SELL: 'Sell',
    DIVIDEND: 'Dividend',
    CAPITAL_GAIN: 'Realized gain',
    CAPITAL_LOSS: 'Realized loss',
};

const MINUS = '\u2212';

export const InvestmentHistoryModal: React.FC<InvestmentHistoryModalProps> = ({
    visible,
    onClose,
    symbol,
    currency,
    onDataChange
}) => {
    const { ds } = useTheme();
    const { isPrivacyEnabled } = usePrivacy();
    // Detail sheets follow the privacy mode too: Discreet and Hidden both mask amounts here.
    const money = (...args: Parameters<typeof formatCurrencyAmount>) => (isPrivacyEnabled ? '****' : formatCurrencyAmount(...args));
    const { showAlert } = useAlert();
    const { checkConsent } = useAIConsent();
    const navigation = useNavigation<any>();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('POSITIONS');


    const [transactions, setTransactions] = useState<HistoryItem[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
    const [dividendHistory, setDividendHistory] = useState<DividendHistory[]>([]);
    const [asset, setAsset] = useState<Asset | null>(null);


    const [realizedPL, setRealizedPL] = useState(0);


    const [priceFormVisible, setPriceFormVisible] = useState(false);
    const [dividendFormVisible, setDividendFormVisible] = useState(false);
    const [editingPrice, setEditingPrice] = useState<PriceHistory | null>(null);
    const [editingDividend, setEditingDividend] = useState<DividendHistory | null>(null);
    const [showManualOnly, setShowManualOnly] = useState(false);

    // AI Fetch State
    const [isFetchMenuVisible, setIsFetchMenuVisible] = useState(false);
    const [activeFetchMode, setActiveFetchMode] = useState<'price' | 'dividend'>('price');
    const [isFetching, setIsFetching] = useState(false);


    const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null);
    const [linkedTransaction, setLinkedTransaction] = useState<Transaction | null>(null);


    const loadPositions = useCallback(async () => {

        const allInvestments = await getAllInvestments();
        const symbolInvestments = allInvestments.filter(inv => inv.symbol === symbol);
        const investmentIds = new Set(symbolInvestments.map(inv => inv.id));


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


        const allTransactions = await getAllTransactions();
        const linkedTransactions = allTransactions.filter(txn =>
            txn.investmentId && investmentIds.has(txn.investmentId) &&
            (txn.type === 'CAPITAL_GAIN' || txn.type === 'CAPITAL_LOSS')
        );


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
            // eslint-disable-next-line react-hooks/set-state-in-effect -- legitimate async data load on open; see FIXES.md
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


    const openFetchMenu = async (mode: 'price' | 'dividend') => {

        let isSupportedAsset = false;
        const position = transactions.find(t =>
            t.originalInvestment?.type === 'STOCKS' ||
            t.originalInvestment?.type === 'CRYPTO'
        );

        if (position) {
            isSupportedAsset = true;

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


        let durationPrompt = '';


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

            const allAssets = await getAllAssets();
            const assetInfo = allAssets.find(a => a.symbol === symbol);

            const assetRequest: AssetRequest = {
                symbol: symbol,
                exchange: assetInfo?.exchange || 'Unknown'
            };


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


    const handlePositionPress = async (item: HistoryItem) => {
        if (!item.originalInvestment) return;


        const allTxs = await getAllTransactions();
        const linked = allTxs.find(t => t.investmentId === item.originalInvestment?.id);

        setSelectedInvestment(item.originalInvestment);
        setLinkedTransaction(linked || null);
    };

    const renderRightActions = (onDelete: () => void) => {
        return (
            <TouchableOpacity
                style={[styles.deleteAction, { backgroundColor: ds.danger }]}
                onPress={onDelete}
            >
                <Ionicons name="trash-outline" size={20} color={ds.onSemantic} />
            </TouchableOpacity>
        );
    };

    const renderDeleteButton = (onDelete: () => void) => (
        <TouchableOpacity hitSlop={space[2]} onPress={onDelete} accessibilityLabel="Delete">
            <Ionicons name="trash-outline" size={20} color={ds.danger} />
        </TouchableOpacity>
    );

    const renderPositionsItem = ({ item, index }: { item: HistoryItem; index: number }) => {
        let iconName: IconName = "help-circle-outline";
        let tone: Tone | undefined;
        let sign = '';

        if (item.type === 'BUY') {
            iconName = "arrow-up-circle-outline";
        } else if (item.type === 'SELL') {
            iconName = "arrow-down-circle-outline";
            sign = MINUS;
        } else if (item.type === 'DIVIDEND') {
            iconName = "gift-outline";
            tone = 'good';
            sign = '+';
        } else if (item.type === 'CAPITAL_GAIN') {
            iconName = "trending-up-outline";
            tone = 'good';
            sign = '+';
        } else if (item.type === 'CAPITAL_LOSS') {
            iconName = "trending-down-outline";
            tone = 'bad';
            sign = MINUS;
        }


        let displayAmountValue = new BigNumber(item.amount);
        let displayCurrency = currency; // Default to profile currency

        // Any rate other than 1 means values were converted on save - rates below 1 too.
        const rate = new BigNumber(item.originalInvestment?.exchangeRate || 1);
        const isConverted = rate.isGreaterThan(0) && !rate.isEqualTo(1);

        if (item.originalInvestment) {
            const inv = item.originalInvestment;
            displayCurrency = inv.currency || currency; // Use investment currency (e.g. USD)

            if (isConverted) {
                displayAmountValue = displayAmountValue.dividedBy(rate);
            }
        }

        const displayAmount = money(displayAmountValue, displayCurrency);
        const sharesLine = (item.shares !== undefined) && item.originalInvestment
            ? ` · ${item.shares} @ ${money(
                item.price
                    ? (isConverted ? new BigNumber(item.price).dividedBy(rate) : item.price)
                    : 0,
                displayCurrency
            )}`
            : '';

        return (
            <Row
                domain="invest"
                icon={iconName}
                title={POSITION_LABELS[item.type]}
                subtitle={`${new Date(item.date).toLocaleDateString()}${sharesLine}`}
                value={`${sign}${displayAmount}`}
                valueTone={tone}
                chevron={!!item.originalInvestment}
                onPress={item.originalInvestment ? () => handlePositionPress(item) : undefined}
                last={index === transactions.length - 1}
            />
        );
    };



    const renderPriceItem = ({ item, index }: { item: PriceHistory; index: number }) => {
        const isManual = item.source === 'MANUAL';
        const isAiFetch = item.source === 'AI_FETCH';
        const canDelete = isManual || isAiFetch;


        let displayPrice = item.price;
        let displayCurrency = currency;

        if (asset && asset.currency && asset.currency !== currency) {
            // A rate of 1 carries no conversion info, so only convert back to native when it isn't 1.
            const rate = item.exchangeRate ? new BigNumber(item.exchangeRate) : new BigNumber(1);
            if (!rate.isEqualTo(1)) {
                displayPrice = item.price.dividedBy(rate);
                displayCurrency = asset.currency;
            }
        }

        const content = (
            // Long-press edits manual entries; the inner Row has no onPress, so it leaves touches to this.
            <Pressable
                style={{ backgroundColor: ds.group }}
                disabled={!isManual}
                onLongPress={() => isManual && handleEditPrice(item)}
                delayLongPress={500}
            >
                <Row
                    domain="invest"
                    icon={isAiFetch ? 'sparkles-outline' : 'pricetag-outline'}
                    title={new Date(item.timestamp).toLocaleDateString()}
                    subtitle={item.high && item.low ? `H: ${item.high.toNumber()} L: ${item.low.toNumber()}` : undefined}
                    value={money(displayPrice.toNumber(), displayCurrency)}
                    trailing={canDelete ? renderDeleteButton(() => handleDeletePrice(item.id)) : undefined}
                    last={index === filteredPrices.length - 1}
                />
            </Pressable>
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

    const renderDividendItem = ({ item, index }: { item: DividendHistory; index: number }) => {
        const isManual = item.source === 'MANUAL';
        const isAiFetch = item.source === 'AI_FETCH';
        const canDelete = isManual || isAiFetch;

        const content = (
            <Pressable
                style={{ backgroundColor: ds.group }}
                disabled={!isManual}
                onLongPress={() => isManual && handleEditDividend(item)}
                delayLongPress={500}
            >
                <Row
                    domain="invest"
                    icon={isAiFetch ? 'sparkles-outline' : 'cash-outline'}
                    title={`Ex ${new Date(item.exDate).toLocaleDateString()}`}
                    subtitle={item.paymentDate ? `Pay ${new Date(item.paymentDate).toLocaleDateString()}` : undefined}
                    value={money(item.amount.toNumber(), currency)}
                    change={item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                    trailing={canDelete ? renderDeleteButton(() => handleDeleteDividend(item.id)) : undefined}
                    last={index === filteredDividends.length - 1}
                />
            </Pressable>
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

    // Manual-only chip, add, AI fetch and clear actions above the Prices / Dividends lists.
    const renderActionRow = (mode: 'price' | 'dividend', onAdd: () => void, onClear: () => void) => (
        <View style={styles.actionRow}>
            <Pressable
                style={[styles.chip, showManualOnly && { backgroundColor: ds.group }]}
                onPress={() => setShowManualOnly(!showManualOnly)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: showManualOnly }}
            >
                <Text style={[type.smallMedium, { color: showManualOnly ? ds.text : ds.text2 }]}>Manual only</Text>
            </Pressable>

            <View style={styles.actionIcons}>
                <TouchableOpacity hitSlop={space[2]} onPress={onAdd} accessibilityLabel="Add entry">
                    <Ionicons name="add" size={20} color={ds.text2} />
                </TouchableOpacity>

                <TouchableOpacity
                    hitSlop={space[2]}
                    onPress={() => openFetchMenu(mode)}
                    disabled={isFetching}
                    accessibilityLabel="Fetch with AI"
                >
                    {isFetching && activeFetchMode === mode ? (
                        <ActivityIndicator size="small" color={ds.accent} />
                    ) : (
                        <Ionicons name="cloud-download-outline" size={20} color={ds.text2} />
                    )}
                </TouchableOpacity>

                <TouchableOpacity hitSlop={space[2]} onPress={onClear} accessibilityLabel="Clear history">
                    <Ionicons name="trash-outline" size={20} color={ds.danger} />
                </TouchableOpacity>
            </View>
        </View>
    );

    const filteredPrices = priceHistory.filter(p => !showManualOnly || p.source === 'MANUAL');
    const filteredDividends = dividendHistory.filter(d => !showManualOnly || d.source === 'MANUAL');
    const fetchOptions = activeFetchMode === 'price'
        ? ['Today', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 31 days']
        : Array.from({ length: 5 }, (_, i) => {
            const currentYear = new Date().getFullYear();
            return i === 0 ? 'This Year' : (currentYear - i).toString();
        });

    // A Group can't bound a FlatList's height, so the list itself draws the group surface.
    const listSurface = [styles.list, { backgroundColor: ds.group }];

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
                title={`${symbol} history`}
                maxHeight="85%"
            >
                <View style={styles.content}>
                    <SegmentedControl options={TABS} value={activeTab} onChange={setActiveTab} />

                    {activeTab === 'POSITIONS' && (
                        <Group padded style={styles.summary}>
                            <Text style={[type.small, { color: ds.text2 }]}>Realized P/L</Text>
                            <Text style={[type.titleNum, { color: realizedPL >= 0 ? ds.success : ds.danger }]}>
                                {realizedPL >= 0 ? '+' : ''}{money(realizedPL, currency)}
                            </Text>
                        </Group>
                    )}

                    {isLoading ? (
                        <ActivityIndicator size="large" color={ds.accent} style={styles.loading} />
                    ) : (
                        <View style={styles.fill}>
                            {activeTab === 'POSITIONS' && (
                                <FlatList
                                    data={transactions}
                                    renderItem={renderPositionsItem}
                                    keyExtractor={item => item.id}
                                    style={transactions.length > 0 && listSurface}
                                    contentContainerStyle={styles.listContent}
                                    ListEmptyComponent={
                                        <EmptyState size="compact" icon="swap-vertical-outline" title="No position history found." />
                                    }
                                />
                            )}
                            {activeTab === 'PRICES' && (
                                <View style={styles.fill}>
                                    {renderActionRow('price', handleAddPrice, handleClearPrices)}
                                    <FlatList
                                        data={filteredPrices}
                                        renderItem={renderPriceItem}
                                        keyExtractor={item => item.id}
                                        style={filteredPrices.length > 0 && listSurface}
                                        contentContainerStyle={styles.listContent}
                                        ListEmptyComponent={
                                            <EmptyState
                                                size="compact"
                                                icon="pricetag-outline"
                                                title={showManualOnly ? 'No manual price history found.' : 'No price history found.'}
                                            />
                                        }
                                    />
                                </View>
                            )}
                            {activeTab === 'DIVIDENDS' && (
                                <View style={styles.fill}>
                                    {renderActionRow('dividend', handleAddDividend, handleClearAutoDividends)}
                                    <FlatList
                                        data={filteredDividends}
                                        renderItem={renderDividendItem}
                                        keyExtractor={item => item.id}
                                        style={filteredDividends.length > 0 && listSurface}
                                        contentContainerStyle={styles.listContent}
                                        ListEmptyComponent={
                                            <EmptyState
                                                size="compact"
                                                icon="cash-outline"
                                                title={showManualOnly ? 'No manual dividend history found.' : 'No dividend history found.'}
                                            />
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


            <BottomModal
                visible={isFetchMenuVisible}
                onClose={() => setIsFetchMenuVisible(false)}
                title={`Fetch ${activeFetchMode === 'price' ? 'prices' : 'dividends'}`}
            >
                <Disclaimer severity="warning">
                    AI-fetched {activeFetchMode === 'price' ? 'prices' : 'dividends'} are estimates and may vary from real-time official records.
                </Disclaimer>
                <Group style={styles.fetchList}>
                    {fetchOptions.map((label, i) => (
                        <Row
                            key={label}
                            icon="cloud-download-outline"
                            title={label}
                            onPress={() => executeFetch(label)}
                            last={i === fetchOptions.length - 1}
                        />
                    ))}
                </Group>
            </BottomModal>
        </>
    );
};

const styles = StyleSheet.create({
    content: {
        width: '100%',
        height: '90%',
    },
    summary: {
        marginTop: space[4],
        marginBottom: space[3],
    },
    loading: {
        marginTop: space[5],
    },
    fill: {
        flex: 1,
    },
    list: {
        flexGrow: 0,
        borderRadius: radius.group,
        overflow: 'hidden',
        marginBottom: space[4],
    },
    listContent: {
        paddingHorizontal: layout.groupPadding,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: space[4],
        marginBottom: space[2],
        paddingHorizontal: layout.groupPadding,
    },
    chip: {
        paddingVertical: 6,
        paddingHorizontal: space[3],
        borderRadius: radius.sm,
    },
    actionIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[5],
    },
    deleteAction: {
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
    },
    fetchList: {
        marginTop: space[3],
    },
});
