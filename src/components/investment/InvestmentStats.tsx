import React from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { Skeleton } from '@components/common/Skeleton';

interface InvestmentStatsProps {
    totalEquity: number;
    realizedPL: number;
    unrealizedPL: number;
    unrealizedPLPercent: number;
    totalDividends: number;
    currency?: string;
    isLoading?: boolean;
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

const StatCard = ({ label, value, subValue, color, icon, width }: any) => {
    const { colors } = useTheme();
    return (
        <View style={[styles.card, { backgroundColor: colors.surface, width }]}>
            <View style={styles.cardHeader}>
                <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>{label}</Text>
                {icon && <Ionicons name={icon} size={16} color={colors.textSecondary} />}
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
    unrealizedPL,
    unrealizedPLPercent,
    totalDividends,
    currency = 'PHP',
    isLoading = false
}) => {
    const { colors } = useTheme();
    const [currentPage, setCurrentPage] = React.useState(0);

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

    const cards = [
        {
            id: 'equity',
            label: "Total Equity",
            value: formatCurrencyAmount(totalEquity, currency),
            color: colors.primary,
            icon: "wallet-outline"
        },
        {
            id: 'realized',
            label: "Realized P/L",
            value: formatCurrencyAmount(realizedPL, currency),
            subValue: (
                <Text style={{
                    color: realizedPL >= 0 ? colors.success : colors.error,
                    fontWeight: 'bold',
                    fontSize: 12
                }}>
                    {realizedPL >= 0 ? '+' : ''}{(0).toFixed(2)}%
                </Text>
            ),
            color: colors.text
        },
        {
            id: 'unrealized',
            label: "Unrealized P/L",
            value: formatCurrencyAmount(unrealizedPL, currency),
            subValue: (
                <Text style={{
                    color: unrealizedPL >= 0 ? colors.success : colors.error,
                    fontWeight: 'bold',
                    fontSize: 12
                }}>
                    {unrealizedPL >= 0 ? '+' : ''}{unrealizedPLPercent.toFixed(2)}%
                </Text>
            )
        },
        {
            id: 'dividends',
            label: "Total Divs Received",
            value: formatCurrencyAmount(totalDividends, currency),
            color: colors.textSecondary
        }
    ];

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
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 10,
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
        marginTop: 16,
        gap: 6
    }
});