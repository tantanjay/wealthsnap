import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { formatCurrencyAmount } from '../../../utils/currencyUtils';
import { Ionicons } from '@expo/vector-icons';
import { Skeleton } from '../../common/Skeleton';
import BottomModal from '../../common/BottomModal';

interface InsightsOverviewCardsProps {
    netCashFlow: number;
    income: number;
    expense: number;
    savingsRate: number;
    burnRate: number;
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading?: boolean;
    // New props
    currentBalance: number;
    budgetPerformance: number;
    topExpenseCategory: { name: string; amount: number; percentage: number };
    daysInMonth: number;
    fiStatus: { fiTarget: number; progress: number; isFI: boolean; annualExpense: number };
    cardOrder?: string[];
    onReorderCards?: (newOrder: string[]) => void;
}

const InsightsOverviewCards: React.FC<InsightsOverviewCardsProps> = ({
    netCashFlow,
    income,
    expense,
    savingsRate,
    burnRate,
    currency,
    isPrivacyEnabled,
    isLoading = false,
    currentBalance,
    budgetPerformance,
    topExpenseCategory,
    daysInMonth,
    fiStatus,
    cardOrder,
    onReorderCards
}) => {
    const { colors } = useTheme();

    const flatListRef = useRef<FlatList>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isRunwayModalVisible, setIsRunwayModalVisible] = useState(false);
    const [isFIModalVisible, setIsFIModalVisible] = useState(false);

    const cardWidth = (Dimensions.get('window').width - 32 - 12) / 2; // (Screen - Padding - Gap) / 2

    // Memoize data to prevent re-creation on every render
    const data = useMemo(() => [
        {
            id: 'fi-progress',
            title: "FI Progress",
            value: `${fiStatus.progress.toFixed(1)}%`,
            subValue: fiStatus.isFI ? "Financial Independence Hit!" : "Freedom Milestone",
            color: fiStatus.progress >= 50 ? '#4CAF50' : fiStatus.progress >= 20 ? '#FF9800' : colors.primary,
            hasInfo: true,
            infoType: 'FI'
        },
        {
            id: 'financial-runway',
            title: "Financial Runway",
            value: burnRate > 0 ? `${(currentBalance / burnRate).toFixed(1)} months` : "∞ months",
            subValue: "Financial Safety Net",
            color: (currentBalance / burnRate) >= 6 ? '#4CAF50' : (currentBalance / burnRate) >= 3 ? '#FF9800' : '#F44336',
            hasInfo: true
        },
        {
            id: 'budget-performance',
            title: "Budget Health",
            value: budgetPerformance > 0 ? `${budgetPerformance.toFixed(0)}%` : "N/A",
            subValue: budgetPerformance === 0 ? "No Budgets Set" : budgetPerformance <= 100 ? "Under Budget" : "Over Budget",
            color: budgetPerformance === 0 ? undefined : budgetPerformance <= 80 ? '#4CAF50' : budgetPerformance <= 100 ? '#FF9800' : '#F44336'
        },
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
        },
        {
            id: 'avg-daily-spending',
            title: "Daily Average",
            value: formatCurrencyAmount(expense / daysInMonth, currency),
            subValue: "This Month",
            color: undefined
        },
        {
            id: 'annual-spending',
            title: "Annualized Exp.",
            value: formatCurrencyAmount(burnRate * 12, currency),
            subValue: "Based on Burn Rate",
            color: undefined
        },
        {
            id: 'largest-category',
            title: "Top Category",
            value: topExpenseCategory.name,
            subValue: formatCurrencyAmount(topExpenseCategory.amount, currency),
            color: undefined
        }
    ], [netCashFlow, income, expense, savingsRate, burnRate, currency, currentBalance, budgetPerformance, topExpenseCategory, daysInMonth]);

    // Apply custom order if available
    const orderedData = useMemo(() => {
        if (!cardOrder || cardOrder.length === 0) return data;
        return [...data].sort((a, b) => {
            const indexA = cardOrder.indexOf(a.id);
            const indexB = cardOrder.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
    }, [data, cardOrder]);

    // Calculate total pages (2 cards per page)
    const totalPages = Math.ceil(orderedData.length / 2);

    const onMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const contentOffset = event.nativeEvent.contentOffset.x;
        const viewWidth = cardWidth * 2 + 12; // Two cards + gap
        const page = Math.round(contentOffset / viewWidth);
        setCurrentPage(page);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={{ width: cardWidth, marginRight: 12 }}>
            <Card style={{ padding: 16, height: 120, justifyContent: 'space-between', backgroundColor: colors.surface }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{item.title.toUpperCase()}</Text>
                    {item.hasInfo && (
                        <TouchableOpacity
                            onPress={() => item.infoType === 'FI' ? setIsFIModalVisible(true) : setIsRunwayModalVisible(true)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="information-circle-outline" size={16} color={colors.textSecondary} />
                        </TouchableOpacity>
                    )}
                </View>
                <View>
                    <Text style={{ color: item.color || colors.text, fontSize: 20, fontWeight: 'bold' }} numberOfLines={1}>
                        {isLoading ? (
                            <Skeleton width={100} height={24} style={{ marginBottom: 4 }} />
                        ) : (
                            isPrivacyEnabled ? '****' : item.value
                        )}
                    </Text>
                    {isLoading ? (
                        <Skeleton width={60} height={12} style={{ marginTop: 4 }} />
                    ) : (
                        item.subValue && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{item.subValue}</Text>
                    )}
                </View>
            </Card>
        </View>
    );

    // Handle error when scrolling
    const onScrollToIndexFailed = (info: { index: number; highestMeasuredFrameIndex: number; averageItemLength: number }) => {
        const wait = new Promise(resolve => setTimeout(resolve, 500));
        wait.then(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: true });
        });
    };

    return (
        <View>
            <FlatList
                ref={flatListRef}
                data={orderedData}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 0 }}
                onMomentumScrollEnd={onMomentumScrollEnd}
                decelerationRate="fast"
                snapToInterval={cardWidth * 2 + 12} // Two cards + gap for page snapping
                snapToAlignment="start"
                getItemLayout={(data, index) => (
                    { length: cardWidth + 12, offset: (cardWidth + 12) * index, index }
                )}
                onScrollToIndexFailed={onScrollToIndexFailed}
            />

            {/* Paging Dots */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: -10, marginBottom: 10, gap: 6 }}>
                {Array.from({ length: totalPages }).map((_, index) => (
                    <View
                        key={index}
                        style={{
                            height: 8,
                            width: currentPage === index ? 24 : 8,
                            borderRadius: 4,
                            backgroundColor: currentPage === index ? colors.primary : colors.border,
                            opacity: currentPage === index ? 1 : 0.3,
                        }}
                    />
                ))}
            </View>

            {/* Info Modal for FI Progress */}
            <BottomModal
                visible={isFIModalVisible}
                onClose={() => setIsFIModalVisible(false)}
                title="Financial Independence (FI) Progress"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 20 }}>
                        The <Text style={{ fontWeight: 'bold', color: colors.primary }}>25x Rule</Text> determines the amount you need to save to never have to work again for money.
                    </Text>

                    {/* Progress Visual */}
                    <View style={{ marginBottom: 30 }}>
                        <View style={{ height: 12, backgroundColor: colors.border + '40', borderRadius: 6, width: '100%', overflow: 'hidden', marginBottom: 10 }}>
                            <View
                                style={{
                                    height: '100%',
                                    width: `${Math.min(fiStatus.progress, 100)}%`,
                                    backgroundColor: fiStatus.progress >= 100 ? '#4CAF50' : colors.primary,
                                    borderRadius: 6
                                }}
                            />
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Current Assets: <Text style={{ color: colors.text, fontWeight: 'bold' }}>{fiStatus.progress.toFixed(1)}%</Text></Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Goal: 100%</Text>
                        </View>
                    </View>

                    {/* Calculation Section */}
                    <View style={{ backgroundColor: colors.surface, padding: 20, borderRadius: 16, marginBottom: 25 }}>
                        <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 15 }}>How we calculate it:</Text>

                        <View style={{ gap: 12 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>1</Text>
                                </View>
                                <Text style={{ color: colors.text, flex: 1 }}>Average <Text style={{ fontWeight: 'bold' }}>Monthly Burn Rate</Text></Text>
                            </View>

                            <Ionicons name="close-outline" size={20} color={colors.textSecondary} style={{ marginLeft: 6 }} />

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>2</Text>
                                </View>
                                <Text style={{ color: colors.text, flex: 1 }}>Multiply by <Text style={{ fontWeight: 'bold' }}>12</Text> (Annual Spending)</Text>
                            </View>

                            <Ionicons name="close-outline" size={20} color={colors.textSecondary} style={{ marginLeft: 6 }} />

                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ color: colors.primary, fontWeight: 'bold' }}>3</Text>
                                </View>
                                <Text style={{ color: colors.text, flex: 1 }}>Multiply by <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>25</Text> (The Safe Withdrawal Multiple)</Text>
                            </View>
                        </View>

                        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 20 }} />

                        <Text style={{ color: colors.textSecondary, fontSize: 14, textAlign: 'center' }}>
                            Your FI Number: <Text style={{ color: '#4CAF50', fontWeight: 'bold', fontSize: 18 }}>{formatCurrencyAmount(fiStatus.fiTarget, currency)}</Text>
                        </Text>
                    </View>

                    {/* Important Info */}
                    <View style={{ backgroundColor: '#4CAF5010', padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#4CAF50', marginBottom: 15 }}>
                        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
                            <Text style={{ fontWeight: 'bold', color: '#4CAF50' }}>What is the 25x Rule?</Text> Based on the 4% safe withdrawal rate, if you have 25 times your annual expenses saved, you can withdraw 4% annually for life without running out of money.
                        </Text>
                    </View>

                    <View style={{ backgroundColor: '#FF980010', padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: '#FF9800' }}>
                        <Text style={{ color: colors.text, fontSize: 14, lineHeight: 22 }}>
                            <Text style={{ fontWeight: 'bold', color: '#FF9800' }}>Note:</Text> This calculation assumes your current lifestyle (Burn Rate) stays the same. If your expenses go down, your FI progress goes up!
                        </Text>
                    </View>
                </ScrollView>
            </BottomModal>
        </View>
    );
};

export default InsightsOverviewCards;
