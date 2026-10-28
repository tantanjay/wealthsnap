import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Row, SectionHeader, Sheet } from '@components/ds';
import SnapshotOrderList, { OrderItemMeta } from '@components/home/SnapshotOrderList';
import { useTheme } from '@context/ThemeContext';
import { HEALTH_GRID_SIZE, HEALTH_METRIC_IDS, HealthMetricId } from '@services/core/storageService';
import { type, space, radius } from '@styles/theme';
import { HEALTH_METRIC_META } from './financialHealthPool';

// Sections below the grid, in their default order. 'budgets' is new with the redesign.
export type InsightsSectionId = 'cumulative' | 'comparison' | 'expense' | 'income' | 'savings' | 'budgets' | 'alerts';

export const INSIGHTS_SECTION_META: Record<InsightsSectionId, OrderItemMeta> = {
    cumulative: { label: 'Cumulative spending' },
    comparison: { label: 'Spending comparison' },
    expense: { label: 'Expense analysis' },
    income: { label: 'Income analysis' },
    savings: { label: 'Savings rate trend' },
    budgets: { label: 'Budgets' },
    alerts: { label: 'Smart alerts' },
};

export const DEFAULT_SECTION_ORDER = Object.keys(INSIGHTS_SECTION_META) as InsightsSectionId[];

// Keeps a saved order (dropping the old 'overview' and unknown ids) and appends new sections.
export const normalizeSectionOrder = (saved: string[] | null): InsightsSectionId[] => {
    const known = (saved ?? []).filter((id, i, all): id is InsightsSectionId => Object.prototype.hasOwnProperty.call(INSIGHTS_SECTION_META, id) && all.indexOf(id) === i);
    return [...known, ...DEFAULT_SECTION_ORDER.filter(id => !known.includes(id))];
};

// Checking appends to the grid; unchecking closes the gap, so check order = grid order.
export const toggleGridPick = (grid: HealthMetricId[], id: HealthMetricId): HealthMetricId[] => {
    if (grid.includes(id)) return grid.filter(g => g !== id);
    return grid.length >= HEALTH_GRID_SIZE ? grid : [...grid, id];
};

const NumberedCheck: React.FC<{ position: number }> = ({ position }) => {
    const { ds } = useTheme();
    const on = position > 0;
    return (
        <View style={[styles.check, on ? { backgroundColor: ds.accent, borderColor: ds.accent } : { borderColor: ds.text3 }]}>
            {on && <Text style={[type.captionMedium, { color: ds.onAccent }]}>{position}</Text>}
        </View>
    );
};

interface InsightsSettingsSheetProps {
    visible: boolean;
    onClose: () => void;
    grid: HealthMetricId[];
    onChangeGrid: (grid: HealthMetricId[]) => void;
    sectionOrder: InsightsSectionId[];
    onChangeSectionOrder: (order: InsightsSectionId[]) => void;
}

const InsightsSettingsSheet: React.FC<InsightsSettingsSheetProps> = ({ visible, onClose, grid, onChangeGrid, sectionOrder, onChangeSectionOrder }) => {
    const { ds } = useTheme();
    const full = grid.length >= HEALTH_GRID_SIZE;
    const ids = [...grid, ...HEALTH_METRIC_IDS.filter(id => !grid.includes(id))];

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title="Insights settings"
            footer={
                <Pressable onPress={onClose} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Done</Text>
                </Pressable>
            }
        >
            {/* SectionHeader's spacing, with a counter instead of a link on the right. */}
            <View style={styles.headerRow}>
                <Text style={[type.smallStrong, { color: ds.text }]}>Financial health grid</Text>
                <Text style={[type.smallMediumNum, { color: full ? ds.accent : ds.text2 }]}>
                    {grid.length} of {HEALTH_GRID_SIZE}
                </Text>
            </View>
            <Text style={[type.small, { color: ds.text2 }]}>
                Checked numbers move to the top in the order you check them; that&apos;s their order on the grid.
            </Text>
            {ids.map((id, i) => {
                const position = grid.indexOf(id) + 1;
                const locked = !position && full;
                const isLastPicked = position > 0 && position === grid.length && i < ids.length - 1;
                return (
                    <Row
                        key={id}
                        title={HEALTH_METRIC_META[id].label}
                        subtitle={position ? `Card ${position}` : undefined}
                        leading={<NumberedCheck position={position} />}
                        onPress={locked ? undefined : () => onChangeGrid(toggleGridPick(grid, id))}
                        last={i === ids.length - 1}
                        style={[locked && styles.locked, isLastPicked && styles.lastPicked]}
                    />
                );
            })}

            <SectionHeader title="Section order" />
            <Text style={[type.small, { color: ds.text2 }]}>Drag to reorder the sections below the grid.</Text>
            <SnapshotOrderList order={sectionOrder} meta={INSIGHTS_SECTION_META} onChange={onChangeSectionOrder} />
        </Sheet>
    );
};

const styles = StyleSheet.create({
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: space[6],
        marginBottom: space[1],
    },
    check: {
        width: 22,
        height: 22,
        borderRadius: 6,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    locked: {
        opacity: 0.4,
    },
    lastPicked: {
        borderBottomWidth: 2,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default InsightsSettingsSheet;
