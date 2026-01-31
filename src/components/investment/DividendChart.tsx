import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '@context/ThemeContext';
import { CURRENCY_SYMBOLS } from '@utils/currencyUtils';

interface DividendChartProps {
    labels: string[];
    data: number[];
    currency?: string;
}

export const DividendChart: React.FC<DividendChartProps> = ({ labels, data, currency = 'PHP' }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    const chartConfig = {
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 0,
        color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`, // Green
        labelColor: (opacity = 1) => colors.textSecondary,
        barPercentage: 0.5,
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <Text style={[styles.title, { color: colors.text }]}>Proj. Dividends</Text>
            <BarChart
                data={{
                    labels: labels,
                    datasets: [
                        {
                            data: data
                        }
                    ]
                }}
                width={screenWidth - 48} // slightly less than container width
                height={220}
                yAxisLabel={symbol}
                yAxisSuffix=""
                yAxisInterval={1}
                chartConfig={chartConfig}
                verticalLabelRotation={0}
                showValuesOnTopOfBars
                fromZero
                style={{ borderRadius: 16 }}
            />
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
    }
});
