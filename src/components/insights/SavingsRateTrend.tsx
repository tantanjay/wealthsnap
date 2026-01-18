import React, { useMemo } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useTheme } from '../../context/ThemeContext';
import { Card } from '../index';
import { Transaction } from '../../types';
import { getSavingsRateTrend } from '../../utils/financialMetrics';

interface SavingsRateTrendProps {
    transactions: Transaction[];
    privacyMode: boolean;
}

const SavingsRateTrend: React.FC<SavingsRateTrendProps> = ({ transactions, privacyMode }) => {
    const { colors } = useTheme();
    const screenWidth = Dimensions.get('window').width;

    const savingsData = useMemo(() => {
        const data = getSavingsRateTrend(transactions, 6);
        return {
            labels: data.map(d => d.month),
            datasets: [{
                data: data.map(d => d.rate),
                color: (opacity = 1) => colors.primary,
                strokeWidth: 3
            }],
            rawData: data
        };
    }, [transactions, colors.primary]);

    const chartConfig = {
        backgroundColor: colors.surface,
        backgroundGradientFrom: colors.surface,
        backgroundGradientTo: colors.surface,
        decimalPlaces: 1,
        color: (opacity = 1) => colors.primary,
        labelColor: (opacity = 1) => colors.text,
        style: {
            borderRadius: 16,
        },
        propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: colors.primary
        },
        propsForBackgroundLines: {
            strokeDasharray: '',
            stroke: colors.border,
            strokeWidth: 1
        }
    };

    // Calculate average savings rate
    const avgRate = useMemo(() => {
        if (savingsData.rawData.length === 0) return 0;
        const sum = savingsData.rawData.reduce((acc, d) => acc + d.rate, 0);
        return Math.round((sum / savingsData.rawData.length) * 10) / 10;
    }, [savingsData.rawData]);

    const latestRate = savingsData.rawData[savingsData.rawData.length - 1]?.rate || 0;

    if (savingsData.datasets[0].data.length === 0) {
        return (
            <Card>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 10 }}>
                    Savings Rate Trend
                </Text>
                <Text style={{ color: colors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                    No data yet. Start tracking income and expenses!
                </Text>
            </Card>
        );
    }

    return (
        <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>Savings Rate Trend</Text>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Current</Text>
                    <Text style={{
                        color: latestRate >= 0 ? '#4CAF50' : '#F44336',
                        fontSize: 18,
                        fontWeight: 'bold'
                    }}>
                        {privacyMode ? '••••' : `${latestRate}%`}
                    </Text>
                </View>
            </View>

            {!privacyMode && (
                <LineChart
                    data={savingsData}
                    width={screenWidth - 60}
                    height={200}
                    chartConfig={chartConfig}
                    bezier
                    style={{
                        marginVertical: 8,
                        borderRadius: 16,
                    }}
                    formatYLabel={(value) => `${value}%`}
                    yAxisSuffix="%"
                    fromZero
                />
            )}

            {privacyMode && (
                <View style={{
                    height: 200,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: colors.border + '20',
                    borderRadius: 16,
                    marginVertical: 8
                }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 14 }}>🔒 Chart hidden for privacy</Text>
                </View>
            )}

            <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border }}>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Average</Text>
                    <Text style={{ color: colors.text, fontSize: 14, fontWeight: '600' }}>
                        {privacyMode ? '••••' : `${avgRate}%`}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Best Month</Text>
                    <Text style={{ color: '#4CAF50', fontSize: 14, fontWeight: '600' }}>
                        {privacyMode ? '••••' : `${Math.max(...savingsData.rawData.map(d => d.rate))}%`}
                    </Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Worst Month</Text>
                    <Text style={{ color: '#F44336', fontSize: 14, fontWeight: '600' }}>
                        {privacyMode ? '••••' : `${Math.min(...savingsData.rawData.map(d => d.rate))}%`}
                    </Text>
                </View>
            </View>
        </Card>
    );
};

export default SavingsRateTrend;
