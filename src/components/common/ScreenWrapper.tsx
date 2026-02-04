import React from 'react';
import { StyleProp, ViewStyle, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';
import { StatusBar } from 'expo-status-bar';

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
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'android' ? -insets.bottom : 0}
        >
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} translucent />
            {content}
        </KeyboardAvoidingView>
    );
};
