import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Skeleton } from '@components/common/Skeleton';
import BottomModal from '@components/common/BottomModal';
import { InvestmentHistoryModal } from '@components/investments/modals/InvestmentHistoryModal';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount, formatCompactCurrency, CURRENCY_SYMBOLS } from '@utils/currencyUtils';
import { saveInvestmentHoldingsSort, getInvestmentHoldingsSort } from '@services/core/storageService';

interface Holding {
    symbol: string;
    name?: string;
    shares: number;
    price: number;
    totalValue: number;
    gainLoss: number;
    // null when cost basis is $0 but there's a real gain/loss (e.g. free/gifted shares)
    gainLossPercent: number | null;
    divYield: number;
}

interface HoldingsListProps {
    holdings: Holding[];
    currency?: string;
    totalPortfolioValue?: number;
    isLoading?: boolean;
    isPrivacyEnabled?: boolean;
    onUpdate?: () => void;
}

type SortOption = 'ALPHABETICAL' | 'ALLOCATION' | 'PL_AMOUNT' | 'PL_PERCENT' | 'YIELD';
type SortDirection = 'ASC' | 'DESC';

const HoldingItemSkeleton = () => {
    const { colors } = useTheme();
    return (

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
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


            <View style={{ marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Skeleton height={6} style={{ flex: 1 }} borderRadius={3} />
                <Skeleton width={60} height={11} />
            </View>


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


    const allocationPercent = totalValue > 0 ? (item.totalValue / totalValue) * 100 : 0;


    const estAnnualIncome = (item.totalValue * item.divYield) / 100;

    return (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: colors.surface }]}
            onPress={onPress}
            activeOpacity={0.7}
        >

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
                        {isPrivacyEnabled ? "••••" : (item.gainLossPercent === null ? 'N/A' : `${isProfit ? '+' : ''}${item.gainLossPercent.toFixed(2)}%`)}
                    </Text>
                </View>
            </View>


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


            <View style={[styles.metricsGrid, { borderTopColor: colors.border }]}>
                <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Holdings</Text>
                    <Text style={[styles.metricValue, { color: colors.text }]}>
                        {isPrivacyEnabled ? "••••" : formatCompactCurrency(item.totalValue, currency)}
                    </Text>
                    <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
                        {isPrivacyEnabled ? "** shares" : `${item.shares} shares`}
                    </Text>
                </View>


                <View style={styles.metricItem}>
                    <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Profit/Loss</Text>
                    <Text style={[styles.metricValue, { color: isProfit ? colors.success : colors.error }]}>
                        {isPrivacyEnabled ? "••••" : `${isProfit ? '+' : ''}${formatCompactCurrency(item.gainLoss, currency)}`}
                    </Text>
                </View>


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

export const HoldingsList: React.FC<HoldingsListProps> = ({ holdings, currency = 'PHP', totalPortfolioValue = 0, isLoading = false, isPrivacyEnabled = false, onUpdate }) => {
    const { colors } = useTheme();

    const [selectedHolding, setSelectedHolding] = React.useState<Holding | null>(null);
    const [historyModalVisible, setHistoryModalVisible] = React.useState(false);


    const [sortOption, setSortOption] = React.useState<SortOption>('ALLOCATION');
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('DESC');
    const [isSortModalVisible, setSortModalVisible] = React.useState(false);

    // Helper ref to avoid infinite loop in useEffect when saving
    const isInitialLoad = React.useRef(true);

    // Load Sort Pref
    React.useEffect(() => {
        const loadSort = async () => {
            const saved = await getInvestmentHoldingsSort();
            if (saved) {
                setSortOption(saved.option as SortOption);
                setSortDirection(saved.direction as SortDirection);
            }
            isInitialLoad.current = false;
        };
        loadSort();
    }, []);

    // Save Sort Pref
    React.useEffect(() => {
        if (!isInitialLoad.current) {
            saveInvestmentHoldingsSort({ option: sortOption, direction: sortDirection });
        }
    }, [sortOption, sortDirection]);

    const handleHoldingPress = (holding: Holding) => {
        setSelectedHolding(holding);
        setHistoryModalVisible(true);
    };

    const handleSort = (option: SortOption) => {
        if (sortOption === option) {
            // Toggle direction
            setSortDirection(prev => prev === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortOption(option);
            setSortDirection('DESC'); // Default to DESC for new option (usually better for numbers)
        }
        if (sortOption !== option) {
            setSortModalVisible(false);
        }
    };

    const getSortedHoldings = () => {
        if (!holdings) return [];

        return [...holdings].sort((a, b) => {
            let comparison = 0;
            switch (sortOption) {
                case 'ALPHABETICAL':
                    comparison = a.symbol.localeCompare(b.symbol);
                    // For alphabetical, ASC is A-Z (default), DESC is Z-A
                    break;
                case 'ALLOCATION':
                    comparison = a.totalValue - b.totalValue;
                    break;
                case 'PL_AMOUNT':
                    comparison = a.gainLoss - b.gainLoss;
                    break;
                case 'PL_PERCENT':
                    comparison = (a.gainLossPercent ?? 0) - (b.gainLossPercent ?? 0);
                    break;
                case 'YIELD':
                    comparison = a.divYield - b.divYield;
                    break;
            }
            return sortDirection === 'ASC' ? comparison : -comparison;
        });
    };

    const sortedHoldings = getSortedHoldings();

    const getSortLabel = (option: SortOption) => {
        switch (option) {
            case 'ALPHABETICAL': return 'Alphabetical (Symbol)';
            case 'ALLOCATION': return 'Allocation (Value)';
            case 'PL_AMOUNT': return `Profit/Loss (${CURRENCY_SYMBOLS[currency] || currency})`;
            case 'PL_PERCENT': return 'Profit/Loss (%)';
            case 'YIELD': return 'Dividend Yield';
        }
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
                <View>
                    <Text style={[styles.headerTitle, { color: colors.text }]}>Current Holdings</Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                        Sorted by {getSortLabel(sortOption).replace(/ *\([^)]*\) */g, "")} ({sortDirection === 'ASC' ? (sortOption === 'ALPHABETICAL' ? 'A-Z' : 'Low-High') : (sortOption === 'ALPHABETICAL' ? 'Z-A' : 'High-Low')})
                    </Text>
                </View>
                <TouchableOpacity
                    style={styles.sortButton}
                    onPress={() => setSortModalVisible(true)}
                >
                    <Ionicons name="filter" size={20} color={colors.primary} />
                </TouchableOpacity>
            </View>
            {sortedHoldings.map((h, index) => (
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
                onDataChange={onUpdate}
            />

            <BottomModal
                visible={isSortModalVisible}
                onClose={() => setSortModalVisible(false)}
                title="Sort Holdings"
                maxHeight="80%"
            >
                <View style={{ gap: 8, paddingBottom: 16 }}>
                    {(['ALLOCATION', 'ALPHABETICAL', 'PL_AMOUNT', 'PL_PERCENT', 'YIELD'] as SortOption[]).map((option) => (
                        <TouchableOpacity
                            key={option}
                            style={[
                                styles.sortOption,
                                {
                                    backgroundColor: sortOption === option ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                                    borderColor: sortOption === option ? colors.primary : colors.border
                                }
                            ]}
                            onPress={() => handleSort(option)}
                        >
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                                <Ionicons
                                    name={
                                        option === 'ALPHABETICAL' ? 'text' :
                                            option === 'ALLOCATION' ? 'pie-chart' :
                                                option === 'YIELD' ? 'water' :
                                                    'trending-up'
                                    }
                                    size={20}
                                    color={sortOption === option ? colors.primary : colors.textSecondary}
                                />
                                <Text style={[
                                    styles.sortOptionText,
                                    {
                                        color: sortOption === option ? colors.primary : colors.text,
                                        fontWeight: sortOption === option ? '700' : '400'
                                    }
                                ]}>
                                    {getSortLabel(option)}
                                </Text>
                            </View>
                            {sortOption === option && (
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                    <Text style={{ fontSize: 12, color: colors.primary }}>
                                        {sortDirection === 'ASC' ? (option === 'ALPHABETICAL' ? 'A-Z' : 'Low-High') : (option === 'ALPHABETICAL' ? 'Z-A' : 'High-Low')}
                                    </Text>
                                    <Ionicons
                                        name={sortDirection === 'ASC' ? 'arrow-up' : 'arrow-down'}
                                        size={16}
                                        color={colors.primary}
                                    />
                                </View>
                            )}
                        </TouchableOpacity>
                    ))}
                </View>
            </BottomModal>
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
    },
    sortButton: {
        padding: 4,
        marginRight: -4
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
    },
    sortOptionText: {
        fontSize: 16,
    }
});
