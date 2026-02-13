import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { InvestmentDisplayMode } from '@services/core/storageService';

interface HomeInvestmentCardProps {
    total: BigNumber;
    realizedPL: BigNumber;
    unrealizedPL: BigNumber;

    // Monthly Metrics
    monthInvested: BigNumber;
    monthRealizedPL: BigNumber;
    monthUnrealizedPL: BigNumber;

    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    onPress: () => void;

    displayMode: InvestmentDisplayMode;
    onDisplayModeChange: (mode: InvestmentDisplayMode) => void;
}

const HomeInvestmentCard: React.FC<HomeInvestmentCardProps> = ({
    total,
    realizedPL,
    unrealizedPL,
    monthInvested,
    monthRealizedPL,
    monthUnrealizedPL,
    isLoading,
    isPrivacyEnabled,
    currency,
    onPress,
    displayMode,
    onDisplayModeChange
}) => {
    const { colors } = useTheme();
    const scrollRef = useRef<ScrollView>(null);
    const [cardWidth, setCardWidth] = useState(0);

    // Sync ScrollView with displayMode change
    useEffect(() => {
        if (cardWidth > 0 && scrollRef.current) {
            let pageIndex = 0;
            if (displayMode === 'Month') pageIndex = 1;
            scrollRef.current.scrollTo({ x: pageIndex * cardWidth, animated: true });
        }
    }, [displayMode, cardWidth]);

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(contentOffsetX / width);

        const newMode: InvestmentDisplayMode = pageIndex === 0 ? 'Total' : 'Month';
        if (newMode !== displayMode) {
            onDisplayModeChange(newMode);
        }
    };

    return (
        <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                    Investments
                </Text>
                {/* Page Indicator */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Total' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Month' ? colors.primary : colors.border }} />
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
                            }
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {/* Card 1: Total Portfolio */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.secondary, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Portfolio</Text>
                                </View>
                                <Ionicons name="trending-up" size={24} color={colors.white} />
                            </View>
                            <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                                {isLoading ? (
                                    <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    isPrivacyEnabled ? '****' : formatCurrencyAmount(total, currency)
                                )}
                            </Text>

                            {!isLoading && (
                                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Realized P/L</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : (
                                                (realizedPL.isGreaterThanOrEqualTo(0) ? '+' : '') + formatCurrencyAmount(realizedPL, currency)
                                            )}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Unrealized P/L</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : (
                                                (unrealizedPL.isGreaterThanOrEqualTo(0) ? '+' : '') + formatCurrencyAmount(unrealizedPL, currency)
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {isLoading ? (
                                <Skeleton width="100%" height={36} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            ) : (
                                <TouchableOpacity
                                    style={{
                                        marginTop: 15,
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                        borderRadius: 8
                                    }}
                                    onPress={onPress}
                                >
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Portfolio</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>

                    {/* Card 2: Monthly Activity */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.secondary, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Monthly Activity</Text>
                                </View>
                                <Ionicons name="calendar-outline" size={24} color={colors.white} />
                            </View>
                            <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                                {isLoading ? (
                                    <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    isPrivacyEnabled ? '****' : formatCurrencyAmount(monthInvested, currency)
                                )}
                            </Text>

                            {!isLoading && (
                                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Realized (Mo)</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : (
                                                (monthRealizedPL.isGreaterThanOrEqualTo(0) ? '+' : '') + formatCurrencyAmount(monthRealizedPL, currency)
                                            )}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Unrealized (Mo)</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : (
                                                (monthUnrealizedPL.isGreaterThanOrEqualTo(0) ? '+' : '') + formatCurrencyAmount(monthUnrealizedPL, currency)
                                            )}
                                        </Text>
                                    </View>
                                </View>
                            )}
                            {isLoading ? (
                                <Skeleton width="100%" height={36} style={{ marginTop: 15, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' }} />
                            ) : (
                                <TouchableOpacity
                                    style={{
                                        marginTop: 15,
                                        backgroundColor: 'rgba(255,255,255,0.2)',
                                        paddingVertical: 8,
                                        alignItems: 'center',
                                        borderRadius: 8
                                    }}
                                    onPress={onPress}
                                >
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Portfolio</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

export default HomeInvestmentCard;
