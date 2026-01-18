import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart, PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components';
import { CURRENCY_SYMBOLS, formatCompactCurrency } from '../../utils/currencyUtils';

interface IncomeAnalysisProps {
    monthlyTrends: {
        labels: string[];
        incomeData: number[];
    };
    categoryBreakdown: {
        name: string;
        amount: number;
        percentage: number;
    }[];
    currency: string;
    isPrivacyEnabled: boolean;
}

const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ monthlyTrends, categoryBreakdown, currency, isPrivacyEnabled }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: item.amount,
        color: index % 2 === 0 ? colors.primary : '#FF9800', // Simple alternator for now, could be better
        legendFontColor: colors.textSecondary,
        legendFontSize: 12
    }));

    // Generate smart insight
    const getInsight = () => {
        if (isPrivacyEnabled) return "Income insights hidden in privacy mode.";
        if (monthlyTrends.incomeData.length < 2) return "Not enough data for insights.";
        const lastMonth = monthlyTrends.incomeData[monthlyTrends.incomeData.length - 1];
        const prevMonth = monthlyTrends.incomeData[monthlyTrends.incomeData.length - 2];

        if (lastMonth > prevMonth) {
            const growth = prevMonth === 0 ? 100 : ((lastMonth - prevMonth) / prevMonth) * 100;
            return `Your income grew by ${growth.toFixed(1)}% compared to last month.`;
        } else if (lastMonth < prevMonth) {
            const drop = prevMonth === 0 ? 0 : ((prevMonth - lastMonth) / prevMonth) * 100;
            return `Income is down by ${drop.toFixed(1)}% compared to last month.`;
        }
        return "Your income has been stable.";
    };

    return (
        <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 20 }}>Income Analytics</Text>

            {/* Insight Bubble */}
            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                <Text style={{ color: colors.text, flex: 1 }}>{getInsight()}</Text>
            </View>

            <Card style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Income Trend</Text>
                <LineChart
                    data={{
                        labels: monthlyTrends.labels,
                        datasets: [{ data: monthlyTrends.incomeData.length > 0 ? monthlyTrends.incomeData : [0] }]
                    }}
                    width={screenWidth - 64}
                    height={220}
                    yAxisLabel={CURRENCY_SYMBOLS[currency] || currency}
                    yAxisSuffix=""
                    formatYLabel={(yValue) => formatCompactCurrency(parseFloat(yValue), currency).replace(CURRENCY_SYMBOLS[currency] || currency, '')}
                    chartConfig={{
                        backgroundColor: colors.surface,
                        backgroundGradientFrom: colors.surface,
                        backgroundGradientTo: colors.surface,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green for income
                        labelColor: (opacity = 1) => colors.textSecondary,
                        style: { borderRadius: 16 },
                        propsForDots: { r: "4", strokeWidth: "2", stroke: "#4CAF50" }
                    }}
                    bezier
                    style={{ marginVertical: 8, borderRadius: 16 }}
                />
            </Card>

            <Card>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Income Sources</Text>
                {pieData.length > 0 ? (
                    <>
                        <PieChart
                            data={pieData}
                            width={screenWidth - 64}
                            height={220}
                            chartConfig={{
                                color: (opacity = 1) => colors.text,
                            }}
                            accessor={"population"}
                            backgroundColor={"transparent"}
                            paddingLeft={"15"}
                            center={[10, 0]}
                            absolute={false}
                        />
                        <View style={{ marginTop: 20 }}>
                            {categoryBreakdown.map((item, index) => (
                                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: pieData[index].color, marginRight: 10 }} />
                                        <Text style={{ color: colors.text, fontSize: 14 }}>{item.name}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={{ color: colors.text, fontWeight: 'bold' }}>
                                            {isPrivacyEnabled ? '***' : formatCompactCurrency(item.amount, currency)}
                                        </Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.percentage.toFixed(1)}%</Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </>
                ) : (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No income data available.</Text>
                )}
            </Card>
        </View>
    );
};

export default IncomeAnalysis;
