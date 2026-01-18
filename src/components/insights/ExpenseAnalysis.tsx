import React from 'react';
import { View, Text, Dimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../../components';
import { formatCurrencyAmount } from '../../utils/currencyUtils';

interface ExpenseAnalysisProps {
    categoryBreakdown: {
        name: string;
        amount: number;
        percentage: number;
    }[];
    currency: string;
}

const ExpenseAnalysis: React.FC<ExpenseAnalysisProps> = ({ categoryBreakdown, currency }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    // Fixed colors for categories to make it look decent
    const CHART_COLORS = [
        '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5',
        '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50'
    ];

    const pieData = categoryBreakdown.map((item, index) => ({
        name: item.name,
        population: item.amount,
        color: CHART_COLORS[index % CHART_COLORS.length],
        legendFontColor: colors.textSecondary,
        legendFontSize: 12
    }));

    const topCategory = categoryBreakdown[0];

    return (
        <View>
            <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12, marginTop: 20 }}>Expense Analysis</Text>

            {topCategory && (
                <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                    <Text style={{ color: colors.text, flex: 1 }}>
                        {`${topCategory.name} accounts for ${Math.round(topCategory.percentage)}% of your total expenses.`}
                    </Text>
                </View>
            )}

            <Card style={{ marginBottom: 16 }}>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Category Breakdown</Text>
                {pieData.length > 0 ? (
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
                        absolute
                    />
                ) : (
                    <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No expense data available.</Text>
                )}
            </Card>

            <Card>
                <Text style={{ color: colors.textSecondary, marginBottom: 10 }}>Top Spending Categories</Text>
                {categoryBreakdown.slice(0, 5).map((item, index) => (
                    <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: CHART_COLORS[index % CHART_COLORS.length], marginRight: 10 }} />
                            <Text style={{ color: colors.text, fontSize: 14 }}>{item.name}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ color: colors.text, fontWeight: 'bold' }}>{formatCurrencyAmount(item.amount, currency)}</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.percentage.toFixed(1)}%</Text>
                        </View>
                    </View>
                ))}
            </Card>
        </View>
    );
};

export default ExpenseAnalysis;
