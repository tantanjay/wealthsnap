import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

interface EmptyStateProps {
    icon: React.ComponentProps<typeof Ionicons>['name'];
    title: string;
    subtitle?: string;
    iconColor?: string;
    ctaLabel?: string;
    onCtaPress?: () => void;
    // 'full' for a whole empty page/panel (icon circle + title + subtitle + optional CTA).
    // 'compact' for a block embedded inside an otherwise-populated list/modal.
    size?: 'full' | 'compact';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
    icon,
    title,
    subtitle,
    iconColor,
    ctaLabel,
    onCtaPress,
    size = 'full',
}) => {
    const { ds } = useTheme();
    const isCompact = size === 'compact';

    return (
        <View style={isCompact ? styles.compactContainer : styles.container}>
            {isCompact ? (
                <Ionicons name={icon} size={40} color={ds.text3} style={styles.compactIcon} />
            ) : (
                <View style={[styles.iconCircle, { backgroundColor: ds.inset }]}>
                    <Ionicons name={icon} size={32} color={iconColor ?? ds.text2} />
                </View>
            )}
            <Text style={[isCompact ? type.smallStrong : type.title, styles.centered, { color: ds.text }]}>
                {title}
            </Text>
            {subtitle && (
                <Text style={[type.small, styles.centered, isCompact ? styles.compactSubtitle : styles.subtitle, { color: ds.text2 }]}>
                    {subtitle}
                </Text>
            )}
            {ctaLabel && onCtaPress && (
                <TouchableOpacity
                    style={[styles.cta, { backgroundColor: ds.accent }]}
                    onPress={onCtaPress}
                >
                    <Text style={[type.bodyStrong, { color: ds.onAccent }]}>{ctaLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: space[7],
        paddingHorizontal: space[6],
    },
    iconCircle: {
        width: 72,
        height: 72,
        borderRadius: radius.full,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: space[5],
    },
    centered: {
        textAlign: 'center',
    },
    subtitle: {
        maxWidth: 280,
        marginTop: space[2],
        marginBottom: space[6],
    },
    cta: {
        alignSelf: 'stretch',
        height: 48,
        borderRadius: radius.md,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: space[6],
    },
    compactContainer: {
        alignItems: 'center',
        paddingVertical: space[7],
        paddingHorizontal: space[5],
    },
    compactIcon: {
        marginBottom: space[3],
    },
    compactSubtitle: {
        marginTop: space[1],
    },
});
