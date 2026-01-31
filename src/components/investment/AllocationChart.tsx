import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, LayoutChangeEvent } from 'react-native';
import { useTheme } from '@context/ThemeContext';

// --- Interfaces ---
interface Holding {
    symbol: string;
    shares: number;
    price: number;
    totalValue: number;
    gainLoss: number;
    gainLossPercent: number;
    divYield: number;
    sector?: string;
}

interface AllocationChartProps {
    holdingsData: Holding[];
}

interface TreeMapItem {
    id: string;
    value: number;
    label: string;
    weight: string;       // Separated for smart rendering
    performance: string;  // Separated for smart rendering
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// --- Layout Helper ---
const getTreemapLayout = (data: any[], width: number, height: number): TreeMapItem[] => {
    if (data.length === 0 || width <= 0) return [];
    const result: TreeMapItem[] = [];

    const split = (items: any[], rectX: number, rectY: number, rectW: number, rectH: number) => {
        if (items.length === 0) return;
        if (items.length === 1) {
            result.push({
                ...items[0],
                x: rectX,
                y: rectY,
                width: rectW,
                height: rectH
            });
            return;
        }

        const currentTotal = items.reduce((sum, item) => sum + item.value, 0);
        let currentSum = 0;
        let splitIndex = 0;

        for (let i = 0; i < items.length; i++) {
            currentSum += items[i].value;
            if (currentSum >= currentTotal / 2) {
                splitIndex = i;
                break;
            }
        }

        if (splitIndex >= items.length - 1) splitIndex = items.length - 2;
        if (splitIndex < 0) splitIndex = 0;

        const group1 = items.slice(0, splitIndex + 1);
        const group2 = items.slice(splitIndex + 1);
        const group1Value = group1.reduce((s: number, i: any) => s + i.value, 0);
        const ratio = group1Value / currentTotal;

        if (rectW > rectH) {
            const w1 = Math.floor(rectW * ratio);
            split(group1, rectX, rectY, w1, rectH);
            split(group2, rectX + w1, rectY, rectW - w1, rectH);
        } else {
            const h1 = Math.floor(rectH * ratio);
            split(group1, rectX, rectY, rectW, h1);
            split(group2, rectX, rectY + h1, rectW, rectH - h1);
        }
    };

    const sortedData = [...data].sort((a, b) => b.value - a.value);
    split(sortedData, 0, 0, width, height);
    return result;
};

// --- Main Component ---
export const AllocationChart: React.FC<AllocationChartProps> = ({ holdingsData }) => {
    const { colors } = useTheme();
    const [selectedTab, setSelectedTab] = useState<'stocks' | 'sector'>('stocks');
    const [containerWidth, setContainerWidth] = useState(0);
    const chartHeight = 220;

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    }, []);

    const chartItems = useMemo(() => {
        if (!holdingsData || holdingsData.length === 0) return [];
        const totalPortfolioValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);

        if (selectedTab === 'stocks') {
            return holdingsData.map(h => {
                const isGain = h.gainLoss >= 0;
                const glSign = isGain ? '+' : '';
                const color = isGain
                    ? `rgba(16, 185, 129, ${0.5 + (Math.min(h.gainLossPercent, 15) / 40)})`
                    : `rgba(239, 68, 68, ${0.5 + (Math.min(Math.abs(h.gainLossPercent), 15) / 40)})`;

                return {
                    id: h.symbol,
                    value: h.totalValue,
                    label: h.symbol,
                    weight: `${((h.totalValue / totalPortfolioValue) * 100).toFixed(1)}%`,
                    performance: `${glSign}${h.gainLossPercent.toFixed(1)}%`,
                    color,
                };
            });
        } else {
            const sectors: { [key: string]: { value: number, gainLoss: number } } = {};
            holdingsData.forEach(h => {
                const s = h.sector || 'Other';
                if (!sectors[s]) sectors[s] = { value: 0, gainLoss: 0 };
                sectors[s].value += h.totalValue;
                sectors[s].gainLoss += h.gainLoss;
            });

            return Object.keys(sectors).map((s) => {
                const data = sectors[s];
                const costBasis = data.value - data.gainLoss;
                const sectorPerf = costBasis > 0 ? (data.gainLoss / costBasis) * 100 : 0;

                const isGain = data.gainLoss >= 0;
                const glSign = isGain ? '+' : '';
                const color = isGain
                    ? `rgba(16, 185, 129, ${0.5 + (Math.min(sectorPerf, 15) / 40)})`
                    : `rgba(239, 68, 68, ${0.5 + (Math.min(Math.abs(sectorPerf), 15) / 40)})`;

                return {
                    id: s,
                    value: data.value,
                    label: s,
                    weight: `${((data.value / totalPortfolioValue) * 100).toFixed(1)}%`,
                    performance: `${glSign}${sectorPerf.toFixed(1)}%`,
                    color,
                };
            });
        }
    }, [holdingsData, selectedTab]);

    const layout = useMemo(() => {
        if (containerWidth <= 0) return [];
        return getTreemapLayout(chartItems, containerWidth, chartHeight);
    }, [chartItems, containerWidth]);

    return (
        <View style={[styles.container, { backgroundColor: colors.surface }]}>
            <View style={styles.header}>
                <Text style={[styles.title, { color: colors.text }]}>Allocation</Text>
                <View style={[styles.tabContainer, { backgroundColor: colors.background }]}>
                    {(['stocks', 'sector'] as const).map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            style={[styles.tab, selectedTab === tab && { backgroundColor: colors.primary }]}
                            onPress={() => setSelectedTab(tab)}
                        >
                            <Text style={[styles.tabText, { color: selectedTab === tab ? '#fff' : colors.textSecondary }]}>
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            <View style={styles.chartWrapper} onLayout={onLayout}>
                <View style={[styles.chartContainer, { height: chartHeight }]}>
                    {layout.map((item) => {
                        const isPortrait = item.height > item.width * 1.2;
                        const showLabel = item.width > 28 && item.height > 18;
                        const showWeight = item.width > 40 && item.height > 35;
                        // Performance (% gain/loss) is hidden if the box is very small
                        const showPerf = item.width > 55 && item.height > 45;

                        return (
                            <View
                                key={item.id}
                                style={[
                                    styles.box,
                                    {
                                        left: item.x,
                                        top: item.y,
                                        width: item.width,
                                        height: item.height,
                                        backgroundColor: item.color,
                                        borderColor: colors.surface,
                                    }
                                ]}
                            >
                                {showLabel && (
                                    <Text
                                        style={[styles.boxLabel, { fontSize: Math.min(12, item.width / 4.5) }]}
                                        numberOfLines={1}
                                        adjustsFontSizeToFit
                                    >
                                        {item.label}
                                    </Text>
                                )}

                                {(showWeight || showPerf) && (
                                    <View style={[
                                        styles.subLabelContainer,
                                        { flexDirection: isPortrait ? 'column' : 'row' }
                                    ]}>
                                        {showWeight && (
                                            <Text style={[styles.boxSubLabel, { fontSize: Math.min(10, item.width / 7) }]}>
                                                {item.weight}
                                            </Text>
                                        )}
                                        {showWeight && showPerf && !isPortrait && (
                                            <Text style={styles.boxSubLabel}> </Text>
                                        )}
                                        {showPerf && (
                                            <Text style={[styles.boxSubLabel, { fontSize: Math.min(10, item.width / 7), opacity: 0.9 }]}>
                                                ({item.performance})
                                            </Text>
                                        )}
                                    </View>
                                )}
                            </View>
                        );
                    })}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        marginBottom: 20,
        marginHorizontal: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    chartWrapper: {
        marginHorizontal: 16,
        marginBottom: 16,
    },
    chartContainer: {
        width: '100%',
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    title: { fontSize: 18, fontWeight: 'bold' },
    tabContainer: { flexDirection: 'row', borderRadius: 8, padding: 2 },
    tab: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
    tabText: { fontSize: 12, fontWeight: '700' },
    box: {
        position: 'absolute',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    boxLabel: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    subLabelContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxSubLabel: {
        color: '#fff',
        fontWeight: '600',
        textAlign: 'center',
    }
});