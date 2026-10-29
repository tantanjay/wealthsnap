import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { Group, SectionHeader, Tile } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { HealthMetricId } from '@services/core/storageService';
import { type, space, layout } from '@styles/theme';
import { HEALTH_METRIC_META, HealthEntry } from './financialHealthPool';

interface FinancialHealthGridProps {
    grid: HealthMetricId[];
    entries: Record<HealthMetricId, HealthEntry>;
    isHidden: boolean;
    onShowAll: () => void;
    onSelect: (id: HealthMetricId) => void;
    onOpenSettings: () => void;
}

// Fixed 2×2 of the user's picks (Insights settings); no swipe, no paging.
const FinancialHealthGrid: React.FC<FinancialHealthGridProps> = ({ grid, entries, isHidden, onShowAll, onSelect, onOpenSettings }) => {
    const { ds } = useTheme();
    const rows = [grid.slice(0, 2), grid.slice(2, 4)].filter(r => r.length > 0);

    return (
        <View>
            <SectionHeader grouped title="Financial health" actionLabel="Show all" onAction={onShowAll} />
            {grid.length === 0 ? (
                <Group padded>
                    <Text style={[type.small, { color: ds.text2 }]} onPress={onOpenSettings}>
                        No numbers picked. <Text style={{ color: ds.accent }}>Choose up to 4 in Insights settings.</Text>
                    </Text>
                </Group>
            ) : (
                <View style={styles.grid}>
                    {rows.map((row, r) => (
                        <View key={r} style={styles.gridRow}>
                            {row.map(id => {
                                const entry = entries[id];
                                return (
                                    <Tile
                                        key={id}
                                        label={HEALTH_METRIC_META[id].label}
                                        icon={HEALTH_METRIC_META[id].icon}
                                        value={entry.value}
                                        change={entry.change}
                                        changeTone={isHidden ? 'neutral' : entry.changeTone}
                                        onPress={() => onSelect(id)}
                                        style={styles.tile}
                                    />
                                );
                            })}
                            {row.length === 1 && <View style={styles.tile} />}
                        </View>
                    ))}
                </View>
            )}
            <Text style={[type.caption, styles.disclaimer, { color: ds.text2 }]}>
                Strict, conservative math. Use it to improve, not to panic.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    grid: {
        gap: space[2],
    },
    gridRow: {
        flexDirection: 'row',
        gap: space[2],
    },
    tile: {
        flex: 1,
        minWidth: 0,
    },
    disclaimer: {
        marginTop: space[2],
        paddingHorizontal: layout.groupPadding,
    },
});

export default FinancialHealthGrid;
