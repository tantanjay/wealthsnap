import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { type, space } from '@styles/theme';

export interface UnderlineTab<K extends string> {
    key: K;
    label: string;
}

export interface UnderlineTabsProps<K extends string> {
    tabs: UnderlineTab<K>[];
    value: K;
    onChange: (key: K) => void;
    style?: StyleProp<ViewStyle>;
}

// Horizontally scrollable tab strip. Stickiness is the parent's job (e.g. ScrollView stickyHeaderIndices).
function UnderlineTabs<K extends string>({ tabs, value, onChange, style }: UnderlineTabsProps<K>) {
    const { ds } = useTheme();

    return (
        <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[{ backgroundColor: ds.bg, borderBottomColor: ds.hairline }, styles.strip, style]}
            contentContainerStyle={styles.content}
        >
            {tabs.map(tab => {
                const active = tab.key === value;
                return (
                    <Pressable
                        key={tab.key}
                        onPress={() => onChange(tab.key)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        style={[styles.tab, { borderBottomColor: active ? ds.accent : 'transparent' }]}
                    >
                        <Text style={[type.smallMedium, { color: active ? ds.text : ds.text2 }]}>{tab.label}</Text>
                    </Pressable>
                );
            })}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    strip: {
        flexGrow: 0,
        borderBottomWidth: 1,
    },
    content: {
        gap: space[5],
        paddingHorizontal: space[5],
    },
    tab: {
        paddingTop: space[3],
        paddingBottom: 10,
        borderBottomWidth: 2,
    },
});

export default UnderlineTabs;
