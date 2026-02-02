import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform, ToastAndroid } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { BigNumber } from 'bignumber.js';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { useAlert } from '@context/AlertContext';
import { getAllInvestments } from '@services/domain/investmentService';
import { getAllTransactions } from '@services/domain/transactionService';
import { getPriceHistory, deleteAllPriceHistory, addPriceHistory, deletePriceHistory } from '@services/domain/priceHistoryService';
import { getDividendHistory, deleteAutoDividendHistory, deleteDividendHistory, addDividendHistory } from '@services/domain/dividendHistoryService';
import { getAllAssets } from '@services/domain/assetService';
import { fetchHistoricalPrices, AssetRequest, fetchDividendHistory } from '@services/integrations/geminiService';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { DividendHistory, PriceHistory } from '@types';
import PriceHistoryFormModal from './PriceHistoryFormModal';
import DividendHistoryFormModal from './DividendHistoryFormModal';

interface InvestmentHistoryModalProps {
    visible: boolean;
    onClose: () => void;
    symbol: string;
    currency: string;
}

interface HistoryItem {
    id: string;
    date: string;
    type: 'BUY' | 'SELL' | 'DIVIDEND' | 'CAPITAL_GAIN' | 'CAPITAL_LOSS';
    amount: number;
    price?: number;
    shares?: number;
    note?: string;
}

type TabType = 'POSITIONS' | 'PRICES' | 'DIVIDENDS';

export const InvestmentHistoryModal: React.FC<InvestmentHistoryModalProps> = ({
    visible,
    onClose,
    symbol,
    currency
}) => {
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('POSITIONS');

    // Data states
    const [transactions, setTransactions] = useState<HistoryItem[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
    const [dividendHistory, setDividendHistory] = useState<DividendHistory[]>([]);

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

    // Data Loading Functions
    const loadPositions = async () => {
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
            note: inv.notes
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
    };

    const loadPrices = async () => {
        const prices = await getPriceHistory(symbol);
        setPriceHistory(prices);
    };

    const loadDividends = async () => {
        const dividends = await getDividendHistory(symbol);
        setDividendHistory(dividends);
    };

    const loadAllHistory = async () => {
        setIsLoading(true);
        try {
            await Promise.all([
                loadPositions(),
                loadPrices(),
                loadDividends()
            ]);
        } catch (error) {
            console.error("Failed to load investment history", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (visible && symbol) {
            loadAllHistory();
            setActiveTab('POSITIONS'); // Reset tab on open
        }
    }, [visible, symbol]);

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
                                        source: 'MANUAL'
                                    });
                                }
                            }

                            await loadPrices();

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

    const openFetchMenu = (mode: 'price' | 'dividend') => {
        setActiveFetchMode(mode);
        setIsFetchMenuVisible(true);
    };

    const executeFetch = async (durationLabel: string) => {
        setIsFetchMenuVisible(false);

        // 1. Determine prompt duration string
        let durationPrompt = '';
        if (durationLabel === 'Today') durationPrompt = 'Today';
        else if (durationLabel === 'Last 3 days') durationPrompt = 'Last 3 days';
        else if (durationLabel === 'Last 7 days') durationPrompt = 'Last 7 days';
        else if (durationLabel === 'Last 14 days') durationPrompt = 'Last 14 days';
        else if (durationLabel === 'Last 31 days') durationPrompt = 'Last 31 days';
        else if (durationLabel === 'Last 3 months') durationPrompt = 'Last 3 months';
        else if (durationLabel === 'Last 6 months') durationPrompt = 'Last 6 months';
        else if (durationLabel === 'Last 1 year') durationPrompt = 'Last 1 year';
        else return;

        const context = activeFetchMode === 'price' ? 'prices' : 'dividends';
        const msg = `Fetching ${context} for ${durationLabel}...`;
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

            // 3. Call AI Service
            if (activeFetchMode === 'price') {
                fetchHistoricalPrices([assetRequest], durationPrompt).then(async (prices) => {
                    let savedCount = 0;
                    for (const p of prices) {
                        await addPriceHistory(p.symbol, p.price, {
                            high: p.high,
                            low: p.low,
                            volume: p.volume,
                            timestamp: p.date,
                            source: 'AI_FETCH'
                        });
                        savedCount++;
                    }
                    const successMsg = `Updated ${savedCount} prices.`;
                    if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.SHORT);
                    loadPrices();
                }).catch(err => {
                    console.error("Background fetch prices failed", err);
                    const errMsg = "Failed to update prices.";
                    if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
                }).finally(() => {
                    setIsFetching(false);
                });
            } else {
                fetchDividendHistory([assetRequest], durationPrompt).then(async (dividends) => {
                    let savedCount = 0;
                    for (const d of dividends) {
                        await addDividendHistory({
                            symbol: d.symbol,
                            exDate: d.exDate,
                            paymentDate: d.paymentDate,
                            recordDate: d.recordDate,
                            amount: new BigNumber(d.amount),
                            type: d.type,
                            status: 'PAID',
                            source: 'AI_FETCH'
                        });
                        savedCount++;
                    }
                    const successMsg = `Updated ${savedCount} dividend records.`;
                    if (Platform.OS === 'android') ToastAndroid.show(successMsg, ToastAndroid.SHORT);
                    loadDividends();
                }).catch(err => {
                    console.error("Background fetch dividends failed", err);
                    const errMsg = "Failed to update dividends.";
                    if (Platform.OS === 'android') ToastAndroid.show(errMsg, ToastAndroid.SHORT);
                }).finally(() => {
                    setIsFetching(false);
                });
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
                        } catch (error) {
                            console.error("Failed to delete dividend", error);
                        }
                    }
                }
            ]
        );
    };

    // Render Helpers
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
        const isDiv = item.type === 'DIVIDEND';

        let amountColor = colors.text;
        let sign = '';

        if (isGain || isDiv) {
            amountColor = colors.success;
            sign = '+';
        } else if (isLoss) {
            amountColor = colors.error;
            sign = '-';
        }

        const displayAmount = formatCurrencyAmount(item.amount, currency);

        return (
            <View style={[styles.itemContainer, { borderBottomColor: colors.border }]}>
                <View style={styles.itemLeft}>
                    <Text style={[styles.itemType, { color: colors.text }]}>
                        {item.type.replace('_', ' ')}
                    </Text>
                    <Text style={[styles.itemDate, { color: colors.textSecondary }]}>
                        {new Date(item.date).toLocaleDateString()}
                    </Text>
                    {(item.shares !== undefined) && (
                        <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                            {item.shares} @ {formatCurrencyAmount(item.price || 0, currency)}
                        </Text>
                    )}
                </View>
                <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: amountColor }]}>
                        {sign}{displayAmount}
                    </Text>
                </View>
            </View>
        );
    };

    const renderPriceItem = ({ item }: { item: PriceHistory }) => {
        const isManual = item.source === 'MANUAL';

        const content = (
            <TouchableOpacity
                style={[styles.itemContainer, { borderBottomColor: colors.border }]}
                disabled={!isManual}
                onLongPress={() => isManual && handleEditPrice(item)}
                delayLongPress={500}
            >
                <View style={styles.itemLeft}>
                    <Text style={[styles.itemType, { color: colors.text }]}>
                        {new Date(item.timestamp).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                        {item.source === 'AI_FETCH' ? (
                            <Ionicons name="sparkles" color={colors.primary} />
                        ) : (
                            <Ionicons name="create-outline" color={colors.primary} />
                        )}
                    </Text>
                </View>
                <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: colors.text }]}>
                        {formatCurrencyAmount(item.price.toNumber(), currency)}
                    </Text>
                    {item.high && item.low && (
                        <Text style={[styles.itemSubDetail, { color: colors.textSecondary }]}>
                            Low: {item.low.toNumber()} • High: {item.high.toNumber()}
                        </Text>
                    )}
                </View>
                {isManual && (
                    <TouchableOpacity
                        style={{ padding: 8, marginLeft: 8 }}
                        onPress={() => handleDeletePrice(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );

        if (isManual) {
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

        const content = (
            <TouchableOpacity
                style={[styles.itemContainer, { borderBottomColor: colors.border }]}
                disabled={!isManual}
                onLongPress={() => isManual && handleEditDividend(item)}
                delayLongPress={500}
            >
                <View style={styles.itemLeft}>
                    <Text style={[styles.itemType, { color: colors.text }]}>
                        Ex-Date: {new Date(item.exDate).toLocaleDateString()}
                    </Text>
                    <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                        {item.source === 'AI_FETCH' ? (
                            <Ionicons name="sparkles" color={colors.primary} />
                        ) : (
                            <Ionicons name="create-outline" color={colors.primary} />
                        )}
                        {"  "}{item.type}
                    </Text>
                </View>
                <View style={styles.itemRight}>
                    <Text style={[styles.itemAmount, { color: colors.success }]}>
                        {formatCurrencyAmount(item.amount.toNumber(), currency)}
                    </Text>
                    {item.paymentDate && (
                        <Text style={[styles.itemSubDetail, { color: colors.textSecondary }]}>
                            Pay: {new Date(item.paymentDate).toLocaleDateString()}
                        </Text>
                    )}
                </View>
                {isManual && (
                    <TouchableOpacity
                        style={{ padding: 8, marginLeft: 8 }}
                        onPress={() => handleDeleteDividend(item.id)}
                    >
                        <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                )}
            </TouchableOpacity>
        );

        if (isManual) {
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
                                                <Text style={[styles.actionBtnText, { color: colors.success }]}>Add</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => openFetchMenu('price')}
                                                disabled={isFetching}
                                            >
                                                {isFetching && activeFetchMode === 'price' ? (
                                                    <ActivityIndicator size="small" color={colors.primary} />
                                                ) : (
                                                    <>
                                                        <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                                                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>Fetch</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={handleClearPrices}>
                                                <Ionicons name="trash-outline" size={18} color={colors.error} />
                                                <Text style={[styles.actionBtnText, { color: colors.error }]}>Clear</Text>
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
                                                <Text style={[styles.actionBtnText, { color: colors.success }]}>Add</Text>
                                            </TouchableOpacity>

                                            <TouchableOpacity
                                                style={styles.actionBtn}
                                                onPress={() => openFetchMenu('dividend')}
                                                disabled={isFetching}
                                            >
                                                {isFetching && activeFetchMode === 'dividend' ? (
                                                    <ActivityIndicator size="small" color={colors.primary} />
                                                ) : (
                                                    <>
                                                        <Ionicons name="cloud-download-outline" size={18} color={colors.primary} />
                                                        <Text style={[styles.actionBtnText, { color: colors.primary }]}>Fetch</Text>
                                                    </>
                                                )}
                                            </TouchableOpacity>

                                            <TouchableOpacity style={styles.actionBtn} onPress={handleClearAutoDividends}>
                                                <Ionicons name="trash-outline" size={18} color={colors.error} />
                                                <Text style={[styles.actionBtnText, { color: colors.error }]}>Clear</Text>
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
                onSuccess={loadPrices}
            />

            <DividendHistoryFormModal
                visible={dividendFormVisible}
                onClose={() => setDividendFormVisible(false)}
                symbol={symbol}
                existingItem={editingDividend}
                onSuccess={loadDividends}
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
                            AI-fetched data are estimates.
                        </Text>
                    </View>

                    <View style={{ backgroundColor: colors.surface, borderRadius: 12, overflow: 'hidden' }}>
                        {['Today', 'Last 3 days', 'Last 7 days', 'Last 14 days', 'Last 31 days', 'Last 3 months', 'Last 6 months', 'Last 1 year'].map((item, index, arr) => (
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
                        ))}
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
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        alignItems: 'center'
    },
    itemLeft: {
        flex: 1,
    },
    itemRight: {
        alignItems: 'flex-end',
        justifyContent: 'center'
    },
    itemType: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2
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
