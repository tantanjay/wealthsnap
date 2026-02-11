import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Skeleton } from '@components/common/Skeleton';
import { useTheme } from '@context/ThemeContext';
import { CURRENCY_SYMBOLS, formatCurrencyAmount, formatCompactNumber, formatCompactCurrency } from '@utils/currencyUtils';

interface DividendChartProps {
    labels: string[];
    data: number[];
    currency?: string;
    isLoading?: boolean;
    isPrivacyEnabled?: boolean;
}

export const DividendChart: React.FC<DividendChartProps> = ({ labels, data, currency = 'PHP', isLoading = false, isPrivacyEnabled = false }) => {
    const { colors } = useTheme();
    const [selectedBarIndex, setSelectedBarIndex] = useState<number | null>(null);
    const symbol = CURRENCY_SYMBOLS[currency] || currency;

    const totalDividends = data.reduce((acc, curr) => acc + curr, 0);

    const maxValue = Math.max(...data, 1); // Ensure at least 1 to avoid division by zero
    const yMax = maxValue * 1.1; // 10% padding
    const yMin = 0;
    const yRange = yMax - yMin;
    const chartHeight = 180;

    // Generate Y-axis labels (4 labels)
    const yLabels: string[] = [];
    for (let i = 0; i < 4; i++) {
        const value = yMin + (yRange * (i / 3)); // 0, 1/3, 2/3, 1
        yLabels.push(formatCompactNumber(value));
    }

    const renderChart = () => {
        return (
            <View style={{ flex: 1, flexDirection: 'row' }}>
                {/* Y-Axis Labels */}
                <View style={{ width: 40, justifyContent: 'space-between', paddingBottom: 25, alignItems: 'flex-end', paddingRight: 8 }}>
                    {yLabels.reverse().map((label, i) => (
                        <Text key={i} style={{ color: colors.textSecondary, fontSize: 10 }}>{label}</Text>
                    ))}
                </View>

                {/* Bars */}
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', paddingRight: 10 }}>
                    {data.map((value, index) => {
                        const barHeight = yRange > 0 ? ((value - yMin) / yRange) * chartHeight : 0;
                        const isSelected = selectedBarIndex === index;

                        // Smart Labeling: Throttling for density if many items
                        const showLabelInterval = Math.ceil(labels.length / 6);
                        const shouldShowLabel = index === 0 || index === labels.length - 1 || index % showLabelInterval === 0;

                        return (
                            <View key={index} style={{ alignItems: 'center', flex: 1, zIndex: isSelected ? 100 : 0 }}>
                                <TouchableOpacity
                                    activeOpacity={1}
                                    onPressIn={() => setSelectedBarIndex(index)}
                                    onPressOut={() => setSelectedBarIndex(null)}
                                    style={{ height: chartHeight, justifyContent: 'flex-end', width: '100%', alignItems: 'center' }}
                                >
                                    <View style={{
                                        position: 'relative',
                                        height: Math.max(4, barHeight), // Min height for visibility
                                        width: '60%', // Relative width to container
                                        backgroundColor: 'rgba(16, 185, 129, 1)', // Emerald Green
                                        opacity: isSelected ? 0.8 : 1,
                                        borderRadius: 4,
                                        minWidth: 4,
                                        maxWidth: 40
                                    }} />
                                </TouchableOpacity>

                                {/* Tooltip Overlay */}
                                {isSelected && (
                                    <View style={{
                                        position: 'absolute',
                                        bottom: Math.max(4, barHeight) + 8,
                                        backgroundColor: colors.surface,
                                        padding: 8,
                                        borderRadius: 8,
                                        shadowColor: '#000',
                                        shadowOffset: { width: 0, height: 2 },
                                        shadowOpacity: 0.15,
                                        shadowRadius: 4,
                                        elevation: 10,
                                        minWidth: 80,
                                        alignItems: 'center',
                                        borderWidth: 1,
                                        borderColor: colors.border,
                                        zIndex: 100
                                    }}>
                                        <Text style={{ color: colors.text, fontSize: 12, fontWeight: 'bold', marginBottom: 2 }}>{labels[index]}</Text>
                                        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>
                                            {formatCompactCurrency(value, currency)}
                                        </Text>
                                        {/* Arrow */}
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

                                <Text
                                    numberOfLines={1}
                                    style={{
                                        color: isSelected ? colors.primary : colors.textSecondary,
                                        fontSize: 10,
                                        marginTop: 6,
                                        width: 40,
                                        textAlign: 'center',
                                        fontWeight: isSelected ? 'bold' : 'normal',
                                        opacity: shouldShowLabel || isSelected ? 1 : 0
                                    }}
                                >
                                    {labels[index]}
                                </Text>
                            </View>
                        );
                    })}
                </View>
            </View>
        );
    };

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.headerRow}>
                <Text style={[styles.title, { color: colors.text, marginBottom: 0 }]}>Proj. Dividends</Text>
                <Text style={[styles.total, { color: colors.primary }]}>
                    {isPrivacyEnabled ? "••••" : formatCurrencyAmount(totalDividends, currency)}
                </Text>
            </View>
            {isLoading ? (
                <Skeleton width="100%" height={220} borderRadius={16} />
            ) : isPrivacyEnabled ? (
                <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border + '20', borderRadius: 16 }}>
                    <Text style={{ color: colors.textSecondary }}>🔒 Chart hidden for privacy</Text>
                </View>
            ) : (!data || data.length === 0 || data.every(d => d === 0)) ? (
                <View style={{ height: 220, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.border + '20', borderRadius: 16 }}>
                    <Text style={{ color: colors.textSecondary, fontStyle: 'italic' }}>No active holdings.</Text>
                </View>
            ) : (
                <View style={{ height: 220, paddingVertical: 10 }}>
                    {renderChart()}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8
    },
    total: {
        fontSize: 16,
        fontWeight: 'bold'
    }
});
