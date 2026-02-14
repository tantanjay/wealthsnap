import React, { useRef, useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';
import { DebtDisplayMode } from '@services/core/storageService';

interface HomeDebtCardProps {
    total: BigNumber;
    borrowed: BigNumber;
    repaid: BigNumber;

    // Monthly Metrics
    monthBorrowed: BigNumber;
    monthRepaid: BigNumber;

    // Monthly Obligations
    obligations: BigNumber;
    obligationsPaid: BigNumber;

    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    onPress: () => void;

    displayMode: DebtDisplayMode;
    onDisplayModeChange: (mode: DebtDisplayMode) => void;
}

const HomeDebtCard: React.FC<HomeDebtCardProps> = ({
    total,
    borrowed,
    repaid,
    monthBorrowed,
    monthRepaid,
    obligations,
    obligationsPaid,
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
            if (displayMode === 'Obligations') pageIndex = 2;
            scrollRef.current.scrollTo({ x: pageIndex * cardWidth, animated: true });
        }
    }, [displayMode, cardWidth]);

    const handleMomentumScrollEnd = (event: any) => {
        const contentOffsetX = event.nativeEvent.contentOffset.x;
        const width = event.nativeEvent.layoutMeasurement.width;
        const pageIndex = Math.round(contentOffsetX / width);

        let newMode: DebtDisplayMode = 'Total';
        if (pageIndex === 1) newMode = 'Month';
        if (pageIndex === 2) newMode = 'Obligations';
        if (newMode !== displayMode) {
            onDisplayModeChange(newMode);
        }
    };

    return (
        <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                    Debts & Liabilities
                </Text>
                {/* Page Indicator */}
                <View style={{ flexDirection: 'row', gap: 4 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Total' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Month' ? colors.primary : colors.border }} />
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: displayMode === 'Obligations' ? colors.primary : colors.border }} />
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
                            if (displayMode === 'Obligations' && width > 0) {
                                scrollRef.current?.scrollTo({ x: width * 2, animated: false });
                            }
                        }
                    }}
                    scrollEventThrottle={16}
                >
                    {/* Card 1: Total Debt */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.error, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Debt</Text>
                                <Ionicons name="card" size={24} color={colors.white} />
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
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Borrowed</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : formatCurrencyAmount(borrowed, currency)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Repaid</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : formatCurrencyAmount(repaid, currency)}
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
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Debts</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>

                    {/* Card 2: Monthly Activity */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.error, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Monthly Activity</Text>
                                <Ionicons name="calendar-outline" size={24} color={colors.white} />
                            </View>
                            {/* For monthly activity, maybe showing Net Change (Borrowed - Repaid)? Or just Repaid is more positive? 
                                Let's show Repaid as the Hero number since that is the goal. */}
                            <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                                {isLoading ? (
                                    <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    isPrivacyEnabled ? '****' : formatCurrencyAmount(monthRepaid, currency)
                                )}
                            </Text>

                            {!isLoading && (
                                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Borrowed (Mo)</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : formatCurrencyAmount(monthBorrowed, currency)}
                                        </Text>
                                    </View>
                                    {/* Maybe "Net Change" instead of repeating Repaid? */}
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Net Change</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : (
                                                (monthBorrowed.minus(monthRepaid).isGreaterThanOrEqualTo(0) ? '+' : '') +
                                                formatCurrencyAmount(monthBorrowed.minus(monthRepaid), currency)
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
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Debts</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>
                    {/* Card 3: Monthly Obligations */}
                    <View style={{ width: cardWidth || '100%', paddingRight: 0 }}>
                        <Card style={{ backgroundColor: colors.error, padding: 20, marginBottom: 10, width: '100%' }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                                <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Monthly Obligations</Text>
                                <Ionicons name="alert-circle-outline" size={24} color={colors.white} />
                            </View>
                            <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                                {isLoading ? (
                                    <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                                ) : (
                                    isPrivacyEnabled ? '****' : formatCurrencyAmount(obligations, currency)
                                )}
                            </Text>

                            {!isLoading && (
                                <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Paid</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : formatCurrencyAmount(obligationsPaid, currency)}
                                        </Text>
                                    </View>
                                    <View>
                                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Unpaid</Text>
                                        <Text style={{
                                            color: colors.white,
                                            fontWeight: 'bold',
                                            opacity: isPrivacyEnabled ? 0.5 : 1
                                        }}>
                                            {isPrivacyEnabled ? '****' : formatCurrencyAmount(BigNumber.max(0, obligations.minus(obligationsPaid)), currency)}
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
                                    <Text style={{ color: colors.white, fontWeight: '600' }}>View Debts</Text>
                                </TouchableOpacity>
                            )}
                        </Card>
                    </View>
                </ScrollView>
            </View>
        </View>
    );
};

export default HomeDebtCard;
