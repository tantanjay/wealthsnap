import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';

import { useTheme } from '@context/ThemeContext';
import { CURRENCY_SYMBOLS, formatCompactCurrency, formatCompactNumber, formatCurrencyAmount } from '@utils/currencyUtils';
import { Skeleton } from '@components/common/Skeleton';

interface DividendChartProps {
    labels: string[];
    data: number[];
    currency?: string;
    isLoading?: boolean;
}

export const DividendChart: React.FC<DividendChartProps> = ({ labels, data, currency = 'PHP', isLoading = false }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    const totalDividends = data.reduce((acc, curr) => acc + curr, 0);

    const chartConfig = {
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
        labelColor: (opacity = 1) => colors.textSecondary,
        barPercentage: 0.5,
        formatYLabel: (value: string) => formatCompactNumber(value),
        formatTopBarValue: (value: number) => formatCompactCurrency(value.toString(), currency, 0),
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Proj. Dividends</Text>
                <Text style={[styles.total, { color: colors.primary }]}>{formatCurrencyAmount(totalDividends, currency)}</Text>
            </View>
            {isLoading ? (
                <Skeleton width="100%" height={220} borderRadius={16} />
            ) : (
                <BarChart
                    data={{
                        labels: labels,
                        datasets: [{ data: data }]
                    }}
                    width={screenWidth - 48}
                    height={220}
                    yAxisLabel={symbol}
                    yAxisSuffix=""
                    yAxisInterval={1}
                    chartConfig={chartConfig as any}
                    verticalLabelRotation={0}
                    showValuesOnTopOfBars
                    fromZero
                    style={{ borderRadius: 16 }}
                />
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
