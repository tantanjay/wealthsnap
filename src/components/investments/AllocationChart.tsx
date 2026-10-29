import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Skeleton } from '@components/common/Skeleton';
import { usePrivacy } from '@context/PrivacyContext';
import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

// Applies a variable opacity to a theme hex color (e.g. ds.success), so gain/loss
// intensity can still scale with magnitude without falling back to a hardcoded rgba().
const withAlpha = (hex: string, opacity: number): string => {
    const alphaHex = Math.round(Math.min(Math.max(opacity, 0), 1) * 255).toString(16).padStart(2, '0');
    return `${hex}${alphaHex}`;
};

// --- Interfaces ---
interface Holding {
    symbol: string;
    shares: number;
    price: number;
    totalValue: number;
    gainLoss: number;
    // null when cost basis is $0 but there's a real gain/loss (e.g. free/gifted shares)
    gainLossPercent: number | null;
    divYield: number;
    sector?: string;
    type?: string;
}

export type AllocationTab = 'stocks' | 'sector' | 'type';

interface AllocationChartProps {
    holdingsData: Holding[];
    // Which grouping to draw; the page picks it.
    tab: AllocationTab;
    isLoading?: boolean;
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

// Box text shrinks with the box but never exceeds the caption size.
const MAX_BOX_FONT = type.caption.fontSize ?? 11;

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
// Weights and return % are scale-free, so only Hidden replaces the treemap.
export const AllocationChart: React.FC<AllocationChartProps> = ({ holdingsData, tab: selectedTab, isLoading = false }) => {
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    const [containerWidth, setContainerWidth] = useState(0);
    const chartHeight = 220;

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    }, []);

    const chartItems = useMemo(() => {
        if (!holdingsData || holdingsData.length === 0) return [];

        // Filter based on selected tab logic first
        // For Stocks tab, we only want actual Stocks
        let filteredHoldings = holdingsData;
        if (selectedTab === 'stocks') {
            filteredHoldings = holdingsData.filter(h => h.type === 'STOCKS');
        }

        if (filteredHoldings.length === 0) return [];

        const totalPortfolioValue = filteredHoldings.reduce((sum, h) => sum + h.totalValue, 0);

        if (selectedTab === 'stocks') {
            return filteredHoldings.map(h => {
                const isGain = h.gainLoss >= 0;
                const glSign = isGain ? '+' : '';
                // null means a real gain/loss with an undefined percent (e.g. $0 cost basis) —
                // treat it as strong intensity for the color since we know it's non-trivial.
                const glMagnitude = h.gainLossPercent ?? 100;
                const color = isGain
                    ? withAlpha(ds.success, 0.5 + (Math.min(glMagnitude, 15) / 40))
                    : withAlpha(ds.danger, 0.5 + (Math.min(Math.abs(glMagnitude), 15) / 40));

                return {
                    id: h.symbol,
                    value: h.totalValue,
                    label: h.symbol,
                    weight: `${((h.totalValue / totalPortfolioValue) * 100).toFixed(1)}%`,
                    performance: h.gainLossPercent === null ? 'N/A' : `${glSign}${h.gainLossPercent.toFixed(1)}%`,
                    color,
                };
            });
        } else if (selectedTab === 'sector') {
            const sectors: { [key: string]: { value: number, gainLoss: number } } = {};
            // For Sector view, we use ALL holdings (as requested "its ok in Sector option")
            // So we use holdingsData, not filteredHoldings (which was only filtered for 'stocks' tab)
            holdingsData.forEach(h => {
                const s = h.sector || 'Other';
                if (!sectors[s]) sectors[s] = { value: 0, gainLoss: 0 };
                sectors[s].value += h.totalValue;
                sectors[s].gainLoss += h.gainLoss;
            });

            // Recalculate total for ALL holdings
            const totalValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);

            return Object.keys(sectors).map((s) => {
                const data = sectors[s];
                const costBasis = data.value - data.gainLoss;
                const sectorPerf = costBasis > 0 ? (data.gainLoss / costBasis) * 100 : 0;

                const isGain = data.gainLoss >= 0;
                const glSign = isGain ? '+' : '';
                const color = isGain
                    ? withAlpha(ds.success, 0.5 + (Math.min(sectorPerf, 15) / 40))
                    : withAlpha(ds.danger, 0.5 + (Math.min(Math.abs(sectorPerf), 15) / 40));

                return {
                    id: s,
                    value: data.value,
                    label: s,
                    weight: `${((data.value / totalValue) * 100).toFixed(1)}%`,
                    performance: `${glSign}${sectorPerf.toFixed(1)}%`,
                    color,
                };
            });
        } else {
            // TYPE view
            const types: { [key: string]: { value: number, gainLoss: number } } = {};
            holdingsData.forEach(h => {
                // Use type or fallback
                const t = h.type || 'Other';
                if (!types[t]) types[t] = { value: 0, gainLoss: 0 };
                types[t].value += h.totalValue;
                types[t].gainLoss += h.gainLoss;
            });

            const totalValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);

            return Object.keys(types).map((t) => {
                const data = types[t];
                const costBasis = data.value - data.gainLoss;
                const typePerf = costBasis > 0 ? (data.gainLoss / costBasis) * 100 : 0;

                const isGain = data.gainLoss >= 0;
                const glSign = isGain ? '+' : '';
                const color = isGain
                    ? withAlpha(ds.success, 0.5 + (Math.min(typePerf, 15) / 40))
                    : withAlpha(ds.danger, 0.5 + (Math.min(Math.abs(typePerf), 15) / 40));

                return {
                    id: t,
                    value: data.value,
                    label: t, // Label as Type
                    weight: `${((data.value / totalValue) * 100).toFixed(1)}%`,
                    performance: `${glSign}${typePerf.toFixed(1)}%`,
                    color,
                };
            });
        }
    }, [holdingsData, selectedTab, ds]);

    const layout = useMemo(() => {
        if (containerWidth <= 0) return [];
        return getTreemapLayout(chartItems, containerWidth, chartHeight);
    }, [chartItems, containerWidth]);

    return (
        <View>
            {isLoading ? (
                <View>
                    <Skeleton width="100%" height={chartHeight} borderRadius={radius.md} />
                </View>
            ) : mode === 'hidden' ? (
                <View style={[styles.placeholder, { height: chartHeight, backgroundColor: ds.inset }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={ds.text2} />
                    <Text style={[type.small, { color: ds.text2 }]}>Chart hidden for privacy</Text>
                </View>
            ) : (!holdingsData || holdingsData.length === 0) ? (
                <View style={[styles.placeholder, { height: chartHeight, backgroundColor: ds.inset }]}>
                    <Text style={[type.small, { color: ds.text2 }]}>No active holdings.</Text>
                </View>
            ) : (
                <View style={styles.chartWrapper} onLayout={onLayout}>
                    <View style={[styles.chartContainer, { height: chartHeight }]}>
                        {layout.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={[type.small, { color: ds.text2 }]}>No data for {selectedTab}</Text>
                            </View>
                        ) : (
                            layout.map((item) => {
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
                                                borderColor: ds.group,
                                            }
                                        ]}
                                    >
                                        {showLabel && (
                                            <Text
                                                style={[styles.boxLabel, { color: ds.onAccent, fontSize: Math.min(MAX_BOX_FONT, item.width / 4.5) }]}
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
                                                    <Text style={[styles.boxSubLabel, { color: ds.onAccent, fontSize: Math.min(MAX_BOX_FONT, item.width / 7) }]}>
                                                        {item.weight}
                                                    </Text>
                                                )}
                                                {showWeight && showPerf && !isPortrait && (
                                                    <Text style={[styles.boxSubLabel, { color: ds.onAccent }]}> </Text>
                                                )}
                                                {showPerf && (
                                                    <Text style={[styles.boxSubLabel, { color: ds.onAccent, fontSize: Math.min(MAX_BOX_FONT, item.width / 7), opacity: 0.9 }]}>
                                                        ({item.performance})
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    placeholder: {
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        gap: space[2],
    },
    chartWrapper: {
        marginTop: space[1],
    },
    chartContainer: {
        width: '100%',
        position: 'relative',
        borderRadius: radius.md,
        overflow: 'hidden',
    },
    box: {
        position: 'absolute',
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 2,
    },
    boxLabel: {
        ...type.captionMedium,
        textAlign: 'center',
    },
    subLabelContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    boxSubLabel: {
        ...type.captionNum,
        textAlign: 'center',
    }
});
