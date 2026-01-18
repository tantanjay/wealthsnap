import React from 'react';
import { View, StyleProp, ViewStyle, StatusBar } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

interface Props {
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
    noPadding?: boolean;
}

export const ScreenWrapper: React.FC<Props> = ({ children, style, noPadding }) => {
    const { colors, mode } = useTheme();
    const insets = useSafeAreaInsets();

    return (
        <View style={[{
            flex: 1,
            backgroundColor: colors.background,
            paddingTop: insets.top,
            paddingHorizontal: noPadding ? 0 : 16,
        }, style]}>
            <StatusBar barStyle={mode === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
            {children}
        </View>
    );
};
