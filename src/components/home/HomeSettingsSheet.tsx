import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { PrivacyMode, usePrivacy } from '@context/PrivacyContext';
import { type, radius } from '@styles/theme';
import { Row, SectionHeader, Sheet } from '@components/ds';
import { HoldingsSectionId, SNAPSHOT_RANGES, SnapshotRange, SnapshotRowId } from '@services/core/storageService';
import SnapshotOrderList, { OrderItemMeta, SNAPSHOT_ROW_META } from './SnapshotOrderList';

export type HomeTab = 'snapshot' | 'ledger' | 'holdings' | 'goals' | 'loans';

const TAB_LABEL: Record<HomeTab, string> = {
    snapshot: 'Snapshot',
    ledger: 'Ledger',
    holdings: 'Holdings',
    goals: 'Goals',
    loans: 'Loans',
};

const HOLDINGS_SECTION_META: Record<HoldingsSectionId, OrderItemMeta> = {
    holdings: { label: 'Holdings' },
    allocation: { label: 'Allocation' },
    dividends: { label: 'Dividends' },
    advisor: { label: 'Smart advisor' },
};

const PRIVACY_OPTIONS: { mode: PrivacyMode; label: string; description: string }[] = [
    { mode: 'open', label: 'Open', description: 'Shows every amount.' },
    { mode: 'discreet', label: 'Discreet', description: 'Percentages, months and progress instead of amounts.' },
    { mode: 'hidden', label: 'Hidden', description: 'Masks every amount with ****.' },
];

const Radio: React.FC<{ selected: boolean }> = ({ selected }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.radio, { borderColor: selected ? ds.accent : ds.text3 }]}>
            {selected && <View style={[styles.radioDot, { backgroundColor: ds.accent }]} />}
        </View>
    );
};

interface HomeSettingsSheetProps {
    visible: boolean;
    onClose: () => void;
    // The selected Home tab decides which settings show.
    tab: HomeTab;
    order: SnapshotRowId[];
    onChangeOrder: (order: SnapshotRowId[]) => void;
    range: SnapshotRange;
    onChangeRange: (range: SnapshotRange) => void;
    holdingsOrder: HoldingsSectionId[];
    onChangeHoldingsOrder: (order: HoldingsSectionId[]) => void;
}

const HomeSettingsSheet: React.FC<HomeSettingsSheetProps> = ({ visible, onClose, tab, order, onChangeOrder, range, onChangeRange, holdingsOrder, onChangeHoldingsOrder }) => {
    const { ds } = useTheme();
    const { mode, setMode } = usePrivacy();

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title={`${TAB_LABEL[tab]} settings`}
            footer={
                <Pressable onPress={onClose} style={[styles.button, { backgroundColor: ds.accent }]} accessibilityRole="button">
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>Done</Text>
                </Pressable>
            }
        >
            <SectionHeader title="Privacy" />
            <Text style={[type.small, { color: ds.text2 }]}>Applies everywhere as soon as you pick one.</Text>
            {PRIVACY_OPTIONS.map((option, i) => (
                <Row
                    key={option.mode}
                    title={option.label}
                    subtitle={option.description}
                    leading={<Radio selected={mode === option.mode} />}
                    onPress={() => setMode(option.mode)}
                    last={i === PRIVACY_OPTIONS.length - 1}
                />
            ))}

            {tab === 'snapshot' && (
                <>
                    <SectionHeader title="Net worth graph" />
                    <Text style={[type.small, { color: ds.text2 }]}>How far back the line under your net worth reaches.</Text>
                    {SNAPSHOT_RANGES.map((option, i) => (
                        <Row
                            key={option.key}
                            title={option.label}
                            leading={<Radio selected={range === option.key} />}
                            onPress={() => onChangeRange(option.key)}
                            last={i === SNAPSHOT_RANGES.length - 1}
                        />
                    ))}

                    <SectionHeader title="Snapshot order" />
                    <Text style={[type.small, { color: ds.text2 }]}>Hold the handle and drag to reorder the Overview rows. Net worth stays on top.</Text>
                    <SnapshotOrderList order={order} meta={SNAPSHOT_ROW_META} onChange={onChangeOrder} />
                </>
            )}

            {tab === 'holdings' && (
                <>
                    <SectionHeader title="Section order" />
                    <Text style={[type.small, { color: ds.text2 }]}>Hold the handle and drag to reorder the sections under your portfolio summary.</Text>
                    <SnapshotOrderList order={holdingsOrder} meta={HOLDINGS_SECTION_META} onChange={onChangeHoldingsOrder} />
                </>
            )}
        </Sheet>
    );
};

const styles = StyleSheet.create({
    radio: {
        width: 20,
        height: 20,
        borderRadius: radius.full,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: radius.full,
    },
    button: {
        height: 48,
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HomeSettingsSheet;
