import React from 'react';
import { StyleProp, ViewStyle, KeyboardAvoidingView, ScrollView, Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@context/ThemeContext';

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
            // Use insets.bottom here to ensure content isn't hidden behind the nav bar
            contentContainerStyle={{
                flexGrow: 1,
                paddingBottom: insets.bottom + 20
            }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
        >
            {children}
        </ScrollView>
    ) : (
        // For non-scrollable views, we wrap in a View to apply the bottom inset
        <View style={{ flex: 1, paddingBottom: insets.bottom }}>
            {children}
        </View>
    );

    return (
        <KeyboardAvoidingView
            style={[{
                flex: 1,
                backgroundColor: colors.background,
                paddingTop: insets.top,
                paddingHorizontal: noPadding ? 0 : 16,
            }, style]}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <StatusBar style={mode === 'dark' ? 'light' : 'dark'} translucent />
            {content}
        </KeyboardAvoidingView>
    );
};