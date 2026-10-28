import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import ChangeLine from './ChangeLine';
import { IconName, Tone } from './tone';

export interface TileProps {
    label: string;
    icon?: IconName;
    // Already formatted (and privacy-masked) by the caller.
    value: string;
    change?: string;
    changeTone?: Tone;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

const Tile: React.FC<TileProps> = ({ label, icon, value, change, changeTone = 'neutral', onPress, style }) => {
    const { ds } = useTheme();

    return (
        <Pressable onPress={onPress} disabled={!onPress} style={[styles.tile, { backgroundColor: ds.inset }, style]}>
            <View style={styles.label}>
                {icon && <Ionicons name={icon} size={15} color={ds.text2} />}
                <Text style={[type.small, styles.labelText, { color: ds.text2 }]} numberOfLines={1}>{label}</Text>
            </View>
            <Text style={[type.titleNum, styles.value, { color: ds.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{value}</Text>
            {change ? <ChangeLine text={change} tone={changeTone} style={styles.change} /> : null}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    tile: {
        borderRadius: radius.md,
        padding: space[4],
    },
    label: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    labelText: {
        flexShrink: 1,
    },
    value: {
        marginTop: space[2],
    },
    change: {
        marginTop: 2,
    },
});

export default Tile;
