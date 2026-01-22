import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent, Pressable } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { formatCurrencyAmount } from '../../../utils/currencyUtils';

import { Skeleton } from '../../common/Skeleton';

interface InsightsOverviewCardsProps {
    netCashFlow: number;
    income: number;
    expense: number;
    savingsRate: number;
    burnRate: number;
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading?: boolean;
}

const InsightsOverviewCards: React.FC<InsightsOverviewCardsProps> = ({
    netCashFlow,
    income,
    expense,
    savingsRate,
    burnRate,
    currency,
    isPrivacyEnabled,
    isLoading = false
}) => {
    const { colors } = useTheme();

    const flatListRef = useRef<FlatList>(null);
    const [, setCurrentIndex] = useState(0);
    // Use a Ref to track interaction state synchronously
    const isInteracting = useRef(false);
    const autoScrollTimer = useRef<NodeJS.Timeout | null>(null);

    const cardWidth = (Dimensions.get('window').width - 32 - 12) / 2; // (Screen - Padding - Gap) / 2

    // Memoize originalData to prevent re-creation on every render
    const originalData = useMemo(() => [
        {
            id: 'net-cash-flow',
            title: "Net Cash Flow",
            value: formatCurrencyAmount(netCashFlow, currency),
            subValue: "This Month",
            color: netCashFlow >= 0 ? '#4CAF50' : '#F44336'
        },
        {
            id: 'savings-rate',
            title: "Savings Rate",
            value: `${savingsRate.toFixed(1)}%`,
            subValue: savingsRate < 20 ? "Below Goal" : "Healthy",
            color: savingsRate >= 20 ? '#4CAF50' : '#FF9800'
        },
        {
            id: 'total-income',
            title: "Total Income",
            value: formatCurrencyAmount(income, currency),
            subValue: "This Month",
            color: '#4CAF50'
        },
        {
            id: 'total-expense',
            title: "Total Expense",
            value: formatCurrencyAmount(expense, currency),
            subValue: "This Month",
            color: '#F44336'
        },
        {
            id: 'burn-rate',
            title: "Burn Rate",
            value: formatCurrencyAmount(burnRate, currency),
            subValue: "Avg Monthly Expense",
            color: undefined
        }
    ], [netCashFlow, income, expense, savingsRate, burnRate, currency]); // Dependencies for data content

    // Append first 2 items to the end for seamless looping
    const data = useMemo(() => [
        ...originalData,
        ...originalData.slice(0, 2).map(item => ({ ...item, id: `${item.id}-dup` }))
    ], [originalData]);

    const startAutoScroll = useCallback(() => {
        if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);

        autoScrollTimer.current = setInterval(() => {
            // Double check interaction state inside the timer callback
            if (isInteracting.current) return;

            setCurrentIndex(prevIndex => {
                // Determine layout details
                const totalLen = originalData.length;

                // --- Infinite Loop Logic ---
                if (prevIndex >= totalLen) {
                    const realIndex = prevIndex % totalLen;

                    // 1. Silent Snap to real index
                    flatListRef.current?.scrollToIndex({ index: realIndex, animated: false });

                    // 2. Scroll to next index (which is realIndex + 1)
                    const nextIndex = realIndex + 1;

                    // Small delay to ensure the snap has processed
                    setTimeout(() => {
                        // Check interaction again before animating
                        if (!isInteracting.current) {
                            flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                        }
                    }, 50);

                    return nextIndex;
                }

                const nextIndex = prevIndex + 1;
                flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                return nextIndex;
            });
        }, 3000);
    }, [originalData.length]);

    const stopAutoScroll = useCallback(() => {
        if (autoScrollTimer.current) {
            clearInterval(autoScrollTimer.current);
            autoScrollTimer.current = null;
        }
    }, []);

    // Initial Start
    useEffect(() => {
        startAutoScroll();
        return () => stopAutoScroll();
    }, [startAutoScroll, stopAutoScroll]);


    // --- Interaction Handlers ---

    const handleInteractionStart = () => {
        isInteracting.current = true;
        stopAutoScroll();
    };

    const handleInteractionEnd = () => {
        isInteracting.current = false;
        startAutoScroll();
    };

    const onScrollBeginDrag = () => {
        handleInteractionStart();
    };

    const onScrollEndDrag = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        handleInteractionEnd();
    };


    const onMomentumScrollBegin = () => {
        handleInteractionStart();
    };

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const index = Math.round(contentOffset / (cardWidth + 12));
        setCurrentIndex(index);

        // Snap back logic for manual scrolling
        if (index >= originalData.length) {
            const realIndex = index % originalData.length;
            flatListRef.current?.scrollToIndex({ index: realIndex, animated: false });
            setCurrentIndex(realIndex);
        }

        handleInteractionEnd();
    };

    // Catch-all touch handlers using Pressable wrapper on items
    // This handles "touch and hold" which stops the scroll
    const onPressIn = () => {
        handleInteractionStart();
    };

    const renderItem = ({ item }: { item: any }) => (
        <Pressable
            onPressIn={onPressIn}
            onPressOut={handleInteractionEnd}
            style={{ width: cardWidth, marginRight: 12 }}
        >

            <Card style={{ padding: 16, height: 120, justifyContent: 'space-between', backgroundColor: colors.surface }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{item.title.toUpperCase()}</Text>
                <View>
                    <Text style={{ color: item.color || colors.text, fontSize: 20, fontWeight: 'bold' }}>
                        {isLoading ? (
                            <Skeleton width={100} height={24} style={{ marginBottom: 4 }} />
                        ) : (
                            isPrivacyEnabled ? '***' : item.value
                        )}
                    </Text>
                    {isLoading ? (
                        <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
                    ) : (
                        item.subValue && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>{item.subValue}</Text>
                    )}
                </View>
            </Card>
        </Pressable>
    );

    // Handle error when scrolling
    const onScrollToIndexFailed = (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
        });
    };

    return (
        <FlatList
            ref={flatListRef}
            data={data}
            renderItem={renderItem}
            keyExtractor={item => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 0 }}

            // Scroll Interaction Handlers
            onScrollBeginDrag={onScrollBeginDrag}
            onScrollEndDrag={onScrollEndDrag}
            onMomentumScrollBegin={onMomentumScrollBegin}
            onMomentumScrollEnd={onMomentumScrollEnd}

            decelerationRate="fast"
            snapToInterval={cardWidth + 12} // width + margin
            getItemLayout={(data, index) => (
                { length: cardWidth + 12, offset: (cardWidth + 12) * index, index }
            )}
            onScrollToIndexFailed={onScrollToIndexFailed}
        />
    );
};

export default InsightsOverviewCards;
