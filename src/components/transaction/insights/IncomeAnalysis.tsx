import React from 'react';
import { View, Text, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart, BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';
import { Card } from '../../../components';
import { CURRENCY_SYMBOLS, formatCompactCurrency } from '../../../utils/currencyUtils';
import MonthEndProjectionModal from '../modals/MonthEndProjectionModal';
import { Transaction } from '../../../types';
import { Ionicons } from '@expo/vector-icons';


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
    transactions: Transaction[];
}

const IncomeAnalysis: React.FC<IncomeAnalysisProps> = ({ monthlyTrends, categoryBreakdown, currency, isPrivacyEnabled, transactions }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;
    const [showProjectionModal, setShowProjectionModal] = React.useState(false);
    const [activeTab, setActiveTab] = React.useState<'TREND' | 'SOURCES'>('TREND');

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
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 12 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Income Analytics</Text>

                {/* Projection Button */}
                {!isPrivacyEnabled && (
                    <TouchableOpacity
                        onPress={() => setShowProjectionModal(true)}
                        style={{
                            padding: 8,
                            backgroundColor: colors.primary + '20',
                            borderRadius: 8
                        }}
                    >
                        <Ionicons name="trending-up" size={18} color={colors.primary} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Insight Bubble */}
            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                <Text style={{ color: colors.text, flex: 1 }}>{getInsight()}</Text>
            </View>

            <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity
                            onPress={() => setActiveTab('TREND')}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: activeTab === 'TREND' ? colors.surface : 'transparent',
                                borderRadius: 6,
                                borderWidth: activeTab === 'TREND' ? 1 : 0,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{
                                color: activeTab === 'TREND' ? colors.text : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: activeTab === 'TREND' ? '600' : '400'
                            }}>Trend</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveTab('SOURCES')}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: activeTab === 'SOURCES' ? colors.surface : 'transparent',
                                borderRadius: 6,
                                borderWidth: activeTab === 'SOURCES' ? 1 : 0,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{
                                color: activeTab === 'SOURCES' ? colors.text : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: activeTab === 'SOURCES' ? '600' : '400'
                            }}>Sources</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {!isPrivacyEnabled ? (
                    activeTab === 'TREND' ? (
                        (() => {
                            const maxValue = Math.max(...(monthlyTrends.incomeData.length > 0 ? monthlyTrends.incomeData : [0]));
                            let scaledData = monthlyTrends.incomeData.length > 0 ? monthlyTrends.incomeData : [0];
                            let suffix = '';

                            if (maxValue >= 1000000) {
                                scaledData = scaledData.map(v => v / 1000000);
                                suffix = 'M';
                            } else if (maxValue >= 1000) {
                                scaledData = scaledData.map(v => v / 1000);
                                suffix = 'K';
                            }

                            return (
                                <BarChart
                                    data={{
                                        labels: monthlyTrends.labels,
                                        datasets: [{ data: scaledData }]
                                    }}
                                    width={screenWidth - 64}
                                    height={220}
                                    yAxisLabel={CURRENCY_SYMBOLS[currency] || currency}
                                    yAxisSuffix={suffix}
                                    chartConfig={{
                                        backgroundColor: colors.surface,
                                        backgroundGradientFrom: colors.surface,
                                        backgroundGradientTo: colors.surface,
                                        decimalPlaces: 1,
                                        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`,
                                        labelColor: (opacity = 1) => colors.textSecondary,
                                        style: { borderRadius: 16 },
                                        barPercentage: 0.7,
                                    }}
                                    style={{ marginVertical: 8, borderRadius: 16 }}
                                    fromZero
                                />
                            );
                        })()
                    ) : (
                        pieData.length > 0 ? (
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
                                                    {formatCompactCurrency(item.amount, currency)}
                                                </Text>
                                                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{item.percentage.toFixed(1)}%</Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </>
                        ) : (
                            <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: 20 }}>No income data available.</Text>
                        )
                    )
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


            <MonthEndProjectionModal
                visible={showProjectionModal}
                onClose={() => setShowProjectionModal(false)}
                transactions={transactions}
                currency={currency}
            />
        </View >
    );
};

export default IncomeAnalysis;
