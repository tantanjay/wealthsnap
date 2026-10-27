import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { space } from '@styles/theme';
import { Domain, Tone, domainColor, toneColor } from './tone';

export interface ProgressBarProps {
    // 0–100; clamped.
    percent: number;
    // Domain color for goals/loans; a tone when the value itself is good/bad (budgets).
    domain?: Domain;
    tone?: Exclude<Tone, 'neutral'>;
    style?: StyleProp<ViewStyle>;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ percent, domain, tone, style }) => {
    const { ds } = useTheme();
    const fill = tone ? toneColor(ds, tone) : domain ? domainColor(ds, domain) : ds.accent;
    const width = `${Math.min(100, Math.max(0, percent))}%` as const;

    return (
        <View style={[styles.track, { backgroundColor: ds.hairline }, style]}>
            <View style={[styles.fill, { width, backgroundColor: fill }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    track: {
        height: 4,
        borderRadius: 2,
        marginTop: space[2],
        overflow: 'hidden',
        flexDirection: 'row',
    },
    fill: {
        height: '100%',
    },
});

export default ProgressBar;
