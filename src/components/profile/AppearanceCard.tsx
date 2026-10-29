import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

import { Group, Row, SectionHeader, SegmentedControl, Sheet } from '@components/ds';
import { useTheme, type ThemeMode } from '@context/ThemeContext';
import { SKINS, SKIN_IDS, type, space, radius } from '@styles/theme';

const MODE_OPTIONS: { key: ThemeMode; label: string }[] = [
    { key: 'light', label: 'Light' },
    { key: 'dark', label: 'Dark' },
    { key: 'system', label: 'System' },
];

// Profile → Appearance: one Skin row; mode and skin both live in its sheet since they're rarely changed.
const AppearanceCard: React.FC = () => {
    const { ds, theme, mode, setMode, skin, setSkin } = useTheme();
    const [visible, setVisible] = useState(false);
    const modeLabel = MODE_OPTIONS.find(o => o.key === mode)?.label ?? 'System';

    return (
        <>
            <SectionHeader grouped title="Appearance" />
            <Group>
                <Row
                    icon="color-palette-outline"
                    title="Skin"
                    subtitle={`${SKINS[skin].name} · ${modeLabel}`}
                    chevron
                    last
                    onPress={() => setVisible(true)}
                />
            </Group>

            <Sheet visible={visible} onClose={() => setVisible(false)} title="Appearance">
                <SectionHeader grouped title="Mode" />
                <SegmentedControl options={MODE_OPTIONS} value={mode} onChange={setMode} />

                <SectionHeader grouped title="Skin" />
                <View style={styles.grid}>
                    {SKIN_IDS.map(id => {
                        const option = SKINS[id];
                        // Swatches follow the mode currently on screen, so System shows the device's half.
                        const swatch = option[theme.mode];
                        const selected = id === skin;
                        return (
                            <Pressable
                                key={id}
                                onPress={() => setSkin(id)}
                                accessibilityRole="radio"
                                accessibilityState={{ selected }}
                                accessibilityLabel={`${option.name}, ${option.description}`}
                                style={[
                                    styles.card,
                                    { backgroundColor: ds.group, borderColor: selected ? ds.accent : ds.hairline },
                                ]}
                            >
                                <View style={[styles.strip, { borderColor: ds.hairline }]}>
                                    {[swatch.canvas, swatch.group, swatch.heroPanel, swatch.accent].map((color, i) => (
                                        <View key={i} style={[styles.swatch, { backgroundColor: color }]} />
                                    ))}
                                </View>
                                <Text style={[type.smallStrong, { color: ds.text }]} numberOfLines={1}>{option.name}</Text>
                                <Text style={[type.caption, { color: ds.text2 }]} numberOfLines={2}>{option.description}</Text>
                            </Pressable>
                        );
                    })}
                </View>
            </Sheet>
        </>
    );
};

const styles = StyleSheet.create({
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: space[3],
    },
    // Always 2px so selecting a card doesn't shift the grid; only the color changes.
    card: {
        flexBasis: '47%',
        flexGrow: 1,
        borderRadius: radius.md,
        borderWidth: 2,
        padding: space[3],
        gap: space[1],
    },
    strip: {
        flexDirection: 'row',
        height: 28,
        borderRadius: radius.sm,
        borderWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
        marginBottom: space[1],
    },
    swatch: {
        flex: 1,
    },
});

export default AppearanceCard;
