import React from 'react';
import { TouchableOpacity, Text, ViewStyle, StyleProp, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    style?: StyleProp<ViewStyle>;
    loading?: boolean;
    disabled?: boolean;
    icon?: string;
}

export const Button: React.FC<ButtonProps> = ({ title, onPress, variant = 'primary', style, loading, disabled, icon }) => {
    const { colors } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return colors.gray300;
        switch (variant) {
            case 'primary': return colors.primary;
            case 'secondary': return colors.secondary;
            case 'outline': return 'transparent';
            case 'ghost': return 'transparent';
            default: return colors.primary;
        }
    };

    const getTextColor = () => {
        if (disabled) return colors.gray500;
        switch (variant) {
            case 'primary': return colors.textLight;
            case 'secondary': return colors.textLight;
            case 'outline': return colors.primary;
            case 'ghost': return colors.text;
            default: return colors.textLight;
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                {
                    backgroundColor: getBackgroundColor(),
                    paddingVertical: 12,
                    paddingHorizontal: 24,
                    borderRadius: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: variant === 'outline' ? 1 : 0,
                    borderColor: colors.primary,
                    opacity: disabled ? 0.7 : 1,
                    flexDirection: 'row',
                    gap: 8,
                },
                style
            ]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon && <Ionicons name={icon as any} size={20} color={getTextColor()} />}
                    <Text style={{ color: getTextColor(), fontSize: 16, fontWeight: '600' }}>
                        {title}
                    </Text>
                </>
            )}
        </TouchableOpacity>
    );
};

interface CardProps {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const Card: React.FC<CardProps> = ({ children, style }) => {
    const { colors } = useTheme();
    return (
        <View style={[
            {
                backgroundColor: colors.surface,
                borderRadius: 16,
                padding: 16,
                marginBottom: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 8,
                elevation: 4,
            },
            style
        ]}>
            {children}
        </View>
    );
};
