import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';
import ChangeLine from './ChangeLine';
import { DOMAIN_ICONS, Domain, IconName, Tone, domainColor, domainSoftColor, toneColor } from './tone';

export interface RowProps {
    title: string;
    subtitle?: string;
    // Leading slot: a 32px icon tile (domain-tinted when `domain` is set), or custom content (radio, checkbox).
    domain?: Domain;
    icon?: IconName;
    // 'plain' keeps the old 8px domain dot / bare 20px icon.
    iconStyle?: 'tile' | 'plain';
    leading?: React.ReactNode;
    // Trailing value and change line arrive already formatted (and privacy-masked) by the caller.
    value?: string;
    // Unset renders in `text`; set only when the value itself is good/bad (income, transfers).
    valueTone?: Tone;
    change?: string;
    changeTone?: Tone;
    // Custom trailing control (switch, spinner), placed before the chevron.
    trailing?: React.ReactNode;
    // Only when the destination isn't obvious.
    chevron?: boolean;
    // Rendered under the subtitle, e.g. a ProgressBar.
    children?: React.ReactNode;
    // No hairline after the last row of a list.
    last?: boolean;
    onPress?: () => void;
    style?: StyleProp<ViewStyle>;
}

const Row: React.FC<RowProps> = ({
    title,
    subtitle,
    domain,
    icon,
    iconStyle = 'tile',
    leading,
    value,
    valueTone,
    change,
    changeTone = 'neutral',
    trailing,
    chevron,
    children,
    last,
    onPress,
    style,
}) => {
    const { ds } = useTheme();
    const tileIcon = icon ?? (domain ? DOMAIN_ICONS[domain] : undefined);

    return (
        <Pressable
            onPress={onPress}
            disabled={!onPress}
            style={[
                styles.row,
                { borderBottomColor: ds.hairline, borderBottomWidth: last ? 0 : 1 },
                style,
            ]}
        >
            {leading}
            {!leading && iconStyle === 'tile' && tileIcon && (
                <View style={[styles.tile, { backgroundColor: domain ? domainSoftColor(ds, domain) : ds.tileNeutral }]}>
                    <Ionicons name={tileIcon} size={18} color={domain ? domainColor(ds, domain) : ds.text2} />
                </View>
            )}
            {!leading && iconStyle === 'plain' && domain && <View style={[styles.dot, { backgroundColor: domainColor(ds, domain) }]} />}
            {!leading && iconStyle === 'plain' && !domain && icon && <Ionicons name={icon} size={20} color={ds.text2} />}

            <View style={styles.main}>
                <Text style={[type.body, { color: ds.text }]}>{title}</Text>
                {subtitle ? <Text style={[type.small, { color: ds.text2 }]}>{subtitle}</Text> : null}
                {children}
            </View>

            {(value || change) ? (
                <View style={styles.end}>
                    {value ? (
                        <Text style={[type.bodyNum, { color: valueTone ? toneColor(ds, valueTone) : ds.text }]} numberOfLines={1}>
                            {value}
                        </Text>
                    ) : null}
                    {change ? <ChangeLine text={change} tone={changeTone} /> : null}
                </View>
            ) : null}

            {trailing}
            {chevron && <Ionicons name="chevron-forward" size={16} color={ds.text3} />}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: space[3],
        paddingVertical: space[3],
        minHeight: 56,
    },
    tile: {
        width: 32,
        height: 32,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: radius.full,
    },
    main: {
        flex: 1,
        minWidth: 0,
    },
    end: {
        alignItems: 'flex-end',
    },
});

export default Row;
