import React, { useMemo } from 'react';
import { BigNumber } from 'bignumber.js';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomModal from '@components/common/BottomModal';
import { Card } from '@components/index';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { Transaction } from '@types';
import { getMonthlyTrends, getMonthlyTrendsForYear } from '@utils/financialMetrics';
import { CURRENCY_SYMBOLS, formatCurrencyAmount } from '@utils/currencyUtils';

interface ComparisonChartProps {
    currentMonthExpense: BigNumber;
    lastMonthExpense: BigNumber;
    averageExpense: BigNumber;
    average6Month: BigNumber;
    average1Year: BigNumber;
    currency: string;
    isPrivacyEnabled: boolean;
    transactions: Transaction[];
    isLoading?: boolean;
}

const ComparisonChart: React.FC<ComparisonChartProps> = ({ currentMonthExpense, lastMonthExpense, averageExpense, average6Month, average1Year, currency, isPrivacyEnabled, transactions, isLoading = false }) => {
    const [showInfoModal, setShowInfoModal] = React.useState(false);
    const [showInsightInfo, setShowInsightInfo] = React.useState(false);
    const [selectedBarIndex, setSelectedBarIndex] = React.useState<number | null>(null);
    const [activeView, setActiveView] = React.useState<'COMPARISON' | 'MONTHLY'>('COMPARISON');
    const [timeRange, setTimeRange] = React.useState<'6M' | '1Y' | '3Y' | 'ALL'>('6M');
    const [selectedYear, setSelectedYear] = React.useState(new Date().getFullYear());

    const availableYears = useMemo(() => {
        if (transactions.length === 0) return [new Date().getFullYear()];
        const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))];
        return years.sort((a, b) => b - a);
    }, [transactions]);

    const { colors } = useTheme();

    // Calculate how many months of data to load based on selection
    const monthsToLoad = useMemo(() => {
        if (timeRange === '6M') return 6;
        if (timeRange === '1Y') return 12;
        if (timeRange === '3Y') return 36;

        if (transactions.length === 0) return 6;
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const today = new Date();
        const diff = (today.getFullYear() - minDate.getFullYear()) * 12 + (today.getMonth() - minDate.getMonth()) + 1;
        return Math.max(diff, 6);
    }, [timeRange, transactions]);

    // Recalculate trends based on selected time range
    const activeMonthlyTrends = useMemo(() => {
        if (activeView === 'MONTHLY' && timeRange === '1Y') {
            return getMonthlyTrendsForYear(transactions, selectedYear);
        }
        return getMonthlyTrends(transactions, monthsToLoad);
    }, [transactions, monthsToLoad, activeView, timeRange, selectedYear]);

    // Pro-rate current month spending to estimate full month
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const proRatedExpense = currentDay > 0 ?
        currentMonthExpense.dividedBy(currentDay).multipliedBy(daysInMonth) : currentMonthExpense;

    const getComparisonInsight = () => {
        if (isPrivacyEnabled) return "Spending comparison hidden in privacy mode.";
        if (proRatedExpense.minus(averageExpense).abs().isLessThan(0.01)) {
            return "On track to match your 3-month average.*";
        }
        if (proRatedExpense.isGreaterThan(averageExpense)) {
            const diff = proRatedExpense.minus(averageExpense);
            return `On track to spend ${formatCurrencyAmount(diff, currency)} more than your 3-month average.*`;
        } else {
            const diff = averageExpense.minus(proRatedExpense);
            return `Great job! On track to spend ${formatCurrencyAmount(diff, currency)} less than average.*`;
        }
    };

    const renderTimeFilter = () => (
        <View style={{ flexDirection: 'row', backgroundColor: colors.border + '40', borderRadius: 8, padding: 2 }}>
            {(['6M', '1Y', '3Y', 'ALL'] as const).map((range) => (
                <Text
                    key={range}
                    onPress={() => setTimeRange(range)}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 6,
                        backgroundColor: timeRange === range ? colors.surface : 'transparent',
                        color: timeRange === range ? colors.primary : colors.textSecondary,
                        fontWeight: timeRange === range ? '600' : '400',
                        fontSize: 12,
                        elevation: timeRange === range ? 1 : 0,
                    }}
                >
                    {range}
                </Text>
            ))}
        </View>
    );

    const renderYearSelector = () => {
        if (availableYears.length <= 1 && availableYears[0] === new Date().getFullYear()) return null;

        const currentIndex = availableYears.indexOf(selectedYear);
        const hasNext = currentIndex > 0;
        const hasPrev = currentIndex < availableYears.length - 1;

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 12 }}>
                <TouchableOpacity
                    onPress={() => setSelectedYear(availableYears[currentIndex + 1])}
                    disabled={!hasPrev}
                >
                    <Ionicons name="chevron-back" size={20} color={hasPrev ? colors.text : colors.border} />
                </TouchableOpacity>
                <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text }}>{selectedYear}</Text>
                <TouchableOpacity
                    onPress={() => setSelectedYear(availableYears[currentIndex - 1])}
                    disabled={!hasNext}
                >
                    <Ionicons name="chevron-forward" size={20} color={hasNext ? colors.text : colors.border} />
                </TouchableOpacity>
            </View>
        );
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
                    <Text style={{ color: colors.text, fontSize: 18, fontWeight: 'bold', marginRight: 8 }}>
                        {activeView === 'COMPARISON' ? 'Spending Comparison' : 'Monthly Spending'}
                    </Text>
                    <TouchableOpacity onPress={() => setShowInfoModal(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
            </View>

            <View style={{ backgroundColor: colors.surface, padding: 12, borderRadius: 12, marginBottom: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 20, marginRight: 10 }}>💡</Text>
                    <Text style={{ color: colors.text, flex: 1 }}>{isLoading ? "Analyzing spending habits..." : getComparisonInsight()}</Text>
                    <TouchableOpacity onPress={() => setShowInsightInfo(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
                    </TouchableOpacity>
                </View>
                {!isPrivacyEnabled && (
                    <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: 'italic', marginTop: 8, marginLeft: 30 }}>
                        *Projection assumes even spending throughout month
                    </Text>
                )}
            </View>

            <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <View style={{ flexDirection: 'row', backgroundColor: colors.background, borderRadius: 8, padding: 2 }}>
                        <TouchableOpacity
                            onPress={() => setActiveView('MONTHLY')}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: activeView === 'MONTHLY' ? colors.surface : 'transparent',
                                borderRadius: 6,
                                borderWidth: activeView === 'MONTHLY' ? 1 : 0,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{
                                color: activeView === 'MONTHLY' ? colors.text : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: activeView === 'MONTHLY' ? '600' : '400'
                            }}>Trend</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setActiveView('COMPARISON')}
                            style={{
                                paddingVertical: 6,
                                paddingHorizontal: 12,
                                backgroundColor: activeView === 'COMPARISON' ? colors.surface : 'transparent',
                                borderRadius: 6,
                                borderWidth: activeView === 'COMPARISON' ? 1 : 0,
                                borderColor: colors.border
                            }}
                        >
                            <Text style={{
                                color: activeView === 'COMPARISON' ? colors.text : colors.textSecondary,
                                fontSize: 12,
                                fontWeight: activeView === 'COMPARISON' ? '600' : '400'
                            }}>Compare</Text>
                        </TouchableOpacity>
                    </View>

                    {activeView === 'MONTHLY' && renderTimeFilter()}
                </View>

                {isLoading ? (
                    <View style={{ height: 220, padding: 10 }}>
                        <Skeleton height={200} width="100%" borderRadius={16} />
                    </View>
                ) : !isPrivacyEnabled ? (
                    <View style={{ height: 220, paddingVertical: 10 }}>
                        {activeView === 'MONTHLY' && timeRange === '1Y' && renderYearSelector()}
                        {(() => {
                            const barData = activeView === 'COMPARISON' ? [
                                { label: "This M*", value: proRatedExpense, actual: currentMonthExpense, fullLabel: "This Month (Projected)", isProjected: true },
                                { label: "Last M", value: lastMonthExpense, actual: lastMonthExpense, fullLabel: "Last Month", isProjected: false },
                                { label: "Avg 3M", value: averageExpense, actual: averageExpense, fullLabel: "3-Month Average", isProjected: false },
                                { label: "Avg 6M", value: average6Month, actual: average6Month, fullLabel: "6-Month Average", isProjected: false },
                                { label: "Avg 1Y", value: average1Year, actual: average1Year, fullLabel: "1-Year Average", isProjected: false },
                            ] : (() => {
                                const labels = [...activeMonthlyTrends.labels];
                                const fullLabels = activeMonthlyTrends.fullLabels ? [...activeMonthlyTrends.fullLabels] : [...labels];
                                const rawData = [...activeMonthlyTrends.expenseData];

                                return labels.map((label, index) => {
                                    const today = new Date();
                                    const isActualCurrentMonth = selectedYear === today.getFullYear() && index === today.getMonth();
                                    const isCurrentMonth = timeRange === '1Y' ? isActualCurrentMonth : (index === labels.length - 1);

                                    const actual = rawData[index] || new BigNumber(0);
                                    const value = isCurrentMonth ? proRatedExpense : actual;

                                    const showLabelInterval = Math.ceil(labels.length / 6);
                                    const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

                                    return {
                                        label: shouldShowLabel ? (isCurrentMonth ? label + "*" : label) : '',
                                        fullLabel: isCurrentMonth ? fullLabels[index] + "*" : fullLabels[index],
                                        value,
                                        actual,
                                        isProjected: isCurrentMonth
                                    };
                                });
                            })();

                            // Calculate Max Value safely
                            const maxValue = BigNumber.max(
                                ...barData.map(b => b.value),
                                new BigNumber(0)
                            ).toNumber();

                            // Calculate Min Value safely
                            const minValue = activeView === 'COMPARISON' ? BigNumber.min(
                                ...barData.map(b => b.isProjected ? b.actual : b.value),
                                maxValue
                            ).toNumber() : 0;

                            // Start Y-axis 15% below minimum for COMPARISON, or 0 for MONTHLY
                            const yMin = activeView === 'COMPARISON' ? Math.max(0, minValue * 0.85) : 0;
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
                                yLabels.push(`${CURRENCY_SYMBOLS[currency] || currency}${formatted.toFixed(1)}${suffix}`);
                            }

                            return (
                                <View style={{ flex: 1, flexDirection: 'row' }}>
                                    {/* Y-Axis Labels */}
                                    <View style={{ width: 45, justifyContent: 'space-between', paddingBottom: 25, alignItems: 'flex-end', paddingRight: 5 }}>
                                        {yLabels.reverse().map((label, i) => (
                                            <Text key={i} style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
                                        ))}
                                    </View>

                                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' }}>
                                        {barData.map((bar, index) => {
                                            // Calculate heights relative to yMin-yMax range
                                            const totalHeight = (yRange > 0
                                                ? bar.value.minus(yMin).dividedBy(yRange).times(chartHeight)
                                                : new BigNumber(0)).toNumber();

                                            const actualHeight = (yRange > 0
                                                ? bar.actual.minus(yMin).dividedBy(yRange).times(chartHeight)
                                                : new BigNumber(0)).toNumber();

                                            const projectedHeight = bar.isProjected ? Math.max(0, totalHeight - actualHeight) : 0;

                                            const isSelected = selectedBarIndex === index;

                                            return (
                                                <View key={index} style={{ alignItems: 'center', flex: 1, zIndex: isSelected ? 100 : 0, elevation: isSelected ? 10 : 0 }}>
                                                    {/* Tappable Bar Area */}
                                                    <TouchableOpacity
                                                        activeOpacity={1}
                                                        onPressIn={() => setSelectedBarIndex(index)}
                                                        onPressOut={() => setSelectedBarIndex(null)}
                                                        style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}
                                                    >
                                                        {bar.isProjected ? (
                                                            // Stacked bar: actual (solid) + projected (lighter)
                                                            <View style={{ width: activeView === 'COMPARISON' ? '50%' : '70%', borderRadius: 4, overflow: 'hidden' }}>
                                                                {/* Projected portion (lighter, on top) */}
                                                                <View style={{
                                                                    height: projectedHeight,
                                                                    backgroundColor: isSelected ? 'rgba(255, 152, 0, 0.45)' : 'rgba(255, 152, 0, 0.35)',
                                                                    borderTopLeftRadius: 4,
                                                                    borderTopRightRadius: 4,
                                                                }} />
                                                                {/* Actual portion (solid, on bottom) */}
                                                                <View style={{
                                                                    height: Math.max(0, actualHeight),
                                                                    backgroundColor: isSelected ? 'rgba(255, 152, 0, 0.9)' : 'rgba(255, 152, 0, 1)',
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
                                                                width: activeView === 'COMPARISON' ? '50%' : '70%',
                                                                backgroundColor: isSelected ? 'rgba(255, 152, 0, 0.9)' : 'rgba(255, 152, 0, 1)',
                                                                borderRadius: 4,
                                                            }} />
                                                        )}
                                                    </TouchableOpacity>

                                                    {/* Tooltip Overlay */}
                                                    {isSelected && (
                                                        <View style={{
                                                            position: 'absolute',
                                                            bottom: Math.max(0, totalHeight) + 8,
                                                            backgroundColor: colors.surface,
                                                            padding: 8,
                                                            borderRadius: 8,
                                                            shadowColor: '#000',
                                                            shadowOffset: { width: 0, height: 2 },
                                                            shadowOpacity: 0.15,
                                                            shadowRadius: 4,
                                                            elevation: 10,
                                                            minWidth: 100,
                                                            alignItems: 'center',
                                                            borderWidth: 1,
                                                            borderColor: colors.border,
                                                            zIndex: 100
                                                        }}>
                                                            <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>{bar.fullLabel.replace('*', '')}</Text>
                                                            <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                                Actual: <Text style={{ color: colors.text }}>{formatCurrencyAmount(bar.actual, currency)}</Text>
                                                            </Text>
                                                            {bar.isProjected && (
                                                                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                                                    Proj: <Text style={{ color: colors.text }}>{formatCurrencyAmount(bar.value, currency)}</Text>
                                                                </Text>
                                                            )}
                                                            <View style={{
                                                                position: 'absolute',
                                                                bottom: -6,
                                                                width: 12,
                                                                height: 12,
                                                                backgroundColor: colors.surface,
                                                                transform: [{ rotate: '45deg' }],
                                                                borderBottomWidth: 1,
                                                                borderRightWidth: 1,
                                                                borderColor: colors.border,
                                                                zIndex: -1
                                                            }} />
                                                        </View>
                                                    )}

                                                    {/* Label */}
                                                    <Text
                                                        numberOfLines={1}
                                                        style={{
                                                            color: isSelected ? colors.primary : colors.textSecondary,
                                                            fontSize: 10,
                                                            marginTop: 6,
                                                            width: activeView === 'COMPARISON' ? undefined : 40,
                                                            textAlign: 'center',
                                                            fontWeight: isSelected ? 'bold' : 'normal',
                                                            opacity: bar.label || isSelected ? 1 : 0
                                                        }}
                                                    >
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
        </View >
    );
};

export default ComparisonChart;
