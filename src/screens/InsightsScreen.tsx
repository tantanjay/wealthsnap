import React, { useState, useCallback } from 'react';
import { Text, View, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';
import { Card } from '../components';
import { getAllTransactions } from '../services/storageService';
import { Transaction } from '../types';
import { LineChart } from 'react-native-chart-kit';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const InsightsScreen = ({ navigation }: any) => {
    const { colors } = useTheme();
    const [chartData, setChartData] = useState<{ labels: string[], datasets: { data: number[] }[] }>({
        labels: [],
        datasets: [{ data: [0] }]
    });

    const loadData = async () => {
        const t = await getAllTransactions();
        prepareChartData(t);
    };

    const prepareChartData = (allTransactions: Transaction[]) => {
        // 1. Get last 6 months
        const months: string[] = [];
        const monthEndDates: Date[] = [];
        const today = new Date();

        for (let i = 5; i >= 0; i--) {
            const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
            months.push(d.toLocaleString('default', { month: 'short' }));

            // End of this month
            const endOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
            endOfMonth.setHours(23, 59, 59, 999);
            monthEndDates.push(endOfMonth);
        }

        // 2. Calculate Cumulative Balance for each month end
        const dataPoints = monthEndDates.map(endDate => {
            // Sum all transactions strictly before or on endDate
            return allTransactions.reduce((acc, tx) => {
                const txDate = new Date(tx.date);
                if (txDate <= endDate) {
                    return acc + (tx.type === 'INCOME' ? tx.amount : -tx.amount);
                }
                return acc;
            }, 0);
        });

        setChartData({
            labels: months,
            datasets: [{ data: dataPoints }]
        });
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    return (
        <ScreenWrapper>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 10 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 15 }}>
                    <Ionicons name="arrow-back" size={24} color={colors.text} />
                </TouchableOpacity>
                <Text style={{ color: colors.text, fontSize: 24, fontWeight: 'bold' }}>Financial Insights</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Balance Trend</Text>
                    <Card>
                        <LineChart
                            data={chartData}
                            width={Dimensions.get('window').width - 64} // Card padding + Screen padding
                            height={220}
                            yAxisLabel=""
                            yAxisSuffix=""
                            yAxisInterval={1}
                            chartConfig={{
                                backgroundColor: colors.surface,
                                backgroundGradientFrom: colors.surface,
                                backgroundGradientTo: colors.surface,
                                decimalPlaces: 0,
                                color: (opacity = 1) => colors.primary,
                                labelColor: (opacity = 1) => colors.textSecondary,
                                style: {
                                    borderRadius: 16
                                },
                                propsForDots: {
                                    r: "4",
                                    strokeWidth: "2",
                                    stroke: colors.primary
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                            withVerticalLines={false}
                            withHorizontalLines={true}
                        />
                    </Card>
                </View>

                {/* Placeholders for future insights */}
                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Monthly Analysis</Text>
                    <Card>
                        <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                            Detailed monthly breakdown coming soon.
                        </Text>
                    </Card>
                </View>

                <View style={{ marginBottom: 20 }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginBottom: 12 }}>Category Distribution</Text>
                    <Card>
                        <Text style={{ color: colors.textSecondary, fontStyle: 'italic', textAlign: 'center', padding: 20 }}>
                            Category pie chart coming soon.
                        </Text>
                    </Card>
                </View>

            </ScrollView>
        </ScreenWrapper>
    );
};

export default InsightsScreen;
