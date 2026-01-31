import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '@context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface Holding {
    symbol: string;
    shares: number;
    price: number;
    totalValue: number;
    gainLoss: number;
    gainLossPercent: number;
    divYield: number;
}

interface HoldingsListProps {
    holdings: Holding[];
    currency?: string;
}

const HoldingItem = ({ item, currency }: { item: Holding, currency: string }) => {
    const { colors } = useTheme();
    const isProfit = item.gainLoss >= 0;

    return (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            <View style={styles.cardHeader}>
                <View style={styles.tickerContainer}>
                    <Text style={[styles.ticker, { color: colors.text }]}>{item.symbol}</Text>
                    {item.divYield > 0 && (
                        <View style={styles.yieldBadge}>
                            <Text style={styles.yieldText}>{item.divYield}% Yld</Text>
                        </View>
                    )}
                </View>
                <Text style={[styles.value, { color: colors.text }]}>
                    {formatCurrencyAmount(item.totalValue, currency)}
                </Text>
            </View>

            <View style={styles.cardBody}>
                <View>
                    <Text style={[styles.subLabel, { color: colors.textSecondary }]}>
                        {item.shares} sh @ {formatCurrencyAmount(item.price, currency)}
                    </Text>
                </View>
                <View style={styles.pnlContainer}>
                    <Text style={[styles.pnlValue, { color: isProfit ? colors.success : colors.error }]}>
                        {isProfit ? '+' : ''}{formatCurrencyAmount(item.gainLoss, currency)}
                    </Text>
                    <Text style={[styles.pnlPercent, { color: isProfit ? colors.success : colors.error }]}>
                        ({isProfit ? '+' : ''}{item.gainLossPercent.toFixed(2)}%)
                    </Text>
                </View>
            </View>
        </View>
    );
};

export const HoldingsList: React.FC<HoldingsListProps> = ({ holdings, currency = 'PHP' }) => {
    const { colors } = useTheme();

    if (!holdings || holdings.length === 0) {
        return (
            <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No active holdings.</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Current Holdings</Text>
                <TouchableOpacity>
                    <Ionicons name="filter" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>
            {holdings.map((h, index) => (
                <HoldingItem key={index} item={h} currency={currency} />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 16,
        marginBottom: 20
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 8
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    card: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    tickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    ticker: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    yieldBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)'
    },
    yieldText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#10b981' // Hardcoded success color for badge text to match web
    },
    value: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    cardBody: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    subLabel: {
        fontSize: 12,
    },
    pnlContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4
    },
    pnlValue: {
        fontSize: 14,
        fontWeight: '600',
    },
    pnlPercent: {
        fontSize: 12,
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginVertical: 10
    },
    emptyText: {
        fontStyle: 'italic'
    }
});
