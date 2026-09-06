import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface HomeSavingsGoalsCardProps {
    total: BigNumber;
    target: BigNumber;
    spent: BigNumber;
    goalCount: number;
    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    onPress: () => void;
}

const HomeSavingsGoalsCard: React.FC<HomeSavingsGoalsCardProps> = ({
    total,
    target,
    spent,
    goalCount,
    isLoading,
    isPrivacyEnabled,
    currency,
    onPress,
}) => {
    const { colors } = useTheme();

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>
                Savings Goals
            </Text>
            <Card style={{ backgroundColor: colors.success, padding: 20, width: '100%' }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: colors.white, fontSize: 16, opacity: 0.9 }}>Total Saved</Text>
                    <Ionicons name="wallet" size={24} color={colors.white} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.white, fontSize: 32, fontWeight: 'bold' }}>
                        {isLoading ? (
                            <Skeleton width={120} height={36} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
                        ) : (
                            isPrivacyEnabled ? '****' : formatCurrencyAmount(total, currency)
                        )}
                    </Text>
                    {!isLoading && (
                        <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>
                            {goalCount === 0 ? 'No goals yet' : `${goalCount} goal${goalCount === 1 ? '' : 's'}`}
                        </Text>
                    )}
                </View>

                {!isLoading && goalCount > 0 && (
                    <View style={{ marginTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <View>
                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Total Target</Text>
                            <Text style={{
                                color: colors.white,
                                fontWeight: 'bold',
                                opacity: isPrivacyEnabled ? 0.5 : 1
                            }}>
                                {isPrivacyEnabled ? '****' : formatCurrencyAmount(target, currency)}
                            </Text>
                        </View>
                        <View>
                            <Text style={{ color: colors.white, opacity: 0.8, fontSize: 12 }}>Total Spent</Text>
                            <Text style={{
                                color: colors.white,
                                fontWeight: 'bold',
                                opacity: isPrivacyEnabled ? 0.5 : 1
                            }}>
                                {isPrivacyEnabled ? '****' : formatCurrencyAmount(spent, currency)}
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
                            borderRadius: 8,
                            flexDirection: 'row',
                            justifyContent: 'center'
                        }}
                        onPress={onPress}
                    >
                        <Ionicons name="wallet" size={24} color={colors.white} style={{ marginRight: 8 }} />
                        <Text style={{ color: colors.white, fontWeight: '600' }}>
                            {goalCount === 0 ? 'Start a Savings Goal' : 'View Savings Goals'}
                        </Text>
                    </TouchableOpacity>
                )}
            </Card>
        </View>
    );
};

export default HomeSavingsGoalsCard;
