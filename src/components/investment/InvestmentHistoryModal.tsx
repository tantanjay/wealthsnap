import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';

import BottomModal from '@components/common/BottomModal';
import { useTheme } from '@context/ThemeContext';
import { getAllInvestments } from '@services/domain/investmentService';
import { getAllTransactions } from '@services/domain/transactionService';
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

export const InvestmentHistoryModal: React.FC<InvestmentHistoryModalProps> = ({
    visible,
    onClose,
    symbol,
    currency
}) => {
    const { colors } = useTheme();
    const [isLoading, setIsLoading] = useState(true);
    const [transactions, setTransactions] = useState<HistoryItem[]>([]);
    const [realizedPL, setRealizedPL] = useState(0);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            try {
                // 1. Fetch all investments for this symbol to get their IDs
                const allInvestments = await getAllInvestments();
                const symbolInvestments = allInvestments.filter(inv => inv.symbol === symbol);
                const investmentIds = new Set(symbolInvestments.map(inv => inv.id));

                // Map investments to history items (BUY/SELL/DIVIDEND from Investment table actions)
                // Note: The user wants to see records like Buy, Sell, Div. 
                // The 'investments' table tracks these actions.
                const investmentItems: HistoryItem[] = symbolInvestments.map(inv => ({
                    id: inv.id,
                    date: inv.date,
                    type: inv.action === 'INTEREST' ? 'DIVIDEND' : inv.action, // Map interest to dividend for simplicity or keep distinct? User said "buy, sell, div"
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

            } catch (error) {
                console.error("Failed to load investment history", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (visible && symbol) {
            loadHistory();
        }
    }, [visible, symbol]);

    const renderItem = ({ item }: { item: HistoryItem }) => {
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

        // For Buy/Sell, show the total value
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

    return (
        <BottomModal
            visible={visible}
            onClose={onClose}
            title={`${symbol} History`}
            maxHeight="80%"
        >
            <View style={styles.content}>
                {/* Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
                    <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Realized P/L</Text>
                    <Text style={[
                        styles.summaryValue,
                        { color: realizedPL >= 0 ? colors.success : colors.error }
                    ]}>
                        {realizedPL >= 0 ? '+' : ''}{formatCurrencyAmount(realizedPL, currency)}
                    </Text>
                </View>

                {isLoading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
                ) : (
                    <FlatList
                        data={transactions}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                                No history found.
                            </Text>
                        }
                    />
                )}
            </View>
        </BottomModal>
    );
};

const styles = StyleSheet.create({
    content: {
        width: '100%',
        minHeight: 300,
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
        fontSize: 16,
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
    itemAmount: {
        fontSize: 16,
        fontWeight: '700',
    },
    emptyText: {
        textAlign: 'center',
        marginTop: 20,
        fontSize: 14
    }
});
