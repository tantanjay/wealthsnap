import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface HomeInvestmentCardProps {
    total: BigNumber;
    realizedPL: BigNumber;
    unrealizedPL: BigNumber;
    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    onPress: () => void;
}

const HomeInvestmentCard: React.FC<HomeInvestmentCardProps> = ({
    total,
    realizedPL,
    unrealizedPL,
    isLoading,
    isPrivacyEnabled,
    currency,
    onPress
}) => {
    const { colors } = useTheme();

    return (
        <View style={{ marginBottom: 20 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>
                    Investments
                </Text>
            </View>
            <Card style={{ backgroundColor: colors.secondary, padding: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Portfolio</Text>
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
    );
};

export default HomeInvestmentCard;
