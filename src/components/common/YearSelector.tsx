import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space } from '@styles/theme';

interface YearSelectorProps {
    // Newest first.
    years: number[];
    value: number;
    onChange: (year: number) => void;
    style?: StyleProp<ViewStyle>;
}

// "‹ 2025 ›" for a chart's 1-year view. Renders nothing when this year is the only one.
const YearSelector: React.FC<YearSelectorProps> = ({ years, value, onChange, style }) => {
    const { ds } = useTheme();
    if (years.length <= 1 && years[0] === new Date().getFullYear()) return null;

    // A value outside the list (-1) can still step back onto its newest year.
    const index = years.indexOf(value);
    const hasPrev = index < years.length - 1;
    const hasNext = index > 0;

    return (
        <View style={[styles.row, style]}>
            <Pressable onPress={() => onChange(years[index + 1])} disabled={!hasPrev} hitSlop={space[2]} accessibilityLabel="Previous year">
                <Ionicons name="chevron-back" size={18} color={hasPrev ? ds.text : ds.text3} />
            </Pressable>
            <Text style={[type.smallMediumNum, { color: ds.text }]}>{value}</Text>
            <Pressable onPress={() => onChange(years[index - 1])} disabled={!hasNext} hitSlop={space[2]} accessibilityLabel="Next year">
                <Ionicons name="chevron-forward" size={18} color={hasNext ? ds.text : ds.text3} />
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[5],
        marginBottom: space[3],
    },
});

export default YearSelector;
