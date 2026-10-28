import React from 'react';
import { TouchableOpacity, Text, ViewStyle, StyleProp, ActivityIndicator, View, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius } from '@styles/theme';

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
    const { ds } = useTheme();

    const getBackgroundColor = () => {
        if (disabled) return ds.inset;
        switch (variant) {
            case 'primary': return ds.accent;
            case 'secondary': return ds.inset;
            default: return 'transparent';
        }
    };

    const getTextColor = () => {
        if (disabled) return ds.text3;
        switch (variant) {
            case 'primary': return ds.onAccent;
            case 'outline': return ds.accent;
            default: return ds.text;
        }
    };

    return (
        <TouchableOpacity
            onPress={onPress}
            disabled={disabled || loading}
            style={[
                {
                    backgroundColor: getBackgroundColor(),
                    minHeight: 48,
                    paddingVertical: space[3],
                    paddingHorizontal: space[6],
                    borderRadius: radius.md,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: variant === 'outline' ? 1 : 0,
                    borderColor: disabled ? ds.hairline : ds.accent,
                    flexDirection: 'row',
                    gap: space[2],
                },
                style
            ]}
        >
            {loading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <>
                    {icon && <Ionicons name={icon as any} size={20} color={getTextColor()} />}
                    <Text style={[type.bodyStrong, { color: getTextColor() }]}>
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
    onLayout?: (event: LayoutChangeEvent) => void;
    // Hairline-bordered on the page instead of the inset tile fill, for repeated list rows.
    flat?: boolean;
}

// Legacy container drawn as a DESIGN.md tile; no shadow, since it's in-flow content.
export const Card: React.FC<CardProps> = ({ children, style, onLayout, flat }) => {
    const { ds } = useTheme();
    return (
        <View
            onLayout={onLayout}
            style={[
                {
                    borderRadius: radius.md,
                    padding: space[4],
                    marginBottom: space[4],
                },
                flat
                    ? { backgroundColor: ds.bg, borderWidth: 1, borderColor: ds.hairline }
                    : { backgroundColor: ds.inset },
                style
            ]}>
            {children}
        </View>
    );
};
