import React from 'react';
import { BigNumber } from 'bignumber.js';
import { Text, View } from 'react-native';

import { useTheme } from '@context/ThemeContext';

interface HistorySectionHeaderProps {
    title: string;
    count: number;
    totalAmount: BigNumber;
    formatCurrency: (amount: BigNumber, currency?: string) => string;
}

const HistorySectionHeader: React.FC<HistorySectionHeaderProps> = ({ title, count, totalAmount, formatCurrency }) => {
    const { colors } = useTheme();

    return (
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 10, paddingHorizontal: 4 }}>
            <Text style={{ color: colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {title} <Text style={{ color: colors.textSecondary, fontWeight: 'normal' }}>({count})</Text>
            </Text>
            <Text style={{ color: totalAmount.isGreaterThanOrEqualTo(0) ? colors.success : colors.text, fontSize: 14, fontWeight: 'bold' }}>
                {totalAmount.isGreaterThanOrEqualTo(0) ? '+' : ''}{formatCurrency(totalAmount)}
            </Text>
        </View>
    );
};

export default React.memo(HistorySectionHeader);
