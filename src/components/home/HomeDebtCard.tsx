import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BigNumber } from 'bignumber.js';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { formatCurrencyAmount } from '@utils/currencyUtils';

interface HomeDebtCardProps {
    total: BigNumber;
    isLoading: boolean;
    isPrivacyEnabled: boolean;
    currency: string;
    onPress: () => void;
}

const HomeDebtCard: React.FC<HomeDebtCardProps> = ({
    total,
    isLoading,
    isPrivacyEnabled,
    currency,
    onPress
}) => {
    const { colors } = useTheme();

    return (
        <View style={{ marginBottom: 20 }}>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Debts & Liabilities</Text>
            <Card style={{ backgroundColor: colors.error, padding: 20 }}>
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
    );
};

export default HomeDebtCard;
