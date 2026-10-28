import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';

import { Row, SectionHeader, Sheet } from '@components/ds';
import { useTheme } from '@context/ThemeContext';
import { radius } from '@styles/theme';

type ThemeMode = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
];

interface AppearanceCardProps {
    mode: string;
    setMode: (mode: ThemeMode) => void;
}

// Profile → Appearance: one Theme row; the choice lives in a sheet since it's rarely changed.
const AppearanceCard: React.FC<AppearanceCardProps> = ({ mode, setMode }) => {
    const { ds } = useTheme();
    const [visible, setVisible] = useState(false);
    const current = THEME_OPTIONS.find(o => o.value === mode)?.label ?? 'System';

    return (
        <>
            <SectionHeader title="Appearance" />
            <Row icon="contrast-outline" title="Theme" subtitle={current} chevron last onPress={() => setVisible(true)} />

            <Sheet
                visible={visible}
                onClose={() => setVisible(false)}
                title="Theme"
            >
                {THEME_OPTIONS.map((option, i) => {
                    const selected = mode === option.value;
                    return (
                        <Row
                            key={option.value}
                            title={option.label}
                            subtitle={option.value === 'system' ? 'Follows your device setting' : undefined}
                            leading={
                                <View style={[styles.radio, { borderColor: selected ? ds.accent : ds.text3 }]}>
                                    {selected && <View style={[styles.radioDot, { backgroundColor: ds.accent }]} />}
                                </View>
                            }
                            onPress={() => setMode(option.value)}
                            last={i === THEME_OPTIONS.length - 1}
                        />
                    );
                })}
            </Sheet>
        </>
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
});

export default AppearanceCard;
