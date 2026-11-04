import React, { useState, useMemo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';

import { Skeleton } from '@components/common/Skeleton';
import HiddenChart from '@components/common/HiddenChart';
import { usePrivacy } from '@context/PrivacyContext';
import { useTheme } from '@context/ThemeContext';
import { usePrivacyFormat, formatPercent } from '@hooks/usePrivacyFormat';
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
    realizedPL: number;
    dividends: number;
    totalInvested: number;
}

export type AllocationTab = 'assets' | 'stocks' | 'sector' | 'type';

interface AllocationChartProps {
    holdingsData: Holding[];
    // Which grouping to draw; the page picks it.
    tab: AllocationTab;
    currency: string;
    isLoading?: boolean;
}

interface TreeMapItem {
    id: string;
    value: number;
    label: string;
    weight: string;       // Separated for smart rendering
    performance: string;  // Separated for smart rendering
    // For the tap tooltip: the raw return (tone) and how many holdings a sector/type box holds.
    performanceValue: number | null;
    // Return counting realized gains and dividends too; null while nothing was ever invested.
    totalReturnValue: number | null;
    count: number;
    color: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// Box text shrinks with the box but never exceeds the caption size.
const MAX_BOX_FONT = type.caption.fontSize ?? 11;

// Same rule as the Holdings Total return, for one box.
const totalReturnPercent = (totalReturn: number, invested: number): number | null =>
    invested > 0 ? (totalReturn / invested) * 100 : null;

const PRESSED_OPACITY = 0.7;
const TOOLTIP_WIDTH = 150;
// Estimated so the tooltip can be placed before it's drawn; Open adds the value line.
const TOOLTIP_HEIGHT = 94;
const TOOLTIP_HEIGHT_OPEN = 112;
const TOOLTIP_GAP = 6;

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
export const AllocationChart: React.FC<AllocationChartProps> = ({ holdingsData, tab: selectedTab, currency, isLoading = false }) => {
    const { ds } = useTheme();
    const { mode } = usePrivacy();
    const format = usePrivacyFormat(currency);
    const [containerWidth, setContainerWidth] = useState(0);
    // Tapped box; tapping it again (or switching tabs) closes its tooltip.
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [prevTab, setPrevTab] = useState(selectedTab);
    if (prevTab !== selectedTab) {
        setPrevTab(selectedTab);
        setSelectedId(null);
    }
    const chartHeight = 220;

    const onLayout = useCallback((event: LayoutChangeEvent) => {
        const { width } = event.nativeEvent.layout;
        setContainerWidth(width);
    }, []);

    const chartItems = useMemo(() => {
        if (!holdingsData || holdingsData.length === 0) return [];

        // Assets: one box per holding of any type. Stocks: the same, stocks only, weighted among stocks.
        if (selectedTab === 'assets' || selectedTab === 'stocks') {
            const boxHoldings = selectedTab === 'stocks' ? holdingsData.filter(h => h.type === 'STOCKS') : holdingsData;
            const totalPortfolioValue = boxHoldings.reduce((sum, h) => sum + h.totalValue, 0);
            return boxHoldings.map(h => {
                const isGain = h.gainLoss >= 0;
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
                    performance: h.gainLossPercent === null ? 'N/A' : formatPercent(h.gainLossPercent, { signed: true, decimals: 1 }),
                    performanceValue: h.gainLossPercent,
                    totalReturnValue: totalReturnPercent(h.gainLoss + h.realizedPL + h.dividends, h.totalInvested),
                    count: 1,
                    color,
                };
            });
        } else if (selectedTab === 'sector') {
            const sectors: { [key: string]: { value: number, gainLoss: number, count: number, extra: number, invested: number } } = {};
            holdingsData.forEach(h => {
                const s = h.sector || 'Other';
                if (!sectors[s]) sectors[s] = { value: 0, gainLoss: 0, count: 0, extra: 0, invested: 0 };
                sectors[s].value += h.totalValue;
                sectors[s].gainLoss += h.gainLoss;
                sectors[s].count += 1;
                sectors[s].extra += h.realizedPL + h.dividends;
                sectors[s].invested += h.totalInvested;
            });

            // Recalculate total for ALL holdings
            const totalValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);

            return Object.keys(sectors).map((s) => {
                const data = sectors[s];
                const costBasis = data.value - data.gainLoss;
                const sectorPerf = costBasis > 0 ? (data.gainLoss / costBasis) * 100 : 0;

                const isGain = data.gainLoss >= 0;
                const color = isGain
                    ? withAlpha(ds.success, 0.5 + (Math.min(sectorPerf, 15) / 40))
                    : withAlpha(ds.danger, 0.5 + (Math.min(Math.abs(sectorPerf), 15) / 40));

                return {
                    id: s,
                    value: data.value,
                    label: s,
                    weight: `${((data.value / totalValue) * 100).toFixed(1)}%`,
                    performance: formatPercent(sectorPerf, { signed: true, decimals: 1 }),
                    performanceValue: sectorPerf,
                    totalReturnValue: totalReturnPercent(data.gainLoss + data.extra, data.invested),
                    count: data.count,
                    color,
                };
            });
        } else {
            // TYPE view
            const types: { [key: string]: { value: number, gainLoss: number, count: number, extra: number, invested: number } } = {};
            holdingsData.forEach(h => {
                // Use type or fallback
                const t = h.type || 'Other';
                if (!types[t]) types[t] = { value: 0, gainLoss: 0, count: 0, extra: 0, invested: 0 };
                types[t].value += h.totalValue;
                types[t].gainLoss += h.gainLoss;
                types[t].count += 1;
                types[t].extra += h.realizedPL + h.dividends;
                types[t].invested += h.totalInvested;
            });

            const totalValue = holdingsData.reduce((sum, h) => sum + h.totalValue, 0);

            return Object.keys(types).map((t) => {
                const data = types[t];
                const costBasis = data.value - data.gainLoss;
                const typePerf = costBasis > 0 ? (data.gainLoss / costBasis) * 100 : 0;

                const isGain = data.gainLoss >= 0;
                const color = isGain
                    ? withAlpha(ds.success, 0.5 + (Math.min(typePerf, 15) / 40))
                    : withAlpha(ds.danger, 0.5 + (Math.min(Math.abs(typePerf), 15) / 40));

                return {
                    id: t,
                    value: data.value,
                    label: t, // Label as Type
                    weight: `${((data.value / totalValue) * 100).toFixed(1)}%`,
                    performance: formatPercent(typePerf, { signed: true, decimals: 1 }),
                    performanceValue: typePerf,
                    totalReturnValue: totalReturnPercent(data.gainLoss + data.extra, data.invested),
                    count: data.count,
                    color,
                };
            });
        }
    }, [holdingsData, selectedTab, ds]);

    const layout = useMemo(() => {
        if (containerWidth <= 0) return [];
        return getTreemapLayout(chartItems, containerWidth, chartHeight);
    }, [chartItems, containerWidth]);

    // Above the box when it fits, else below, else over its top edge; always inside the map.
    const renderTooltip = () => {
        const item = layout.find(i => i.id === selectedId);
        if (!item) return null;
        const tipHeight = format.isOpen ? TOOLTIP_HEIGHT_OPEN : TOOLTIP_HEIGHT;
        const centerX = item.x + item.width / 2;
        const left = Math.min(Math.max(centerX - TOOLTIP_WIDTH / 2, TOOLTIP_GAP), containerWidth - TOOLTIP_WIDTH - TOOLTIP_GAP);
        const above = item.y - tipHeight - TOOLTIP_GAP;
        const below = item.y + item.height + TOOLTIP_GAP;
        const top = above >= 0 ? above : below + tipHeight <= chartHeight ? below : Math.max(item.y + TOOLTIP_GAP, TOOLTIP_GAP);
        const share = selectedTab === 'stocks' ? 'of stocks' : 'of portfolio';
        const toneOf = (v: number | null) => {
            const shown = v === null ? 0 : Number(v.toFixed(1));
            return shown > 0 ? ds.success : shown < 0 ? ds.danger : ds.text2;
        };
        const totalText = item.totalReturnValue === null ? null : formatPercent(item.totalReturnValue, { signed: true, decimals: 1 });
        // Only worth a line when dividends or sales move it away from the price return.
        const showTotal = totalText !== null && totalText !== item.performance;
        return (
            <View pointerEvents="none" style={[styles.tooltip, { left, top, width: TOOLTIP_WIDTH, backgroundColor: ds.raised, borderColor: ds.hairline }]}>
                <Text style={[type.captionMedium, { color: ds.text }]}>{item.label}</Text>
                <Text style={[type.captionNum, { color: ds.text2 }]}>{item.weight} {share}</Text>
                <Text style={[type.captionNum, { color: toneOf(item.performanceValue) }]}>Price return {item.performance}</Text>
                {showTotal && (
                    <Text style={[type.captionNum, { color: toneOf(item.totalReturnValue) }]}>Total return {totalText}</Text>
                )}
                {format.isOpen && <Text style={[type.captionNum, { color: ds.text }]}>{format.money(item.value)}</Text>}
                {item.count > 1 && <Text style={[type.caption, { color: ds.text2 }]}>{item.count} holdings</Text>}
            </View>
        );
    };

    return (
        <View>
            {isLoading ? (
                <View>
                    <Skeleton width="100%" height={chartHeight} borderRadius={radius.md} />
                </View>
            ) : mode === 'hidden' ? (
                <HiddenChart height={chartHeight} />
            ) : (!holdingsData || holdingsData.length === 0) ? (
                <View style={[styles.placeholder, { height: chartHeight, backgroundColor: ds.inset }]}>
                    <Text style={[type.small, { color: ds.text2 }]}>No active holdings.</Text>
                </View>
            ) : (
                <View style={styles.chartWrapper} onLayout={onLayout}>
                    <View style={[styles.chartContainer, { height: chartHeight }]}>
                        {layout.length === 0 ? (
                            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                                <Text style={[type.small, { color: ds.text2 }]}>{selectedTab === 'stocks' ? 'No stocks to show' : 'No data to show'}</Text>
                            </View>
                        ) : (
                            layout.map((item) => {
                                const isPortrait = item.height > item.width * 1.2;
                                const showLabel = item.width > 28 && item.height > 18;
                                const showWeight = item.width > 40 && item.height > 35;
                                // Performance (% gain/loss) is hidden if the box is very small
                                const showPerf = item.width > 55 && item.height > 45;

                                return (
                                    <Pressable
                                        key={item.id}
                                        onPress={() => setSelectedId(id => (id === item.id ? null : item.id))}
                                        accessibilityRole="button"
                                        accessibilityLabel={`${item.label}, ${item.weight}, ${item.performance} return`}
                                        style={[
                                            styles.box,
                                            {
                                                left: item.x,
                                                top: item.y,
                                                width: item.width,
                                                height: item.height,
                                                backgroundColor: item.color,
                                                borderColor: ds.group,
                                                opacity: selectedId === item.id ? PRESSED_OPACITY : 1,
                                            }
                                        ]}
                                    >
                                        {showLabel && (
                                            <Text
                                                style={[styles.boxLabel, { color: ds.onSemantic, fontSize: Math.min(MAX_BOX_FONT, item.width / 4.5) }]}
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
                                                    <Text style={[styles.boxSubLabel, { color: ds.onSemantic, fontSize: Math.min(MAX_BOX_FONT, item.width / 7) }]}>
                                                        {item.weight}
                                                    </Text>
                                                )}
                                                {showWeight && showPerf && !isPortrait && (
                                                    <Text style={[styles.boxSubLabel, { color: ds.onSemantic }]}> </Text>
                                                )}
                                                {showPerf && (
                                                    <Text style={[styles.boxSubLabel, { color: ds.onSemantic, fontSize: Math.min(MAX_BOX_FONT, item.width / 7), opacity: 0.9 }]}>
                                                        ({item.performance})
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })
                        )}
                        {renderTooltip()}
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
    },
    tooltip: {
        position: 'absolute',
        padding: space[2],
        borderRadius: radius.sm,
        borderWidth: 1,
        gap: 2,
        zIndex: 100,
    },
});
