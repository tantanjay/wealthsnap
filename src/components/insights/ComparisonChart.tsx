import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components';
import { formatCurrencyAmount } from '../../utils/currencyUtils';

interface ComparisonChartProps {
    currentMonthExpense: number;
    lastMonthExpense: number;
    averageExpense: number;
    currency: string;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ currentMonthExpense, lastMonthExpense, averageExpense, currency }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    const data = {
        labels: ["This Month", "Last Month", "Avg (3M)"],
        datasets: [
            {
                data: [currentMonthExpense, lastMonthExpense, averageExpense]
            }
        ]
    };

    const getComparisonInsight = () => {
        if (currentMonthExpense > averageExpense) {
            const diff = currentMonthExpense - averageExpense;
            return `You spent ${formatCurrencyAmount(diff, currency)} more than your 3-month average.`;
        } else {
            const diff = averageExpense - currentMonthExpense;
            return `Great job! You spent ${formatCurrencyAmount(diff, currency)} less than your average.`;
        }
    };

    return (
        <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 20 }}>Spending Comparison</Text>

            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                <Text style={{ color: colors.text, flex: 1 }}>{getComparisonInsight()}</Text>
            </View>

            <Card>
                <BarChart
                    data={data}
                    width={screenWidth - 64}
                    height={220}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                        backgroundColor: colors.surface,
                        backgroundGradientFrom: colors.surface,
                        backgroundGradientTo: colors.surface,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`, // Orange for comparison
                        labelColor: (opacity = 1) => colors.textSecondary,
                        style: { borderRadius: 16 },
                        barPercentage: 0.7,
                    }}
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            </Card>
        </View>
    );
};

export default ComparisonChart;
