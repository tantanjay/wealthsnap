import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { getAllInvestments } from '@services/domain/investmentService';
import { getAllTransactions } from '@services/domain/transactionService';
import { getPriceHistory, PriceHistory } from '@services/domain/priceHistoryService';
import { getDividendHistory, DividendHistory } from '@services/domain/dividendHistoryService';
import { formatCurrencyAmount } from '@utils/currencyUtils';

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
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('POSITIONS');

    // Data states
    const [transactions, setTransactions] = useState<HistoryItem[]>([]);
    const [priceHistory, setPriceHistory] = useState<PriceHistory[]>([]);
    const [dividendHistory, setDividendHistory] = useState<DividendHistory[]>([]);

    // Summary states
    const [realizedPL, setRealizedPL] = useState(0);

    // Initial Load - load everything or lazy load? 
    // Given the local DB nature, loading all is likely fine and provides smoother tab switching.
    useEffect(() => {
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

        if (visible && symbol) {
            loadAllHistory();
            setActiveTab('POSITIONS'); // Reset tab on open
        }
    }, [visible, symbol]);

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

    const renderPriceItem = ({ item }: { item: PriceHistory }) => (
        <View style={[styles.itemContainer, { borderBottomColor: colors.border }]}>
            <View style={styles.itemLeft}>
                <Text style={[styles.itemType, { color: colors.text }]}>
                    {new Date(item.timestamp).toLocaleDateString()}
                </Text>
                <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                    {item.source || 'Unknown Source'}
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
        </View>
    );

    const renderDividendItem = ({ item }: { item: DividendHistory }) => (
        <View style={[styles.itemContainer, { borderBottomColor: colors.border }]}>
            <View style={styles.itemLeft}>
                <Text style={[styles.itemType, { color: colors.text }]}>
                    Ex-Date: {new Date(item.exDate).toLocaleDateString()}
                </Text>
                <Text style={[styles.itemDetails, { color: colors.textSecondary }]}>
                    {item.type} {item.status === 'PROJECTED' ? '(Projected)' : ''}
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
        </View>
    );

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
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={`${symbol} History`}
            maxHeight="85%" // Slightly taller to accommodate tabs
        >
            <View style={styles.content}>

                {/* Tabs */}
                <View style={[styles.tabContainer, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
                    {renderTabButton('POSITIONS', 'Positions')}
                    {renderTabButton('PRICES', 'Prices')}
                    {renderTabButton('DIVIDENDS', 'Dividends')}
                </View>

                {/* Summary Card - Only for Positions for now, or adaptable? 
                    Realized P/L is specific to user positions. 
                    Price history summary could be "Current Price"?
                    Dividend summary could be "Yield"?
                    For simplicity, let's keep P/L only on Positions tab or just hide it on others.
                */}
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
                            <FlatList
                                data={priceHistory}
                                renderItem={renderPriceItem}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No price history found.
                                    </Text>
                                }
                            />
                        )}
                        {activeTab === 'DIVIDENDS' && (
                            <FlatList
                                data={dividendHistory}
                                renderItem={renderDividendItem}
                                keyExtractor={item => item.id}
                                contentContainerStyle={styles.listContent}
                                ListEmptyComponent={
                                    <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                        No dividend history found.
                                    </Text>
                                }
                            />
                        )}
                    </View>
                )}
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    content: {
        width: '100%',
        height: '90%', // Explicit height to prevent collapse
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
    }
});
