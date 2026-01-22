import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { CURRENCY_SYMBOLS, formatCurrencyAmount } from '../../../utils/currencyUtils';
import { Card } from '../..';
import { Ionicons } from '@expo/vector-icons';
import BottomModal from '../../common/BottomModal';
import { Skeleton } from '../../common/Skeleton';

interface ComparisonChartProps {
    currentMonthExpense: number;
    lastMonthExpense: number;
    averageExpense: number;
    average6Month: number;
    average1Year: number;
    currency: string;
    isPrivacyEnabled: boolean;
    isLoading?: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ currentMonthExpense, lastMonthExpense, averageExpense, average6Month, average1Year, currency, isPrivacyEnabled, isLoading = false }) => {
    const [showInfoModal, setShowInfoModal] = React.useState(false);
    const [showInsightInfo, setShowInsightInfo] = React.useState(false);
    const { colors } = useTheme();

    // Pro-rate current month spending to estimate full month
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const proRatedExpense = currentDay > 0 ? (currentMonthExpense / currentDay) * daysInMonth : currentMonthExpense;

    const getComparisonInsight = () => {
        if (isPrivacyEnabled) return "Spending comparison hidden in privacy mode.";
        if (Math.abs(proRatedExpense - averageExpense) < 0.01) {
            return "On track to match your 3-month average.";
        }
        if (proRatedExpense > averageExpense) {
            const diff = proRatedExpense - averageExpense;
            return `On track to spend ${formatCurrencyAmount(diff, currency)} more than your 3-month average.`;
        } else {
            const diff = averageExpense - proRatedExpense;
            return `Great job! On track to spend ${formatCurrencyAmount(diff, currency)} less than average.`;
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>Spending Comparison</Text>
                    <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                <Text style={{ color: colors.text, flex: 1 }}>{isLoading ? "Analyzing spending habits..." : getComparisonInsight()}</Text>
                <TouchableOpacity onPress={() => setShowInsightInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
            </View>

            <Card>
                {isLoading ? (
                    <View style={{ height: 220, padding: 10 }}>
                        <Skeleton height={200} width="100%" borderRadius={16} />
                    </View>
                ) : !isPrivacyEnabled ? (
                    <View style={{ height: 220, paddingVertical: 10 }}>
                        {/* Custom Bar Chart with Y-Axis and Stacked First Bar */}
                        {(() => {
                            const barData = [
                                { label: "This M*", value: proRatedExpense, actual: currentMonthExpense, isProjected: true },
                                { label: "Last M", value: lastMonthExpense, actual: lastMonthExpense, isProjected: false },
                                { label: "Avg 3M", value: averageExpense, actual: averageExpense, isProjected: false },
                                { label: "Avg 6M", value: average6Month, actual: average6Month, isProjected: false },
                                { label: "Avg 1Y", value: average1Year, actual: average1Year, isProjected: false },
                            ];

                            const maxValue = Math.max(...barData.map(b => b.value));
                            const minValue = Math.min(...barData.map(b => b.isProjected ? b.actual : b.value));
                            // Start Y-axis 15% below minimum
                            const yMin = Math.max(0, minValue * 0.85);
                            const yMax = maxValue * 1.05; // 5% padding on top
                            const yRange = yMax - yMin;
                            const chartHeight = 150;

                            // Generate Y-axis labels (4 labels)
                            const yLabels = [];
                            for (let i = 0; i < 4; i++) {
                                const value = yMin + (yRange * (i / 3));
                                let formatted = value;
                                let suffix = '';
                                if (value >= 1000000) {
                                    formatted = value / 1000000;
                                    suffix = 'M';
                                } else if (value >= 1000) {
                                    formatted = value / 1000;
                                    suffix = 'K';
                                }
                                yLabels.push(`${CURRENCY_SYMBOLS[currency]}${formatted.toFixed(1)}${suffix}`);
                            }

                            return (
                                <View style={{ flex: 1, flexDirection: 'row' }}>
                                    {/* Y-Axis Labels */}
                                    <View style={{ width: 45, justifyContent: 'space-between', paddingBottom: 25, alignItems: 'flex-end', paddingRight: 5 }}>
                                        {yLabels.reverse().map((label, i) => (
                                            <Text key={i} style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
                                        ))}
                                    </View>

                                    {/* Bars */}
                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                                        {barData.map((bar, index) => {
                                            // Calculate heights relative to yMin-yMax range
                                            const totalHeight = yRange > 0 ? ((bar.value - yMin) / yRange) * chartHeight : 0;
                                            const actualHeight = yRange > 0 ? ((bar.actual - yMin) / yRange) * chartHeight : 0;
                                            const projectedHeight = bar.isProjected ? Math.max(0, totalHeight - actualHeight) : 0;

                                            return (
                                                <View key={index} style={{ alignItems: 'center', flex: 1 }}>
                                                    {/* Bar */}
                                                    <View style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}>
                                                        {bar.isProjected ? (
                                                            // Stacked bar: actual (solid) + projected (lighter)
                                                            <View style={{ width: '50%', borderRadius: 4, overflow: 'hidden' }}>
                                                                {/* Projected portion (lighter, on top) */}
                                                                <View style={{
                                                                    height: projectedHeight,
                                                                    backgroundColor: 'rgba(255, 152, 0, 0.35)',
                                                                    borderTopLeftRadius: 4,
                                                                    borderTopRightRadius: 4,
                                                                }} />
                                                                {/* Actual portion (solid, on bottom) */}
                                                                <View style={{
                                                                    height: Math.max(0, actualHeight),
                                                                    backgroundColor: 'rgba(255, 152, 0, 1)',
                                                                    borderBottomLeftRadius: 4,
                                                                    borderBottomRightRadius: 4,
                                                                    borderTopLeftRadius: projectedHeight > 0 ? 0 : 4,
                                                                    borderTopRightRadius: projectedHeight > 0 ? 0 : 4,
                                                                }} />
                                                            </View>
                                                        ) : (
                                                            // Regular solid bar
                                                            <View style={{
                                                                height: Math.max(0, totalHeight),
                                                                width: '50%',
                                                                backgroundColor: 'rgba(255, 152, 0, 1)',
                                                                borderRadius: 4,
                                                            }} />
                                                        )}
                                                    </View>
                                                    {/* Label */}
                                                    <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 6 }}>
                                                        {bar.label}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                </View>
                            );
                        })()}
                    </View>
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
                        <Text style={{ color: colors.textSecondary, marginBottom: 6 }}>• <Text style={{ color: colors.text, fontWeight: 'bold' }}>This M*:</Text> Projected full month spending.{'\n'}<Text style={{ color: 'rgba(255, 152, 0, 1)', fontWeight: 'bold' }}>Solid color</Text> = actual spending so far.{'\n'}<Text style={{ color: 'rgba(255, 152, 0, 0.5)' }}>Lighter color</Text> = projected remaining.</Text>
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

            <BottomModal
                visible={showInsightInfo}
                onClose={() => setShowInsightInfo(false)}
                title="How is this calculated?"
                maxHeight="40%"
            >
                <View>
                    <Text style={{ color: colors.text, fontSize: 16, marginBottom: 10, lineHeight: 22 }}>
                        This smart insight compares your <Text style={{ fontWeight: 'bold' }}>projected spending</Text> for this month against your <Text style={{ fontWeight: 'bold' }}>3-month average</Text>.
                    </Text>
                    <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 8, marginTop: 5 }}>
                        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                            • <Text style={{ color: '#4CAF50', fontWeight: 'bold' }}>On Track:</Text> You are projected to spend less or equal to average.
                        </Text>
                        <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
                            • <Text style={{ color: '#FF5252', fontWeight: 'bold' }}>Spending More:</Text> Projected spending is higher than average.
                        </Text>
                    </View>
                    <View style={{ height: 20 }} />
                </View>
            </BottomModal>
        </View>
    );
};

export default ComparisonChart;
