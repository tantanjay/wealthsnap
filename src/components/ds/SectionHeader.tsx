import React from 'react';
import { View, Text, Pressable, StyleSheet, StyleProp, ViewStyle } from 'react-native';

import { useTheme } from '@context/ThemeContext';
import { type, space } from '@styles/theme';

export interface SectionHeaderProps {
    title: string;
    // Optional text action on the right ("See all", "Overall ⌄").
    actionLabel?: string;
    onAction?: () => void;
    style?: StyleProp<ViewStyle>;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, actionLabel, onAction, style }) => {
    const { ds } = useTheme();

    return (
        <View style={[styles.container, style]}>
            <Text style={[type.smallStrong, { color: ds.text }]}>{title}</Text>
            {actionLabel ? (
                <Pressable onPress={onAction} disabled={!onAction} hitSlop={space[2]}>
                    <Text style={[type.smallMedium, { color: ds.accent }]}>{actionLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: space[6],
        marginBottom: space[1],
    },
});

export default SectionHeader;
