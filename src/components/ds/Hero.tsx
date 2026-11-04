import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient, Polygon, Polyline, Stop } from 'react-native-svg';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius, SPARK_FILL_OPACITY } from '@styles/theme';
import ChangeLine from './ChangeLine';
import { Tone } from './tone';

export interface HeroStat {
    label: string;
    value: string;
}

export interface HeroProps {
    label: string;
    // Value, change line and stats arrive already formatted (and privacy-masked) by the caller.
    value: string;
    // ▲/▼ are allowed here only.
    change?: string;
    changeTone?: Tone;
    // Raw series for the 1.5px accent sparkline, with a faint accent fill under it; no axes.
    sparkline?: number[];
    stats?: HeroStat[];
    // Trailing link at the end of the stats line ("Details").
    actionLabel?: string;
    onAction?: () => void;
    // Draws the hero in the soft accent-tinted panel (the screen's one hero).
    panel?: boolean;
    style?: StyleProp<ViewStyle>;
}

const SPARK_HEIGHT = 36;
const SPARK_STROKE = 1.5;

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
    const [width, setWidth] = useState(0);
    const min = Math.min(...data);
    const range = Math.max(...data) - min || 1;
    // Inset by half the stroke so the line isn't clipped at the extremes.
    const h = SPARK_HEIGHT - SPARK_STROKE;
    const points = data
        .map((v, i) => {
            const x = data.length > 1 ? (i / (data.length - 1)) * width : 0;
            const y = SPARK_STROKE / 2 + h - ((v - min) / range) * h;
            return `${x},${y}`;
        })
        .join(' ');

    const area = `0,${SPARK_HEIGHT} ${points} ${width},${SPARK_HEIGHT}`;

    return (
        <View style={styles.spark} onLayout={e => setWidth(e.nativeEvent.layout.width)}>
            {width > 0 && (
                <Svg width={width} height={SPARK_HEIGHT}>
                    <Defs>
                        <LinearGradient id="heroSparkFill" x1="0" y1="0" x2="0" y2="1">
                            <Stop offset="0" stopColor={color} stopOpacity={SPARK_FILL_OPACITY} />
                            <Stop offset="1" stopColor={color} stopOpacity={0} />
                        </LinearGradient>
                    </Defs>
                    <Polygon points={area} fill="url(#heroSparkFill)" />
                    <Polyline points={points} fill="none" stroke={color} strokeWidth={SPARK_STROKE} strokeLinejoin="round" />
                </Svg>
            )}
        </View>
    );
};

const Hero: React.FC<HeroProps> = ({
    label,
    value,
    change,
    changeTone = 'neutral',
    sparkline,
    stats,
    actionLabel,
    onAction,
    panel,
    style,
}) => {
    const { ds } = useTheme();
    const hasStatsLine = (stats && stats.length > 0) || actionLabel;

    return (
        <View style={[panel && [styles.panel, { backgroundColor: ds.heroPanel }], style]}>
            <Text style={[type.small, { color: ds.text2 }]}>{label}</Text>
            <Text style={[type.display, styles.tight, { color: ds.text }]}>{value}</Text>
            {change ? <ChangeLine text={change} tone={changeTone} size="small" style={styles.tight} /> : null}

            {sparkline && sparkline.length > 1 && <Sparkline data={sparkline} color={ds.accent} />}

            {hasStatsLine ? (
                <View style={[styles.stats, !sparkline && styles.statsNoSpark]}>
                    {stats?.map(stat => (
                        <Text key={stat.label} style={[type.smallNum, { color: ds.text }]}>
                            <Text style={{ color: ds.text2 }}>{stat.label}</Text> {stat.value}
                        </Text>
                    ))}
                    {actionLabel ? (
                        <Pressable onPress={onAction} disabled={!onAction} hitSlop={space[2]} style={styles.action}>
                            <Text style={[type.smallMedium, { color: ds.accent }]}>{actionLabel}</Text>
                            <Ionicons name="chevron-forward" size={14} color={ds.accent} />
                        </Pressable>
                    ) : null}
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    panel: {
        borderRadius: radius.group,
        padding: space[4],
    },
    tight: {
        marginTop: 2,
    },
    spark: {
        height: SPARK_HEIGHT,
        marginTop: space[3],
        marginBottom: space[2],
    },
    stats: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[5],
    },
    statsNoSpark: {
        marginTop: space[3],
    },
    action: {
        marginLeft: 'auto',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
});

export default Hero;
