import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { HomeFinancialHealthDisplayMode } from '@services/core/storageService';

interface HomeFinancialHealthCardProps {
    totalAssets: BigNumber;
    runwayInMonths: number;
    runwayChange: number;
    topHoldings: Array<{ symbol: string, percent: number }>;
    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    displayMode: HomeFinancialHealthDisplayMode;
    monthBudgetPercent: number;
    spendingDifferencePercent: number;
    investmentsTotal: BigNumber;
    cashBalance: BigNumber;
    netWorth: BigNumber; // New Prop
    onDisplayModeChange: (mode: HomeFinancialHealthDisplayMode) => void;
    onInfoPress: (mode: HomeFinancialHealthDisplayMode) => void;
}

const CARD_HEIGHT = 200;

const HomeFinancialHealthCard: React.FC<HomeFinancialHealthCardProps> = ({
    totalAssets,
    runwayInMonths,
    runwayChange,
    topHoldings,
    monthBudgetPercent,
    spendingDifferencePercent,
    investmentsTotal,
    cashBalance,
    netWorth,
    isLoading,
    isPrivacyEnabled,
    currency,
    displayMode,
    onDisplayModeChange,
    onInfoPress
}) => {
    const { colors } = useTheme();
    const scrollRef = useRef<ScrollView>(null);
    const [cardWidth, setCardWidth] = useState(0);

    // Sync ScrollView with displayMode change
    useEffect(() => {
        if (cardWidth > 0 && scrollRef.current) {
            let pageIndex = 0;
            if (displayMode === 'NetWorth') pageIndex = 0;
            if (displayMode === 'Assets') pageIndex = 1;
            if (displayMode === 'Health') pageIndex = 2;
            scrollRef.current.scrollTo({ x: pageIndex * cardWidth, animated: true });
        }
    }, [displayMode, cardWidth]);

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(contentOffsetX / width);

        let newMode: HomeFinancialHealthDisplayMode = 'NetWorth';
        if (pageIndex === 1) newMode = 'Assets';
        if (pageIndex === 2) newMode = 'Health';

        if (newMode !== displayMode) {
            onDisplayModeChange(newMode);
        }
    };

    const formatCurrency = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, currency);
    };

    const getSpendingMessage = () => {
        const absDiff = Math.abs(spendingDifferencePercent);
        if (spendingDifferencePercent < 0) return `Spending ${absDiff.toFixed(0)}% lower than usual`;
        if (spendingDifferencePercent > 0) return `Spending ${absDiff.toFixed(0)}% higher than usual`;
        return 'Spending is normal';
    };

    const getRunwayChangeContent = () => {
        if (runwayChange === 0) return null;
        const isUp = runwayChange > 0;
        const iconName = isUp ? 'caret-up' : 'caret-down';
        const color = isUp ? colors.success : colors.error;
        const text = `${isUp ? '+' : ''}${runwayChange.toFixed(1)} vs last month`;

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name={iconName} size={12} color={color} />
                <Text style={{ color: color, fontSize: 12, marginLeft: 2 }}>{text}</Text>
            </View>
        );
    };

    return (
        <View style={{ marginBottom: 20 }}>
            {/* Header */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                    Financial Health
                </Text>
                {/* Page Indicator */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'NetWorth' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Assets' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Health' ? colors.primary : colors.border }} />
                </View>
            </View>

            <View>
                <ScrollView
                    ref={scrollRef}
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    onMomentumScrollEnd={handleMomentumScrollEnd}
                    onLayout={(e) => {
                        const width = e.nativeEvent.layout.width;
                        if (Math.abs(width - cardWidth) > 1) {
                            setCardWidth(width);
                            if (displayMode === 'Assets' && width > 0) {
                                scrollRef.current?.scrollTo({ x: width, animated: false });
                            }
                            if (displayMode === 'Health' && width > 0) {
                                scrollRef.current?.scrollTo({ x: width * 2, animated: false });
                            }
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {/* Card 0: Net Worth */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.surface, padding: 20, marginBottom: 10, width: '100%', height: CARD_HEIGHT, justifyContent: 'space-between' }}>
                            <View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => onInfoPress('NetWorth')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 16, opacity: 0.9, marginRight: 6 }}>Net Worth</Text>
                                            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ backgroundColor: colors.primary + '20', padding: 8, borderRadius: 12 }}>
                                        <Ionicons name="shield-checkmark-outline" size={24} color={colors.primary} />
                                    </View>
                                </View>
                                <Text style={{ color: colors.text, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                    {isLoading ? (
                                        <Skeleton width={150} height={40} style={{ backgroundColor: colors.border }} />
                                    ) : (
                                        formatCurrency(netWorth)
                                    )}
                                </Text>
                            </View>
                            <View>
                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                                    Assets - (Debt + Interest)
                                </Text>
                            </View>
                        </Card>
                    </View>

                    {/* Card 1: Total Assets */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.surface, padding: 20, marginBottom: 10, width: '100%', height: CARD_HEIGHT, justifyContent: 'space-between' }}>
                            <View>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <TouchableOpacity onPress={() => onInfoPress('Assets')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Text style={{ color: colors.textSecondary, fontSize: 16, opacity: 0.9, marginRight: 6 }}>Total Assets</Text>
                                            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={{ backgroundColor: colors.primary + '20', padding: 8, borderRadius: 12 }}>
                                        <Ionicons name="pie-chart-outline" size={24} color={colors.primary} />
                                    </View>
                                </View>
                                <Text style={{ color: colors.text, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                    {isLoading ? (
                                        <Skeleton width={150} height={40} style={{ backgroundColor: colors.border }} />
                                    ) : (
                                        formatCurrency(totalAssets)
                                    )}
                                </Text>
                            </View>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Investments</Text>
                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{isLoading ? '...' : formatCurrency(investmentsTotal)}</Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Cash Balance</Text>
                                    <Text style={{ color: colors.text, fontWeight: 'bold' }}>{isLoading ? '...' : formatCurrency(cashBalance)}</Text>
                                </View>
                            </View>
                        </Card>
                    </View>

                    {/* Card 2: Financial Health Stats */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.surface, padding: 20, marginBottom: 10, width: '100%', height: CARD_HEIGHT, justifyContent: 'space-between' }}>

                            {/* Runway */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.success + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Ionicons name="hourglass-outline" size={16} color={colors.success} />
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Runway</Text>
                                        {isLoading ? <Skeleton width={60} height={20} style={{ marginTop: 4 }} /> : (
                                            <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
                                                {runwayInMonths === Infinity ? '∞' : runwayInMonths.toFixed(1)} months
                                            </Text>
                                        )}
                                    </View>
                                </View>
                                {isLoading ? <Skeleton width={80} height={16} /> : getRunwayChangeContent()}
                            </View>

                            {/* Budget */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.warning + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Ionicons name="wallet-outline" size={16} color={colors.warning} />
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Months Budget: {isLoading ? '...' : `${monthBudgetPercent.toFixed(0)}%`}</Text>
                                        {isLoading ? <Skeleton width={100} height={16} style={{ marginTop: 4 }} /> : (
                                            <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: 'italic' }}>
                                                {getSpendingMessage()}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </View>

                            {/* Top Holding */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary + '20', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                                        <Ionicons name="trending-up-outline" size={16} color={colors.primary} />
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 4 }}>Top Holdings</Text>
                                        {isLoading ? <Skeleton width={150} height={20} style={{ marginTop: 4 }} /> : (
                                            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                                {topHoldings.sort((a, b) => b.percent - a.percent).map((holding, index) => (
                                                    <View key={index} style={{ marginRight: index === 0 ? 24 : 0 }}>
                                                        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', lineHeight: 22 }}>
                                                            {holding.percent.toFixed(1)}% <Text style={{ fontWeight: '400', fontSize: 14 }}>({holding.symbol})</Text>
                                                        </Text>
                                                    </View>
                                                ))}
                                                {topHoldings.length === 0 && (
                                                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>No data</Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>

                        </Card>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

export default HomeFinancialHealthCard;
