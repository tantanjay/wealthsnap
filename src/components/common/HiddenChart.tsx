import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface HiddenChartProps {
    // Match the chart it replaces; without one it fills its parent.
    height?: number;
}

// Hidden privacy mode: stands in for every chart with the same size, fill and copy.
const HiddenChart: React.FC<HiddenChartProps> = ({ height }) => {
    const { ds } = useTheme();
    return (
        <View style={[styles.hidden, height === undefined ? styles.fill : { height }, { backgroundColor: ds.inset }]}>
            <Ionicons name="lock-closed-outline" size={18} color={ds.text2} />
            <Text style={[type.small, { color: ds.text2 }]}>Chart hidden for privacy</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    hidden: {
        borderRadius: radius.md,
        alignItems: 'center',
        justifyContent: 'center',
        gap: space[2],
    },
    fill: {
        flex: 1,
    },
});

export default HiddenChart;
