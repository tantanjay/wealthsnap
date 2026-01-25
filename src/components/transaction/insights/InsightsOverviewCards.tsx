import React, { useRef, useState, useMemo } from 'react';
import { View, Text, Dimensions, FlatList, NativeSyntheticEvent, NativeScrollEvent, TouchableOpacity } from 'react-native';
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
    cardOrder,
    onReorderCards
}) => {
    const { colors } = useTheme();

    const flatListRef = useRef<FlatList>(null);
    const [currentPage, setCurrentPage] = useState(0);
    const [isRunwayModalVisible, setIsRunwayModalVisible] = useState(false);
    const [isBudgetModalVisible, setIsBudgetModalVisible] = useState(false);
    const [isDailyAvgModalVisible, setIsDailyAvgModalVisible] = useState(false);

    const cardWidth = (Dimensions.get('window').width - 32 - 12) / 2; // (Screen - Padding - Gap) / 2

    // Memoize data to prevent re-creation on every render
    const data = useMemo(() => [
        {
            id: 'financial-runway',
            title: "Financial Runway",
            value: burnRate > 0 ? `${(currentBalance / burnRate).toFixed(1)} months` : "∞ months",
            subValue: "Financial Safety Net",
            color: (currentBalance / burnRate) >= 6 ? '#4CAF50' : (currentBalance / burnRate) >= 3 ? '#FF9800' : '#F44336',
            hasInfo: true,
            onInfoPress: () => setIsRunwayModalVisible(true)
        },
        {
            id: 'budget-performance',
            title: "Budget Health",
            value: budgetPerformance > 0 ? `${budgetPerformance.toFixed(0)}%` : "N/A",
            subValue: budgetPerformance === 0 ? "No Budgets Set" : budgetPerformance <= 100 ? "Under Budget" : "Over Budget",
            color: budgetPerformance === 0 ? undefined : budgetPerformance <= 70 ? '#4CAF50' : budgetPerformance <= 90 ? '#FF9800' : '#F44336',
            hasInfo: true,
            onInfoPress: () => setIsBudgetModalVisible(true)
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
            color: undefined,
            hasInfo: true,
            onInfoPress: () => setIsDailyAvgModalVisible(true)
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
                        <TouchableOpacity onPress={item.onInfoPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

            {/* Info Modal for Runway */}
            <BottomModal
                visible={isRunwayModalVisible}
                onClose={() => setIsRunwayModalVisible(false)}
                title="How is this Calculated?"
            >
                <View style={{ padding: 20, paddingBottom: 40 }}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 15 }}>
                        Financial Runway shows how many months you can sustain your current lifestyle based on your net tracked balance and average monthly expenses (burn rate).
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20 }}>
                            &quot;Essentially, if your income stopped today, this is how long you could live without changing your spending habits.&quot;
                        </Text>
                    </View>
                    <View style={{ backgroundColor: '#FF9800' + '20', padding: 12, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#FF9800', marginBottom: 15 }}>
                        <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 6 }}>⚠️ Important Note</Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20 }}>
                            This calculation uses your <Text style={{ fontWeight: 'bold' }}>tracked balance</Text> (lifetime income - expenses from your transactions), not your actual bank account balance.{"\n\n"}
                            For accurate runway, ensure your starting balance is recorded as an initial income transaction.
                        </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        Calculation: Net Tracked Balance ÷ Average Monthly Expense
                    </Text>
                </View>
            </BottomModal>

            {/* Budget Performance Modal */}
            <BottomModal
                visible={isBudgetModalVisible}
                onClose={() => setIsBudgetModalVisible(false)}
                title="How is this Calculated?"
            >
                <View style={{ padding: 20, paddingBottom: 40 }}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 15 }}>
                        Budget Health shows what percentage of your total budgets you&apos;ve spent this month.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20 }}>
                            &quot;Track your spending against budgets to stay on target and avoid overspending.&quot;
                        </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Color Guide:</Text>
                    <View style={{ marginLeft: 8, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                            • <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>Green (&lt;70%)</Text>: Healthy - plenty of budget remaining
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                            • <Text style={{ color: '#FF9800', fontWeight: 'bold' }}>Orange (70-90%)</Text>: Warning - approaching budget limit
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            • <Text style={{ color: '#F44336', fontWeight: 'bold' }}>Red (&gt;90%)</Text>: Danger - over budget or very close
                        </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        Calculation: (Total Spent in Budgeted Categories ÷ Total Budget Amounts) × 100
                    </Text>
                </View>
            </BottomModal>

            {/* Daily Average Modal */}
            <BottomModal
                visible={isDailyAvgModalVisible}
                onClose={() => setIsDailyAvgModalVisible(false)}
                title="How is this Calculated?"
            >
                <View style={{ padding: 20, paddingBottom: 40 }}>
                    <Text style={{ color: colors.text, fontSize: 16, lineHeight: 24, marginBottom: 15 }}>
                        Daily Average shows how much you&apos;re spending per day on average this month.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 15, borderRadius: 12, borderLeftWidth: 4, borderLeftColor: colors.primary, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, fontStyle: 'italic', lineHeight: 20 }}>
                            &quot;Understanding your daily spending helps you stay mindful of expenses throughout the month.&quot;
                        </Text>
                    </View>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold', marginBottom: 8 }}>Use Cases:</Text>
                    <View style={{ marginLeft: 8, marginBottom: 15 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                            • Compare daily spending across different months
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13, marginBottom: 4 }}>
                            • Set daily spending goals for better control
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                            • Identify if you&apos;re spending more on certain days
                        </Text>
                    </View>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                        Calculation: Total Monthly Expenses ÷ Days in Month
                    </Text>
                </View>
            </BottomModal>
        </View>
    );
};

export default InsightsOverviewCards;
