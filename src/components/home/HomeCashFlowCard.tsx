import React, { useRef, useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { HomeDisplayMode } from '@services/core/storageService';

interface HomeCashFlowCardProps {
    overallIncome: BigNumber;
    overallExpense: BigNumber;
    overallTransferIn: BigNumber;
    overallTransferOut: BigNumber;
    monthIncome: BigNumber;
    monthExpense: BigNumber;
    monthTransferIn: BigNumber;
    monthTransferOut: BigNumber;
    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    displayMode: HomeDisplayMode;
    onDisplayModeChange: (mode: HomeDisplayMode) => void;
    onInfoPress: (mode: 'Overall' | 'Month' | 'MonthIncomeExpense') => void;
    onNavigateToInsights: () => void;
}

const HomeCashFlowCard: React.FC<HomeCashFlowCardProps> = ({
    overallIncome,
    overallExpense,
    overallTransferIn,
    overallTransferOut,
    monthIncome,
    monthExpense,
    monthTransferIn,
    monthTransferOut,
    isLoading,
    isPrivacyEnabled,
    currency,
    displayMode,
    onDisplayModeChange,
    onInfoPress,
    onNavigateToInsights
}) => {
    const { colors } = useTheme();
    const scrollRef = useRef<ScrollView>(null);
    const [cardWidth, setCardWidth] = useState(0);

    // Sync ScrollView with displayMode change
    useEffect(() => {
        if (cardWidth > 0 && scrollRef.current) {
            let pageIndex = 0;
            if (displayMode === 'Month') pageIndex = 1;
            else if (displayMode === 'MonthIncomeExpense') pageIndex = 2;
            scrollRef.current.scrollTo({ x: pageIndex * cardWidth, animated: true });
        }
    }, [displayMode, cardWidth]);

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(contentOffsetX / width);

        const newMode: HomeDisplayMode = pageIndex === 0 ? 'Overall' : pageIndex === 1 ? 'Month' : 'MonthIncomeExpense';
        if (newMode !== displayMode) {
            onDisplayModeChange(newMode);
        }
    };

    const formatCurrency = (amount: BigNumber) => {
        if (isPrivacyEnabled) return '****';
        return formatCurrencyAmount(amount, currency);
    };

    return (
        <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                    Cash Flow
                </Text>
                {/* Page Indicator */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Overall' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Month' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'MonthIncomeExpense' ? colors.primary : colors.border }} />
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
                            if (displayMode === 'Month' && width > 0) {
                                scrollRef.current?.scrollTo({ x: width, animated: false });
                            } else if (displayMode === 'MonthIncomeExpense' && width > 0) {
                                scrollRef.current?.scrollTo({ x: width * 2, animated: false });
                            }
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {/* Card 1: Total Assets */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity onPress={() => onInfoPress('Overall')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 6 }}>Cash Balance</Text>
                                        <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
                                    </TouchableOpacity>
                                </View>
                                <Ionicons name="wallet-outline" size={24} color={colors.white} />
                            </View>
                            <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                {isLoading ? (
                                    <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    formatCurrency(
                                        overallIncome.plus(overallTransferIn)
                                            .minus(overallExpense.plus(overallTransferOut))
                                    )
                                )}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                <View>
                                    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money In</Text>
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(overallIncome.plus(overallTransferIn))}`}</Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money Out</Text>
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(overallExpense.plus(overallTransferOut))}`}</Text>
                                </View>
                            </View>
                            {isLoading ? (
                                <Skeleton width="100%" height={44} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            ) : (
                                <TouchableOpacity
                                    onPress={onNavigateToInsights}
                                    style={{
                                        marginTop: 15,
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Ionicons name="analytics" size={24} color={colors.white} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Financial Insights</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>

                    {/* Card 2: Monthly Balance */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity onPress={() => onInfoPress('Month')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 6 }}>Monthly Balance</Text>
                                        <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
                                    </TouchableOpacity>
                                </View>
                                <Ionicons name="calendar-outline" size={24} color={colors.white} />
                            </View>
                            <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                {isLoading ? (
                                    <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    formatCurrency(
                                        monthIncome.plus(monthTransferIn)
                                            .minus(monthExpense.plus(monthTransferOut))
                                    )
                                )}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                <View>
                                    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money In</Text>
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(monthIncome.plus(monthTransferIn))}`}</Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Money Out</Text>
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(monthExpense.plus(monthTransferOut))}`}</Text>
                                </View>
                            </View>
                            {isLoading ? (
                                <Skeleton width="100%" height={44} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            ) : (
                                <TouchableOpacity
                                    onPress={onNavigateToInsights}
                                    style={{
                                        marginTop: 15,
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Ionicons name="analytics" size={24} color={colors.white} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Financial Insights</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>

                    {/* Card 3: Monthly Net */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.primary, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <TouchableOpacity onPress={() => onInfoPress('MonthIncomeExpense')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9, marginRight: 6 }}>Monthly Net</Text>
                                        <Ionicons name="information-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
                                    </TouchableOpacity>
                                </View>
                                <Ionicons name="swap-vertical" size={24} color={colors.white} />
                            </View>
                            <Text style={{ color: colors.white, fontSize: 36, fontWeight: 'bold', marginVertical: 10 }}>
                                {isLoading ? (
                                    <Skeleton width={150} height={40} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    formatCurrency(monthIncome.minus(monthExpense))
                                )}
                            </Text>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
                                <View>
                                    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Income</Text>
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `+${formatCurrency(monthIncome)}`}</Text>
                                </View>
                                <View>
                                    <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Expense</Text>
                                    <Text style={{ color: colors.white, fontWeight: 'bold' }}>{isLoading ? '...' : `-${formatCurrency(monthExpense)}`}</Text>
                                </View>
                            </View>
                            {isLoading ? (
                                <Skeleton width="100%" height={44} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            ) : (
                                <TouchableOpacity
                                    onPress={onNavigateToInsights}
                                    style={{
                                        marginTop: 15,
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        paddingVertical: 10,
                                        borderRadius: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}
                                >
                                    <Ionicons name="analytics" size={24} color={colors.white} style={{ marginRight: 8 }} />
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Financial Insights</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>

                </ScrollView>
            </View>
        </View>
    );
};

export default HomeCashFlowCard;
