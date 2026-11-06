import React, { useRef, useState } from 'react';
import { View, Text, Modal, Pressable, ScrollView, ScrollViewInstance, StyleSheet, useWindowDimensions, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

export interface DropdownOption<K extends string> {
    key: K;
    label: string;
}

// The trigger's window position, from measureInWindow.
export interface DropdownAnchor {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface DropdownMenuProps<K extends string> {
    anchor: DropdownAnchor | null;
    options: DropdownOption<K>[];
    value: K;
    onSelect: (key: K) => void;
    onClose: () => void;
}

const GAP = 4;
const EDGE = space[2];

// Opens under its trigger, right edges aligned; flips above when there's no room below and is clamped to the screen.
function DropdownMenu<K extends string>({ anchor, options, value, onSelect, onClose }: DropdownMenuProps<K>) {
    const { ds, elevation } = useTheme();
    const insets = useSafeAreaInsets();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const [size, setSize] = useState<{ width: number; height: number } | null>(null);
    const scrollRef = useRef<ScrollViewInstance>(null);
    // Long lists (e.g. every changelog version) scroll inside the menu instead of running off screen.
    const maxListHeight = Math.min(screenHeight * 0.6, screenHeight - insets.top - insets.bottom - EDGE * 2);

    const onLayout = (e: LayoutChangeEvent) => {
        const { width, height } = e.nativeEvent.layout;
        if (!size || size.width !== width || size.height !== height) setSize({ width, height });
    };

    let position: { top: number; left: number } | null = null;
    if (anchor && size) {
        const below = anchor.y + anchor.height + GAP;
        const fitsBelow = below + size.height <= screenHeight - insets.bottom - EDGE;
        const top = fitsBelow ? below : Math.max(insets.top + EDGE, anchor.y - GAP - size.height);
        const right = Math.min(anchor.x + anchor.width, screenWidth - EDGE);
        position = { top, left: Math.max(EDGE, right - size.width) };
    }

    return (
        <Modal visible={!!anchor} transparent animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
            <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
            <View
                onLayout={onLayout}
                // Hidden for the first frame, until its own size is known.
                style={[
                    styles.menu,
                    elevation.sheet,
                    { backgroundColor: ds.raised, borderColor: ds.hairline },
                    position ?? styles.measuring,
                ]}
            >
                <ScrollView ref={scrollRef} style={{ maxHeight: maxListHeight }} contentContainerStyle={styles.list} bounces={false}>
                    {options.map(option => {
                        const selected = option.key === value;
                        return (
                            <Pressable
                                key={option.key}
                                // Starts a scrolled list with the current option in view.
                                onLayout={selected ? e => scrollRef.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - maxListHeight / 2), animated: false }) : undefined}
                                onPress={() => {
                                    onClose();
                                    if (!selected) onSelect(option.key);
                                }}
                                accessibilityRole="menuitem"
                                accessibilityState={{ selected }}
                                style={({ pressed }) => [styles.item, pressed && { backgroundColor: ds.inset }]}
                            >
                                <Text style={[type.smallMedium, { color: selected ? ds.accent : ds.text }]}>{option.label}</Text>
                                {selected && <Ionicons name="checkmark" size={16} color={ds.accent} />}
                            </Pressable>
                        );
                    })}
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    menu: {
        position: 'absolute',
        minWidth: 180,
        borderRadius: radius.md,
        borderWidth: 1,
    },
    list: {
        paddingVertical: space[1],
    },
    measuring: {
        top: 0,
        left: 0,
        opacity: 0,
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: space[4],
        paddingVertical: space[3],
        paddingHorizontal: space[4],
    },
});

export default DropdownMenu;
