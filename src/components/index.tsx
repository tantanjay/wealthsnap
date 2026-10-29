import React from 'react';
import { TouchableOpacity, Text, ViewStyle, StyleProp, ActivityIndicator, View, LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useTheme } from '@context/ThemeContext';
import { type, space, radius, layout } from '@styles/theme';

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
        // Buttons sit on the canvas, where `inset` would vanish.
        if (disabled) return ds.group;
        switch (variant) {
            case 'primary': return ds.accent;
            case 'secondary': return ds.group;
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
    // Adds a hairline border, for repeated list rows.
    flat?: boolean;
}

// Legacy container drawn as the `group` surface (docs/DESIGN.md, Group); no shadow.
export const Card: React.FC<CardProps> = ({ children, style, onLayout, flat }) => {
    const { ds } = useTheme();
    return (
        <View
            onLayout={onLayout}
            style={[
                {
                    backgroundColor: ds.group,
                    borderRadius: radius.group,
                    padding: layout.groupPadding,
                    marginBottom: space[4],
                },
                flat && { borderWidth: 1, borderColor: ds.hairline },
                style
            ]}>
            {children}
        </View>
    );
};
