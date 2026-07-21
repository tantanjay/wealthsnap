import React from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { InvestmentEquityHelpModal } from './modals/InvestmentEquityHelpModal';

interface InvestmentStatsProps {
    totalEquity: number;
    realizedPL: number;
    // null when cost basis is $0 but there's a real gain/loss (e.g. free/gifted shares)
    realizedPLPercent: number | null;
    unrealizedPL: number;
    unrealizedPLPercent: number | null;
    totalDividends: number;
    thisMonthDividends?: number;
    thisMonthInvested?: number;
    currency?: string;
    isLoading?: boolean;
    isPrivacyEnabled?: boolean;
    cardOrder?: string[];
}

const StatCardSkeleton = ({ width }: { width: number }) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface, width }]}>
            <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Skeleton width={80} height={12} />
                    <Skeleton width={16} height={16} borderRadius={8} />
                </View>
                <Skeleton width={120} height={24} />
                <Skeleton width={60} height={12} />
            </View>
        </View>
    );
};

const StatCard = ({ label, value, subValue, color, icon, width, onIconPress }: any) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface, width }]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
                {icon && (
                    <TouchableOpacity onPress={onIconPress} disabled={!onIconPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name={icon} size={16} color={colors.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>
            <Text style={[styles.value, { color: color || colors.text }]} numberOfLines={1}>
                {value}
            </Text>
            {subValue && (
                <View style={styles.subValueContainer}>
                    {typeof subValue === 'string' ? (
                        <Text style={[styles.subValue, { color: colors.textSecondary }]}>{subValue}</Text>
                    ) : (
                        subValue
                    )}
                </View>
            )}
        </View>
    );
};

export const InvestmentStats: React.FC<InvestmentStatsProps> = ({
    totalEquity,
    realizedPL,
    realizedPLPercent,
    unrealizedPL,
    unrealizedPLPercent,
    totalDividends,
    thisMonthDividends = 0,
    thisMonthInvested = 0,
    currency = 'PHP',
    isLoading = false,
    isPrivacyEnabled = false,
    cardOrder
}) => {
    const { colors } = useTheme();
    const [currentPage, setCurrentPage] = React.useState(0);
    const [isEquityHelpVisible, setIsEquityHelpVisible] = React.useState(false);

    // --- LAYOUT CALCULATIONS ---
    const screenWidth = Dimensions.get('window').width;
    const paddingHorizontal = 16;
    const gap = 12;

    // We want 2 cards per screen view. 
    // The "page width" is the screen minus the horizontal paddings.
    const availableWidth = screenWidth - (paddingHorizontal * 2);
    const cardWidth = (availableWidth - gap) / 2;

    // snapToInterval should be exactly the width of what we consider a "step"
    // To snap 2 cards at a time, we snap by the full availableWidth + gap
    const snapInterval = availableWidth + gap;

    const cards = React.useMemo(() => {
        const allCards = [
            {
                id: 'equity',
                label: "Total Equity",
                value: isPrivacyEnabled ? "••••" : formatCurrencyAmount(totalEquity, currency),
                color: colors.primary,
                icon: "information-circle-outline",
                onIconPress: () => setIsEquityHelpVisible(true),
                subValue: isPrivacyEnabled ? (
                    <Text style={{
                        color: colors.textSecondary,
                        fontWeight: 'bold',
                        fontSize: 12
                    }}>
                        ••••
                    </Text>
                ) : (
                    <Text style={{
                        color: thisMonthInvested >= 0 ? colors.success : colors.error,
                        fontWeight: '600',
                        fontSize: 12
                    }}>
                        {thisMonthInvested >= 0 ? '+' : '-'}{formatCurrencyAmount(Math.abs(thisMonthInvested), currency)}
                    </Text>
                )
            },
            {
                id: 'realized',
                label: "Realized P/L",
                value: isPrivacyEnabled ? "••••" : formatCurrencyAmount(realizedPL, currency),
                subValue: isPrivacyEnabled ? (
                    <Text style={{
                        color: colors.textSecondary,
                        fontWeight: 'bold',
                        fontSize: 12
                    }}>
                        ••••
                    </Text>
                ) : (
                    <Text style={{
                        color: realizedPL >= 0 ? colors.success : colors.error,
                        fontWeight: 'bold',
                        fontSize: 12
                    }}>
                        {realizedPLPercent === null ? 'N/A' : `${realizedPL >= 0 ? '+' : ''}${realizedPLPercent.toFixed(2)}%`}
                    </Text>
                ),
                color: colors.text
            },
            {
                id: 'unrealized',
                label: "Unrealized P/L",
                value: isPrivacyEnabled ? "••••" : formatCurrencyAmount(unrealizedPL, currency),
                subValue: isPrivacyEnabled ? (
                    <Text style={{
                        color: colors.textSecondary,
                        fontWeight: 'bold',
                        fontSize: 12
                    }}>
                        ••••
                    </Text>
                ) : (
                    <Text style={{
                        color: unrealizedPL >= 0 ? colors.success : colors.error,
                        fontWeight: 'bold',
                        fontSize: 12
                    }}>
                        {unrealizedPLPercent === null ? 'N/A' : `${unrealizedPL >= 0 ? '+' : ''}${unrealizedPLPercent.toFixed(2)}%`}
                    </Text>
                )
            },
            {
                id: 'dividends',
                label: "Total Divs Received",
                value: isPrivacyEnabled ? "••••" : formatCurrencyAmount(totalDividends, currency),
                subValue: isPrivacyEnabled ? (
                    <Text style={{
                        color: colors.textSecondary,
                        fontWeight: 'bold',
                        fontSize: 12
                    }}>
                        ••••
                    </Text>
                ) : (
                    <Text style={{
                        color: colors.textSecondary,
                        fontWeight: '600',
                        fontSize: 12
                    }}>
                        +{formatCurrencyAmount(thisMonthDividends, currency)}
                    </Text>
                )
            }
        ];

        if (!cardOrder || cardOrder.length === 0) return allCards;

        return [...allCards].sort((a, b) => {
            const indexA = cardOrder.indexOf(a.id);
            const indexB = cardOrder.indexOf(b.id);
            // Items not in the order array go to the end
            return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
        });
    }, [cardOrder, isPrivacyEnabled, totalEquity, currency, colors, realizedPL, realizedPLPercent, unrealizedPL, unrealizedPLPercent, totalDividends, thisMonthDividends, thisMonthInvested]);

    const totalPages = Math.ceil(cards.length / 2);

    const onMomentumScrollEnd = (event: any) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        const page = Math.round(offsetX / snapInterval);
        const totalPagesCount = Math.ceil(cards.length / 2);
        const clampedPage = Math.min(Math.max(0, page), totalPagesCount - 1);

        setCurrentPage(clampedPage);
    };

    const renderItem = ({ item }: { item: any }) => {
        if (isLoading) {
            return <StatCardSkeleton width={cardWidth} />;
        }
        return (
            <StatCard
                label={item.label}
                value={item.value}
                subValue={item.subValue}
                color={item.color}
                icon={item.icon}
                onIconPress={item.onIconPress}
                width={cardWidth}
            />
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={cards}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    paddingHorizontal: paddingHorizontal,
                    paddingRight: cards.length % 2 !== 0 ? cardWidth + gap : paddingHorizontal,
                }}
                ItemSeparatorComponent={() => <View style={{ width: gap }} />}
                onMomentumScrollEnd={onMomentumScrollEnd}
                decelerationRate="fast"
                // snapToInterval ensures it stops exactly at the start of the next pair
                snapToInterval={snapInterval}
                snapToAlignment="start"
                disableIntervalMomentum={true} // Prevents sliding across multiple pages
                getItemLayout={(_, index) => ({
                    length: cardWidth + gap,
                    offset: (cardWidth + gap) * index,
                    index,
                })}
            />

            {/* Paging Dots */}
            <View style={styles.pagination}>
                {Array.from({ length: totalPages }).map((_, index) => (
                    <View
                        key={index}
                        style={{
                            height: 6,
                            width: currentPage === index ? 16 : 6,
                            borderRadius: 3,
                            backgroundColor: currentPage === index ? colors.primary : colors.border,
                            opacity: currentPage === index ? 1 : 0.5,
                        }}
                    />
                ))}
            </View>

            <InvestmentEquityHelpModal
                visible={isEquityHelpVisible}
                onClose={() => setIsEquityHelpVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
        marginTop: -20,
    },
    card: {
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        height: 100,
        justifyContent: 'center'
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        flex: 1
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    subValueContainer: {
        marginTop: 4,
    },
    subValue: {
        fontSize: 12,
    },
    pagination: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 5,
        marginBottom: 5,
        gap: 6
    }
});