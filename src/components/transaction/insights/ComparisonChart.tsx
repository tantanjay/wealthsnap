import React from 'react';
import { View, Text, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { useTheme } from '../../../context/ThemeContext';
import { CURRENCY_SYMBOLS, formatCurrencyAmount } from '../../../utils/currencyUtils';
import { Card } from '../..';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '../../common/BottomModal';

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
    const [showInfoModal, setShowInfoModal] = React.useState(false);
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
        if (Math.abs(currentMonthExpense - averageExpense) < 0.01) {
            return "Your spending matches your 3-month average.";
        }
        if (currentMonthExpense > averageExpense) {
            const diff = currentMonthExpense - averageExpense;
            return `You spent ${formatCurrencyAmount(diff, currency)} more than your 3-month average.`;
        } else {
            const diff = averageExpense - currentMonthExpense;
            return `Great job! You spent ${formatCurrencyAmount(diff, currency)} less than your average.`;
        }
    };

    const renderVisualScenario = (type: 'OVER' | 'UNDER', label: string) => {
        return (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 60, width: 80, justifyContent: 'center', marginBottom: 5 }}>
                {/* User Bar */}
                <View style={{
                    width: 20,
                    height: type === 'OVER' ? '100%' : '50%',
                    backgroundColor: type === 'OVER' ? '#FF5252' : '#4CAF50',
                    marginRight: 8,
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4
                }} />
                {/* Average Bar */}
                <View style={{
                    width: 20,
                    height: '75%',
                    backgroundColor: colors.textSecondary + '50',
                    borderTopLeftRadius: 4,
                    borderTopRightRadius: 4
                }} />
            </View>
        );
    };

    return (
        <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, marginTop: 20 }}>
                <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold' }}>Spending Comparison</Text>
                <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="information-circle-outline" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

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

            <BottomModal
                visible={showInfoModal}
                onClose={() => setShowInfoModal(false)}
                title="Understanding Your Chart"
                maxHeight="85%"
            >
                <ScrollView showsVerticalScrollIndicator={false}>
                    <Text style={{ color: colors.text, marginBottom: 15, lineHeight: 22 }}>
                        This chart compares your current spending against your past habits.
                    </Text>

                    <View style={{ flexDirection: 'row', marginBottom: 20 }}>
                        <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginRight: 8 }}>
                            {renderVisualScenario('OVER', 'Higher')}
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Spending More</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                                When the orange bar is taller, you are spending above your average.
                            </Text>
                        </View>

                        <View style={{ flex: 1, alignItems: 'center', padding: 10, backgroundColor: colors.surface, borderRadius: 12, marginLeft: 8 }}>
                            {renderVisualScenario('UNDER', 'Lower')}
                            <Text style={{ color: colors.text, fontWeight: 'bold', fontSize: 14, marginBottom: 4 }}>Spending Less</Text>
                            <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: 'center' }}>
                                When the colored bar is shorter, you are saving money!
                            </Text>
                        </View>
                    </View>

                    <Text style={{ color: colors.text, fontWeight: 'bold', marginBottom: 8, marginTop: 5 }}>What do the labels mean?</Text>
                    <View style={{ marginLeft: 8 }}>
                        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>• <Text style={{ color: colors.text, fontWeight: 'bold' }}>This M:</Text> Your total spending so far this month.</Text>
                        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>• <Text style={{ color: colors.text, fontWeight: 'bold' }}>Avg 3M/6M/1Y:</Text> Your average monthly spending over the last 3 months, 6 months, and 1 year.</Text>
                    </View>

                    <View style={{ flexDirection: 'row', backgroundColor: colors.primary + '15', padding: 12, borderRadius: 8, marginTop: 15, alignItems: 'center' }}>
                        <Ionicons name="information-circle" size={20} color={colors.primary} style={{ marginRight: 10 }} />
                        <Text style={{ color: colors.text, flex: 1, fontSize: 13 }}>
                            <Text style={{ fontWeight: 'bold' }}>New Account?</Text> If you just started using WealthSnap, these bars might look identical. As you track more months, they will start to show different trends!
                        </Text>
                    </View>

                    <View style={{ height: 20 }} />
                </ScrollView>
            </BottomModal>
        </View>
    );
};

export default ComparisonChart;
