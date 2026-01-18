import React from 'react';
import { View, StyleProp, ViewStyle, StatusBar, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Props {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    noPadding?: boolean;
    scrollable?: boolean;
}

export const ScreenWrapper: React.FC<Props> = ({ children, style, noPadding, scrollable = true }) => {
    const { colors, mode } = useTheme();
    const insets = useSafeAreaInsets();

    const content = scrollable ? (
        <ScrollView
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    ) : children;

    return (
        <KeyboardAvoidingView
            style={[{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: insets.top,
                paddingHorizontal: noPadding ? 0 : 16,
            }, style]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={0}
        >
            <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            {content}
        </KeyboardAvoidingView>
    );
};
