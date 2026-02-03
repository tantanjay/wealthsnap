import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@context/ThemeContext';

interface SettingItemProps {
    icon: string;
    title: string;
    subtitle?: string;
    onPress?: () => void;
    iconBg?: string;
    iconColor?: string;
    isLast?: boolean;
    rightElement?: React.ReactNode;
}

const SettingItem: React.FC<SettingItemProps> = ({
    icon,
    title,
    subtitle,
    onPress,
    iconBg,
    iconColor,
    isLast = false,
    rightElement
}) => {
    const { colors } = useTheme();

    return (
        <TouchableOpacity
            style={[
                styles.settingItem,
                { borderBottomColor: colors.border },
                isLast && { borderBottomWidth: 0 }
            ]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={[styles.iconContainer, { backgroundColor: iconBg || colors.primary + '20' }]}>
                <Ionicons name={icon as any} size={22} color={iconColor || colors.primary} />
            </View>
            <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>{title}</Text>
                {subtitle && <Text style={[styles.settingSubtitle, { color: colors.textSecondary }]}>{subtitle}</Text>}
            </View>
            {rightElement ? (
                rightElement
            ) : (
                <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },
    settingSubtitle: {
        fontSize: 13,
    },
});

export default SettingItem;
