import React from 'react';
import { View, Text, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { formatCurrencyAmount } from '../../../utils/currencyUtils';

interface InsightsOverviewCardsProps {
    netCashFlow: number;
    income: number;
    expense: number;
    savingsRate: number;
    burnRate: number;
    currency: string;
    isPrivacyEnabled: boolean;
}

const InsightsOverviewCards: React.FC<InsightsOverviewCardsProps> = ({
    netCashFlow,
    income,
    expense,
    savingsRate,
    burnRate,
    currency,
    isPrivacyEnabled
}) => {
    const { colors } = useTheme();

    const cardWidth = (Dimensions.get('window').width - 32 - 12) / 2; // (Screen - Padding - Gap) / 2

    const renderCard = (title: string, value: string, subValue?: string, color?: string) => (
        <View style={{ width: cardWidth, marginRight: 12 }}>
            <Card style={{ padding: 16, height: 120, justifyContent: 'space-between', backgroundColor: colors.surface }}>
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontWeight: '600' }}>{title.toUpperCase()}</Text>
                <View>
                    <Text style={{ color: color || colors.text, fontSize: 20, fontWeight: 'bold' }}>
                        {isPrivacyEnabled ? '***' : value}
                    </Text>
                    {subValue && <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }}>{subValue}</Text>}
                </View>
            </Card>
        </View>
    );

    return (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 0 }}>
            {renderCard(
                "Net Cash Flow",
                formatCurrencyAmount(netCashFlow, currency),
                "This Month",
                netCashFlow >= 0 ? '#4CAF50' : '#F44336'
            )}
            {renderCard(
                "Savings Rate",
                `${savingsRate.toFixed(1)}%`,
                savingsRate < 20 ? "Below Goal" : "Healthy",
                savingsRate >= 20 ? '#4CAF50' : '#FF9800'
            )}
            {renderCard(
                "Total Income",
                formatCurrencyAmount(income, currency),
                "This Month",
                '#4CAF50'
            )}
            {renderCard(
                "Total Expense",
                formatCurrencyAmount(expense, currency),
                "This Month",
                '#F44336'
            )}
            {renderCard(
                "Burn Rate",
                formatCurrencyAmount(burnRate, currency),
                "Avg Monthly Expense"
            )}
        </ScrollView>
    );
};

export default InsightsOverviewCards;
