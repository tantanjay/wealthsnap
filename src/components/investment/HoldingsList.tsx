import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Skeleton } from '@components/common/Skeleton';
import { InvestmentHistoryModal } from './InvestmentHistoryModal';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount, formatCompactCurrency } from '@utils/currencyUtils';

interface Holding {
    symbol: string;
    name?: string;
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
    totalPortfolioValue?: number;
    isLoading?: boolean;
    isPrivacyEnabled?: boolean;
}

const HoldingItemSkeleton = () => {
    const { colors } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
            {/* Header Skeleton */}
            <View style={styles.cardHeader}>
                <View style={styles.tickerContainer}>
                    <Skeleton width={40} height={40} borderRadius={20} />
                    <View style={{ gap: 4 }}>
                        <Skeleton width={60} height={16} />
                        <Skeleton width={100} height={12} />
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    <Skeleton width={80} height={16} />
                    <Skeleton width={50} height={12} />
                </View>
            </View>

            {/* Allocation Bar Skeleton */}
            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Skeleton height={6} style={{ flex: 1 }} borderRadius={3} />
                <Skeleton width={60} height={11} />
            </View>

            {/* Metrics Grid Skeleton */}
            <View style={[styles.metricsGrid, { borderTopColor: colors.border }]}>
                {[1, 2, 3].map((i) => (
                    <View key={i} style={styles.metricItem}>
                        <Skeleton width={50} height={10} style={{ marginBottom: 4 }} />
                        <Skeleton width={70} height={14} style={{ marginBottom: 4 }} />
                        <Skeleton width={60} height={11} />
                    </View>
                ))}
            </View>
        </View>
    );
};

const HoldingItem = ({ item, currency, totalValue, isPrivacyEnabled, onPress }: {
    item: Holding,
    currency: string,
    totalValue: number,
    isPrivacyEnabled?: boolean,
    onPress?: () => void
}) => {
    const { colors } = useTheme();
    const isProfit = item.gainLoss >= 0;

    // Calculate allocation percentage
    const allocationPercent = totalValue > 0 ? (item.totalValue / totalValue) * 100 : 0;

    // Calculate estimated annual income
    const estAnnualIncome = (item.totalValue * item.divYield) / 100;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            {/* Header: Symbol & Name + Price */}
            <View style={styles.cardHeader}>
                <View style={styles.tickerContainer}>
                    <View style={[styles.iconPlaceholder, { backgroundColor: colors.background }]}>
                        <Text style={[styles.iconText, { color: colors.primary }]}>{item.symbol.substring(0, 1)}</Text>
                    </View>
                    <View>
                        <Text style={[styles.ticker, { color: colors.text }]}>{item.symbol}</Text>
                        <Text style={[styles.name, { color: colors.textSecondary }]} numberOfLines={1}>
                            {item.name || 'Stock'}
                        </Text>
                    </View>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.currentPrice, { color: colors.text }]}>
                        {isPrivacyEnabled ? "••••" : formatCurrencyAmount(item.price, currency)}
                    </Text>
                    <Text style={[styles.pnlPercent, { color: isProfit ? colors.success : colors.error }]}>
                        {isPrivacyEnabled ? "••••" : `${isProfit ? '+' : ''}${item.gainLossPercent.toFixed(2)}%`}
                    </Text>
                </View>
            </View>

            {/* Allocation Bar */}
            <View style={styles.allocationContainer}>
                <View style={[styles.allocationBarBg, { backgroundColor: colors.border }]}>
                    <LinearGradient
                        colors={[colors.primary, '#6366f1']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[styles.allocationBarFill, { width: `${Math.min(allocationPercent, 100)}%` }]}
                    />
                </View>
                <Text style={[styles.allocationText, { color: colors.textSecondary }]}>
                    {isPrivacyEnabled ? "**%" : allocationPercent.toFixed(1)}% Portfolio
                </Text>
            </View>

            {/* Metrics Grid */}
            <View style={[styles.metricsGrid, { borderTopColor: colors.border }]}>
                {/* Col 1: Value & Shares */}
                <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Holdings</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {isPrivacyEnabled ? "••••" : formatCompactCurrency(item.totalValue, currency)}
                    </Text>
                    <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                        {isPrivacyEnabled ? "** shares" : `${item.shares} shares`}
                    </Text>
                </View>

                {/* Col 2: P/L */}
                <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Profit/Loss</Text>
                    <Text style={[styles.metricValue, { color: isProfit ? colors.success : colors.error }]}>
                        {isPrivacyEnabled ? "••••" : `${isProfit ? '+' : ''}${formatCompactCurrency(item.gainLoss, currency)}`}
                    </Text>
                </View>

                {/* Col 3: Dividends */}
                <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Dividends</Text>
                    <View style={styles.yieldContainer}>
                        <View style={styles.yieldBadge}>
                            <Text style={styles.yieldText}>{item.divYield.toFixed(2)}%</Text>
                        </View>
                    </View>
                    <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                        ~{isPrivacyEnabled ? "••••" : formatCompactCurrency(estAnnualIncome, currency)} /yr
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export const HoldingsList: React.FC<HoldingsListProps> = ({ holdings, currency = 'PHP', totalPortfolioValue = 0, isLoading = false, isPrivacyEnabled = false }) => {
    const { colors } = useTheme();
    const [selectedHolding, setSelectedHolding] = React.useState<Holding | null>(null);
    const [historyModalVisible, setHistoryModalVisible] = React.useState(false);

    const handleHoldingPress = (holding: Holding) => {
        setSelectedHolding(holding);
        setHistoryModalVisible(true);
    };

    if (isLoading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Current Holdings</Text>
                </View>
                {[1, 2, 3].map((i) => (
                    <HoldingItemSkeleton key={i} />
                ))}
            </View>
        );
    }

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
            </View>
            {holdings.map((h, index) => (
                <HoldingItem
                    key={index}
                    item={h}
                    currency={currency}
                    totalValue={totalPortfolioValue}
                    isPrivacyEnabled={isPrivacyEnabled}
                    onPress={() => handleHoldingPress(h)}
                />
            ))}

            <InvestmentHistoryModal
                visible={historyModalVisible}
                onClose={() => setHistoryModalVisible(false)}
                symbol={selectedHolding?.symbol || ''}
                currency={currency}
            />
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
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    tickerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10
    },
    iconPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    ticker: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    name: {
        fontSize: 12,
        maxWidth: 150,
    },
    currentPrice: {
        fontSize: 16,
        fontWeight: '700',
    },
    pnlPercent: {
        fontSize: 12,
        fontWeight: '600',
    },
    allocationContainer: {
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8
    },
    allocationBarBg: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    allocationBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    allocationText: {
        fontSize: 11,
        fontWeight: '600',
        minWidth: 80,
        textAlign: 'right'
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    metricItem: {
        flex: 1,
        alignItems: 'flex-start', // Align to left for first, others center/right potentially? 
        // Actually grid usually looks best if consistent. Let's keep left but maybe center text?
    },
    metricLabel: {
        fontSize: 10,
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metricValue: {
        fontSize: 14,
        fontWeight: '700',
    },
    metricSub: {
        fontSize: 11,
        marginTop: 1,
    },
    yieldContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 1
    },
    yieldBadge: {
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        alignSelf: 'flex-start'
    },
    yieldText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#10b981'
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
