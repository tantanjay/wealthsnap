import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { CURRENCY_SYMBOLS, formatCurrencyAmount, formatCompactNumber } from '@utils/currencyUtils';

interface DividendChartProps {
    labels: string[];
    data: number[];
    currency?: string;
    isLoading?: boolean;
    isPrivacyEnabled?: boolean;
}

export const DividendChart: React.FC<DividendChartProps> = ({ labels, data, currency = 'PHP', isLoading = false, isPrivacyEnabled = false }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    const totalDividends = data.reduce((acc, curr) => acc + curr, 0);

    const chartWidth = screenWidth - 64;
    const barWidth = 22;
    let initialSpacing = 10;
    let spacing = 20;

    if (data && data.length > 0) {
        if (data.length === 1) {
            initialSpacing = (chartWidth - barWidth) / 2;
        } else {
            const totalBarWidth = data.length * barWidth;
            const availableSpace = chartWidth - initialSpacing * 2 - totalBarWidth; // Subtract initial spacing from both sides for visual balance
            spacing = Math.max(0, availableSpace / (data.length));
        }
    }

    const maxValue = Math.max(...data);
    const maxValueWithBuffer = maxValue * 1.25;

    // Prepare data for Gifted Charts
    const barData = data.map((value, index) => ({
        value,
        label: labels[index],
        topLabelComponent: () => (
            <View style={{ width: 50, alignItems: 'center', marginLeft: 0, marginBottom: 4 }}>
                <Text style={{ color: colors.textSecondary, fontSize: 10 }} numberOfLines={1} adjustsFontSizeToFit>
                    {formatCompactNumber(value)}
                </Text>
            </View>
        ),
        frontColor: 'rgba(16, 185, 129, 1)',
        gradientColor: 'rgba(16, 185, 129, 0.8)',
    }));

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Proj. Dividends</Text>
                <Text style={[styles.total, { color: colors.primary }]}>
                    {isPrivacyEnabled ? "••••" : formatCurrencyAmount(totalDividends, currency)}
                </Text>
            </View>
            {isLoading ? (
                <Skeleton width="100%" height={220} borderRadius={16} />
            ) : isPrivacyEnabled ? (
                <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border + '20', borderRadius: 16 }}>
                    <Text style={{ color: colors.textSecondary }}>🔒 Chart hidden for privacy</Text>
                </View>
            ) : (!data || data.length === 0 || data.every(d => d === 0)) ? (
                <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border + '20', borderRadius: 16 }}>
                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No active holdings.</Text>
                </View>
            ) : (
                <View style={{ overflow: 'hidden', marginLeft: -10 }}>
                    <BarChart
                        data={barData}
                        barWidth={22}
                        noOfSections={4}
                        barBorderRadius={4}
                        frontColor="rgba(16, 185, 129, 1)"
                        yAxisThickness={0}
                        xAxisThickness={0}
                        yAxisTextStyle={{ color: colors.textSecondary, fontSize: 10 }}
                        xAxisLabelTextStyle={{ color: colors.textSecondary, fontSize: 10, textAlign: 'center' }}
                        height={220}
                        width={chartWidth}
                        spacing={spacing}
                        initialSpacing={initialSpacing}
                        yAxisLabelPrefix={symbol}
                        formatYLabel={(label) => formatCompactNumber(parseFloat(label))}
                        maxValue={maxValueWithBuffer}
                        hideRules
                        showGradient
                    />
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    total: {
        fontSize: 16,
        fontWeight: 'bold'
    }
});
