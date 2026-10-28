import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { PrivacyMode, usePrivacy } from '@context/PrivacyContext';
import { type, radius } from '@styles/theme';
import { Row, SectionHeader, Sheet } from '@components/ds';
import { SNAPSHOT_RANGES, SnapshotRange, SnapshotRowId } from '@services/core/storageService';
import SnapshotOrderList, { SNAPSHOT_ROW_META } from './SnapshotOrderList';

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
    order: SnapshotRowId[];
    onChangeOrder: (order: SnapshotRowId[]) => void;
    range: SnapshotRange;
    onChangeRange: (range: SnapshotRange) => void;
}

const HomeSettingsSheet: React.FC<HomeSettingsSheetProps> = ({ visible, onClose, order, onChangeOrder, range, onChangeRange }) => {
    const { ds } = useTheme();
    const { mode, setMode } = usePrivacy();

    return (
        <Sheet
            visible={visible}
            onClose={onClose}
            title="Home settings"
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
            <Text style={[type.small, { color: ds.text2 }]}>Drag to reorder the Overview rows. Net worth stays on top.</Text>
            <SnapshotOrderList order={order} meta={SNAPSHOT_ROW_META} onChange={onChangeOrder} />
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
