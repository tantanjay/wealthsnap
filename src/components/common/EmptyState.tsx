import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';

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
    const { colors } = useTheme();
    const resolvedIconColor = iconColor ?? colors.primary;
    const isCompact = size === 'compact';

    return (
        <View style={isCompact ? styles.compactContainer : styles.container}>
            {isCompact ? (
                <Ionicons name={icon} size={40} color={colors.gray300} style={styles.compactIcon} />
            ) : (
                <View style={[styles.iconCircle, { backgroundColor: resolvedIconColor + '15' }]}>
                    <Ionicons name={icon} size={34} color={resolvedIconColor} />
                </View>
            )}
            <Text style={[isCompact ? styles.compactTitle : styles.title, { color: colors.text }]}>
                {title}
            </Text>
            {subtitle && (
                <Text style={[isCompact ? styles.compactSubtitle : styles.subtitle, { color: colors.textSecondary }]}>
                    {subtitle}
                </Text>
            )}
            {ctaLabel && onCtaPress && (
                <TouchableOpacity
                    style={[styles.cta, { backgroundColor: colors.primary }]}
                    onPress={onCtaPress}
                >
                    <Text style={styles.ctaText}>{ctaLabel}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingTop: 40,
        paddingHorizontal: 24,
    },
    iconCircle: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 280,
        marginBottom: 24,
    },
    cta: {
        paddingVertical: 13,
        paddingHorizontal: 28,
        borderRadius: 12,
    },
    ctaText: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
    },
    compactContainer: {
        alignItems: 'center',
        paddingVertical: 32,
        paddingHorizontal: 20,
    },
    compactIcon: {
        marginBottom: 10,
    },
    compactTitle: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },
    compactSubtitle: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 4,
    },
});
