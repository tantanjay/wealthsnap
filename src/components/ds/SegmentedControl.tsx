import React from 'react';
import { View, Pressable, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { type, radius } from '@styles/theme';

export interface SegmentOption<K extends string> {
    key: K;
    label: string;
}

export interface SegmentedControlProps<K extends string> {
    options: SegmentOption<K>[];
    value: K;
    onChange: (key: K) => void;
    style?: StyleProp<ViewStyle>;
}

// Only for two peer views on one screen; max one per screen (docs/DESIGN.md §3).
function SegmentedControl<K extends string>({ options, value, onChange, style }: SegmentedControlProps<K>) {
    const { ds } = useTheme();

    return (
        <View style={[styles.track, { backgroundColor: ds.track }, style]} accessibilityRole="tablist">
            {options.map(option => {
                const selected = option.key === value;
                return (
                    <Pressable
                        key={option.key}
                        onPress={() => onChange(option.key)}
                        accessibilityRole="tab"
                        accessibilityState={{ selected }}
                        style={[
                            styles.option,
                            selected && { backgroundColor: ds.raised, borderColor: ds.hairline },
                        ]}
                    >
                        <Text style={[type.smallMedium, { color: selected ? ds.text : ds.text2 }]}>{option.label}</Text>
                    </Pressable>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    track: {
        flexDirection: 'row',
        borderRadius: 10,
        padding: 3,
    },
    // 1px ring stands in for the prototype's box-shadow ring; padding drops 7 → 6 to keep the same height.
    option: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 6,
        borderRadius: radius.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
});

export default SegmentedControl;
