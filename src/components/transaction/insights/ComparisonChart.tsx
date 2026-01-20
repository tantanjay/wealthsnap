import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';
import { CURRENCY_SYMBOLS, formatCurrencyAmount } from '../../../utils/currencyUtils';
import { Card } from '../..';

interface ComparisonChartProps {
    currentMonthExpense: number;
    lastMonthExpense: number;
    averageExpense: number;
    average6Month: number;
    average1Year: number;
    currency: string;
    isPrivacyEnabled: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ currentMonthExpense, lastMonthExpense, averageExpense, average6Month, average1Year, currency, isPrivacyEnabled }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    // Determine the scale for compact display
    const maxValue = Math.max(currentMonthExpense, lastMonthExpense, averageExpense, average6Month, average1Year);
    let scaledData = [currentMonthExpense, lastMonthExpense, averageExpense, average6Month, average1Year];
    let suffix = '';

    if (maxValue >= 1000000) {
        scaledData = scaledData.map(v => v / 1000000);
        suffix = 'M';
    } else if (maxValue >= 1000) {
        scaledData = scaledData.map(v => v / 1000);
        suffix = 'K';
    }

    const data = {
        labels: ["This M", "Last M", "Avg 3M", "Avg 6M", "Avg 1Y"],
        datasets: [
            {
                data: scaledData
            }
        ]
    };

    const getComparisonInsight = () => {
        if (isPrivacyEnabled) return "Spending comparison hidden in privacy mode.";
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
                {!isPrivacyEnabled ? (
                    <BarChart
                        data={data}
                        width={screenWidth - 64}
                        height={220}
                        yAxisLabel={CURRENCY_SYMBOLS[currency] || currency}
                        yAxisSuffix={suffix}
                        chartConfig={{
                            backgroundColor: colors.surface,
                            backgroundGradientFrom: colors.surface,
                            backgroundGradientTo: colors.surface,
                            decimalPlaces: 1,
                            color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`, // Orange for comparison
                            labelColor: (opacity = 1) => colors.textSecondary,
                            style: { borderRadius: 16 },
                            barPercentage: 0.7,
                        }}
                        style={{ marginVertical: 8, borderRadius: 16 }}
                    />
                ) : (
                    <View style={{
                        height: 220,
                        justifyContent: 'center',
                        alignItems: 'center',
                        backgroundColor: colors.border + '20',
                        borderRadius: 16,
                        marginVertical: 8
                    }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>🔒 Chart hidden for privacy</Text>
                    </View>
                )}
            </Card>
        </View>
    );
};

export default ComparisonChart;
